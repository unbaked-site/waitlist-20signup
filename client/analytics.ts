// client/analytics.ts
// Client bootstrap: initialize Meta and TikTok pixels and capture ttclid cookie.

function readUrlParam(name: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 30) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}

export function getCookie(name: string) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function loadFacebookSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof (window as any).fbq === 'function') return resolve();
    // wait briefly for the loader to load
    let checks = 0;
    const id = setInterval(() => {
      checks++;
      if (typeof (window as any).fbq === 'function' || checks >= 15) {
        clearInterval(id);
        resolve();
      }
    }, 200);
  });
}

export async function initTikTok(): Promise<void> {
  const tiktokPixelId = (import.meta as any).env?.VITE_TIKTOK_PIXEL_ID;
  if (!tiktokPixelId) return;

  // capture ttclid from URL and save to cookie
  const ttclidParam = readUrlParam('ttclid');
  if (ttclidParam) setCookie('ttclid', ttclidParam, 30);

  if ((window as any).__tiktok_pixel_initialized) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://analytics.tiktok.com/i18n/pixel/sdk.js?sdkid=${encodeURIComponent(tiktokPixelId)}`;
  s.onload = () => {
    try {
      if ((window as any).ttq && typeof (window as any).ttq.page === 'function') {
        (window as any).ttq.page();
      }
    } catch (e) {
      console.warn('TikTok page fire failed', e);
    }
    (window as any).__tiktok_pixel_initialized = true;
  };
  s.onerror = (e) => console.warn('TikTok SDK load failed', e);
  document.head.appendChild(s);
}

export async function initPixels(): Promise<void> {
  // Meta
  const metaPixelId = (import.meta as any).env?.VITE_META_PIXEL_ID;
  try {
    await loadFacebookSdk();
    if (metaPixelId && typeof (window as any).fbq === 'function') {
      if (!(window as any).__meta_pixel_initialized) {
        (window as any).fbq('init', metaPixelId);
        (window as any).fbq('track', 'PageView');
        (window as any).__meta_pixel_initialized = true;
      }
    }
  } catch (err) {
    console.warn('Meta pixel init error', err);
  }

  // TikTok
  try {
    await initTikTok();
  } catch (err) {
    console.warn('TikTok init error', err);
  }
}
