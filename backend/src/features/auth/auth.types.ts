export type AuthDecision = 'permitido' | 'negado' | 'erro';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  userId: string;
  email: string;
  name: string;
  csrfToken: string;
  sessionSecret: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  secretHash: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  sessionStart: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: string;
}

export interface TokenPair {
  sessionSecret: string;
  csrfToken: string;
}
