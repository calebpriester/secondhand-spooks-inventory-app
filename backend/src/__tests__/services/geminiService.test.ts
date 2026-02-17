jest.mock('../../config/database');

import { query } from '../../config/database';
import {
  filterValidSubgenres,
  enforceOtherRule,
  validatePacing,
  parseGeminiResponse,
  PACING_OPTIONS,
} from '../../services/geminiService';
import { GeminiService } from '../../services/geminiService';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRows = (rows: any[]) =>
  ({ rows, rowCount: rows.length, command: '', oid: 0, fields: [] }) as any;

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

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';
    service = new GeminiService();
  });

  afterEach(() => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when API key is empty', () => {
      process.env.GOOGLE_BOOKS_API_KEY = '';
      const s = new GeminiService();
      expect(s.isConfigured()).toBe(false);
    });

    it('returns false when API key is not set', () => {
      delete process.env.GOOGLE_BOOKS_API_KEY;
      const s = new GeminiService();
      expect(s.isConfigured()).toBe(false);
    });
  });

  describe('tagBook', () => {
    it('returns error when book is not found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));

      const result = await service.tagBook(999);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Book not found');
    });

    it('returns error when no sub-genre options are configured', async () => {
      mockQuery
        .mockResolvedValueOnce(mockRows([{ id: 1, book_title: 'Test', author_fullname: 'Author', description: null, genres: null, subgenres: null }]))
        .mockResolvedValueOnce(mockRows([])); // empty subgenre_options

      const result = await service.tagBook(1);

      expect(result.status).toBe('error');
      expect(result.error).toBe('No sub-genre options configured');
    });
  });

  describe('getTaggingStats', () => {
    it('returns tag counts from database', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{
        total_books: '682',
        tagged_count: '100',
        untagged_count: '582',
      }]));

      const stats = await service.getTaggingStats();

      expect(stats.total_books).toBe('682');
      expect(stats.tagged_count).toBe('100');
      expect(stats.untagged_count).toBe('582');
    });
  });

  describe('getBatchProgress', () => {
    it('returns null when no batch has run', () => {
      expect(service.getBatchProgress()).toBeNull();
    });
  });

  describe('startBatchTagging', () => {
    it('sets empty progress when no untagged books exist', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([])); // no untagged books

      await service.startBatchTagging(5);

      const progress = service.getBatchProgress();
      expect(progress).not.toBeNull();
      expect(progress!.total).toBe(0);
      expect(progress!.is_running).toBe(false);
    });

    it('throws when batch is already running', async () => {
      // Start a batch with books that will take a while
      mockQuery.mockResolvedValueOnce(mockRows([{ id: 1, book_title: 'Test', author_fullname: 'Author' }]));
      await service.startBatchTagging(1);

      await expect(service.startBatchTagging(1)).rejects.toThrow('Batch tagging is already running');

      // Clean up
      service.cancelBatchTagging();
    });
  });

  describe('cancelBatchTagging', () => {
    it('sets is_running to false', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ id: 1, book_title: 'Test', author_fullname: 'Author' }]));
      await service.startBatchTagging(1);

      service.cancelBatchTagging();

      // Give a tick for the batch to see the abort
      await new Promise(resolve => setTimeout(resolve, 10));
      const progress = service.getBatchProgress();
      expect(progress!.is_running).toBe(false);
    });
  });
});
