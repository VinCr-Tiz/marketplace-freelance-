const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'ارتباط با سرور برقرار نشد. لطفاً مطمئن شوید سرور در حال اجرا است');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(response.status, data?.message || 'عملیات با شکست مواجه شد', data);
  }
  return data;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
};

export default api;
