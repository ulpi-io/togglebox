export const env = {
  PORT: parseInt(process.env.PORT || '3003', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ToggleBox
  PLATFORM: process.env.TOGGLEBOX_PLATFORM || 'ecommerce',
  ENVIRONMENT: process.env.TOGGLEBOX_ENVIRONMENT || 'development',
  TOGGLEBOX_API_URL: process.env.TOGGLEBOX_API_URL || 'http://localhost:3000/api/v1',
  TOGGLEBOX_API_KEY: process.env.TOGGLEBOX_API_KEY,
}
