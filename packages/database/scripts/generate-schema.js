#!/usr/bin/env node
/**
 * Generates Prisma schema with correct provider based on DB_TYPE environment variable
 *
 * Usage:
 *   DB_TYPE=postgresql node scripts/generate-schema.js
 *   DB_TYPE=mysql node scripts/generate-schema.js
 */

const fs = require('fs');
const path = require('path');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Map DB_TYPE to Prisma provider
const providerMap = {
  'mysql': 'mysql',
  'postgresql': 'postgresql',
  'sqlite': 'sqlite',
};

const provider = providerMap[DB_TYPE];

if (!provider) {
  console.error(`Unsupported DB_TYPE: ${DB_TYPE}`);
  console.error(`Supported types: ${Object.keys(providerMap).join(', ')}`);
  process.exit(1);
}

// Read the base schema template
const schemaTemplatePath = path.join(__dirname, '../prisma/schema.prisma.template');
const schemaOutputPath = path.join(__dirname, '../prisma/schema.prisma');

let schemaContent;

if (fs.existsSync(schemaTemplatePath)) {
  // If template exists, use it
  schemaContent = fs.readFileSync(schemaTemplatePath, 'utf8');
} else {
  // Otherwise, read the current schema
  schemaContent = fs.readFileSync(schemaOutputPath, 'utf8');
}

// Replace the provider placeholder
schemaContent = schemaContent.replace(
  /provider\s*=\s*"(mysql|postgresql|sqlite)"/,
  `provider = "${provider}"`
);

// Write the generated schema
fs.writeFileSync(schemaOutputPath, schemaContent, 'utf8');

console.log(`✅ Generated Prisma schema with provider: ${provider}`);
console.log(`   DB_TYPE: ${DB_TYPE}`);
console.log(`   Output: ${schemaOutputPath}`);
