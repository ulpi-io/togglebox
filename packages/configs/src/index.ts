/**
 * @togglebox/configs
 *
 * Remote configuration management package (Tier 1 of three-tier architecture).
 * Provides schemas and types for versioned configuration management.
 *
 * @remarks
 * This package handles arbitrary JSON configurations with:
 * - Platform/environment organization
 * - Immutable versioning
 * - Stable version flagging
 * - Cache invalidation support
 *
 * **Three-Tier Architecture:**
 * - Tier 1: Remote Configs (@togglebox/configs) - Arbitrary JSON configs
 * - Tier 2: Feature Flags (@togglebox/flags) - 2-value model
 * - Tier 3: Experiments (@togglebox/experiments) - Multi-variant A/B testing
 */

export * from './schemas';
