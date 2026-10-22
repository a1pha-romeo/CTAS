import { apiRequest } from './api.js';
import { showToast } from './toast.js';

export async function login(username, password, role) {
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username, password, role }
    });

    showToast(`Welcome, ${data.user.fullName || data.user.username}!`, 'success');

    // Route to actual user role dashboard
    const targetRole = data?.user?.role || role || 'admin';
    setTimeout(() => {
      if (targetRole === 'admin') window.location.href = '/admin/';
      else if (targetRole === 'faculty') window.location.href = '/faculty/';
      else if (targetRole === 'student') window.location.href = '/student/';
      else window.location.href = '/';
    }, 350);

    return data;
  } catch (err) {
    // Error is toasted automatically by apiRequest
    return null;
  }
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', showErrorToast: false });
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 200);
  } catch (err) {
    window.location.href = '/';
  }
}

export async function getCurrentUser() {
  try {
    const res = await apiRequest('/api/auth/me', { showErrorToast: false });
    return res.user;
  } catch {
    return null;
  }
}

export async function checkSession(expectedRole) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/#login';
    return null;
  }

  // Cross-role guard: allow admin everywhere, but restrict faculty & students
  if (expectedRole && user.role !== expectedRole && user.role !== 'admin') {
    showToast(`Access denied: Your account role is '${user.role}'`, 'error');
    setTimeout(() => {
      window.location.href = `/${user.role}/`;
    }, 600);
    return null;
  }

  // Populate header user badge if present
  const userDisplay = document.getElementById('user-display-name');
  if (userDisplay) {
    userDisplay.textContent = user.full_name || user.username;
  }

  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    roleBadge.textContent = user.role.toUpperCase();
  }

  return user;
}

export async function changePassword(currentPassword, newPassword) {
  return await apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword }
  });
}

export default {
  login,
  logout,
  getCurrentUser,
  checkSession,
  changePassword
};
