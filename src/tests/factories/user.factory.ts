// src/tests/factories/user.factory.ts

export const createMockUser = (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    fullName: 'Default User', // Change this in ONE place for all tests
    password: 'hashed_password',
    createdAt: new Date(),
    ...overrides,
});

/**
 * Creates a mock project with the necessary nested relations
 */
export const createMockProject = (overrides = {}) => ({
    id: 1,
    title: 'Default Project',
    description: 'A test project',
    ownerId: 1,
    owner: createMockUser({ id: 1 }),
    members: [
        { user: createMockUser({ id: 1 }) }
    ],
    tasks: [],
    createdAt: new Date(),
    ...overrides,
});