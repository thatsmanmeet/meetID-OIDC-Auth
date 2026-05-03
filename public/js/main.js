function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
}

function confirmAction(message) {
  return confirm(message || 'Are you sure? This action cannot be undone.');
}

document.addEventListener('DOMContentLoaded', () => {
  const flash = document.querySelector('.flash');
  if (flash) {
    setTimeout(() => {
      flash.style.transition = 'opacity 0.4s';
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 400);
    }, 5000);
  }

  // highlight active nav link — pick the most-specific match only
  const currentPath = window.location.pathname;
  const navLinks = Array.from(document.querySelectorAll('.sidebar-nav a[href]'));
  let bestMatch = null;
  let bestMatchLen = 0;
  for (const link of navLinks) {
    const href = link.getAttribute('href');
    if (!href || href === '/') continue;
    const exact = currentPath === href;
    const prefix = currentPath.startsWith(href + '/');
    if ((exact || prefix) && href.length > bestMatchLen) {
      bestMatch = link;
      bestMatchLen = href.length;
    }
  }
  if (bestMatch) bestMatch.classList.add('active');
});
