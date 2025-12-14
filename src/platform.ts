import dotenv from 'dotenv';
import Redis from 'ioredis';
import type { Server as SocketIOServer } from 'socket.io';

dotenv.config();

export let io: any = {
  emit: (_event: string, _payload?: any) => {},
  to: (_room: string) => ({ emit: (_event: string, _payload?: any) => {} }),
};

export function setIO(instance: SocketIOServer) {
  io = instance as any;
}

const redisUrl = process.env.REDIS_URL;
const redisEnabled = !!redisUrl;
export const redis: any = redisEnabled
  ? new Redis(redisUrl!, { lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: true })
  : {
      _mem: new Map<string, string>(),
      async get(key: string) { return this._mem.get(key) || null; },
      async set(key: string, val: string, _ex?: string, _ttl?: number) { this._mem.set(key, val); },
      async sadd(_key: string, _member: string) {},
      async srem(_key: string, _member: string) {},
      async del(key: string) { this._mem.delete(key); },
    };

if (redisEnabled) {
  redis.on('error', (e: any) => console.warn('[redis] error', e?.message || e));
  // Connect lazily; in serverless, connection may be short-lived
  redis.connect().catch(() => {});
}