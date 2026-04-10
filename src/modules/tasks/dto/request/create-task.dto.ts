import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional, IsInt, MinLength, MaxLength, IsEnum } from 'class-validator';


export class CreateTaskDto {
  @ApiProperty({
    example: 'Implement JWT Refresh Tokens',
    description: 'The title of the task'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  public title!: string;

  @ApiPropertyOptional({
    example: 'Setup rotating refresh tokens for enhanced security',
    description: 'Detailed description of the work'
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  public description?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'The User ID of the person assigned to this task'
  })
  @IsInt()
  @IsOptional()
  public assigneeId?: number;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.TODO,
    description: 'The initial status of the task'
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  public status?: TaskStatus;
}