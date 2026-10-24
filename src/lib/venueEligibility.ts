/** Hide tea houses, grills, bakeries, markets and çiğköfte venues, keeping unrelated cafe names. */
export function isExcludedTeaVenue(name: string): boolean {
  const normalized = name.toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return /\b(?:cay\s*(?:evi|evleri|ocagi|ocaklari|bahcesi|bachesi)|kirathane|kiraathane|krathane|kraathane|kahvehane)(?:si|leri)?\b/.test(normalized)
    || /\b(?:kokorec\w*|izgara\w*|firin\w*|market\w*|supermarket\w*|cig\s*kofte\w*)\b/.test(normalized);
}
