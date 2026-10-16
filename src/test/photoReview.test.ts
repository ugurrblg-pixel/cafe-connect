import { describe, expect, it } from 'vitest';
import { photoVerdict } from '../../supabase/functions/moderate-photo/policy';
const clean = { flagged: false, categories: { sexual: false, violence: false, 'violence/graphic': false, 'self-harm': false, 'self-harm/intent': false, 'self-harm/instructions': false } };
describe('photo review decisions', () => {
 it('accepts only a complete successful provider result', () => expect(photoVerdict(clean)).toBe('accepted'));
 it.each(['sexual', 'violence/graphic', 'self-harm'])('rejects %s even if the summary flag is false', key => expect(photoVerdict({...clean,categories:{...clean.categories,[key]:true}})).toBe('rejected'));
 it.each([undefined, {}, {flagged:false}, {flagged:false,categories:{sexual:false}}, {flagged:'false',categories:clean.categories}])('does not approve incomplete responses', value => expect(photoVerdict(value)).toBe('pending'));
});
