jest.mock('../../config/database');

import { query } from '../../config/database';
import {
  buildBlurbPrompt,
  parseBlurbResponse,
  BlindDateService,
} from '../../services/blindDateService';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRows = (rows: any[]) =>
  ({ rows, rowCount: rows.length, command: '', oid: 0, fields: [] }) as any;

describe('buildBlurbPrompt', () => {
  it('includes all fields when provided', () => {
    const prompt = buildBlurbPrompt(
      'The Haunting',
      'Shirley Jackson',
      'A chilling tale of a haunted house.',
      ['Gothic', 'Psychological'],
      'Slow Burn',
      246
    );
    expect(prompt).toContain('Sub-genres: Gothic, Psychological');
    expect(prompt).toContain('Pacing: Slow Burn');
    expect(prompt).toContain('Page count: 246');
    expect(prompt).toContain('A chilling tale of a haunted house.');
  });

  it('omits description when null', () => {
    const prompt = buildBlurbPrompt('Test', 'Author', null, ['Gothic'], 'Moderate', 200);
    expect(prompt).not.toContain('Description');
  });

  it('omits subgenres when null', () => {
    const prompt = buildBlurbPrompt('Test', 'Author', 'desc', null, 'Moderate', 200);
    expect(prompt).not.toContain('Sub-genres');
  });

  it('omits pacing when null', () => {
    const prompt = buildBlurbPrompt('Test', 'Author', 'desc', ['Gothic'], null, 200);
    expect(prompt).not.toContain('Pacing');
  });

  it('omits page count when null', () => {
    const prompt = buildBlurbPrompt('Test', 'Author', 'desc', ['Gothic'], 'Moderate', null);
    expect(prompt).not.toContain('Page count');
  });

  it('omits page count when zero', () => {
    const prompt = buildBlurbPrompt('Test', 'Author', 'desc', ['Gothic'], 'Moderate', 0);
    expect(prompt).not.toContain('Page count');
  });

  it('includes title and author in the DO NOT reveal instruction', () => {
    const prompt = buildBlurbPrompt('The Shining', 'Stephen King', null, null, null, null);
    expect(prompt).toContain('"The Shining"');
    expect(prompt).toContain('"Stephen King"');
    expect(prompt).toContain('Do NOT mention');
  });

  it('handles all null optional fields gracefully', () => {
    const prompt = buildBlurbPrompt('Title', 'Author', null, null, null, null);
    expect(prompt).toContain('Secondhand Spooks');
    expect(prompt).toContain('Blind Date with a Book');
    expect(prompt).not.toContain('Sub-genres');
    expect(prompt).not.toContain('Pacing');
    expect(prompt).not.toContain('Page count');
    expect(prompt).not.toContain('Description');
  });
});

describe('parseBlurbResponse', () => {
  it('extracts blurb from valid JSON', () => {
    const result = parseBlurbResponse('{"blurb": "A dark and mysterious tale..."}');
    expect(result).toBe('A dark and mysterious tale...');
  });

  it('trims whitespace from blurb', () => {
    const result = parseBlurbResponse('{"blurb": "  A dark tale.  "}');
    expect(result).toBe('A dark tale.');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBlurbResponse('not json')).toThrow();
  });

  it('throws on missing blurb field', () => {
    expect(() => parseBlurbResponse('{"text": "something"}')).toThrow('Gemini response missing valid blurb field');
  });

  it('throws on empty blurb string', () => {
    expect(() => parseBlurbResponse('{"blurb": ""}')).toThrow('Gemini response missing valid blurb field');
  });

  it('throws on whitespace-only blurb', () => {
    expect(() => parseBlurbResponse('{"blurb": "   "}')).toThrow('Gemini response missing valid blurb field');
  });

  it('throws on non-string blurb', () => {
    expect(() => parseBlurbResponse('{"blurb": 123}')).toThrow('Gemini response missing valid blurb field');
  });
});

