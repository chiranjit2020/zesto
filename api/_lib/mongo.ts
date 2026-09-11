import { MongoClient, type Db } from 'mongodb';

/**
 * Cached across warm serverless invocations — a fresh `MongoClient` per request would
 * exhaust Atlas's connection limit under any real traffic. Cached on `globalThis` rather
 * than a plain module-level variable so it also survives Vercel's dev-server module
 * reloads, not just production warm starts (the standard pattern for Mongo + serverless).
 */
declare global {
  // eslint-disable-next-line no-var
  var _zestoMongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!globalThis._zestoMongoClientPromise) {
    globalThis._zestoMongoClientPromise = new MongoClient(uri).connect();
  }
  return globalThis._zestoMongoClientPromise;
}

/** Uses the database named in the connection string (`mongodb+srv://.../<db>?...`). */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
