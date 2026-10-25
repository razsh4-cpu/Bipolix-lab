import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Accounts are created by an administrator, never by self sign-up.
    disableSignUp: true,
    minPasswordLength: 10,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      isPlatformAdmin: { type: "boolean", input: false, defaultValue: false },
      isActive: { type: "boolean", input: false, defaultValue: true },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Deactivated users cannot open new sessions.
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          return user?.isActive ? { data: session } : false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});
