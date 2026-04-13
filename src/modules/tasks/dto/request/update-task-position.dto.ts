import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateTaskPositionDto {
  @ApiProperty({
    example: 1500.5,
    description: 'The new float position for the task'
  })
  @IsNumber()
  @IsNotEmpty()
  public position!: number;
}