const API = (() => {
    const API_BASE = '/api';
    
    let isRefreshing = false;
    let refreshSubscribers = [];

    function subscribeTokenRefresh(cb) {
        refreshSubscribers.push(cb);
    }

    function onTokenRefreshed(token) {
        refreshSubscribers.map(cb => cb(token));
        refreshSubscribers = [];
    }

    function getHeaders() {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async function request(url, options = {}) {
        options.headers = {
            ...getHeaders(),
            ...options.headers
        };

        let response = await fetch(`${API_BASE}${url}`, options);

        // Auto Refresh Token Interceptor on 401
        if (response.status === 401 && isAuthenticated()) {
            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const newTokens = await refresh();
                    isRefreshing = false;
                    onTokenRefreshed(newTokens.token);
                } catch (err) {
                    isRefreshing = false;
                    logout();
                    window.location.reload();
                    return response;
                }
            }

            const retryOriginalRequest = new Promise((resolve) => {
                subscribeTokenRefresh((token) => {
                    options.headers['Authorization'] = `Bearer ${token}`;
                    resolve(fetch(`${API_BASE}${url}`, options));
                });
            });

            return retryOriginalRequest;
        }

        return response;
    }

    async function get(url) {
        const res = await request(url, { method: 'GET' });
        return handleResponse(res);
    }

    async function post(url, body) {
        const res = await request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        return handleResponse(res);
    }

    async function put(url, body) {
        const res = await request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        return handleResponse(res);
    }

    async function del(url) {
        const res = await request(url, { method: 'DELETE' });
        return handleResponse(res);
    }

    async function handleResponse(res) {
        if (!res.ok) {
            let errorData;
            try {
                errorData = await res.json();
            } catch (e) {
                errorData = { error: 'Unknown server error' };
            }
            throw new Error(errorData.error || 'Request failed');
        }
        
        // For downloads (PDF)
        const contentType = res.headers.get('Content-Type');
        if (contentType && contentType.includes('application/pdf')) {
            return res.blob();
        }

        return res.json();
    }

    // Authentication Helper Methods
    async function login(email, password) {
        const data = await post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    }

    async function register(name, email, password) {
        const data = await post('/auth/register', { name, email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    }

    async function refresh() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            throw new Error('Refresh expired');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return data;
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    function isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    function getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    return {
        get,
        post,
        put,
        del,
        login,
        register,
        logout,
        isAuthenticated,
        getCurrentUser
    };
})();
