export const socialPlatforms = [
  {id:"linkedin",label:"LinkedIn",hosts:["linkedin.com"]},
  {
    "id": "instagram",
    "label": "Instagram",
    "hosts": [
      "instagram.com"
    ]
  },
  {
    "id": "facebook",
    "label": "Facebook",
    "hosts": [
      "facebook.com",
      "fb.com",
      "fb.me"
    ]
  },
  {
    "id": "threads",
    "label": "Threads",
    "hosts": [
      "threads.com",
      "threads.net"
    ]
  },
  {
    "id": "x",
    "label": "X",
    "hosts": [
      "x.com",
      "twitter.com"
    ]
  },
  {
    "id": "bluesky",
    "label": "Bluesky",
    "hosts": [
      "bsky.app"
    ]
  },
  {
    "id": "mastodon",
    "label": "Mastodon",
    "hosts": [
      "mastodon.social",
      "mastodon.online"
    ]
  },
  {
    "id": "snapchat",
    "label": "Snapchat",
    "hosts": [
      "snapchat.com"
    ]
  },
  {
    "id": "pinterest",
    "label": "Pinterest",
    "hosts": [
      "pinterest.com",
      "pin.it"
    ]
  },
  {
    "id": "reddit",
    "label": "Reddit",
    "hosts": [
      "reddit.com",
      "redd.it"
    ]
  },
  {
    "id": "tumblr",
    "label": "Tumblr",
    "hosts": [
      "tumblr.com"
    ]
  },
  {
    "id": "tiktok",
    "label": "TikTok",
    "hosts": [
      "tiktok.com"
    ]
  },
  {
    "id": "youtube",
    "label": "YouTube",
    "hosts": [
      "youtube.com",
      "youtu.be"
    ]
  },
  {
    "id": "twitch",
    "label": "Twitch",
    "hosts": [
      "twitch.tv"
    ]
  },
  {
    "id": "kick",
    "label": "Kick",
    "hosts": [
      "kick.com"
    ]
  },
  {
    "id": "vimeo",
    "label": "Vimeo",
    "hosts": [
      "vimeo.com"
    ]
  },
  {
    "id": "rumble",
    "label": "Rumble",
    "hosts": [
      "rumble.com"
    ]
  },
  {
    "id": "whatsapp",
    "label": "WhatsApp",
    "hosts": [
      "wa.me",
      "whatsapp.com"
    ]
  },
  {
    "id": "messenger",
    "label": "Messenger",
    "hosts": [
      "messenger.com",
      "m.me"
    ]
  },
  {
    "id": "telegram",
    "label": "Telegram",
    "hosts": [
      "t.me",
      "telegram.me"
    ]
  },
  {
    "id": "discord",
    "label": "Discord",
    "hosts": [
      "discord.gg",
      "discord.com"
    ]
  },
  {
    "id": "signal",
    "label": "Signal",
    "hosts": [
      "signal.me",
      "signal.group"
    ]
  },
  {
    "id": "line",
    "label": "LINE",
    "hosts": [
      "line.me",
      "line-apps.com"
    ]
  },
  {
    "id": "behance",
    "label": "Behance",
    "hosts": [
      "behance.net"
    ]
  },
  {
    "id": "dribbble",
    "label": "Dribbble",
    "hosts": [
      "dribbble.com"
    ]
  },
  {
    "id": "github",
    "label": "GitHub",
    "hosts": [
      "github.com"
    ]
  },
  {
    "id": "spotify",
    "label": "Spotify",
    "hosts": [
      "spotify.com"
    ]
  },
  {
    "id": "applemusic",
    "label": "Apple Music",
    "hosts": [
      "music.apple.com"
    ]
  },
  {
    "id": "soundcloud",
    "label": "SoundCloud",
    "hosts": [
      "soundcloud.com"
    ]
  },
  {
    "id": "bandcamp",
    "label": "Bandcamp",
    "hosts": [
      "bandcamp.com"
    ]
  },
  {
    "id": "audiomack",
    "label": "Audiomack",
    "hosts": [
      "audiomack.com"
    ]
  },
  {
    "id": "mixcloud",
    "label": "Mixcloud",
    "hosts": [
      "mixcloud.com"
    ]
  },
  {
    "id": "googlemaps",
    "label": "Google Maps",
    "hosts": [
      "maps.google.com",
      "maps.app.goo.gl",
      "google.com"
    ]
  },
  {
    "id": "yelp",
    "label": "Yelp",
    "hosts": [
      "yelp.com"
    ]
  },
  {
    "id": "tripadvisor",
    "label": "Tripadvisor",
    "hosts": [
      "tripadvisor.com"
    ]
  },
  {
    "id": "patreon",
    "label": "Patreon",
    "hosts": [
      "patreon.com"
    ]
  },
  {
    "id": "substack",
    "label": "Substack",
    "hosts": [
      "substack.com"
    ]
  },
  {
    "id": "medium",
    "label": "Medium",
    "hosts": [
      "medium.com"
    ]
  },
  {
    "id": "kofi",
    "label": "Ko-fi",
    "hosts": [
      "ko-fi.com"
    ]
  },
  {
    "id": "linktree",
    "label": "Linktree",
    "hosts": [
      "linktr.ee"
    ]
  }
];

export function normalizeSocialLinks(input) {
  if (!Array.isArray(input)) return [];
  const links = new Map();
  for (const row of input.slice(0, socialPlatforms.length)) {
    const platform = socialPlatforms.find(item => item.id === row?.id);
    if (!platform || typeof row.url !== 'string' || row.url.length > 1500) continue;
    try {
      const url = new URL(row.url.trim());
      if (url.protocol !== 'https:' || url.username || url.password || url.port) continue;
      if (!platform.hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) continue;
      if (platform.id === 'googlemaps' && ['google.com','www.google.com'].includes(url.hostname) && !url.pathname.startsWith('/maps')) continue;
      links.set(platform.id, {id:platform.id, url:url.href});
    } catch { /* Ignore malformed links. */ }
  }
  return [...links.values()];
}

export function businessSocialLinks(business, features = {}) {
  if (Array.isArray(business?.socialLinks)) return normalizeSocialLinks(business.socialLinks);
  const legacy = [];
  for (const id of ['instagram','facebook','x']) {
    const value = String(business?.[id] || '').trim();
    if (value) legacy.push({id,url:/^https?:/i.test(value)?value.replace(/^http:/i,'https:'):'https://'+id+'.com/'+value.replace(/^@/,'')});
  }
  const whatsapp = String(business?.whatsapp || '').replace(/[^0-9]/g,'');
  if (whatsapp && features.whatsapp !== false) legacy.push({id:'whatsapp',url:'https://wa.me/'+whatsapp});
  return normalizeSocialLinks(legacy);
}
