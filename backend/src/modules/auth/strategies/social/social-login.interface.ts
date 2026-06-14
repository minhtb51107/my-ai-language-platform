export interface SocialProviderData {
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export interface SocialLoginStrategy {
  getProviderName(): string;
  verifyAndGetData(requestData: any): Promise<SocialProviderData>;
}