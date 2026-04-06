import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  public email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  public password!: string;
}