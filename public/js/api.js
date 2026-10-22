import { showToast } from './toast.js';

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
    credentials: 'include', // Includes httpOnly JWT cookie
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || `HTTP error ${res.status}`;
      if (options.showErrorToast !== false) {
        showToast(errorMsg, 'error');
      }
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showToast('Network error: unable to connect to server', 'error');
    }
    throw err;
  }
}

export default apiRequest;
