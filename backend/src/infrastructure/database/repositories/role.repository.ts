import { getDb } from '../index.js';
import { roles, permissions, userRoles, rolePermissions } from '../schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export type RoleInsert = typeof roles.$inferInsert;
export type RoleSelect = typeof roles.$inferSelect;
export type PermissionInsert = typeof permissions.$inferInsert;
export type PermissionSelect = typeof permissions.$inferSelect;
export type UserRoleInsert = typeof userRoles.$inferInsert;
export type UserRoleSelect = typeof userRoles.$inferSelect;
export type RolePermissionInsert = typeof rolePermissions.$inferInsert;
export type RolePermissionSelect = typeof rolePermissions.$inferSelect;

export class RoleRepository {
  async create(data: RoleInsert): Promise<RoleSelect> {
    const db = getDb();
    const [created] = await db.insert(roles).values(data).returning();
    return created;
  }

  async findByCode(code: string): Promise<RoleSelect | null> {
    const db = getDb();
    const [found] = await db.select().from(roles).where(eq(roles.code, code));
    return found ?? null;
  }

  async findById(id: string): Promise<RoleSelect | null> {
    const db = getDb();
    const [found] = await db.select().from(roles).where(eq(roles.id, id));
    return found ?? null;
  }

  async findAll(): Promise<RoleSelect[]> {
    const db = getDb();
    return await db.select().from(roles);
  }
}

export class PermissionRepository {
  async create(data: PermissionInsert): Promise<PermissionSelect> {
    const db = getDb();
    const [created] = await db.insert(permissions).values(data).returning();
    return created;
  }

  async findByCode(code: string): Promise<PermissionSelect | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.code, code));
    return found ?? null;
  }

  async findAll(): Promise<PermissionSelect[]> {
    const db = getDb();
    return await db.select().from(permissions);
  }

  async findByCodes(codes: string[]): Promise<PermissionSelect[]> {
    const db = getDb();
    return await db
      .select()
      .from(permissions)
      .where(inArray(permissions.code, codes));
  }
}

export class UserRoleRepository {
  async assign(data: UserRoleInsert): Promise<UserRoleSelect> {
    const db = getDb();
    const [created] = await db.insert(userRoles).values(data).returning();
    return created;
  }

  async findByUserId(userId: string): Promise<UserRoleSelect[]> {
    const db = getDb();
    return await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
  }

  async findByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRoleSelect | null> {
    const db = getDb();
    const [found] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    return found ?? null;
  }

  async removeByUserAndRole(userId: string, roleId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  async removeAllByUserId(userId: string): Promise<void> {
    const db = getDb();
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
  }
}

export class RolePermissionRepository {
  async grant(data: RolePermissionInsert): Promise<RolePermissionSelect> {
    const db = getDb();
    const [created] = await db.insert(rolePermissions).values(data).returning();
    return created;
  }

  async findByRoleId(roleId: string): Promise<RolePermissionSelect[]> {
    const db = getDb();
    return await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
  }

  async findPermissionsByRoleId(roleId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.permissionId);
  }

  async revoke(roleId: string, permissionId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permissionId),
        ),
      );
  }

  async revokeAllByRoleId(roleId: string): Promise<void> {
    const db = getDb();
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }
}
