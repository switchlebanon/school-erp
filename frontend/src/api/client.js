// ─── API Client ───────────────────────────────────────────────────
// Wraps fetch() calls to the backend, automatically attaching the
// JWT token (if present) and parsing JSON / error responses.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const TOKEN_KEY = "scube_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Core request helper.
 * @param {string} path - e.g. "/students"
 * @param {object} options - fetch options (method, body, etc.)
 */
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 204 No Content (e.g. DELETE)
  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

// ─── Convenience methods ──────────────────────────────────────────
export const api = {
  get:    (path)        => request(path, { method: "GET" }),
  post:   (path, body)  => request(path, { method: "POST", body }),
  put:    (path, body)  => request(path, { method: "PUT", body }),
  delete: (path)        => request(path, { method: "DELETE" }),
};

/**
 * Downloads a file from an authenticated endpoint and triggers
 * a browser save dialog. Used for Excel exports, PDFs, etc.
 * @param {string} path - e.g. "/export/all"
 * @param {string} fallbackFilename - used if the server doesn't send one
 */
export async function downloadFile(path, fallbackFilename = "download.xlsx") {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  // Try to extract filename from Content-Disposition header
  let filename = fallbackFilename;
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
