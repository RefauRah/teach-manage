import { API } from './services/api.js';
import { themeManager } from './utils/theme.js';
import { showToast } from './utils/toast.js';
import { showLoading, hideLoading, setButtonLoading } from './utils/loading.js';
import { User } from './types/index.js';

import { renderDashboard } from './views/dashboard.js';
import { renderStudents } from './views/students.js';
import { renderSubjects } from './views/subjects.js';
import { renderSchedules } from './views/schedules.js';
import { renderSessions } from './views/sessions.js';
import { renderRecap } from './views/recap.js';

class Application {
  private currentUser: User | null = null;
  private appLayout = document.getElementById('app')!;
  private authContainer = document.getElementById('auth-container')!;
  private appContent = document.getElementById('app-content')!;

  private routes: Record<string, (container: HTMLElement, navigate: (p: string) => void) => Promise<void>> = {
    '/': renderDashboard,
    '/dashboard': renderDashboard,
    '/students': renderStudents,
    '/subjects': renderSubjects,
    '/schedules': renderSchedules,
    '/sessions': renderSessions,
    '/recap': renderRecap
  };

  init(): void {
    themeManager.init();
    this.setupAuthForms();
    this.setupNavigation();

    if (API.isAuthenticated()) {
      this.currentUser = API.getCurrentUser();
      this.showAppLayout();
      const currentPath = window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
      this.navigate(currentPath);
    } else {
      this.showAuthLayout();
    }
  }

  private showAppLayout(): void {
    this.authContainer.classList.add('hidden');
    this.appLayout.classList.remove('hidden');

    if (this.currentUser) {
      const nameEl = document.getElementById('teacher-name');
      const emailEl = document.getElementById('teacher-email');
      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (emailEl) emailEl.textContent = this.currentUser.email;
    }
  }

  private showAuthLayout(): void {
    this.appLayout.classList.add('hidden');
    this.authContainer.classList.remove('hidden');
  }

  private setupAuthForms(): void {
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const authSubtitle = document.getElementById('auth-subtitle');

    switchToRegister?.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      if (authSubtitle) authSubtitle.textContent = 'Daftar akun baru untuk bimbingan belajar privat';
    });

    switchToLogin?.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      if (authSubtitle) authSubtitle.textContent = 'Masuk untuk mengelola les privat Anda';
    });

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const restore = setButtonLoading(submitBtn, 'Sedang masuk...');
      const email = (document.getElementById('login-email') as HTMLInputElement).value.trim();
      const password = (document.getElementById('login-password') as HTMLInputElement).value;

      try {
        const resp = await API.login(email, password);
        this.currentUser = resp.user;
        showToast(`Selamat datang kembali, ${resp.user.name}!`, 'success');
        this.showAppLayout();
        this.navigate('/dashboard');
      } catch (err: any) {
        showToast(err.message || 'Gagal masuk, periksa email dan password Anda', 'danger');
      } finally {
        restore();
      }
    });

    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const restore = setButtonLoading(submitBtn, 'Mendaftarkan...');
      const name = (document.getElementById('register-name') as HTMLInputElement).value.trim();
      const email = (document.getElementById('register-email') as HTMLInputElement).value.trim();
      const password = (document.getElementById('register-password') as HTMLInputElement).value;

      try {
        const resp = await API.register(name, email, password);
        this.currentUser = resp.user;
        showToast(`Akun Anda berhasil dibuat, selamat datang ${resp.user.name}!`, 'success');
        this.showAppLayout();
        this.navigate('/dashboard');
      } catch (err: any) {
        showToast(err.message || 'Gagal mendaftar', 'danger');
      } finally {
        restore();
      }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar?')) {
        API.logout();
        this.currentUser = null;
        showToast('Anda telah berhasil keluar', 'info');
        this.showAuthLayout();
      }
    });
  }

  private setupNavigation(): void {
    // Intercept clicks on links with data-link
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-link]') as HTMLAnchorElement | null;
      if (target) {
        e.preventDefault();
        const href = target.getAttribute('href') || '/dashboard';
        this.navigate(href);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      if (API.isAuthenticated()) {
        this.navigate(window.location.pathname, false);
      }
    });

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target as Node) && !mobileMenuBtn.contains(e.target as Node)) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  async navigate(path: string, pushHistory = true): Promise<void> {
    const route = this.routes[path] || this.routes['/dashboard'];

    if (pushHistory) {
      window.history.pushState(null, '', path);
    }

    // Update active class in sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === path || (path === '/' && href === '/dashboard')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile sidebar on navigate
    document.querySelector('.sidebar')?.classList.remove('open');

    // Render Route with loading overlay
    showLoading('Memuat halaman...');
    try {
      await route(this.appContent, (p) => this.navigate(p));
    } catch (err) {
      console.error('Route render error:', err);
    } finally {
      hideLoading();
    }
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.init();
});
