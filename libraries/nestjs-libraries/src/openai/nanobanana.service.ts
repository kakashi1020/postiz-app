import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@gitroom/nestjs-libraries/config/app-config.service';

@Injectable()
export class NanoBananaService {
  constructor(private _appConfigService: AppConfigService) {}

  async generateImage(
    prompt: string,
    aspectRatio: string = '16:9',
    organizationId?: string
  ): Promise<Buffer> {
    let apiKey = process.env.GEMINI_API_KEY || '';
    if (organizationId) {
      const override = await this._appConfigService.get(organizationId, 'GEMINI_API_KEY');
      if (override) {
        apiKey = override;
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
            aspectRatio,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!part?.inlineData?.data) {
      throw new Error('No image data returned from Gemini API');
    }

    return Buffer.from(part.inlineData.data, 'base64');
  }
}
