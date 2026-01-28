import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        border: "#000000",
        input: "#000000",
        ring: "#000000",
        background: "#FFFFFF",
        foreground: "#000000",
        primary: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F5F5",
          foreground: "#000000",
        },
        accent: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#666666",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#CA8A04",
          foreground: "#FFFFFF",
        },
        info: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF",
        },
      },
      borderWidth: {
        DEFAULT: "1px",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        black: "900",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      spacing: {
        px: "1px",
        0: "0",
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        11: "2.75rem",
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        20: "5rem",
        24: "6rem",
        28: "7rem",
        32: "8rem",
      },
      boxShadow: {
        glass:
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        "glass-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        "glass-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "40px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-to-top": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
        "slide-out-to-bottom": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        "slide-out-to-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "slide-out-to-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "zoom-in": {
          "0%": { transform: "scale(0.95) translate3d(0,0,0)", opacity: "0" },
          "100%": { transform: "scale(1) translate3d(0,0,0)", opacity: "1" },
        },
        "zoom-out": {
          "0%": { transform: "scale(1) translate3d(0,0,0)", opacity: "1" },
          "100%": { transform: "scale(0.95) translate3d(0,0,0)", opacity: "0" },
        },
        "accordion-down": {
          "0%": { height: "0" },
          "100%": { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          "0%": { height: "var(--radix-accordion-content-height)" },
          "100%": { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 100ms ease-out",
        "fade-out": "fade-out 75ms ease-out",
        "slide-in-from-top": "slide-in-from-top 150ms ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 150ms ease-out",
        "slide-in-from-left": "slide-in-from-left 150ms ease-out",
        "slide-in-from-right": "slide-in-from-right 150ms ease-out",
        "slide-out-to-top": "slide-out-to-top 100ms ease-out",
        "slide-out-to-bottom": "slide-out-to-bottom 100ms ease-out",
        "slide-out-to-left": "slide-out-to-left 100ms ease-out",
        "slide-out-to-right": "slide-out-to-right 100ms ease-out",
        "zoom-in": "zoom-in 100ms ease-out",
        "zoom-out": "zoom-out 75ms ease-out",
        "accordion-down": "accordion-down 150ms ease-out",
        "accordion-up": "accordion-up 100ms ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default preset;
