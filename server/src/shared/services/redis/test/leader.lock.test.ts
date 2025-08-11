import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { RedisLeaderLock } from '../leader.lock';

// Create a minimal fake Redis client with the methods we need
function createFakeRedis() {
  let kv = new Map<string, string>();
  let isOpen = true;
  return {
    isOpen,
    async connect() {
      isOpen = true;
      // no-op
    },
    async set(key: string, value: string, opts: any) {
      if (opts?.NX) {
        if (kv.has(key)) return null;
        kv.set(key, value);
        return 'OK';
      }
      kv.set(key, value);
      return 'OK';
    },
    async get(key: string) {
      return kv.get(key) ?? null;
    },
    async pexpire(key: string, _ttl: number) {
      // simulate TTL set, ignore
      return 1;
    },
    async eval(_script: string, args: { keys: string[]; arguments: string[] }) {
      const [key] = args.keys;
      const [val] = args.arguments;
      if (kv.get(key) === val) {
        kv.delete(key);
        return 1;
      }
      return 0;
    },
  } as any;
}

describe('RedisLeaderLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('acquires lock once and rejects second contender', async () => {
    const fake = createFakeRedis();
    const a = new RedisLeaderLock({ key: 'k', ttlMs: 10000, client: fake });
    const b = new RedisLeaderLock({ key: 'k', ttlMs: 10000, client: fake });
    const okA = await a.acquire();
    const okB = await b.acquire();
    expect(okA).toBe(true);
    expect(okB).toBe(false);
  });

  it('releases only if owner and allows new leader', async () => {
    const fake = createFakeRedis();
    const a = new RedisLeaderLock({ key: 'k', ttlMs: 10000, client: fake });
    const b = new RedisLeaderLock({ key: 'k', ttlMs: 10000, client: fake });
    expect(await a.acquire()).toBe(true);
    await a.release();
    expect(await b.acquire()).toBe(true);
  });

  it('renewal keeps leadership while value matches', async () => {
    const fake = createFakeRedis();
    const a = new RedisLeaderLock({
      key: 'k',
      ttlMs: 1000,
      renewEveryMs: 200,
      client: fake,
    });
    expect(await a.acquire()).toBe(true);
    // advance timers a few times; no error expected
    await jest.advanceTimersByTimeAsync(1200);
    expect(a.isLeader()).toBe(true);
  });
});
