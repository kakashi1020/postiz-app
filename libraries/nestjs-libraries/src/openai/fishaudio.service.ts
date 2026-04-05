import { Injectable } from '@nestjs/common';

@Injectable()
export class FishAudioService {
  async textToSpeech(text: string, voiceId: string): Promise<Buffer> {
    const response = await fetch(
      `https://api.fish.audio/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FISH_AUDIO_KEY}`,
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

  async listVoices(): Promise<Array<{ id: string; name: string }>> {
    const response = await fetch(
      'https://api.fish.audio/v1/models',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FISH_AUDIO_KEY}`,
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
