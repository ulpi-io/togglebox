export const Colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
export const PLATFORM = process.env.EXPO_PUBLIC_PLATFORM || 'mobile'
export const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'staging'
export const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_USER_ID || 'demo-user-123'
