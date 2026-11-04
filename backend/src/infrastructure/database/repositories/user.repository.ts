import { getDb } from '../index.js';
import { users, userCredentials } from '../schema.js';
import { eq } from 'drizzle-orm';

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;

export class UserRepository {
  async create(data: UserInsert): Promise<UserSelect> {
    const db = getDb();
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }

  async findById(id: string): Promise<UserSelect | null> {
    const db = getDb();
    const [found] = await db.select().from(users).where(eq(users.id, id));
    return found ?? null;
  }

  async findByEmail(email: string): Promise<UserSelect | null> {
    const db = getDb();
    const [found] = await db.select().from(users).where(eq(users.email, email));
    return found ?? null;
  }

  async updateStatus(id: string, status: string): Promise<UserSelect | null> {
    const db = getDb();
    const [updated] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  }
}

export type CredentialInsert = typeof userCredentials.$inferInsert;
export type CredentialSelect = typeof userCredentials.$inferSelect;

export class CredentialRepository {
  async create(data: CredentialInsert): Promise<CredentialSelect> {
    const db = getDb();
    const [created] = await db.insert(userCredentials).values(data).returning();
    return created;
  }

  async findByUserId(userId: string): Promise<CredentialSelect | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId));
    return found ?? null;
  }

  async incrementFailedAttempts(
    userId: string,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(userCredentials)
      .set({
        failedLoginAttempts: attempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(userCredentials.userId, userId));
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(userCredentials)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(userCredentials)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(userCredentials.userId, userId));
  }
}
