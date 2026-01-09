import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Brand Colors - Rápidos 3T Identity
        brand: {
          red: "hsl(var(--brand-red))",
          green: "hsl(var(--brand-green))",
          dark: "hsl(var(--brand-dark))",
          black: "hsl(var(--brand-black))",
        },
        // TMS Status Colors
        status: {
          success: "hsl(var(--status-success))",
          "success-bg": "hsl(var(--status-success-bg))",
          "success-border": "hsl(var(--status-success-border))",
          warning: "hsl(var(--status-warning))",
          "warning-bg": "hsl(var(--status-warning-bg))",
          "warning-border": "hsl(var(--status-warning-border))",
          danger: "hsl(var(--status-danger))",
          "danger-bg": "hsl(var(--status-danger-bg))",
          "danger-border": "hsl(var(--status-danger-border))",
          info: "hsl(var(--status-info))",
          "info-bg": "hsl(var(--status-info-bg))",
          "info-border": "hsl(var(--status-info-border))",
        },
        // Action Button Colors (Brand Green)
        action: {
          DEFAULT: "hsl(var(--action))",
          hover: "hsl(var(--action-hover))",
          foreground: "hsl(var(--action-foreground))",
        },
        // Table Colors
        table: {
          header: "hsl(var(--table-header))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
