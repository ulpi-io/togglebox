/**
 * Business logic services for authentication.
 *
 * @module services
 *
 * @remarks
 * Core services:
 * - {@link UserService} - User registration, login, management
 * - {@link ApiKeyService} - API key creation, verification, revocation
 * - {@link PasswordResetService} - Password reset flow (3-step)
 * - {@link EmailService} - Transactional emails via SMTP
 */
export * from './UserService';
export * from './PasswordResetService';
export * from './ApiKeyService';
export * from './EmailService';
