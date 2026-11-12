export const musicCategories = ['Music Artist', 'DJ Services'];
export const supportsSiteMusic = category => musicCategories.includes(category);
const musicTemplateSlugs = new Set(['sonido-vivo-artist', 'pulse-dj-services']);
export const siteCanPublishMusic = site => site.design?.templateSlug
  ? musicTemplateSlugs.has(site.design.templateSlug)
  : supportsSiteMusic(site.business?.category);
export const musicFileLimit = 4 * 1024 * 1024;
export const musicTrackLimit = 20;

export function normalizeSiteMusic(value, siteId) {
  const tracks = [];
  const ids = new Set();
  const audioKeys = new Set();
  for (const row of (Array.isArray(value?.tracks) ? value.tracks : []).slice(0, musicTrackLimit)) {
    if (typeof row?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id)) continue;
    const audioKey = row.audioKey;
    const prefix = `sites/${siteId}/music/`;
    if (typeof audioKey !== 'string' || !audioKey.startsWith(prefix) || !/^[a-f0-9-]{36}\.mp3$/.test(audioKey.slice(prefix.length)) || audioKeys.has(audioKey)) continue;
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 120) : '';
    if (!title) continue;
    const coverKey = typeof row.coverKey === 'string' && /^sites\/[^/]+\/[a-zA-Z0-9_.-]+$/.test(row.coverKey) && row.coverKey.startsWith(`sites/${siteId}/`) ? row.coverKey : '';
    tracks.push({id:row.id,title,audioKey,coverKey});
    ids.add(row.id);
    audioKeys.add(audioKey);
  }
  return {tracks, autoplay:value?.autoplay === true, welcomeId:ids.has(value?.welcomeId) ? value.welcomeId : tracks[0]?.id || ''};
}

export function siteAssetUrl(siteId, key) {
  return key ? `/.netlify/functions/client-asset?siteId=${encodeURIComponent(siteId)}&key=${encodeURIComponent(key)}` : '';
}

export function publicSiteMusic(site) {
  const settings = normalizeSiteMusic(siteCanPublishMusic(site) ? site.music : null, site.siteId);
  return {...settings,tracks:settings.tracks.map(({id,title,audioKey,coverKey}) => ({
    id,title,audioUrl:siteAssetUrl(site.siteId,audioKey),coverUrl:siteAssetUrl(site.siteId,coverKey),
  }))};
}
