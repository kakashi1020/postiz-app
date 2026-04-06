import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@gitroom/nestjs-libraries/config/app-config.service';

@Injectable()
export class FishAudioService {
  constructor(private _appConfigService: AppConfigService) {}

  private async getApiKey(organizationId?: string): Promise<string> {
    if (organizationId) {
      const override = await this._appConfigService.get(organizationId, 'FISH_AUDIO_KEY');
      if (override) {
        return override;
      }
    }
    return process.env.FISH_AUDIO_KEY || '';
  }

  async textToSpeech(text: string, voiceId: string, organizationId?: string): Promise<Buffer> {
    const apiKey = await this.getApiKey(organizationId);
    const response = await fetch(
      `https://api.fish.audio/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text,
          reference_id: voiceId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Fish Audio API error: ${response.status} ${response.statusText}`
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async listVoices(organizationId?: string): Promise<Array<{ id: string; name: string }>> {
    const apiKey = await this.getApiKey(organizationId);
    const response = await fetch(
      'https://api.fish.audio/v1/models',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Fish Audio API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || [];

    return items.map((voice: any) => ({
      id: voice._id || voice.id,
      name: voice.title || voice.name,
    }));
  }
}
