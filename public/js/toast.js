// Animated Toast System
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="color:inherit;opacity:0.8;font-size:1.1rem;line-height:1;" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  };

  closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return toast;
}

export default showToast;
