import { Injectable } from '@nestjs/common';
import { AppConfigRepository } from './app-config.repository';
import {
  AuthService,
} from '@gitroom/helpers/auth/auth.service';

const KEY_CATEGORIES: Record<string, string[]> = {
  ai: [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'FAL_KEY',
    'FISH_AUDIO_KEY',
    'VIDEO_MODEL',
  ],
  social: [
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'TIKTOK_CLIENT_ID',
    'TIKTOK_CLIENT_SECRET',
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
  ],
  storage: [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_ACCESS_KEY',
    'CLOUDFLARE_SECRET_ACCESS_KEY',
    'CLOUDFLARE_BUCKETNAME',
    'CLOUDFLARE_BUCKET_URL',
  ],
};

const ALL_KEYS = Object.values(KEY_CATEGORIES).flat();

@Injectable()
export class AppConfigService {
  constructor(private _appConfigRepository: AppConfigRepository) {}

  async get(organizationId: string, key: string): Promise<string | undefined> {
    const record = await this._appConfigRepository.get(organizationId, key);
    if (record) {
      return AuthService.fixedDecryption(record.value);
    }
    return process.env[key] || undefined;
  }

  async set(organizationId: string, key: string, value: string) {
    if (!ALL_KEYS.includes(key)) {
      throw new Error(`Invalid config key: ${key}`);
    }
    const encrypted = AuthService.fixedEncryption(value);
    return this._appConfigRepository.set(organizationId, key, encrypted);
  }

  async getAll(organizationId: string) {
    const records = await this._appConfigRepository.getAll(organizationId);
    const decrypted = new Map<string, string>();
    for (const record of records) {
      decrypted.set(record.key, AuthService.fixedDecryption(record.value));
    }

    const result: Record<string, Record<string, string>> = {};
    for (const [category, keys] of Object.entries(KEY_CATEGORIES)) {
      result[category] = {};
      for (const key of keys) {
        const value = decrypted.get(key) || process.env[key] || '';
        result[category][key] = value;
      }
    }
    return result;
  }

  async getAllMasked(organizationId: string) {
    const all = await this.getAll(organizationId);
    const masked: Record<string, Record<string, string>> = {};
    for (const [category, keys] of Object.entries(all)) {
      masked[category] = {};
      for (const [key, value] of Object.entries(keys)) {
        masked[category][key] = this.maskValue(value);
      }
    }
    return masked;
  }

  async getByCategory(organizationId: string, category: string) {
    const keys = KEY_CATEGORIES[category];
    if (!keys) {
      throw new Error(`Invalid category: ${category}`);
    }
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = (await this.get(organizationId, key)) || '';
    }
    return result;
  }

  private maskValue(value: string): string {
    if (!value || value.length <= 4) {
      return value ? '••••' : '';
    }
    return '••••••••' + value.slice(-4);
  }
}
