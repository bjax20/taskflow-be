import { PickType } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

/**
 * LoginDto automatically inherits email and password
 * from RegisterDto. If you add a field to RegisterDto
 * and pick it here, it updates automatically.
 */
export class LoginDto extends PickType(RegisterDto, ['email', 'password'] as const) {}