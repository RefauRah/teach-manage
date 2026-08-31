import { User } from '../types/index.js';

class ApiService {
  private apiBase = '/api';
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string>)
    };

    let response = await fetch(`${this.apiBase}${url}`, {
      ...options,
      headers
    });

    // Auto Refresh Token Interceptor on 401
    if (response.status === 401 && this.isAuthenticated()) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const newTokens = await this.refresh();
          this.isRefreshing = false;
          this.onTokenRefreshed(newTokens.token);
        } catch (err) {
          this.isRefreshing = false;
          this.logout();
          window.location.reload();
          throw err;
        }
      }

      return new Promise<T>((resolve, reject) => {
        this.subscribeTokenRefresh((token) => {
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${token}`
          };
          fetch(`${this.apiBase}${url}`, {
            ...options,
            headers: retryHeaders
          })
            .then((res) => this.handleResponse<T>(res))
            .then(resolve)
            .catch(reject);
        });
      });
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorData: any;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { error: 'Unknown server error' };
      }
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }

    const contentType = res.headers.get('Content-Type');
    if (contentType && contentType.includes('application/pdf')) {
      return (await res.blob()) as unknown as T;
    }

    return (await res.json()) as T;
  }

  get<T = any>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  post<T = any>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  put<T = any>(url: string, body?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  del<T = any>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  async login(email: string, password: string): Promise<{ token: string; refresh_token: string; user: User }> {
    const data = await this.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async register(name: string, email: string, password: string): Promise<{ token: string; refresh_token: string; user: User }> {
    const data = await this.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async refresh(): Promise<{ token: string; refresh_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${this.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error('Refresh token expired');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export const API = new ApiService();
