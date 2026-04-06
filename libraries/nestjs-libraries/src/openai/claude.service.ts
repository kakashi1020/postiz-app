import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AppConfigService } from '@gitroom/nestjs-libraries/config/app-config.service';

@Injectable()
export class ClaudeService {
  constructor(private _appConfigService: AppConfigService) {}

  private async getClient(organizationId?: string): Promise<Anthropic> {
    let apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (organizationId) {
      const override = await this._appConfigService.get(organizationId, 'ANTHROPIC_API_KEY');
      if (override) {
        apiKey = override;
      }
    }
    return new Anthropic({ apiKey });
  }

  async generateContent(prompt: string, system?: string, maxTokens = 4096, organizationId?: string): Promise<string> {
    const anthropic = await this.getClient(organizationId);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  async separatePosts(content: string, len: number, organizationId?: string) {
    const anthropic = await this.getClient(organizationId);
    const splitResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an assistant that takes a social media post and breaks it into a thread. Each post must be minimum ${
        len - 10
      } and maximum ${len} characters, keeping the exact wording and line breaks. Split posts based on context. Respond with a JSON object: { "posts": string[] }`,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    const splitText =
      splitResponse.content[0].type === 'text'
        ? splitResponse.content[0].text
        : '{"posts":[]}';

    let posts: string[];
    try {
      posts = JSON.parse(splitText).posts || [];
    } catch {
      posts = [];
    }

    return {
      posts: await Promise.all(
        posts.map(async (post: string) => {
          if (post.length <= len) {
            return post;
          }

          let retries = 4;
          while (retries) {
            try {
              const shrinkResponse = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: `You are an assistant that takes a social media post and shrinks it to be maximum ${len} characters, keeping the exact wording and line breaks. Respond with a JSON object: { "post": string }`,
                messages: [
                  {
                    role: 'user',
                    content: post,
                  },
                ],
              });

              const shrinkText =
                shrinkResponse.content[0].type === 'text'
                  ? shrinkResponse.content[0].text
                  : '';

              return JSON.parse(shrinkText).post || '';
            } catch {
              retries--;
            }
          }

          return post;
        })
      ),
    };
  }
}
