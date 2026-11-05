import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { createHmac } from 'crypto';
import { AuthService } from './auth.service.js';
import { LoginInput } from './auth.types.js';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'session';
const CSRF_SECRET_ENV = process.env.CSRF_SECRET;
if (!CSRF_SECRET_ENV) {
  throw new Error('CSRF_SECRET não definida. Configure o arquivo .env.');
}
const CSRF_SECRET: string = CSRF_SECRET_ENV;

function getFrontendOrigin(): string | undefined {
  return process.env.FRONTEND_ORIGIN;
}

function computeCsrfToken(sessionId: string): string {
  return createHmac('sha256', CSRF_SECRET).update(sessionId).digest('hex');
}

function validateCsrfToken(
  sessionId: string,
  token: string | undefined,
): boolean {
  if (!token) {
    return false;
  }
  const expected = computeCsrfToken(sessionId);
  return token === expected;
}

function validateOrigin(origin: string | undefined): boolean {
  const frontendOrigin = getFrontendOrigin();
  if (!frontendOrigin) {
    return true;
  }
  return origin === frontendOrigin;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Requisição inválida.' },
      });
      return;
    }

    const input: LoginInput = parsed.data;
    const result = await this.authService.login(input);

    res.cookie(SESSION_COOKIE_NAME, result.sessionSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      userId: result.userId,
      email: result.email,
      name: result.name,
      csrfToken: result.csrfToken,
    });
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    const csrfToken = req.headers['x-csrf-token'] as string | undefined;
    const origin = req.headers['origin'] as string | undefined;

    if (!validateOrigin(origin)) {
      res.status(403).json({
        error: { code: 'AUTHZ_DENIED', message: 'Origem não permitida.' },
      });
      return;
    }

    if (sessionId) {
      if (!validateCsrfToken(sessionId, csrfToken)) {
        res.status(403).json({
          error: { code: 'AUTHZ_DENIED', message: 'Token CSRF inválido.' },
        });
        return;
      }
      await this.authService.logout(sessionId);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(200).json({ message: 'Logout realizado.' });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    const csrfToken = req.headers['x-csrf-token'] as string | undefined;
    const origin = req.headers['origin'] as string | undefined;

    if (!validateOrigin(origin)) {
      res.status(403).json({
        error: { code: 'AUTHZ_DENIED', message: 'Origem não permitida.' },
      });
      return;
    }

    if (!sessionId) {
      res.status(401).json({
        error: { code: 'AUTH_SESSION_INVALID', message: 'Sessão inválida.' },
      });
      return;
    }

    if (!validateCsrfToken(sessionId, csrfToken)) {
      res.status(403).json({
        error: { code: 'AUTHZ_DENIED', message: 'Token CSRF inválido.' },
      });
      return;
    }

    const result = await this.authService.refresh(sessionId);

    res.cookie(SESSION_COOKIE_NAME, result.sessionSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({ csrfToken: result.csrfToken });
  }

  @Get('me')
  @HttpCode(200)
  async me(@Req() req: Request, @Res() res: Response): Promise<void> {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      res.status(401).json({
        error: { code: 'AUTH_SESSION_INVALID', message: 'Sessão inválida.' },
      });
      return;
    }

    const user = await this.authService.me(sessionId);

    res.status(200).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    });
  }
}
