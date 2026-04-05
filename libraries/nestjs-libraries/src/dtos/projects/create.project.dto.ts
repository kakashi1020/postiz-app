import { IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsDefined()
  slug: string;
}
