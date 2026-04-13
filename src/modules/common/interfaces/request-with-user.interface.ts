import { FastifyRequest } from 'fastify';

export interface RequestWithUser extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    fullName: string;
  };
}