import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'e2e-auth@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'A secure password',
  })
  @IsNotEmpty()
  @MinLength(6)
  public password!: string;
}