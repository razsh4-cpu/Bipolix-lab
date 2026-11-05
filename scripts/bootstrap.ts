// Runs during every production build, after migrations. On the first deploy it
// creates the admin, the organization and the truck's machines from environment
// variables; later runs find the admin and do nothing. The password is never logged.
//   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_PASSWORD
//   BOOTSTRAP_ORG_NAME (default "מעבדה ניידת"), BOOTSTRAP_ORG_SLUG (default "mobile-lab")
import "dotenv/config";
import { db } from "../src/lib/db";
import { addLabMachines, createAdmin } from "./lib/setup";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("bootstrap: no BOOTSTRAP_ADMIN_EMAIL/PASSWORD set, skipping");
    return;
  }
  const slug = process.env.BOOTSTRAP_ORG_SLUG?.trim() || "mobile-lab";
  const created = await createAdmin(db, {
    email,
    password,
    name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || email,
    org: process.env.BOOTSTRAP_ORG_NAME?.trim() || "מעבדה ניידת",
    slug,
    lab: "משאית",
    labType: "MOBILE",
  });
  if (!created) {
    console.log("bootstrap: admin already exists, nothing to do");
    return;
  }
  console.log(`bootstrap: created admin ${email.toLowerCase()} in "${slug}"`);
  await addLabMachines(db, slug, (line) => console.log(`bootstrap: ${line}`));
}

main()
  .catch((error) => {
    console.error("bootstrap failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
