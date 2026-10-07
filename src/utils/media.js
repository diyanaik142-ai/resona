export function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const isCapacitor = window.location.protocol === 'capacitor:' ||
      window.location.origin === 'null' ||
      window.location.origin === 'http://localhost' ||
      window.location.origin === 'https://localhost' ||
      window.location.origin.includes('capacitor');

    if (isCapacitor) return 'https://resona.anchorlyhms.com';
    if (window.location.hostname === 'localhost' && window.location.port !== '') {
      return 'http://localhost:8080';
    }
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://resona.anchorlyhms.com';
}

export function resolveMediaUrl(url) {
  const fallbackUrl = '/branding/resona-icon.png';
  if (!url || typeof url !== 'string') return fallbackUrl;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (/^(?:file|filesystem):/i.test(url)) return fallbackUrl;
  const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(url);
  if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^https?:\/\//i.test(url) && !isWindowsPath) return fallbackUrl;

  let pathname = url;
  let absoluteUrl = null;
  try {
    if (/^https?:\/\//i.test(url)) {
      absoluteUrl = new URL(url);
      pathname = absoluteUrl.pathname;
    }
  } catch {
    return fallbackUrl;
  }

  pathname = pathname.replace(/\\/g, '/');
  const profilePath = pathname.match(/(?:^|\/)(?:(?:server\/)?data\/|opt\/resona\/)?media\/profiles\/([^/]+)$/);
  if (profilePath) pathname = `/media/profiles/${profilePath[1]}`;
  const bareProfilePath = pathname.match(/^\/media\/(usr_[^/]+)$/);
  if (bareProfilePath) pathname = `/media/profiles/${bareProfilePath[1]}`;
  if (pathname.startsWith('/media/cover-') || pathname.startsWith('/media/audio-')) {
    pathname = pathname.replace('/media/', '/media/catalog/');
  }
  if (pathname.startsWith('media/')) pathname = `/${pathname}`;

  if (absoluteUrl && ['localhost', '127.0.0.1', '::1'].includes(absoluteUrl.hostname)) {
    return pathname.startsWith('/media/') ? `${getApiBaseUrl()}${pathname}` : fallbackUrl;
  }
  if (absoluteUrl) {
    absoluteUrl.pathname = pathname;
    return absoluteUrl.href;
  }
  if (pathname.startsWith('/media/')) return `${getApiBaseUrl()}${pathname}`;
  if ((isWindowsPath && !profilePath) || pathname.startsWith('/opt/') || pathname.startsWith('/data/')) {
    return fallbackUrl;
  }
  return url;
}
