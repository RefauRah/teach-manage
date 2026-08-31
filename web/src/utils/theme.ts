export class ThemeManager {
  private body = document.body;

  init(): void {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleBtnMobile = document.getElementById('theme-toggle-mobile');

    // Default mode is strictly 'light' unless user explicitly chose 'dark'
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const defaultTheme = savedTheme === 'dark' ? 'dark' : 'light';

    this.applyTheme(defaultTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }
    if (themeToggleBtnMobile) {
      themeToggleBtnMobile.addEventListener('click', () => this.toggleTheme());
    }
  }

  applyTheme(theme: 'light' | 'dark'): void {
    if (theme === 'dark') {
      this.body.classList.remove('theme-light');
      this.body.classList.add('theme-dark');
      this.updateIcons('dark');
    } else {
      this.body.classList.remove('theme-dark');
      this.body.classList.add('theme-light');
      this.updateIcons('light');
    }
    localStorage.setItem('theme', theme);
  }

  private updateIcons(theme: 'light' | 'dark'): void {
    const iconClass = theme === 'dark' ? 'fa-sun' : 'fa-moon';
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleBtnMobile = document.getElementById('theme-toggle-mobile');

    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }
    if (themeToggleBtnMobile) {
      themeToggleBtnMobile.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }
  }

  toggleTheme(): void {
    const isDark = this.body.classList.contains('theme-dark');
    this.applyTheme(isDark ? 'light' : 'dark');
  }
}

export const themeManager = new ThemeManager();
