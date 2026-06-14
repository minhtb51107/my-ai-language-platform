import { Injectable, BadRequestException } from '@nestjs/common';
import { SocialLoginStrategy } from './social-login.interface';
import { GoogleLoginStrategy } from './google-login.strategy';
import { FacebookLoginStrategy } from './facebook-login.strategy';
import { TikTokLoginStrategy } from './tiktok-login.strategy';

@Injectable()
export class SocialLoginFactory {
  private readonly strategies = new Map<string, SocialLoginStrategy>();

  constructor(
    private readonly googleStrategy: GoogleLoginStrategy,
    private readonly facebookStrategy: FacebookLoginStrategy,
    private readonly tiktokStrategy: TikTokLoginStrategy,
    // Apple Strategy có thể inject thêm tương tự
  ) {
    this.registerStrategy(this.googleStrategy);
    this.registerStrategy(this.facebookStrategy);
    this.registerStrategy(this.tiktokStrategy);
  }

  private registerStrategy(strategy: SocialLoginStrategy) {
    this.strategies.set(strategy.getProviderName().toLowerCase(), strategy);
  }

  getStrategy(providerName: string): SocialLoginStrategy {
    const strategy = this.strategies.get(providerName.toLowerCase());
    if (!strategy) {
      throw new BadRequestException(`Unsupported social provider: ${providerName}`);
    }
    return strategy;
  }
}