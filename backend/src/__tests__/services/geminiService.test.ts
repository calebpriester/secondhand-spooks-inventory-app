import {
  filterValidSubgenres,
  enforceOtherRule,
  validatePacing,
  parseGeminiResponse,
  PACING_OPTIONS,
} from '../../services/geminiService';

const ALLOWED = [
  'Supernatural', 'Vampire', 'Occult/Demonic', 'Psychological',
  'Creature Feature', 'Slasher/Survival', 'Gothic', 'Body Horror',
  'Apocalyptic', 'Dark Fantasy', 'Cosmic Horror', 'Thriller/Suspense',
  'Splatterpunk', 'Small Town Horror', 'Paranormal Romance',
  'True Crime/Nonfiction', 'Anthology/Collection', 'Humor/Satire', 'Other',
];

describe('filterValidSubgenres', () => {
  it('keeps only sub-genres that are in the allowed list', () => {
    expect(filterValidSubgenres(['Gothic', 'Vampire'], ALLOWED)).toEqual(['Gothic', 'Vampire']);
  });

  it('removes invalid sub-genres', () => {
    expect(filterValidSubgenres(['Gothic', 'Sci-Fi', 'Vampire'], ALLOWED)).toEqual(['Gothic', 'Vampire']);
  });

  it('returns empty array when none are valid', () => {
    expect(filterValidSubgenres(['Romance', 'Western'], ALLOWED)).toEqual([]);
  });

  it('handles empty input', () => {
    expect(filterValidSubgenres([], ALLOWED)).toEqual([]);
  });
});

describe('enforceOtherRule', () => {
  it('keeps "Other" when it is the only tag', () => {
    expect(enforceOtherRule(['Other'])).toEqual(['Other']);
  });

  it('drops "Other" when paired with another tag', () => {
    expect(enforceOtherRule(['Other', 'Gothic'])).toEqual(['Gothic']);
  });

  it('drops "Other" when paired with multiple tags', () => {
    expect(enforceOtherRule(['Vampire', 'Other', 'Gothic'])).toEqual(['Vampire', 'Gothic']);
  });

  it('does not modify array without "Other"', () => {
    expect(enforceOtherRule(['Gothic', 'Vampire'])).toEqual(['Gothic', 'Vampire']);
  });

  it('handles single non-Other tag', () => {
    expect(enforceOtherRule(['Gothic'])).toEqual(['Gothic']);
  });

  it('handles empty array', () => {
    expect(enforceOtherRule([])).toEqual([]);
  });
});

describe('validatePacing', () => {
  it.each(PACING_OPTIONS)('accepts valid pacing value: %s', (pacing) => {
    expect(validatePacing(pacing)).toBe(pacing);
  });

  it('defaults to "Moderate" for invalid value', () => {
    expect(validatePacing('Super Fast')).toBe('Moderate');
  });

  it('defaults to "Moderate" for empty string', () => {
    expect(validatePacing('')).toBe('Moderate');
  });

  it('is case-sensitive', () => {
    expect(validatePacing('slow burn')).toBe('Moderate');
  });
});

describe('parseGeminiResponse', () => {
  it('parses valid response with sub-genres and pacing', () => {
    const json = JSON.stringify({ subgenres: ['Gothic', 'Vampire'], pacing: 'Slow Burn' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Gothic', 'Vampire'], pacing: 'Slow Burn' });
  });

  it('filters out invalid sub-genres from response', () => {
    const json = JSON.stringify({ subgenres: ['Gothic', 'Sci-Fi'], pacing: 'Fast-Paced' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Gothic'], pacing: 'Fast-Paced' });
  });

  it('enforces Other rule in parsed response', () => {
    const json = JSON.stringify({ subgenres: ['Other', 'Vampire'], pacing: 'Moderate' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Vampire'], pacing: 'Moderate' });
  });

  it('keeps Other when it is the only tag', () => {
    const json = JSON.stringify({ subgenres: ['Other'], pacing: 'Moderate' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Other'], pacing: 'Moderate' });
  });

  it('defaults pacing to Moderate for invalid value', () => {
    const json = JSON.stringify({ subgenres: ['Gothic'], pacing: 'Lightning' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Gothic'], pacing: 'Moderate' });
  });

  it('handles missing subgenres field', () => {
    const json = JSON.stringify({ pacing: 'Slow Burn' });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: [], pacing: 'Slow Burn' });
  });

  it('handles missing pacing field', () => {
    const json = JSON.stringify({ subgenres: ['Gothic'] });
    const result = parseGeminiResponse(json, ALLOWED);
    expect(result).toEqual({ subgenres: ['Gothic'], pacing: 'Moderate' });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseGeminiResponse('not json', ALLOWED)).toThrow();
  });
});
