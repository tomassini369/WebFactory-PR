export function isTeamPhotoKey(siteId, key) {
  return typeof key === 'string' && key.startsWith(`sites/${siteId}/team/`) &&
    /^[a-f0-9-]{36}\.webp$/.test(key.slice(`sites/${siteId}/team/`.length));
}

export function teamPhotoUrl(siteId, key) {
  return isTeamPhotoKey(siteId, key)
    ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(key)}`
    : '';
}
