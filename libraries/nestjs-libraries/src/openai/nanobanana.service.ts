import { Injectable } from '@nestjs/common';

@Injectable()
export class NanoBananaService {
  async generateImage(
    prompt: string,
    aspectRatio: string = '16:9'
  ): Promise<Buffer> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
