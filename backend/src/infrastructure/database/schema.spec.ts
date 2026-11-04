import { describe, it, expect } from 'vitest';
import { schema } from './schema.js';

const EXPECTED_TABLES = [
  'clients',
  'users',
  'userCredentials',
  'userTokens',
  'roles',
  'permissions',
  'userRoles',
  'rolePermissions',
  'auditEvents',
];

describe('Esquema Drizzle (Stage B)', () => {
  it('deve exportar exatamente as 9 tabelas aprovadas', () => {
    const tableNames = Object.keys(schema);
    expect(tableNames.sort()).toEqual(EXPECTED_TABLES.sort());
    expect(tableNames.length).toBe(9);
  });

  it('não deve conter tabelas fora das 9 aprovadas', () => {
    const extra = Object.keys(schema).filter(
      (name) => !EXPECTED_TABLES.includes(name),
    );
    expect(extra).toEqual([]);
  });

  it('tabela clients deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.clients);
    expect(columns).toContain('id');
    expect(columns).toContain('name');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('updatedAt');
  });

  it('tabela users deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.users);
    expect(columns).toContain('id');
    expect(columns).toContain('clientId');
    expect(columns).toContain('name');
    expect(columns).toContain('email');
    expect(columns).toContain('status');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('updatedAt');
  });

  it('tabela user_credentials deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.userCredentials);
    expect(columns).toContain('id');
    expect(columns).toContain('userId');
    expect(columns).toContain('passwordHash');
    expect(columns).toContain('failedLoginAttempts');
    expect(columns).toContain('lockedUntil');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('updatedAt');
  });

  it('tabela user_tokens deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.userTokens);
    expect(columns).toContain('id');
    expect(columns).toContain('userId');
    expect(columns).toContain('secretHash');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('lastActivityAt');
    expect(columns).toContain('expiresAt');
    expect(columns).toContain('revokedAt');
    expect(columns).toContain('sessionStart');
  });

  it('tabela roles deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.roles);
    expect(columns).toContain('id');
    expect(columns).toContain('code');
    expect(columns).toContain('name');
    expect(columns).toContain('inheritsFromRoleId');
    expect(columns).toContain('createdAt');
    expect(columns).toContain('updatedAt');
  });

  it('tabela permissions deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.permissions);
    expect(columns).toContain('id');
    expect(columns).toContain('code');
    expect(columns).toContain('description');
    expect(columns).toContain('createdAt');
  });

  it('tabela user_roles deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.userRoles);
    expect(columns).toContain('id');
    expect(columns).toContain('userId');
    expect(columns).toContain('roleId');
    expect(columns).toContain('assignedBy');
    expect(columns).toContain('assignedAt');
  });

  it('tabela role_permissions deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.rolePermissions);
    expect(columns).toContain('id');
    expect(columns).toContain('roleId');
    expect(columns).toContain('permissionId');
    expect(columns).toContain('createdAt');
  });

  it('tabela audit_events deve ter colunas esperadas', () => {
    const columns = Object.keys(schema.auditEvents);
    expect(columns).toContain('id');
    expect(columns).toContain('traceId');
    expect(columns).toContain('occurredAt');
    expect(columns).toContain('eventType');
    expect(columns).toContain('actorUserId');
    expect(columns).toContain('sessionId');
    expect(columns).toContain('action');
    expect(columns).toContain('resourceType');
    expect(columns).toContain('resourceId');
    expect(columns).toContain('permissionCode');
    expect(columns).toContain('policyId');
    expect(columns).toContain('decision');
    expect(columns).toContain('reasonCode');
    expect(columns).toContain('toolName');
    expect(columns).toContain('status');
    expect(columns).toContain('durationMs');
    expect(columns).toContain('metadata');
  });
});
