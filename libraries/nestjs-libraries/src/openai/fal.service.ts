import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@gitroom/nestjs-libraries/config/app-config.service';

import pLimit from 'p-limit';
const limit = pLimit(10);

function timer(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class FalService {
  constructor(private _appConfigService: AppConfigService) {}

  private async getApiKey(organizationId?: string): Promise<string> {
    if (organizationId) {
      const override = await this._appConfigService.get(organizationId, 'FAL_KEY');
      if (override) {
        return override;
      }
    }
    return process.env.FAL_KEY || '';
  }

  private async getVideoModel(organizationId?: string): Promise<string> {
    if (organizationId) {
      const override = await this._appConfigService.get(organizationId, 'VIDEO_MODEL');
      if (override) {
        return override;
      }
    }
    return process.env.VIDEO_MODEL || 'fal-ai/kling-video/v1.6/pro/image-to-video';
  }

  async generateImageFromText(
    model: string,
    text: string,
    isVertical: boolean = false,
    organizationId?: string
  ): Promise<string> {
    const apiKey = await this.getApiKey(organizationId);
    const { images, video, ...all } = await (
      await limit(() =>
        fetch(`https://fal.run/fal-ai/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: text,
            aspect_ratio: isVertical ? '9:16' : '16:9',
            resolution: '720p',
            num_images: 1,
            output_format: 'jpeg',
            expand_prompt: true,
          }),
        })
      )
    ).json();

    console.log(all, video, images);

    if (video) {
      return video.url;
    }

    return images[0].url as string;
  }

  async generateVideo(
    prompt: string,
    isVertical: boolean = false,
    organizationId?: string
  ): Promise<string> {
    const apiKey = await this.getApiKey(organizationId);
    const videoModel = await this.getVideoModel(organizationId);
    const model = videoModel.replace(/^fal-ai\//, '');

    const data = await (
      await limit(() =>
        fetch(`https://queue.fal.run/fal-ai/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            aspect_ratio: isVertical ? '9:16' : '16:9',
          }),
        })
      )
    ).json();

    if (data.video) {
      return data.video.url;
    }

    if (!data.request_id) {
      throw new Error('Failed to submit video generation request');
    }

    const requestId = data.request_id;

    while (true) {
      await timer(10000);

      const status = await (
        await fetch(
          `https://queue.fal.run/fal-ai/${model}/requests/${requestId}/status`,
          {
            headers: {
              Authorization: `Key ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        )
      ).json();

      if (status.status === 'COMPLETED') {
        const result = await (
          await fetch(
            `https://queue.fal.run/fal-ai/${model}/requests/${requestId}`,
            {
              headers: {
                Authorization: `Key ${apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          )
        ).json();

        if (result.video) {
          return result.video.url;
        }

        throw new Error('Video generation completed but no video URL returned');
      }

      if (status.status === 'FAILED') {
        throw new Error('Video generation failed');
      }
    }
  }
}
