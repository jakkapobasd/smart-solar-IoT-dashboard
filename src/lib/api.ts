import axios from 'axios';

const api = axios.create({
  baseURL: '/api/proxy',
});

// Request interceptor to add the token
api.interceptors.request.use((config) => {
  if (config.url?.includes('/auth/token')) {
    return config;
  }
  const userData = localStorage.getItem('userData');
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      const token = parsed._token || parsed.token;
      if (token && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
          config.headers['authorization'] = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.error("Failed to parse token from localStorage, ignoring", e);
    }
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/token')) {
      const credsStr = localStorage.getItem('loginCredentials');
      if (credsStr) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token) => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                originalRequest.headers['authorization'] = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const creds = JSON.parse(credsStr);
          const params = new URLSearchParams();
          params.append('username', creds.username);
          params.append('password', creds.password);

          console.log("[Auth Interceptor] Trying silent automatic re-login...");
          const response = await axios.post('/api/proxy/auth/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });

          const { access_token, user: userData } = response.data;

          const oldUserStr = localStorage.getItem('userData');
          let parsedOld: any = {};
          if (oldUserStr) {
            try { parsedOld = JSON.parse(oldUserStr); } catch (e) {}
          }

          const newUserData = {
            ...parsedOld,
            username: userData.name || parsedOld.username,
            id: userData.id || parsedOld.id,
            _token: access_token,
            _tokenExpirationDate: new Date(Date.now() + 3600000 * 24 * 365).toISOString(),
          };
          localStorage.setItem('userData', JSON.stringify(newUserData));

          isRefreshing = false;
          onRefreshed(access_token);

          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
            originalRequest.headers['authorization'] = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (loginErr) {
          console.error("[Auth Interceptor] Silent automatic re-login failed:", loginErr);
          isRefreshing = false;
          refreshSubscribers = [];
          
          localStorage.removeItem('userData');
          localStorage.removeItem('tenantId');
          localStorage.removeItem('applicationId');
          localStorage.removeItem('loginCredentials');
          window.location.href = '/login';
          return Promise.reject(loginErr);
        }
      } else {
        localStorage.removeItem('userData');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('applicationId');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
