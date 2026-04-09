import { Request } from 'express';

/**
 * Interface representing the Express Request object
 * augmented with the user data from JwtStrategy.
 */
export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    fullName: string;
    // Add other fields if JWT strategy returns them (e.g., name, role)
  };
}