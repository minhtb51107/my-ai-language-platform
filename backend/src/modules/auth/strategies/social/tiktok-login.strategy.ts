import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SocialLoginStrategy, SocialProviderData } from './social-login.interface';

@Injectable()
export class TikTokLoginStrategy implements SocialLoginStrategy {
  getProviderName(): string {
    return 'tiktok';
  }

  async verifyAndGetData(requestData: { openId: string; accessToken: string }): Promise<SocialProviderData> {
    try {
      const response = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        headers: {
          'Authorization': `Bearer ${requestData.accessToken}`
        }
      });
      const data = await response.json();

      if (data.error && data.error.code !== 'ok') {
        throw new UnauthorizedException('TikTok token invalid');
      }

      const userInfo = data.data.user;
      return {
        providerId: userInfo.open_id,
        name: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
        // TikTok API thường không trả email trực tiếp qua endpoint này
        email: undefined,
      };
    } catch (error) {
      throw new UnauthorizedException('TikTok authentication failed');
    }
  }
}