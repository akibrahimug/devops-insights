/**
 * REDIS LEADER LOCK
 *
 * A lightweight best-effort leader election using Redis.
 * - One instance acquires the lock (SET NX PX) and becomes leader
 * - Leader periodically renews TTL while running
 * - Release is safe (delete only if owner)
 *
 * This is sufficient to ensure only one poller runs across multiple
 * server replicas. It purposely avoids external deps and complex
 * orchestrations; good enough for our use-case.
 */

import os from 'node:os';
import crypto from 'node:crypto';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { config } from '@root/config';

/**
 * Simple Lua script that deletes the lock only if the value matches
 */
const LUA_RELEASE_IF_VALUE_MATCHES = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

/**
 * Note: We choose to not extend BaseCache directly here to allow
 * easy dependency injection of a preconfigured Redis client for tests.
 */
export class RedisLeaderLock {
  private readonly key: string;
  private readonly ttlMs: number;
  private readonly renewEveryMs: number;
  private readonly client: RedisClientType;
  private renewTimer: NodeJS.Timeout | null = null;
  private readonly instanceId: string;
  private acquired = false;

  constructor(params: {
    key: string;
    ttlMs?: number;
    renewEveryMs?: number;
    client?: RedisClientType;
  }) {
    this.key = params.key;
    this.ttlMs = params.ttlMs ?? 30000; // 30s default TTL
    this.renewEveryMs =
      params.renewEveryMs ?? Math.floor((params.ttlMs ?? 30000) / 2);
    this.client =
      params.client ?? createClient({ url: config.REDIS_HOST || undefined });
    this.instanceId = `${os.hostname()}:${process.pid}:${crypto
      .randomBytes(6)
      .toString('hex')}`;
  }

  public async connect(): Promise<void> {
    // Only connect if not already open
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /** Try to acquire leadership. Returns true if we became leader. */
  public async acquire(): Promise<boolean> {
    await this.connect();
    const res = await this.client.set(this.key, this.instanceId, {
      NX: true,
      PX: this.ttlMs,
    });
    this.acquired = res === 'OK';
    if (this.acquired) this.startRenewal();
    return this.acquired;
  }

  /** Releases leadership if we still own the lock. */
  public async release(): Promise<void> {
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
    if (!this.client.isOpen) return;
    try {
      await this.client.eval(LUA_RELEASE_IF_VALUE_MATCHES, {
        keys: [this.key],
        arguments: [this.instanceId],
      });
    } finally {
      this.acquired = false;
    }
  }

  /** Periodically extend TTL only if we still own the lock. */
  private startRenewal(): void {
    if (this.renewTimer) return;
    this.renewTimer = setInterval(async () => {
      try {
        const current = await this.client.get(this.key);
        if (current !== this.instanceId) {
          // Lost leadership
          if (this.renewTimer) clearInterval(this.renewTimer);
          this.renewTimer = null;
          this.acquired = false;
          return;
        }
        // Renew TTL
        await (this.client as any).pExpire(this.key, this.ttlMs);
      } catch {
        // No-op: transient redis errors should not throw
      }
    }, this.renewEveryMs);
  }

  /**
   * Attempt to acquire leadership on an interval until success.
   * Returns a cancel function to stop retrying.
   */
  public startRetryAcquire(
    onBecameLeader: () => Promise<void> | void,
    retryMs?: number,
  ): () => void {
    const intervalMs = retryMs ?? Math.max(2000, Math.floor(this.ttlMs / 2));
    let timer: NodeJS.Timeout | null = null;
    const tick = async () => {
      if (this.acquired) return; // already leader
      const ok = await this.acquire();
      if (ok) {
        await onBecameLeader();
      }
    };
    timer = setInterval(() => void tick(), intervalMs);
    // fire immediately as well
    void tick();
    return () => {
      if (timer) clearInterval(timer);
    };
  }

  public isLeader(): boolean {
    return this.acquired;
  }
}
