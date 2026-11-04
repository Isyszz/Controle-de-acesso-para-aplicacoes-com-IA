import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';

/**
 * Esquema físico do Projeto C — Stage B (Persistência).
 *
 * Exatamente 9 tabelas aprovadas, sem renomear e sem tabelas extras.
 * Contrato de colunas/restrições: docs/decisoes-fechadas.md §1.
 *
 * Regras físicas aplicadas:
 * - UUID como PK padrão; timestamptz para datas.
 * - Índices em FKs, e-mail, hash da sessão, trace_id, data e tipo de evento.
 * - Unicidade em e-mail, códigos de papel/permissão e associações.
 * - Nenhum segredo (senha, token, sessão) armazenado em texto puro.
 */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. clients — Sistemas clientes (não confundir com clientes finais das ferramentas).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const clients = pgTable(
  'clients',
  {
    // Identificação
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),

    // Auditoria de criação/atualização
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices
    nameIdx: index('clients_name_idx').on(table.name),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. users — Usuários vinculados a cada cliente.
   status: ativo/inativo.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const users = pgTable(
  'users',
  {
    // Identificação
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    status: text('status').notNull().default('active'),

    // Auditoria de criação/atualização
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Chaves estrangeiras
    clientFk: foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
    }),

    // Índices
    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. user_credentials — Credenciais de login (hash Argon2id, nunca senha pura).
   Estado do bloqueio de login: failed_login_attempts, locked_until.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const userCredentials = pgTable(
  'user_credentials',
  {
    // Identificação e vínculo com usuário
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),

    // Controle de bloqueio de login
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),

    // Auditoria de criação/atualização
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices
    userIdx: index('user_credentials_user_id_idx').on(table.userId),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. user_tokens — Sessões. Guarda apenas o hash do segredo de sessão.
   Início absoluto da sessão (sessionStart) conta desde o login original.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const userTokens = pgTable(
  'user_tokens',
  {
    // Identificação e vínculo com usuário
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secretHash: text('secret_hash').notNull().unique(),

    // Ciclo de vida da sessão
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    sessionStart: timestamp('session_start', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices
    userIdx: index('user_tokens_user_id_idx').on(table.userId),
    secretHashIdx: index('user_tokens_secret_hash_idx').on(table.secretHash),
    expiresAtIdx: index('user_tokens_expires_at_idx').on(table.expiresAt),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. roles — Papéis. Hierarquia via inherits_from_role_id (opcional → roles.id).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const roles = pgTable(
  'roles',
  {
    // Identificação
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),

    // Hierarquia de papéis
    inheritsFromRoleId: uuid('inherits_from_role_id'),

    // Auditoria de criação/atualização
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices
    codeIdx: index('roles_code_idx').on(table.code),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. permissions — Catálogo de permissões (códigos estáveis).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const permissions = pgTable(
  'permissions',
  {
    // Identificação
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    description: text('description').notNull(),

    // Auditoria de criação
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Índices
    codeIdx: index('permissions_code_idx').on(table.code),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   7. user_roles — Associação usuário ↔ papel. UNIQUE no par.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const userRoles = pgTable(
  'user_roles',
  {
    // Identificação e vínculos
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Constraints e índices
    uniquePair: unique('user_roles_user_id_role_id_unique').on(
      table.userId,
      table.roleId,
    ),
    userIdx: index('user_roles_user_id_idx').on(table.userId),
    roleIdx: index('user_roles_role_id_idx').on(table.roleId),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   8. role_permissions — Permissões concedidas a cada papel. UNIQUE no par.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    // Identificação e vínculos
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),

    // Auditoria de criação
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Constraints e índices
    uniquePair: unique('role_permissions_role_id_permission_id_unique').on(
      table.roleId,
      table.permissionId,
    ),
    roleIdx: index('role_permissions_role_id_idx').on(table.roleId),
    permissionIdx: index('role_permissions_permission_id_idx').on(
      table.permissionId,
    ),
  }),
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   9. audit_events — Eventos de segurança e operações.
   Referência segura à sessão (session_id), não armazena segredos.
   metadata sem segredos.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const auditEvents = pgTable(
  'audit_events',
  {
    // Identificação e rastreabilidade
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    eventType: text('event_type').notNull(),

    // Ator e sessão (referências seguras, sem segredos)
    actorUserId: uuid('actor_user_id').references(() => users.id),
    sessionId: text('session_id'),

    // Detalhes do evento
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    permissionCode: text('permission_code'),
    policyId: text('policy_id'),
    decision: text('decision').notNull(),
    reasonCode: text('reason_code').notNull(),
    toolName: text('tool_name'),
    status: integer('status'),
    durationMs: integer('duration_ms'),
    metadata: text('metadata'),
  },
  (table) => ({
    // Índices
    traceIdIdx: index('audit_events_trace_id_idx').on(table.traceId),
    occurredAtIdx: index('audit_events_occurred_at_idx').on(table.occurredAt),
    eventTypeIdx: index('audit_events_event_type_idx').on(table.eventType),
    decisionIdx: index('audit_events_decision_idx').on(table.decision),
    actorIdx: index('audit_events_actor_user_id_idx').on(table.actorUserId),
  }),
);

export const schema = {
  clients,
  users,
  userCredentials,
  userTokens,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  auditEvents,
};
