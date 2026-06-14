import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SocialLoginStrategy, SocialProviderData } from './social-login.interface';

@Injectable()
export class FacebookLoginStrategy implements SocialLoginStrategy {
  getProviderName(): string {
    return 'facebook';
  }

  async verifyAndGetData(requestData: { accessToken: string }): Promise<SocialProviderData> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${requestData.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new UnauthorizedException(data.error.message);
      }

      return {
        providerId: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.picture?.data?.url,
      };
    } catch (error) {
      throw new UnauthorizedException('Facebook authentication failed');
    }
  }
}