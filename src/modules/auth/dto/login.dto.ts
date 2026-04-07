import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'neil.armstrong@example.com',
    description: 'The registered email address of the user',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email' })
  public email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'The user password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  public password!: string;
}