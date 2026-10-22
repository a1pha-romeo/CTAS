// Theme Toggle Manager (persists to localStorage)
(function initTheme() {
  const savedTheme = localStorage.getItem('ctas_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ctas_theme', next);
  updateThemeIcon(next);
  return next;
}

export function updateThemeIcon(theme) {
  const iconSpan = document.getElementById('theme-icon');
  if (iconSpan) {
    iconSpan.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(current);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
});

export default { toggleTheme };
