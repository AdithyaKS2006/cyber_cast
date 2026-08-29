/**
 * Centralized fetch wrapper for authenticated requests to the backend.
 * - Injects X-CSRFToken if the csrftoken cookie is present
 * - Sends HttpOnly JWT cookies automatically via credentials: 'include'
 * - Returns parsed JSON/Response on success; throws on error with message from server
 * - Auto-logs out on 401
 */
let isLoggingOut = false;

export default async function apiClient(endpoint, options = {}) {
  const headers = { ...options.headers };

  // Inject CSRF token for mutation safety (belt-and-suspenders)
  const csrfMatch = document.cookie.match(/(^| )csrftoken=([^;]+)/);
  if (csrfMatch) {
    headers['X-CSRFToken'] = csrfMatch[2];
  }

  // Default to JSON content-type unless uploading FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Debug logging
  console.debug(`[apiClient] ${options.method || 'GET'} ${endpoint}`);

  // Auto-logout on 401 (excluding initial auth check & auth endpoints to prevent redirect loops)
  const isAuthEndpoint = endpoint.includes('/auth/') || endpoint.includes('/users/me/');
  if (response.status === 401 && !isLoggingOut && !isAuthEndpoint) {
    isLoggingOut = true;
    fetch('/api/v1/auth/logout/', { method: 'DELETE', credentials: 'include' })
      .finally(() => {
        localStorage.removeItem('cyber_user');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        isLoggingOut = false;
      });
  }

  return response;
}

apiClient.get = async (endpoint, options = {}) => {
  const res = await apiClient(endpoint, { ...options, method: 'GET' });
  if (options.responseType === 'blob') {
    return { data: await res.blob(), status: res.status };
  }
  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
};

apiClient.post = async (endpoint, data, options = {}) => {
  const res = await apiClient(endpoint, {
    ...options,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  return { data: resData, status: res.status };
};

apiClient.put = async (endpoint, data, options = {}) => {
  const res = await apiClient(endpoint, {
    ...options,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  return { data: resData, status: res.status };
};

apiClient.patch = async (endpoint, data, options = {}) => {
  const res = await apiClient(endpoint, {
    ...options,
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  return { data: resData, status: res.status };
};

apiClient.delete = async (endpoint, options = {}) => {
  const res = await apiClient(endpoint, { ...options, method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  return { data, status: res.status };
};
