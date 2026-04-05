import { Injectable } from '@nestjs/common';

interface MarketProfile {
  name: string;
  currency: string;
  terms: string[];
}

const MARKET_PROFILES: Record<string, MarketProfile> = {
  PH: {
    name: 'Philippines',
    currency: 'Philippine peso',
    terms: [
      'WESM',
      'EPIRA',
      'Meralco',
      'PSALM',
      'IPP',
      'USEP',
      'DOE',
      'ERC',
    ],
  },
  KR: {
    name: 'South Korea',
    currency: 'Korean won',
    terms: ['KPX', 'KEPCO', 'REC', 'SMP', 'CP', 'MOTIE'],
  },
  SG: {
    name: 'Singapore',
    currency: 'Singapore dollar',
    terms: ['EMC', 'USEP', 'CPPA', 'vesting contracts', 'EMA'],
  },
  MY: {
    name: 'Malaysia',
    currency: 'Malaysian ringgit',
    terms: ['TNB', 'SESB', 'ICPT', 'SEDA', 'Suruhanjaya Tenaga'],
  },
};

@Injectable()
export class MarketContextService {
  enrichPrompt(basePrompt: string, market: string, platform?: string): string {
    const profile = MARKET_PROFILES[market.toUpperCase()];

    if (!profile) {
      return basePrompt;
    }

    const context = [
      `Target market: ${profile.name} power sector.`,
      `Use local terminology: ${profile.terms.join(', ')}.`,
      `Reference prices in ${profile.currency}.`,
    ];

    if (platform) {
      context.push(`Tailored for ${platform}.`);
    }

    return `${context.join(' ')}\n\n${basePrompt}`;
  }
}
