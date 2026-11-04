import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDb, getDb } from '../index.js';
import { UserRepository, CredentialRepository } from './user.repository.js';
import { SessionRepository } from './session.repository.js';
import {
  RoleRepository,
  PermissionRepository,
  UserRoleRepository,
  RolePermissionRepository,
} from './role.repository.js';
import {
  users,
  userCredentials,
  userTokens,
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from '../schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL_TEST;
const integrationTests = dbUrl ? describe : describe.skip;

describe('Repositórios de persistência (Stage B)', () => {
  beforeEach(() => {
    resetDb();
  });

  afterEach(() => {
    resetDb();
  });

  it('deve instanciar todos os repositórios sem erro', () => {
    expect(() => new UserRepository()).not.toThrow();
    expect(() => new CredentialRepository()).not.toThrow();
    expect(() => new SessionRepository()).not.toThrow();
    expect(() => new RoleRepository()).not.toThrow();
    expect(() => new PermissionRepository()).not.toThrow();
    expect(() => new UserRoleRepository()).not.toThrow();
    expect(() => new RolePermissionRepository()).not.toThrow();
  });

  it('deve informar quando DATABASE_URL_TEST não está configurada', () => {
    if (!dbUrl) {
      console.warn(
        'DATABASE_URL_TEST não definida. Testes de integração com banco serão pulados.',
      );
    }
    expect(true).toBe(true);
  });
});

integrationTests('Repositórios (integração - requer DATABASE_URL_TEST)', () => {
  beforeEach(() => {
    resetDb();
  });

  afterEach(() => {
    resetDb();
  });

  it('UserRepository deve criar e buscar usuário por email', async () => {
    const repo = new UserRepository();
    const db = getDb(dbUrl);

    const created = await repo.create({
      email: 'repo-test@example.com',
      name: 'Repo Test User',
      status: 'active',
    });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('repo-test@example.com');

    const found = await repo.findByEmail('repo-test@example.com');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe('Repo Test User');
    expect(found?.status).toBe('active');

    await db.delete(users).where(eq(users.id, created.id));
  });

  it('CredentialRepository deve criar e buscar credencial por userId', async () => {
    const userRepo = new UserRepository();
    const credRepo = new CredentialRepository();
    const db = getDb(dbUrl);

    const user = await userRepo.create({
      email: 'repo-cred@example.com',
      name: 'Repo Cred User',
      status: 'active',
    });

    const created = await credRepo.create({
      userId: user.id,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$test',
      failedLoginAttempts: 0,
    });

    expect(created.id).toBeDefined();
    expect(created.userId).toBe(user.id);

    const found = await credRepo.findByUserId(user.id);
    expect(found).not.toBeNull();
    expect(found?.passwordHash).toBe(created.passwordHash);
    expect(found?.failedLoginAttempts).toBe(0);

    await db.delete(userCredentials).where(eq(userCredentials.id, created.id));
    await db.delete(users).where(eq(users.id, user.id));
  });

  it('SessionRepository deve criar e buscar sessão por secretHash', async () => {
    const userRepo = new UserRepository();
    const sessionRepo = new SessionRepository();
    const db = getDb(dbUrl);

    const user = await userRepo.create({
      email: 'repo-session@example.com',
      name: 'Repo Session User',
      status: 'active',
    });

    const created = await sessionRepo.create({
      userId: user.id,
      secretHash: 'hash-teste-sessao-repo',
      expiresAt: new Date(Date.now() + 3600000),
      sessionStart: new Date(),
    });

    expect(created.id).toBeDefined();
    expect(created.secretHash).toBe('hash-teste-sessao-repo');

    const found = await sessionRepo.findBySecretHash('hash-teste-sessao-repo');
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);

    await db.delete(userTokens).where(eq(userTokens.id, created.id));
    await db.delete(users).where(eq(users.id, user.id));
  });

  it('RoleRepository deve criar e buscar papel por código', async () => {
    const repo = new RoleRepository();
    const db = getDb(dbUrl);

    const created = await repo.create({
      code: 'repo_role_test',
      name: 'Papel de Teste Repo',
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe('repo_role_test');

    const found = await repo.findByCode('repo_role_test');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe('Papel de Teste Repo');

    await db.delete(roles).where(eq(roles.id, created.id));
  });

  it('PermissionRepository deve criar e buscar permissão por código', async () => {
    const repo = new PermissionRepository();
    const db = getDb(dbUrl);

    const created = await repo.create({
      code: 'repo:perm:test',
      description: 'Permissão de teste do repositório',
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe('repo:perm:test');

    const found = await repo.findByCode('repo:perm:test');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);

    await db.delete(permissions).where(eq(permissions.id, created.id));
  });

  it('UserRoleRepository deve atribuir e buscar papel de usuário', async () => {
    const userRepo = new UserRepository();
    const roleRepo = new RoleRepository();
    const userRoleRepo = new UserRoleRepository();
    const db = getDb(dbUrl);

    const user = await userRepo.create({
      email: 'repo-userrole@example.com',
      name: 'Repo UserRole User',
      status: 'active',
    });
    const role = await roleRepo.create({
      code: 'repo_userrole_role',
      name: 'Papel UserRole Teste',
    });

    const created = await userRoleRepo.assign({
      userId: user.id,
      roleId: role.id,
    });

    expect(created.id).toBeDefined();
    expect(created.userId).toBe(user.id);
    expect(created.roleId).toBe(role.id);

    const found = await userRoleRepo.findByUserAndRole(user.id, role.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);

    const byUser = await userRoleRepo.findByUserId(user.id);
    expect(byUser.length).toBeGreaterThanOrEqual(1);

    await db.delete(userRoles).where(eq(userRoles.id, created.id));
    await db.delete(users).where(eq(users.id, user.id));
    await db.delete(roles).where(eq(roles.id, role.id));
  });

  it('RolePermissionRepository deve conceder e buscar permissões de papel', async () => {
    const roleRepo = new RoleRepository();
    const permRepo = new PermissionRepository();
    const rolePermRepo = new RolePermissionRepository();
    const db = getDb(dbUrl);

    const role = await roleRepo.create({
      code: 'repo_roleperm_role',
      name: 'Papel RolePerm Teste',
    });
    const permission = await permRepo.create({
      code: 'repo:roleperm:test',
      description: 'Permissão RolePerm de teste',
    });

    const created = await rolePermRepo.grant({
      roleId: role.id,
      permissionId: permission.id,
    });

    expect(created.id).toBeDefined();
    expect(created.roleId).toBe(role.id);
    expect(created.permissionId).toBe(permission.id);

    const found = await rolePermRepo.findByRoleId(role.id);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some((rp) => rp.permissionId === permission.id)).toBe(true);

    const permIds = await rolePermRepo.findPermissionsByRoleId(role.id);
    expect(permIds).toContain(permission.id);

    await db.delete(rolePermissions).where(eq(rolePermissions.id, created.id));
    await db.delete(roles).where(eq(roles.id, role.id));
    await db.delete(permissions).where(eq(permissions.id, permission.id));
  });
});
