(function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleBtnMobile = document.getElementById('theme-toggle-mobile');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            updateIcons('dark');
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            updateIcons('light');
        }
        localStorage.setItem('theme', theme);
    }

    function updateIcons(theme) {
        const iconClass = theme === 'dark' ? 'fa-sun' : 'fa-moon';
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }
        if (themeToggleBtnMobile) {
            themeToggleBtnMobile.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const defaultTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        applyTheme(defaultTheme);
    }

    function toggleTheme() {
        const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    if (themeToggleBtnMobile) themeToggleBtnMobile.addEventListener('click', toggleTheme);

    // Initial theme setup on load
    document.addEventListener('DOMContentLoaded', initTheme);
})();
