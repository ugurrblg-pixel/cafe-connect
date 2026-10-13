import { expect, it } from 'vitest';
import { venueHeat } from './VenueActivity';
it('only marks genuinely busy venue counts', () => {
  expect(venueHeat(0)).toBeNull(); expect(venueHeat(4)).toBeNull();
  expect(venueHeat(5)).toBe('warm'); expect(venueHeat(9)).toBe('warm');
  expect(venueHeat(10)).toBe('hot'); expect(venueHeat(40)).toBe('hot');
});
