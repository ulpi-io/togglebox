/**
 * Tests for secret validation
 *
 * Verifies that JWT_SECRET and API_KEY_SECRET validation correctly rejects:
 * - Placeholder values like <GENERATE_RANDOM_STRING_MIN_32_CHARS>
 * - Weak secrets shorter than 32 characters
 * - Common weak patterns (your-secret, change-this, etc.)
 */

import { validateEnv } from '../env';

describe('Secret Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Clear the parsed env from previous tests
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('JWT_SECRET validation', () => {
    it('should reject placeholder pattern <GENERATE_RANDOM_STRING_MIN_32_CHARS>', () => {
      process.env['JWT_SECRET'] = '<GENERATE_RANDOM_STRING_MIN_32_CHARS>';
      process.env['API_KEY_SECRET'] = 'valid-secret-at-least-32-characters-long-12345';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/appears to be a placeholder or weak secret/);
    });

    it('should reject secrets shorter than 32 characters', () => {
      process.env['JWT_SECRET'] = 'short-secret';
      process.env['API_KEY_SECRET'] = 'valid-secret-at-least-32-characters-long-12345';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/must be at least 32 characters/);
    });

    it('should reject weak pattern "your-secret"', () => {
      process.env['JWT_SECRET'] = 'your-secret-please-change-this-value-now';
      process.env['API_KEY_SECRET'] = 'valid-secret-at-least-32-characters-long-12345';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/appears to be a placeholder or weak secret/);
    });

    it('should reject weak pattern "change-this"', () => {
      process.env['JWT_SECRET'] = 'change-this-to-a-strong-secret-value';
      process.env['API_KEY_SECRET'] = 'valid-secret-at-least-32-characters-long-12345';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/appears to be a placeholder or weak secret/);
    });

    it('should accept strong random secret', () => {
      // Generated with: openssl rand -base64 32
      process.env['JWT_SECRET'] = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';
      process.env['API_KEY_SECRET'] = 'x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).not.toThrow();
    });

    it('should allow missing JWT_SECRET when auth is not required', () => {
      process.env['NODE_ENV'] = 'development';
      // No JWT_SECRET or API_KEY_SECRET set

      expect(() => {
        validateEnv(); // No requireAuth option
      }).not.toThrow();
    });

    it('should reject missing JWT_SECRET when auth is required', () => {
      process.env['NODE_ENV'] = 'development';
      // No JWT_SECRET set

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/JWT_SECRET or API_KEY_SECRET is missing/);
    });
  });

  describe('API_KEY_SECRET validation', () => {
    it('should reject placeholder pattern', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = '<GENERATE_RANDOM_STRING_MIN_32_CHARS>';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/appears to be a placeholder or weak secret/);
    });

    it('should reject secrets shorter than 32 characters', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'short';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).toThrow(/must be at least 32 characters/);
    });

    it('should accept strong random secret', () => {
      process.env['JWT_SECRET'] = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';
      process.env['API_KEY_SECRET'] = 'z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true });
      }).not.toThrow();
    });
  });

  describe('Stripe key validation (Cloud)', () => {
    it('should reject STRIPE_SECRET_KEY without sk_ prefix', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'valid-api-key-secret-at-least-32-characters-xyz';
      process.env['STRIPE_SECRET_KEY'] = 'invalid_key_format';
      process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_validformat123';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true, requireStripe: true });
      }).toThrow(/must start with sk_test_ or sk_live_/);
    });

    it('should reject STRIPE_WEBHOOK_SECRET without whsec_ prefix', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'valid-api-key-secret-at-least-32-characters-xyz';
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_validformat123';
      process.env['STRIPE_WEBHOOK_SECRET'] = 'invalid_webhook_secret';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true, requireStripe: true });
      }).toThrow(/must start with whsec_/);
    });

    it('should accept valid Stripe keys', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'valid-api-key-secret-at-least-32-characters-xyz';
      process.env['STRIPE_SECRET_KEY'] = 'sk_test_51HxYz123456789abcdefghijklmnop';
      process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_abcdefghijklmnopqrstuvwxyz123456789';
      process.env['STRIPE_PRICE_PRO_MONTHLY'] = 'price_1234567890abcdef';
      process.env['STRIPE_PRICE_PRO_YEARLY'] = 'price_abcdef1234567890';
      process.env['STRIPE_PRICE_ENTERPRISE_MONTHLY'] = 'price_enterprise_monthly_123';
      process.env['STRIPE_PRICE_ENTERPRISE_YEARLY'] = 'price_enterprise_yearly_456';
      process.env['STRIPE_PRICE_API_REQUESTS'] = 'price_api_requests_789';
      process.env['RESEND_API_KEY'] = 're_validformat123';
      process.env['FROM_EMAIL'] = 'noreply@example.com';
      process.env['FROM_NAME'] = 'Test';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true, requireStripe: true, requireResend: true });
      }).not.toThrow();
    });
  });

  describe('Resend API key validation (Cloud)', () => {
    it('should reject RESEND_API_KEY without re_ prefix', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'valid-api-key-secret-at-least-32-characters-xyz';
      process.env['RESEND_API_KEY'] = 'invalid_resend_key';
      process.env['FROM_EMAIL'] = 'test@example.com';
      process.env['FROM_NAME'] = 'Test';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true, requireResend: true });
      }).toThrow(/must start with re_/);
    });

    it('should accept valid Resend API key', () => {
      process.env['JWT_SECRET'] = 'valid-jwt-secret-at-least-32-characters-long-abc';
      process.env['API_KEY_SECRET'] = 'valid-api-key-secret-at-least-32-characters-xyz';
      process.env['RESEND_API_KEY'] = 're_validformat123456789';
      process.env['FROM_EMAIL'] = 'noreply@example.com';
      process.env['FROM_NAME'] = 'ToggleBox';
      process.env['NODE_ENV'] = 'development';

      expect(() => {
        validateEnv({ requireAuth: true, requireResend: true });
      }).not.toThrow();
    });
  });
});
