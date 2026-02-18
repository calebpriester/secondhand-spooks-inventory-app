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
import { withTransaction } from '../../config/database';

beforeEach(() => {
  jest.clearAllMocks();
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
});
