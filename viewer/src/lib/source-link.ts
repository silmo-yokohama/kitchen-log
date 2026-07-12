// 出典URLの表示・埋め込み用ヘルパー

/** リンクラベル用のドメイン（www.を除いたhostname） */
export function extractDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** YouTubeの動画ID。YouTube以外・解釈不能なURLは null */
export function extractYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    return parsed.pathname.slice(1).split('/')[0] || null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
    const embedded = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/);
    if (embedded) return embedded[1];
  }
  return null;
}
