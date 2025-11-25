import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#000000',
        input: '#000000',
        ring: '#000000',
        background: '#FFFFFF',
        foreground: '#000000',
        primary: {
          DEFAULT: '#000000',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F5F5',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: '#000000',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#666666',
        },
        destructive: {
          DEFAULT: '#FF0000',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#00FF00',
          foreground: '#000000',
        },
      },
      borderWidth: {
        DEFAULT: '2px',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        bold: '700',
        black: '900',
      },
      fontSize: {
        xs: ['10px', { lineHeight: '14px' }],
        sm: ['12px', { lineHeight: '16px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
        '4xl': ['48px', { lineHeight: '56px' }],
      },
      spacing: {
        px: '1px',
        0: '0',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
    },
  },
  plugins: [],
};

export default config;
