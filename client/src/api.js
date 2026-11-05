const API_BASE_URL = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const apiFetch = (path, options) =>
  fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, options);
