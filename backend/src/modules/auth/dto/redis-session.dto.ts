export class RedisUserSession {
  id: string;
  email: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  expiredAt: number;
}

export class UserSessionResponse {
  id: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  isCurrent: boolean;
}