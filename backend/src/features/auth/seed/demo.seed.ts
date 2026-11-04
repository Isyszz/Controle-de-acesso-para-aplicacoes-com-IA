import { eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { getDb } from '../../../infrastructure/database/index.js';
import {
  users,
  userCredentials,
  roles,
  userRoles,
} from '../../../infrastructure/database/schema.js';

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

if (!DEMO_PASSWORD) {
  throw new Error(
    'DEMO_USER_PASSWORD não definida. Configure a variável de ambiente.',
  );
}

const DEMO_USERS = [
  {
    email: 'employee.demo@exemplo',
    name: 'Employee Demo',
    status: 'active',
    roleCode: 'employee',
  },
  {
    email: 'manager.demo@exemplo',
    name: 'Manager Demo',
    status: 'active',
    roleCode: 'manager',
  },
  {
    email: 'admin.demo@exemplo',
    name: 'Admin Demo',
    status: 'active',
    roleCode: 'administrator',
  },
  {
    email: 'disabled.demo@exemplo',
    name: 'Disabled Demo',
    status: 'inactive',
    roleCode: 'employee',
  },
];

export async function seedDemoUsers(): Promise<void> {
  const db = getDb();
  const passwordHash = await hash(DEMO_PASSWORD!);

  for (const demoUser of DEMO_USERS) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoUser.email));

    if (existing) {
      continue;
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        email: demoUser.email,
        name: demoUser.name,
        status: demoUser.status,
      })
      .returning();

    await db.insert(userCredentials).values({
      userId: createdUser.id,
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.code, demoUser.roleCode));

    if (role) {
      await db.insert(userRoles).values({
        userId: createdUser.id,
        roleId: role.id,
      });
    }
  }
}

export { DEMO_USERS };
