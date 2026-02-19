jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
    on: jest.fn(),
  };

  return {
    Pool: jest.fn(() => mockPool),
    __mockPool: mockPool,
    __mockClient: mockClient,
  };
});

// Must import AFTER the mock so Pool constructor uses the mock
const { __mockPool: mockPool, __mockClient: mockClient } = jest.requireMock('pg');
import { query, withTransaction, isTransientError } from '../../config/database';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isTransientError', () => {
  it('returns true for ECONNREFUSED', () => {
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('returns true for ENOTFOUND', () => {
    expect(isTransientError({ code: 'ENOTFOUND' })).toBe(true);
  });

  it('returns true for EAI_AGAIN', () => {
    expect(isTransientError({ code: 'EAI_AGAIN' })).toBe(true);
  });

  it('returns true for PostgreSQL admin shutdown (57P01)', () => {
    expect(isTransientError({ code: '57P01' })).toBe(true);
  });

  it('returns true for "Connection terminated" message', () => {
    expect(isTransientError({ message: 'Connection terminated unexpectedly' })).toBe(true);
  });

  it('returns true for AggregateError with transient sub-errors', () => {
    expect(isTransientError({ errors: [{ code: 'ECONNREFUSED' }] })).toBe(true);
  });

  it('returns false for constraint violation', () => {
    expect(isTransientError({ code: '23505' })).toBe(false);
  });

  it('returns false for generic errors', () => {
    expect(isTransientError(new Error('Something broke'))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe('query', () => {
  it('executes a query and returns the result', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

    const result = await query('SELECT * FROM books WHERE id = $1', [1]);

    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM books WHERE id = $1', [1]);
    expect(result).toEqual({ rows: [{ id: 1 }], rowCount: 1 });
  });

  it('retries on transient error then succeeds', async () => {
    const transientErr = Object.assign(new Error('conn refused'), { code: 'ECONNREFUSED' });
    mockPool.query
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await query('SELECT 1');

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ rows: [], rowCount: 0 });
  });

  it('does not retry on non-transient error', async () => {
    const constraintErr = Object.assign(new Error('unique violation'), { code: '23505' });
    mockPool.query.mockRejectedValueOnce(constraintErr);

    await expect(query('INSERT INTO books ...')).rejects.toThrow('unique violation');

    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries on persistent transient error', async () => {
    const transientErr = Object.assign(new Error('conn refused'), { code: 'ECONNREFUSED' });
    mockPool.query
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr);

    await expect(query('SELECT 1')).rejects.toThrow('conn refused');

    expect(mockPool.query).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });
});

describe('withTransaction', () => {
  it('calls BEGIN, executes callback, then COMMIT', async () => {
    mockClient.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const result = await withTransaction(async (client) => {
      const res = await client.query('UPDATE books SET sold = true WHERE id = $1', [1]);
      return res.rows;
    });

    expect(mockPool.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'UPDATE books SET sold = true WHERE id = $1', [1]);
    expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('calls ROLLBACK and re-throws on callback error', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });
    const testError = new Error('Something broke');

    await expect(
      withTransaction(async () => {
        throw testError;
      })
    ).rejects.toThrow('Something broke');

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('releases client even when ROLLBACK fails', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('ROLLBACK failed')); // ROLLBACK

    await expect(
      withTransaction(async () => {
        throw new Error('Callback error');
      })
    ).rejects.toThrow();

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('passes a working QueryExecutor to the callback', async () => {
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await withTransaction(async (client) => {
      await client.query('SELECT 1');
      await client.query('SELECT 2', []);
    });

    // BEGIN + 2 queries + COMMIT = 4 calls
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it('retries the entire transaction on transient connect error', async () => {
    const transientErr = Object.assign(new Error('conn refused'), { code: 'ECONNREFUSED' });
    mockPool.connect
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce(mockClient);
    mockClient.query.mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 });

    const result = await withTransaction(async (client) => {
      const res = await client.query('SELECT 1');
      return res.rows;
    });

    expect(mockPool.connect).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ ok: true }]);
  });

  it('does not retry transaction on non-transient error', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(Object.assign(new Error('unique violation'), { code: '23505' })); // user query

    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO books ...');
      })
    ).rejects.toThrow('unique violation');

    expect(mockPool.connect).toHaveBeenCalledTimes(1);
  });
});