describe('BlindDateService', () => {
  let service: BlindDateService;
  const origEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...origEnv, GOOGLE_BOOKS_API_KEY: 'test-key' };
    service = new BlindDateService();
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when API key is not set', () => {
      process.env = { ...origEnv };
      delete process.env.GOOGLE_BOOKS_API_KEY;
      const svc = new BlindDateService();
      expect(svc.isConfigured()).toBe(false);
    });

    it('returns false when API key is empty string', () => {
      process.env = { ...origEnv, GOOGLE_BOOKS_API_KEY: '' };
      const svc = new BlindDateService();
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('generateBlurb', () => {
    it('returns error when book not found', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));
      const result = await service.generateBlurb(999);
      expect(result).toEqual({
        book_id: 999,
        book_title: 'Unknown',
        status: 'error',
        error: 'Book not found',
      });
    });

    it('returns error when API key not configured', async () => {
      process.env = { ...origEnv };
      delete process.env.GOOGLE_BOOKS_API_KEY;
      const svc = new BlindDateService();
      mockQuery.mockResolvedValueOnce(mockRows([{
        id: 1,
        book_title: 'Test Book',
        author_fullname: 'Author',
        description: 'A test',
        subgenres: ['Gothic'],
        pacing: 'Moderate',
        page_count: '200',
      }]));
      const result = await svc.generateBlurb(1);
      expect(result.status).toBe('error');
      expect(result.error).toContain('not configured');
    });
  });

  describe('getCandidates', () => {
    it('returns candidate books from query', async () => {
      const books = [
        { id: 1, book_title: 'Book A', condition: 'Like New' },
        { id: 2, book_title: 'Book B', condition: 'Very Good' },
      ];
      mockQuery.mockResolvedValueOnce(mockRows(books));
      const result = await service.getCandidates(10);
      expect(result).toEqual(books);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('Like New'),
        [10]
      );
    });
  });

  describe('getBatchProgress', () => {
    it('returns null when no batch has run', () => {
      expect(service.getBatchProgress()).toBeNull();
    });
  });

  describe('startBatchBlurbGeneration', () => {
    it('sets empty progress when no books need blurbs', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([]));
      await service.startBatchBlurbGeneration(10);
      const progress = service.getBatchProgress();
      expect(progress).toEqual({
        total: 0,
        processed: 0,
        succeeded: 0,
        errors: 0,
        is_running: false,
        results: [],
      });
    });

    it('throws when batch is already running', async () => {
      mockQuery.mockResolvedValueOnce(mockRows([{ id: 1, book_title: 'Test', author_fullname: 'Author' }]));
      // Mock generateBlurb dependencies: the book query + the Gemini API call will hang
      mockQuery.mockResolvedValue(mockRows([{
        id: 1, book_title: 'Test', author_fullname: 'Author',
        description: null, subgenres: null, pacing: null, page_count: null,
      }]));

      // Start the batch (don't await it, it runs in background)
      const startPromise = service.startBatchBlurbGeneration(1);
      await startPromise; // This starts the background task

      // Now try to start another
      mockQuery.mockResolvedValueOnce(mockRows([{ id: 2, book_title: 'Test2', author_fullname: 'Author2' }]));
      await expect(service.startBatchBlurbGeneration(1)).rejects.toThrow('already running');
    });
  });

  describe('cancelBatchGeneration', () => {
    it('does not throw when called without a running batch', () => {
      expect(() => service.cancelBatchGeneration()).not.toThrow();
    });
  });

  describe('batch processing with mocked fetch', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('processes a batch and updates progress on success', async () => {
      // Mock the initial query for books needing blurbs
      mockQuery.mockResolvedValueOnce(mockRows([
        { id: 1, book_title: 'Book One', author_fullname: 'Author A' },
      ]));

      // Mock the generateBlurb book lookup
      mockQuery.mockResolvedValueOnce(mockRows([{
        id: 1, book_title: 'Book One', author_fullname: 'Author A',
        description: 'A spooky tale', subgenres: ['Gothic'], pacing: 'Slow Burn', page_count: '200',
      }]));

      // Mock the Gemini API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"blurb": "A mysterious book awaits..."}' }] } }],
        }),
      }) as any;

      // Mock the blurb update query
      mockQuery.mockResolvedValueOnce(mockRows([]));

      await service.startBatchBlurbGeneration(1);

      // Wait for the background batch to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const progress = service.getBatchProgress();
      expect(progress?.processed).toBe(1);
      expect(progress?.succeeded).toBe(1);
      expect(progress?.errors).toBe(0);
      expect(progress?.is_running).toBe(false);
    });

    it('processes multiple books with rate limiting between them', async () => {
      // Mock the initial query for books needing blurbs (2 books)
      mockQuery.mockResolvedValueOnce(mockRows([
        { id: 1, book_title: 'Book One', author_fullname: 'Author A' },
        { id: 2, book_title: 'Book Two', author_fullname: 'Author B' },
      ]));

      // Mock generateBlurb book lookups for both books
      mockQuery
        .mockResolvedValueOnce(mockRows([{
          id: 1, book_title: 'Book One', author_fullname: 'Author A',
          description: null, subgenres: null, pacing: null, page_count: null,
        }]))
        .mockResolvedValueOnce(mockRows([])) // blurb update
        .mockResolvedValueOnce(mockRows([{
          id: 2, book_title: 'Book Two', author_fullname: 'Author B',
          description: null, subgenres: null, pacing: null, page_count: null,
        }]))
        .mockResolvedValueOnce(mockRows([])); // blurb update

      // Mock Gemini API success
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"blurb": "Mystery awaits..."}' }] } }],
        }),
      }) as any;

      await service.startBatchBlurbGeneration(2);

      // Wait for the background batch to complete (includes 500ms rate limit between books)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const progress = service.getBatchProgress();
      expect(progress?.processed).toBe(2);
      expect(progress?.succeeded).toBe(2);
      expect(progress?.is_running).toBe(false);
    });

    it('handles API errors in batch and records them', async () => {
      // Mock the initial query for books needing blurbs
      mockQuery.mockResolvedValueOnce(mockRows([
        { id: 1, book_title: 'Book One', author_fullname: 'Author A' },
      ]));

      // Mock the generateBlurb book lookup
      mockQuery.mockResolvedValueOnce(mockRows([{
        id: 1, book_title: 'Book One', author_fullname: 'Author A',
        description: null, subgenres: null, pacing: null, page_count: null,
      }]));

      // Mock Gemini API failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }) as any;

      await service.startBatchBlurbGeneration(1);

      // Wait for the background batch to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const progress = service.getBatchProgress();
      expect(progress?.processed).toBe(1);
      expect(progress?.succeeded).toBe(0);
      expect(progress?.errors).toBe(1);
      expect(progress?.is_running).toBe(false);
    });
  });
});
