/** All database operations are server-only. The HTTP bridge authenticates Next.js. */
export { internalMutation as mutation, internalQuery as query } from "./_generated/server";
