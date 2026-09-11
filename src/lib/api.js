const TOKEN_KEY = 'pharmaloop_token';

/** Production (Vercel): set VITE_API_URL to your Render API origin. Local/dev: leave empty (Vite proxy). */
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}
export class ApiError extends Error {
  constructor(status, message, data) {
    super(message)
    this.status = status
    this.data = data
  }
}
export async function api(path, options = {}) {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }
    const token = getToken();
    if (token)
        headers.set('Authorization', `Bearer ${token}`);
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;
    const url = `${API_BASE}${apiPath}`;
    const res = await fetch(url, {
        ...options,
        headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, data.error || res.statusText, data);
    }
    return data;
}
