import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Utility to get a valid JWT for E2E tests.
 */
export async function getAccessToken(app: INestApplication, email = 'test@example.com'): Promise<string> {
  // 1. Cast getHttpServer() to 'App' to satisfy no-unsafe-argument
  const server = app.getHttpServer() as App;

  const loginRes = await request(server)
    .post('/auth/login')
    .send({
        email,
        password: 'password123'
    });

  // If login fails, show debug status
  if (loginRes.status !== 201 && loginRes.status !== 200) {
    throw new Error(`Failed to get access token: ${JSON.stringify(loginRes.body)}`);
  }

  // Define the shape of the body to avoid .accessToken being 'any'
  const body = loginRes.body as { accessToken: string };

  // Return the typed value
  return body.accessToken;
}