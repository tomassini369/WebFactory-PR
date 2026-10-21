// Match locale and theme before lazy routes or the application bundle paint.
document.documentElement.lang = 'en';
try {
  var wfInitialLanguage = localStorage.getItem('webfactory-language');
  if (wfInitialLanguage === 'es' || wfInitialLanguage === 'en') document.documentElement.lang = wfInitialLanguage;
} catch (_) { /* Use the platform default when storage is unavailable. */ }
try {
  var wfInitialTheme = localStorage.getItem('webfactory-theme-v2');
  document.documentElement.dataset.wfTheme = wfInitialTheme === 'light' ? 'light' : 'dark';
  if (!/^\/(?:sites|templates)\/[^/]+\/?$/.test(location.pathname)) document.documentElement.dataset.wfPlatformTheme = 'true';
} catch (_) { document.documentElement.dataset.wfTheme = 'dark'; }
