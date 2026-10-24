import { describe, it, expect } from 'vitest';
import { isExcludedTeaVenue } from './venueEligibility';

describe('tea venue descriptions', () => {
  it.each(['Ali Çay Ocağı', 'ÇAY EVİ', 'Çayevi', 'Merkez Kıraathanesi', 'Kırathane', 'Çay Bahçesi', 'KOKOREÇ', 'Kokoreççi Ali', 'Öz Izgara', 'IZGARA SALONU', 'Köz Izgarası', 'Yeşil Darıca Fırını', 'FIRIN', 'Ova büfe mini market', 'Süpermarket', 'Çiğköfteci Ömer Usta', 'ÇİĞ KÖFTE', 'Cigkofte' ])('excludes %s', name => {
    expect(isExcludedTeaVenue(name)).toBe(true);
  });
  it.each(['Çaylı Coffee', 'Çaykur Cafe', 'Pizza Coffee', 'Kahve Dünyası'])('keeps %s', name => {
    expect(isExcludedTeaVenue(name)).toBe(false);
  });
});
