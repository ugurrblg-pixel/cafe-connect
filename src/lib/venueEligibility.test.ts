import { describe, it, expect } from 'vitest';
import { isExcludedTeaVenue } from './venueEligibility';

describe('tea venue descriptions', () => {
  it.each(['Ali Çay Ocağı', 'ÇAY EVİ', 'Çayevi', 'Merkez Kıraathanesi', 'Kırathane', 'Çay Bahçesi'])('excludes %s', name => {
    expect(isExcludedTeaVenue(name)).toBe(true);
  });
  it.each(['Çaylı Coffee', 'Çaykur Cafe', 'Pizza Coffee', 'Kahve Dünyası'])('keeps %s', name => {
    expect(isExcludedTeaVenue(name)).toBe(false);
  });
});
