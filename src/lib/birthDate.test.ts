import { expect, it } from 'vitest';
import { adultBirthDate, latestAdultBirthDate } from './birthDate';
it('accepts the eighteenth birthday but rejects the following birth date',()=>{
 const today=new Date('2026-10-10T12:00:00Z');
 expect(adultBirthDate('2008-10-10',today)).toBe(true);
 expect(adultBirthDate('2008-10-11',today)).toBe(false);
});
it('rejects impossible, missing, malformed, and future dates',()=>{
 const today=new Date('2026-10-10T12:00:00Z');
 for(const value of ['', 'invalid', '2000-02-30', '2001-02-29','2000-13-01','2030-01-01']) expect(adultBirthDate(value,today)).toBe(false);
 expect(adultBirthDate('2000-02-29',today)).toBe(true);
});
it('does not normalize the maximum leap-day input into March',()=>{
 expect(latestAdultBirthDate(new Date('2024-02-29T23:00:00Z'))).toBe('2006-02-28');
});
