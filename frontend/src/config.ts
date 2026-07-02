// Single source of truth for the backend API base URL.
// Strips any trailing slash(es) so callers can safely append `/path`
// without producing a double slash (e.g. `https://host//auth/google`).
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");
