// Match the saved platform theme before the application bundle paints.
try {
  var wfInitialTheme = localStorage.getItem('webfactory-theme-v2');
  document.documentElement.dataset.wfTheme = wfInitialTheme === 'light' ? 'light' : 'dark';
  if (!/^\/(?:sites|templates)\/[^/]+\/?$/.test(location.pathname)) document.documentElement.dataset.wfPlatformTheme = 'true';
} catch (_) { document.documentElement.dataset.wfTheme = 'dark'; }
