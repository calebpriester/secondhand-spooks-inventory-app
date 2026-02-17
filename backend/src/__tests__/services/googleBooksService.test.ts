import {
  normalizeStr,
  scoreResult,
  extractEnrichmentFromItem,
  pickBestMatch,
} from '../../services/googleBooksService';

// Helper to build a mock Google Books API item
function makeItem(overrides: {
  id?: string;
  title?: string;
  authors?: string[];
  language?: string;
  imageLinks?: any;
  description?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  publisher?: string;
  publishedDate?: string;
  industryIdentifiers?: any[];
} = {}) {
  return {
    id: overrides.id || 'test-id',
    volumeInfo: {
      title: overrides.title || 'Test Book',
      authors: overrides.authors || ['Test Author'],
      language: overrides.language || 'en',
      imageLinks: overrides.imageLinks,
      description: overrides.description,
      pageCount: overrides.pageCount,
      categories: overrides.categories,
      averageRating: overrides.averageRating,
      ratingsCount: overrides.ratingsCount,
      publisher: overrides.publisher,
      publishedDate: overrides.publishedDate,
      industryIdentifiers: overrides.industryIdentifiers,
    },
  };
}

describe('normalizeStr', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeStr('R.L. Stine')).toBe('rl stine');
  });

  it('preserves numbers', () => {
    expect(normalizeStr('Goosebumps #27')).toBe('goosebumps 27');
  });

  it('trims whitespace', () => {
    expect(normalizeStr('  hello  ')).toBe('hello');
  });
});

describe('scoreResult', () => {
  it('scores exact title + exact author match', () => {
    const item = makeItem({ title: 'The Shining', authors: ['Stephen King'] });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(20);
  });

  it('adds bonus for cover image', () => {
    const item = makeItem({
      title: 'The Shining',
      authors: ['Stephen King'],
      imageLinks: { thumbnail: 'http://example.com/cover.jpg' },
    });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(25);
  });

  it('adds bonus for description', () => {
    const item = makeItem({
      title: 'The Shining',
      authors: ['Stephen King'],
      description: 'A horror novel',
    });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(23);
  });

  it('adds bonus for page count', () => {
    const item = makeItem({
      title: 'The Shining',
      authors: ['Stephen King'],
      pageCount: 447,
    });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(21);
  });

  it('scores partial title match (contains)', () => {
    const item = makeItem({ title: 'The Shining (Classic Edition)', authors: ['Stephen King'] });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(15);
  });

  it('scores last-name fallback for author', () => {
    const item = makeItem({ title: 'Lost Souls', authors: ['Poppy Brite'] });
    expect(scoreResult(item, 'Lost Souls', 'Poppy Z. Brite')).toBe(17);
  });

  it('returns 0 for non-English results', () => {
    const item = makeItem({ title: 'The Shining', authors: ['Stephen King'], language: 'es' });
    expect(scoreResult(item, 'The Shining', 'Stephen King')).toBe(0);
  });

  it('returns 0 for items without volumeInfo', () => {
    expect(scoreResult({}, 'The Shining', 'Stephen King')).toBe(0);
  });

  it('handles missing authors gracefully', () => {
    const item = makeItem({ title: 'The Shining', authors: undefined as any });
    // volumeInfo.authors is undefined, normalizeStr on empty array
    const score = scoreResult(
      { id: 'x', volumeInfo: { title: 'The Shining', language: 'en' } },
      'The Shining',
      'Stephen King'
    );
    expect(score).toBe(10); // title match only
  });

  it('prefers covered result over uncovered for same title+author', () => {
    const withCover = makeItem({
      title: 'The Shining',
      authors: ['Stephen King'],
      imageLinks: { thumbnail: 'url' },
      description: 'A novel',
    });
    const withoutCover = makeItem({
      title: 'The Shining',
      authors: ['Stephen King'],
    });
    expect(scoreResult(withCover, 'The Shining', 'Stephen King'))
      .toBeGreaterThan(scoreResult(withoutCover, 'The Shining', 'Stephen King'));
  });
});

