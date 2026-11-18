import "server-only";

// Files are kept in a private Vercel Blob store; this token is added
// automatically when the store is connected to the Vercel project.
export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
