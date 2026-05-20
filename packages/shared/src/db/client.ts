import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Policy } from '../schemas/policy.js';
import type { Regulation } from '../schemas/regulation.js';
import type { Playbook } from '../schemas/playbook.js';
import type { Dispute } from '../schemas/dispute.js';

export function createMongoClient(uri: string): MongoClient {
  return new MongoClient(uri);
}

export function getDb(client: MongoClient, dbName = 'receipts'): Db {
  return client.db(dbName);
}

export function getPoliciesCollection(db: Db): Collection<Policy> {
  return db.collection<Policy>('policies');
}

export function getRegulationsCollection(db: Db): Collection<Regulation> {
  return db.collection<Regulation>('regulations');
}

export function getPlaybooksCollection(db: Db): Collection<Playbook> {
  return db.collection<Playbook>('playbooks');
}

export function getDisputesCollection(db: Db): Collection<Dispute> {
  return db.collection<Dispute>('disputes');
}

export async function connectWithRetry(
  uri: string,
  maxAttempts = 5,
): Promise<MongoClient> {
  const client = createMongoClient(uri);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      return client;
    } catch (error) {
      if (attempt === maxAttempts) {
        await client.close().catch(() => undefined);
        throw error;
      }
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('connectWithRetry: exhausted all attempts');
}
