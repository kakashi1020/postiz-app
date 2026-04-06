import { IsDefined, IsOptional, IsString } from 'class-validator';

export class RejectPostDto {
  @IsDefined()
  @IsString()
  reason: string;
}

export class RequestChangesDto {
  @IsDefined()
  @IsString()
  reason: string;
}

export class ApprovePostDto {
  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}
