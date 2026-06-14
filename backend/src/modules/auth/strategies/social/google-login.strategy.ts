import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { SocialLoginStrategy, SocialProviderData } from './social-login.interface';

@Injectable()
export class GoogleLoginStrategy implements SocialLoginStrategy {
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  getProviderName(): string {
    return 'google';
  }

  async verifyAndGetData(requestData: { idToken: string }): Promise<SocialProviderData> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: requestData.idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      
      if (!payload) throw new UnauthorizedException('Invalid Google token');

      return {
        providerId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Google authentication failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}