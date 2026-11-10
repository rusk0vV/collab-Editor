import { redis } from './client';

const PRESENCE_TTL = 30; // seconds — refreshed on every cursor move

export interface PresenceData {
  name: string;
  color: string;
  position: number | null;
}

export async function setPresence(docId: string, userId: string, data: PresenceData): Promise<void> {
  const key = `presence:${docId}:${userId}`;
  await redis.hset(key, {
    name: data.name,
    color: data.color,
    position: data.position === null ? '' : data.position.toString(),
  });
  await redis.expire(key, PRESENCE_TTL);
}

export async function getPresence(docId: string, userId: string): Promise<PresenceData | null> {
  const key = `presence:${docId}:${userId}`;
  const raw = await redis.hgetall(key);
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    name: raw.name || 'Anonymous',
    color: raw.color || '#60A5FA',
    position: raw.position === '' || raw.position === undefined ? null : parseInt(raw.position, 10),
  };
}

export async function removePresence(docId: string, userId: string): Promise<void> {
  await redis.del(`presence:${docId}:${userId}`);
}

export async function getAllPresence(docId: string): Promise<Array<{ userId: string; name: string; color: string; position: number | null }>> {
  const keys = await redis.keys(`presence:${docId}:*`);
  if (keys.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.hgetall(key);
  }
  const results = await pipeline.exec();
  const list: Array<{ userId: string; name: string; color: string; position: number | null }> = [];

  keys.forEach((key, idx) => {
    const err = results?.[idx]?.[0];
    const raw = results?.[idx]?.[1] as Record<string, string> | undefined;
    if (!err && raw && Object.keys(raw).length > 0) {
      const parts = key.split(':');
      const userId = parts[2] || parts.slice(2).join(':');
      list.push({
        userId,
        name: raw.name || 'Anonymous',
        color: raw.color || '#60A5FA',
        position: raw.position === '' || raw.position === undefined ? null : parseInt(raw.position, 10),
      });
    }
  });

  return list;
}

