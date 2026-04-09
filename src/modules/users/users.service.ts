import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserBaseDto } from './dto/user-base.dto';

@Injectable()
export class UsersService {
  public constructor(private readonly prisma: PrismaService) { }

  /**
   * Find a user by their unique ID
   * @param id The numeric ID of the user
   */
  public async findById(id: number): Promise<UserBaseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        // Explicitly exclude password for security
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Helper to find a user by email for Auth logic
   */
  public async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}