export function isLikelyIPad() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const touch = navigator.maxTouchPoints || 0;
  return /iPad/i.test(ua) || (platform === 'MacIntel' && touch > 1);
}
