export function normalizeProfileAvatar(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  if (/^(blob:|data:|file:)/i.test(raw)) return null;

  let pathname = raw.replace(/\\/g, '/');
  let absolute = null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      absolute = new URL(raw);
      pathname = absolute.pathname;
    } catch {
      return null;
    }
  }

  const profilePath = pathname.match(/(?:^|\/)(?:(?:server\/)?data\/|opt\/resona\/)?media\/profiles\/([^/]+)$/);
  const bareProfilePath = pathname.match(/^\/media\/(usr_[^/]+)$/);
  const filename = profilePath?.[1] || bareProfilePath?.[1];
  if (filename) {
    if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename === '.' || filename === '..') return null;
    return `/media/profiles/${filename}`;
  }

  if (absolute && !['localhost', '127.0.0.1', '::1'].includes(absolute.hostname)) {
    return absolute.href;
  }
  return null;
}
