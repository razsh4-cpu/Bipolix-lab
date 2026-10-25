// Who is acting, and in which organization. Every service call is scoped by it.
export type Actor = { organizationId: string; userId: string };

export class DomainError extends Error {}
