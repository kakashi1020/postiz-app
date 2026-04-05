import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

@Injectable()
export class ClaudeService {
  async generateContent(prompt: string, system?: string): Promise<string> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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

  async separatePosts(content: string, len: number) {
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
