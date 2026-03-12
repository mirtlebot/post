import { API_ROOT } from '../config.js';

export function authHeaders(token, extras = {}) {
  return { Authorization: `Bearer ${token}`, ...extras };
}

export async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); }
  catch { return { error: text.trim() }; }
}

export async function apiRequest(token, init = {}) {
  const response = await fetch(API_ROOT, { ...init, headers: authHeaders(token, init.headers) });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Request failed');
  return payload;
}

export async function uploadFile(token, formData) {
  const response = await fetch(API_ROOT, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload?.error || 'Upload failed');
  return payload;
}
