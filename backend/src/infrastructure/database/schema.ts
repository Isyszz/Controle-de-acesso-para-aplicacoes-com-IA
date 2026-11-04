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

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameIdx: index('clients_name_idx').on(table.name),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').references(() => clients.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    status: text('status').notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clientFk: foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
    }),

    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
  }),
);

export const userCredentials = pgTable(
  'user_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash').notNull(),

    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index('user_credentials_user_id_idx').on(table.userId),
  }),
);

export const userTokens = pgTable(
  'user_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secretHash: text('secret_hash').notNull().unique(),

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
    userIdx: index('user_tokens_user_id_idx').on(table.userId),
    secretHashIdx: index('user_tokens_secret_hash_idx').on(table.secretHash),
    expiresAtIdx: index('user_tokens_expires_at_idx').on(table.expiresAt),
  }),
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),

    inheritsFromRoleId: uuid('inherits_from_role_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: index('roles_code_idx').on(table.code),
  }),
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    description: text('description').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: index('permissions_code_idx').on(table.code),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
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
    uniquePair: unique('user_roles_user_id_role_id_unique').on(
      table.userId,
      table.roleId,
    ),
    userIdx: index('user_roles_user_id_idx').on(table.userId),
    roleIdx: index('user_roles_role_id_idx').on(table.roleId),
  }),
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
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

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    eventType: text('event_type').notNull(),

    actorUserId: uuid('actor_user_id').references(() => users.id),
    sessionId: text('session_id'),

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