describe('extractEnrichmentFromItem', () => {
  it('extracts all fields from a complete item', () => {
    const item = makeItem({
      id: 'abc123',
      title: 'The Shining',
      imageLinks: { thumbnail: 'http://books.google.com/cover.jpg' },
      description: '<b>Bold</b> description',
      categories: ['Fiction', 'Horror'],
      averageRating: 4.2,
      ratingsCount: 1500,
      pageCount: 447,
      publisher: 'Doubleday',
      publishedDate: '1977-01-28',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '0385121679' },
        { type: 'ISBN_13', identifier: '9780385121675' },
      ],
    });

    const result = extractEnrichmentFromItem(item);

    expect(result.google_books_id).toBe('abc123');
    expect(result.cover_image_url).toBe('https://books.google.com/cover.jpg');
    expect(result.description).toBe('Bold description');
    expect(result.genres).toEqual(['Fiction', 'Horror']);
    expect(result.google_rating).toBe(4.2);
    expect(result.google_ratings_count).toBe(1500);
    expect(result.page_count).toBe(447);
    expect(result.publisher).toBe('Doubleday');
    expect(result.published_date).toBe('1977-01-28');
    expect(result.isbn_10).toBe('0385121679');
    expect(result.isbn_13).toBe('9780385121675');
  });

  it('handles missing optional fields', () => {
    const item = makeItem({ id: 'minimal' });
    const result = extractEnrichmentFromItem(item);

    expect(result.google_books_id).toBe('minimal');
    expect(result.cover_image_url).toBeNull();
    expect(result.description).toBeNull();
    expect(result.genres).toEqual([]);
    expect(result.google_rating).toBeNull();
    expect(result.page_count).toBeNull();
    expect(result.isbn_10).toBeNull();
    expect(result.isbn_13).toBeNull();
  });

  it('strips HTML from description', () => {
    const item = makeItem({ description: '<p>A <b>scary</b> book</p>' });
    expect(extractEnrichmentFromItem(item).description).toBe('A scary book');
  });

  it('converts http to https for cover URL', () => {
    const item = makeItem({ imageLinks: { thumbnail: 'http://example.com/img.jpg' } });
    expect(extractEnrichmentFromItem(item).cover_image_url).toBe('https://example.com/img.jpg');
  });
});

describe('pickBestMatch', () => {
  it('picks the highest-scoring item', () => {
    const items = [
      makeItem({ id: 'no-cover', title: 'The Shining', authors: ['Stephen King'] }),
      makeItem({
        id: 'with-cover',
        title: 'The Shining',
        authors: ['Stephen King'],
        imageLinks: { thumbnail: 'url' },
        description: 'A novel',
      }),
    ];
    const result = pickBestMatch(items, 'The Shining', 'Stephen King');
    expect(result.id).toBe('with-cover');
  });

  it('returns null when no item scores >= 10', () => {
    const items = [
      makeItem({ title: 'Completely Different Book', authors: ['Nobody'] }),
    ];
    expect(pickBestMatch(items, 'The Shining', 'Stephen King')).toBeNull();
  });

  it('returns null for empty items array', () => {
    expect(pickBestMatch([], 'The Shining', 'Stephen King')).toBeNull();
  });

  it('skips non-English items and picks English one', () => {
    const items = [
      makeItem({
        id: 'spanish',
        title: 'The Shining',
        authors: ['Stephen King'],
        language: 'es',
        imageLinks: { thumbnail: 'url' },
        description: 'desc',
      }),
      makeItem({
        id: 'english',
        title: 'The Shining',
        authors: ['Stephen King'],
      }),
    ];
    const result = pickBestMatch(items, 'The Shining', 'Stephen King');
    expect(result.id).toBe('english');
  });

  it('handles middle name variations via last-name fallback', () => {
    const items = [
      makeItem({
        id: 'match',
        title: 'Lost Souls',
        authors: ['Poppy Brite'],
        imageLinks: { thumbnail: 'url' },
        description: 'A vampire novel',
      }),
    ];
    const result = pickBestMatch(items, 'Lost Souls', 'Poppy Z. Brite');
    expect(result).not.toBeNull();
    expect(result.id).toBe('match');
  });
});
