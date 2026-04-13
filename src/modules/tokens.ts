/**
 * These tokens are used for NestJS custom providers.
 * They prevent "Magic Strings" and ensure Type Safety across the app.
 */
export enum Service {
    CONFIG = 'config.service',
    STORAGE = 'storage.service',
}

export enum Role {
    ADMIN = 'admin',
    USER = 'user',
    MANAGER = 'manager'
}