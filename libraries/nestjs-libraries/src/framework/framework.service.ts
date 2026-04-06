import { Injectable, NotFoundException } from '@nestjs/common';
import { FrameworkRepository } from '@gitroom/nestjs-libraries/framework/framework.repository';
import { ClaudeService } from '@gitroom/nestjs-libraries/openai/claude.service';

@Injectable()
export class FrameworkService {
  constructor(
    private _repo: FrameworkRepository,
    private _claude: ClaudeService
  ) {}

  async upload(projectId: string, fileName: string, content: string) {
    const previous = await this._repo.getCurrent(projectId);

    let diffSummary: string | undefined;
    if (previous) {
      try {
        const raw = await this._claude.generateContent(
          `Compare these two versions of a marketing framework document and summarize what changed in 2-4 bullet points. Be concise.

Previous version:
${previous.fileContent.substring(0, 3000)}

New version:
${content.substring(0, 3000)}

Respond with JSON: { "summary": "string (bullet-point summary of changes)" }`,
          'You are a document diff assistant. Respond with valid JSON only.'
        );
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        const cleaned = fenceMatch ? fenceMatch[1].trim() : raw.trim();
        const parsed = JSON.parse(cleaned);
        diffSummary = parsed.summary || undefined;
      } catch {
        diffSummary = 'Diff generation failed — manual review recommended.';
      }
    }

    return this._repo.upload(projectId, fileName, content, diffSummary);
  }

  async getCurrent(projectId: string) {
    const doc = await this._repo.getCurrent(projectId);
    if (!doc) {
      throw new NotFoundException('No framework document found for this project');
    }
    return doc;
  }

  async getVersionHistory(projectId: string) {
    return this._repo.getVersionHistory(projectId);
  }

  async getByVersion(projectId: string, version: number) {
    const doc = await this._repo.getByVersion(projectId, version);
    if (!doc) {
      throw new NotFoundException(`Version ${version} not found`);
    }
    return doc;
  }

  async getCurrentOrNull(projectId: string) {
    return this._repo.getCurrent(projectId);
  }
}
