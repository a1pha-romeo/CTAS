import { login } from './auth.js';
import { showToast } from './toast.js';

let selectedRole = 'admin';

document.addEventListener('DOMContentLoaded', () => {
  const roleCards = document.querySelectorAll('.role-card');
  const roleTitle = document.getElementById('selected-role-title');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  // Role card click handler
  roleCards.forEach(card => {
    card.addEventListener('click', () => {
      roleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedRole = card.getAttribute('data-role');
      if (roleTitle) {
        roleTitle.textContent = `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Portal Login`;
      }
    });
  });

  // Demo credential autofill helpers
  const demoButtons = document.querySelectorAll('[data-demo-creds]');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const [u, p, r] = btn.getAttribute('data-demo-creds').split(':');
      if (usernameInput) usernameInput.value = u;
      if (passwordInput) passwordInput.value = p;
      if (r) {
        selectedRole = r;
        roleCards.forEach(c => {
          if (c.getAttribute('data-role') === r) {
            c.classList.add('active');
          } else {
            c.classList.remove('active');
          }
        });
        if (roleTitle) {
          roleTitle.textContent = `${r.charAt(0).toUpperCase() + r.slice(1)} Portal Login`;
        }
      }
      showToast(`Filled credentials for ${r}`, 'info');
    });
  });

  // Form submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = usernameInput?.value.trim();
      const password = passwordInput?.value;

      if (!username || !password) {
        showToast('Please provide both username and password', 'warning');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';
      }

      try {
        await login(username, password, selectedRole);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Portal';
        }
      }
    });
  }
});
