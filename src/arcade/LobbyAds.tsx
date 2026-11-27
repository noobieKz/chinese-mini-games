import { useEffect, useState, type ReactNode } from 'react';

const isLiveSite =
  import.meta.env.PROD && location.hostname === 'hanplay-classroom.giathe-bk.workers.dev';
const left = import.meta.env.VITE_LOBBY_AD_LEFT_URL ?? (isLiveSite ? '/ads/desktop-left' : '');
const right = import.meta.env.VITE_LOBBY_AD_RIGHT_URL ?? (isLiveSite ? '/ads/desktop-right' : '');
const bottom = import.meta.env.VITE_LOBBY_AD_BOTTOM_URL ?? (isLiveSite ? '/ads/mobile-bottom' : '');
/** In development, empty slots show a placeholder so the layout can be checked without ads. */
const preview = import.meta.env.DEV;

/**
 * PC screens get a 160px banner in each side margin, on the lobby and on every game screen. From
 * 1200×680 up, so common laptops (1280×720, 1366×768) are included and the 600px banner still fits
 * under the top bar.
 */
export const DESKTOP_ADS_QUERY = '(min-width: 1200px) and (min-height: 680px)';
const LEFT = { url: left, width: 160, height: 600 };
const RIGHT = { url: right, width: 160, height: 600 };

function useMedia(query: string, enabled: boolean) {
  const [matches, setMatches] = useState(() => enabled && window.matchMedia(query).matches);
  useEffect(() => {
    if (!enabled) return setMatches(false);
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query, enabled]);
  return matches;
}

/** Whether the two side banners show on this screen. */
export function useDesktopAds(enabled = true) {
  return useMedia(DESKTOP_ADS_QUERY, enabled && ((!!left && !!right) || preview));
}

function Banner({ url, width, height }: { url: string; width: number; height: number }) {
  if (!url)
    return (
      <div className="ad-placeholder" style={{ width, height }} aria-hidden="true">
        Quảng cáo
        <br />
        {width}×{height}
      </div>
    );
  return (
    <iframe
      className="lobby-banner"
      title="Quảng cáo"
      src={url}
      width={width}
      height={height}
      sandbox="allow-scripts allow-popups"
      loading="lazy"
    />
  );
}

/** Lobby: banner, content, banner in one row. */
export function LobbyDesktopAds({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const show = useDesktopAds(enabled);
  if (!show) return children;
  return (
    <div className="lobby-banner-layout">
      <div className="lobby-banner-rail">
        <Banner {...LEFT} />
      </div>
      {children}
      <div className="lobby-banner-rail">
        <Banner {...RIGHT} />
      </div>
    </div>
  );
}

/**
 * Game screens: the two banners sit in the side margins below the top bar. The game itself is
 * narrowed by the `has-ad-rails` class on `.arcade-app` (see arcade.css).
 */
export function GameAdRails() {
  return (
    <>
      <aside className="ad-rail ad-rail-left" aria-label="Quảng cáo">
        <Banner {...LEFT} />
      </aside>
      <aside className="ad-rail ad-rail-right" aria-label="Quảng cáo">
        <Banner {...RIGHT} />
      </aside>
    </>
  );
}

export function LobbyMobileAd({ enabled }: { enabled: boolean }) {
  const show = useMedia('(min-width: 320px) and (max-width: 600px)', enabled && !!bottom);
  if (!show || !bottom) return null;
  return (
    <div className="lobby-banner-bottom">
      <Banner url={bottom} width={320} height={50} />
    </div>
  );
}
