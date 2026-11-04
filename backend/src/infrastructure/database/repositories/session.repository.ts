import { getDb } from '../index.js';
import { userTokens } from '../schema.js';
import { eq } from 'drizzle-orm';

export type SessionInsert = typeof userTokens.$inferInsert;
export type SessionSelect = typeof userTokens.$inferSelect;

export class SessionRepository {
  async create(data: SessionInsert): Promise<SessionSelect> {
    const db = getDb();
    const [created] = await db.insert(userTokens).values(data).returning();
    return created;
  }

  async findBySecretHash(secretHash: string): Promise<SessionSelect | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.secretHash, secretHash));
    return found ?? null;
  }

  async findByUserId(userId: string): Promise<SessionSelect[]> {
    const db = getDb();
    return await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.userId, userId));
  }

  async updateLastActivity(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(userTokens)
      .set({ lastActivityAt: new Date() })
      .where(eq(userTokens.id, id));
  }

  async revoke(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(eq(userTokens.id, id));
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(userTokens)
      .set({ revokedAt: new Date() })
      .where(eq(userTokens.userId, userId));
  }
}
