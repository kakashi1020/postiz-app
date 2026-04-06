import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StrategyService } from '@gitroom/nestjs-libraries/strategy/strategy.service';
import { Market } from '@prisma/client';
import {
  GenerateStrategyDto,
  GenerateHooksDto,
  GenerateScriptDto,
  GenerateCaptionDto,
  AnalyzeOutlierDto,
} from '@gitroom/nestjs-libraries/dtos/strategy/strategy.dto';

@ApiTags('Strategy')
@Controller('/strategy')
export class StrategyController {
  constructor(private _strategyService: StrategyService) {}

  @Post('/generate')
  async generateStrategy(@Body() body: GenerateStrategyDto) {
    return this._strategyService.generateStrategy(
      body.projectId,
      body.market,
      body.platform,
      body.funnelStage,
      body.frameworkDoc
    );
  }

  @Get('/:projectId/:market/:platform')
  async getStrategy(
    @Param('projectId') projectId: string,
    @Param('market') market: Market,
    @Param('platform') platform: string
  ) {
    return this._strategyService.getStrategyByScope(projectId, market, platform);
  }

  @Get('/:id/hooks')
  async getHooks(@Param('id') id: string) {
    return this._strategyService.getHooks(id);
  }

  @Get('/:id/scripts')
  async getScripts(@Param('id') id: string) {
    return this._strategyService.getScripts(id);
  }

  @Post('/:id/hooks/generate')
  async generateHooks(
    @Param('id') id: string,
    @Body() body: GenerateHooksDto
  ) {
    return this._strategyService.generateHooks(id, body.topic, body.count || 10);
  }

  @Post('/:id/scripts/generate')
  async generateScript(
    @Param('id') id: string,
    @Body() body: GenerateScriptDto
  ) {
    return this._strategyService.generateScript(id, body.topic, body.structure);
  }

  @Post('/caption')
  async generateCaption(@Body() body: GenerateCaptionDto) {
    return this._strategyService.generateCaption(
      body.market,
      body.platform,
      body.pillar,
      body.postContent
    );
  }

  @Post('/analyze-outlier')
  async analyzeOutlier(@Body() body: AnalyzeOutlierDto) {
    return this._strategyService.analyzeOutlier(body.postContent, body.market);
  }
}
