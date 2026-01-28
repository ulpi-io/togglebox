/**
 * ToggleBox Database Seed Script
 *
 * Seeds demo data directly to the database, bypassing the API.
 * Creates admin user, platforms, environments, configs, flags, and experiments.
 *
 * @usage
 * ```bash
 * # Default (uses DB_TYPE env var, falls back to sqlite)
 * pnpm seed
 *
 * # Explicit database type
 * DB_TYPE=sqlite pnpm seed
 * DB_TYPE=dynamodb pnpm seed
 * DB_TYPE=mysql MYSQL_URL=mysql://... pnpm seed
 * ```
 */

import bcrypt from "bcrypt";
import {
  getDatabase,
  getThreeTierRepositories,
  resetDatabase,
  resetThreeTierRepositories,
  type DatabaseRepositories,
  type ThreeTierRepositories,
} from "@togglebox/database";
import {
  createAuthRepositories,
  type DatabaseType,
  type UserRole,
  type AuthRepositories,
} from "@togglebox/auth";
import type { CreateConfigParameter } from "@togglebox/configs";

// ============================================================================
// CONFIGURATION
// ============================================================================

const ADMIN_EMAIL = "admin@togglebox.com";
const ADMIN_PASSWORD = "Parola123!";
const ADMIN_NAME = "ToggleBox Admin";

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seed(): Promise<void> {
  console.log("🌱 ToggleBox Database Seeder\n");
  console.log("=".repeat(60));

  const dbType = (process.env["DB_TYPE"] || "sqlite") as DatabaseType;
  console.log(`Database type: ${dbType}\n`);

  // Reset singletons to ensure fresh state
  resetDatabase();
  resetThreeTierRepositories();

  // Get repository instances
  const db = getDatabase();
  const threeTier = getThreeTierRepositories();
  let authRepos: AuthRepositories;

  try {
    authRepos = createAuthRepositories(dbType);
  } catch (error) {
    console.error("Failed to create auth repositories:", error);
    console.log(
      "\n⚠️  Auth repositories not available for this database type.",
    );
    console.log("   Skipping user creation. Other entities will be seeded.\n");
    authRepos = null as unknown as AuthRepositories;
  }

  // Step 1: Create admin user
  if (authRepos) {
    await seedAdminUser(authRepos);
  }

  // Step 2: Create platforms
  await seedPlatforms(db);

  // Step 3: Create environments
  await seedEnvironments(db);

  // Step 4: Create config parameters
  await seedConfigParameters(db);

  // Step 5: Create feature flags
  await seedFeatureFlags(threeTier);

  // Step 6: Create experiments
  await seedExperiments(threeTier);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ Seeding complete!");
  console.log("=".repeat(60));

  if (authRepos) {
    console.log("\n📋 Demo Admin Account:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  }

  console.log("\n📋 Created Resources:");
  console.log("   - 3 Platforms: web, mobile, ecommerce");
  console.log("   - 3 Environments: staging (web, mobile), development (ecommerce)");
  console.log("   - 11 Config Parameters: theme, apiTimeout, storeName, currency, taxRate, etc.");
  console.log("   - 7 Feature Flags: dark-mode, beta-features, reviews-enabled, express-shipping, etc.");
  console.log("   - 4 Experiments: checkout-test, cta-test, checkout-button-test, pricing-display-test");

  console.log("\n🚀 Ready to use! Start the API with: pnpm dev:api\n");
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedAdminUser(authRepos: AuthRepositories): Promise<void> {
  console.log("\n📌 Step 1: Creating admin user...");

  try {
    const existingUser = await authRepos.user.findByEmail(ADMIN_EMAIL);

    if (existingUser) {
      console.log(`   ⚠ Admin user '${ADMIN_EMAIL}' already exists`);
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await authRepos.user.create({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: "admin" as UserRole,
    });

    console.log(`   ✓ Admin user '${ADMIN_EMAIL}' created`);
  } catch (error) {
    console.error(`   ✗ Failed to create admin user:`, error);
  }
}

async function seedPlatforms(db: DatabaseRepositories): Promise<void> {
  console.log("\n📌 Step 2: Creating platforms...");

  const platforms = [
    { name: "web", description: "Web platform for Next.js SDK example" },
    { name: "mobile", description: "Mobile platform for Expo SDK example" },
    {
      name: "ecommerce",
      description: "E-commerce platform for Node.js SDK example",
    },
  ];

  for (const platform of platforms) {
    try {
      const existing = await db.platform.getPlatform(platform.name);

      if (existing) {
        console.log(`   ⚠ Platform '${platform.name}' already exists`);
        continue;
      }

      await db.platform.createPlatform({
        name: platform.name,
        description: platform.description,
        createdBy: ADMIN_EMAIL,
        createdAt: new Date().toISOString(),
      });

      console.log(`   ✓ Platform '${platform.name}' created`);
    } catch (error) {
      console.error(`   ✗ Failed to create platform '${platform.name}':`, error);
    }
  }
}

async function seedEnvironments(db: DatabaseRepositories): Promise<void> {
  console.log("\n📌 Step 3: Creating environments...");

  const environments = [
    {
      platform: "web",
      environment: "staging",
      description: "Staging environment for Next.js example",
    },
    {
      platform: "mobile",
      environment: "staging",
      description: "Staging environment for Expo example",
    },
    {
      platform: "ecommerce",
      environment: "development",
      description: "Development environment for Node.js example",
    },
  ];

  for (const env of environments) {
    try {
      const existing = await db.environment.getEnvironment(
        env.platform,
        env.environment,
      );

      if (existing) {
        console.log(
          `   ⚠ Environment '${env.platform}/${env.environment}' already exists`,
        );
        continue;
      }

      await db.environment.createEnvironment({
        platform: env.platform,
        environment: env.environment,
        description: env.description,
        createdBy: ADMIN_EMAIL,
      });

      console.log(
        `   ✓ Environment '${env.platform}/${env.environment}' created`,
      );
    } catch (error) {
      console.error(
        `   ✗ Failed to create environment '${env.platform}/${env.environment}':`,
        error,
      );
    }
  }
}

async function seedConfigParameters(db: DatabaseRepositories): Promise<void> {
  console.log("\n📌 Step 4: Creating config parameters...");

  const configs: CreateConfigParameter[] = [
    {
      platform: "web",
      environment: "staging",
      parameterKey: "theme",
      valueType: "string",
      defaultValue: "dark",
      description: "UI theme setting",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "web",
      environment: "staging",
      parameterKey: "apiTimeout",
      valueType: "number",
      defaultValue: "3000",
      description: "API timeout in milliseconds",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "mobile",
      environment: "staging",
      parameterKey: "theme",
      valueType: "string",
      defaultValue: "dark",
      description: "UI theme setting",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "mobile",
      environment: "staging",
      parameterKey: "apiTimeout",
      valueType: "number",
      defaultValue: "5000",
      description: "API timeout in milliseconds",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "theme",
      valueType: "string",
      defaultValue: "light",
      description: "UI theme setting",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "apiTimeout",
      valueType: "number",
      defaultValue: "5000",
      description: "API timeout in milliseconds",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "cartMaxItems",
      valueType: "number",
      defaultValue: "50",
      description: "Maximum items allowed in shopping cart",
      createdBy: ADMIN_EMAIL,
    },
    // Store configs for Node.js example app
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "storeName",
      valueType: "string",
      defaultValue: "ToggleBox Demo Store",
      description: "Store display name",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "currency",
      valueType: "string",
      defaultValue: "USD",
      description: "Store currency code",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "taxRate",
      valueType: "number",
      defaultValue: "0.08",
      description: "Tax rate (8%)",
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      parameterKey: "freeShippingThreshold",
      valueType: "number",
      defaultValue: "50",
      description: "Minimum order amount for free shipping",
      createdBy: ADMIN_EMAIL,
    },
  ];

  for (const config of configs) {
    try {
      const existing = await db.config.getActive(
        config.platform,
        config.environment,
        config.parameterKey,
      );

      if (existing) {
        console.log(
          `   ⚠ Config '${config.platform}/${config.environment}/${config.parameterKey}' already exists`,
        );
        continue;
      }

      await db.config.create(config);

      console.log(
        `   ✓ Config '${config.platform}/${config.environment}/${config.parameterKey}' created`,
      );
    } catch (error) {
      console.error(
        `   ✗ Failed to create config '${config.platform}/${config.environment}/${config.parameterKey}':`,
        error,
      );
    }
  }
}

async function seedFeatureFlags(threeTier: ThreeTierRepositories): Promise<void> {
  console.log("\n📌 Step 5: Creating feature flags...");

  const flags = [
    {
      platform: "web",
      environment: "staging",
      flagKey: "dark-mode",
      name: "Dark Mode",
      description: "Enable dark mode UI theme",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: false,
      rolloutPercentageA: 100,
      rolloutPercentageB: 0,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "web",
      environment: "staging",
      flagKey: "beta-features",
      name: "Beta Features",
      description: "Enable beta features for testing",
      enabled: false,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "B" as const,
      rolloutEnabled: true,
      rolloutPercentageA: 10,
      rolloutPercentageB: 90,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "mobile",
      environment: "staging",
      flagKey: "dark-mode",
      name: "Dark Mode",
      description: "Enable dark mode UI theme",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: false,
      rolloutPercentageA: 100,
      rolloutPercentageB: 0,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "mobile",
      environment: "staging",
      flagKey: "biometric-auth",
      name: "Biometric Authentication",
      description: "Enable biometric authentication (Face ID/Touch ID)",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: true,
      rolloutPercentageA: 80,
      rolloutPercentageB: 20,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      flagKey: "new-checkout-flow",
      name: "New Checkout Flow",
      description: "Enable the new streamlined checkout flow",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: true,
      rolloutPercentageA: 50,
      rolloutPercentageB: 50,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    // Flags for Node.js example app
    {
      platform: "ecommerce",
      environment: "development",
      flagKey: "reviews-enabled",
      name: "Product Reviews",
      description: "Show product reviews on product pages",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: false,
      rolloutPercentageA: 100,
      rolloutPercentageB: 0,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      flagKey: "express-shipping",
      name: "Express Shipping",
      description: "Enable express shipping option at checkout",
      enabled: true,
      flagType: "boolean" as const,
      valueA: true,
      valueB: false,
      defaultValue: "A" as const,
      rolloutEnabled: true,
      rolloutPercentageA: 70,
      rolloutPercentageB: 30,
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      createdBy: ADMIN_EMAIL,
    },
  ];

  for (const flag of flags) {
    try {
      const exists = await threeTier.flag.exists(
        flag.platform,
        flag.environment,
        flag.flagKey,
      );

      if (exists) {
        console.log(
          `   ⚠ Flag '${flag.platform}/${flag.environment}/${flag.flagKey}' already exists`,
        );
        continue;
      }

      await threeTier.flag.create(flag);

      console.log(
        `   ✓ Flag '${flag.platform}/${flag.environment}/${flag.flagKey}' created`,
      );
    } catch (error) {
      console.error(
        `   ✗ Failed to create flag '${flag.platform}/${flag.environment}/${flag.flagKey}':`,
        error,
      );
    }
  }
}

async function seedExperiments(threeTier: ThreeTierRepositories): Promise<void> {
  console.log("\n📌 Step 6: Creating experiments...");

  const experiments = [
    {
      platform: "web",
      environment: "staging",
      experimentKey: "checkout-test",
      name: "Checkout Flow A/B Test",
      description: "Testing classic vs single-page checkout",
      hypothesis:
        "Single-page checkout will increase conversion rate by 10%",
      variations: [
        {
          key: "classic",
          name: "Classic Checkout",
          value: { layout: "multi-page" },
          isControl: true,
        },
        {
          key: "single-page",
          name: "Single Page Checkout",
          value: { layout: "single-page" },
          isControl: false,
        },
        {
          key: "express",
          name: "Express Checkout",
          value: { layout: "express" },
          isControl: false,
        },
      ],
      controlVariation: "classic",
      trafficAllocation: [
        { variationKey: "classic", percentage: 34 },
        { variationKey: "single-page", percentage: 33 },
        { variationKey: "express", percentage: 33 },
      ],
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      primaryMetric: {
        id: "purchase",
        name: "Purchase Conversion",
        eventName: "purchase",
        metricType: "conversion" as const,
        successDirection: "increase" as const,
      },
      confidenceLevel: 0.95,
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "mobile",
      environment: "staging",
      experimentKey: "cta-test",
      name: "CTA Button Text Test",
      description: "Testing different call-to-action button texts",
      hypothesis:
        "Action-oriented CTA text will increase tap rate by 15%",
      variations: [
        {
          key: "get-started",
          name: "Get Started",
          value: { buttonText: "Get Started" },
          isControl: true,
        },
        {
          key: "free-trial",
          name: "Start Free Trial",
          value: { buttonText: "Start Free Trial" },
          isControl: false,
        },
        {
          key: "try-now",
          name: "Try Now",
          value: { buttonText: "Try Now" },
          isControl: false,
        },
      ],
      controlVariation: "get-started",
      trafficAllocation: [
        { variationKey: "get-started", percentage: 34 },
        { variationKey: "free-trial", percentage: 33 },
        { variationKey: "try-now", percentage: 33 },
      ],
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      primaryMetric: {
        id: "cta_click",
        name: "CTA Click Rate",
        eventName: "cta_clicked",
        metricType: "conversion" as const,
        successDirection: "increase" as const,
      },
      confidenceLevel: 0.95,
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      experimentKey: "checkout-button-test",
      name: "Checkout Button Label Test",
      description: "Testing different checkout button labels",
      hypothesis:
        "Urgency-driven button label will increase checkout rate by 8%",
      variations: [
        {
          key: "purchase",
          name: "Complete Purchase",
          value: { label: "Complete Purchase" },
          isControl: true,
        },
        {
          key: "buy-now",
          name: "Buy Now",
          value: { label: "Buy Now" },
          isControl: false,
        },
        {
          key: "add-to-cart",
          name: "Add to Cart",
          value: { label: "Add to Cart" },
          isControl: false,
        },
      ],
      controlVariation: "purchase",
      trafficAllocation: [
        { variationKey: "purchase", percentage: 34 },
        { variationKey: "buy-now", percentage: 33 },
        { variationKey: "add-to-cart", percentage: 33 },
      ],
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      primaryMetric: {
        id: "checkout_complete",
        name: "Checkout Completion",
        eventName: "checkout_completed",
        metricType: "conversion" as const,
        successDirection: "increase" as const,
      },
      confidenceLevel: 0.95,
      createdBy: ADMIN_EMAIL,
    },
    {
      platform: "ecommerce",
      environment: "development",
      experimentKey: "pricing-display-test",
      name: "Pricing Display Test",
      description: "Testing tax-included vs tax-excluded pricing display",
      hypothesis:
        "Showing tax-included pricing will increase purchase rate by 12%",
      variations: [
        {
          key: "tax-excluded",
          name: "Tax Excluded",
          value: { showTaxIncluded: false },
          isControl: true,
        },
        {
          key: "tax-included",
          name: "Tax Included",
          value: { showTaxIncluded: true },
          isControl: false,
        },
      ],
      controlVariation: "tax-excluded",
      trafficAllocation: [
        { variationKey: "tax-excluded", percentage: 50 },
        { variationKey: "tax-included", percentage: 50 },
      ],
      targeting: {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      primaryMetric: {
        id: "add_to_cart",
        name: "Add to Cart Rate",
        eventName: "add_to_cart",
        metricType: "conversion" as const,
        successDirection: "increase" as const,
      },
      confidenceLevel: 0.95,
      createdBy: ADMIN_EMAIL,
    },
  ];

  for (const experiment of experiments) {
    try {
      const exists = await threeTier.experiment.exists(
        experiment.platform,
        experiment.environment,
        experiment.experimentKey,
      );

      if (exists) {
        console.log(
          `   ⚠ Experiment '${experiment.platform}/${experiment.environment}/${experiment.experimentKey}' already exists`,
        );
        continue;
      }

      await threeTier.experiment.create(experiment);

      console.log(
        `   ✓ Experiment '${experiment.platform}/${experiment.environment}/${experiment.experimentKey}' created`,
      );

      // Start the experiment (draft → running)
      await threeTier.experiment.start(
        experiment.platform,
        experiment.environment,
        experiment.experimentKey,
        ADMIN_EMAIL,
      );

      console.log(
        `   ✓ Experiment '${experiment.platform}/${experiment.environment}/${experiment.experimentKey}' started`,
      );
    } catch (error) {
      console.error(
        `   ✗ Failed to create/start experiment '${experiment.platform}/${experiment.environment}/${experiment.experimentKey}':`,
        error,
      );
    }
  }
}

// ============================================================================
// RUN
// ============================================================================

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  });
