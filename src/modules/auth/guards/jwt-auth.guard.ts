import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Overriding handleRequest with strict types.
   * We cast info to a Record to safely check for a message without using 'any'.
   */
  public override handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    const infoDict = info as Record<string, unknown> | undefined;

    if (infoDict?.message) {
      console.error('--- 🚨 JWT DEBUG LOG 🚨 ---');
      console.error('Reason:', infoDict.message);
      console.error('---------------------------');
    }

    if (err || !user) {
      // Safely extract the message or fallback to a default string
      const errorMessage =
        typeof infoDict?.message === 'string'
          ? infoDict.message
          : 'Unauthorized Access';

      throw err || new UnauthorizedException(errorMessage);
    }

    return user;
  }
}