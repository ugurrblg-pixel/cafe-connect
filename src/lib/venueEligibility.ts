/** Hide tea houses and named grill/kokoreç venues, keeping unrelated cafe names. */
export function isExcludedTeaVenue(name: string): boolean {
  const normalized = name.toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return /\b(?:cay\s*(?:evi|evleri|ocagi|ocaklari|bahcesi)|kirathane|kiraathane|kahvehane)(?:si|leri)?\b/.test(normalized)
    || /\b(?:kokorec\w*|izgara\w*)\b/.test(normalized);
}
