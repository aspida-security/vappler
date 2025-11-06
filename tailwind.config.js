/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
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
    border: "var(--color-border)",
    input: "var(--color-input)",
    ring: "var(--color-ring)",
    background: "var(--color-background)",
    foreground: "var(--color-foreground)",
    // Custom Charcoal Color definition (Primary Base #4A5557)
    charcoal: {
      DEFAULT: '#4A5557',
    },
    primary: {
      DEFAULT: "var(--color-primary)",
      foreground: "var(--color-primary-foreground)",
    },
    secondary: {
      DEFAULT: "var(--color-secondary)",
      foreground: "var(--color-secondary-foreground)",
    },
    destructive: {
      DEFAULT: "var(--color-destructive)",
      foreground: "var(--color-destructive-foreground)",
    },
    muted: {
      DEFAULT: "var(--color-muted)",
      foreground: "var(--color-muted-foreground)",
    },
    accent: {
      DEFAULT: "var(--color-accent)",
      foreground: "var(--color-accent-foreground)",
    },
    popover: {
      DEFAULT: "var(--color-popover)",
      foreground: "var(--color-popover-foreground)",
    },
    card: {
      DEFAULT: "var(--color-card)",
      foreground: "var(--color-card-foreground)",
    },
    // Semantic Status Colors (mapped from CSS variables)
    warning: {
      DEFAULT: "var(--color-warning)",    // ⬅️ Amber mapped to --color-warning
      foreground: "var(--color-foreground)",
    },
    error: {
      DEFAULT: "var(--color-error)",      // ⬅️ Red mapped to --color-error
      foreground: "var(--color-foreground)",
    },
    medium: {
      DEFAULT: "var(--color-medium)",     // ⬅️ Yellow mapped to --color-medium
      foreground: "var(--color-foreground)",
    },
    low: {
      DEFAULT: "var(--color-low)",        // ⬅️ Blue mapped to --color-low
      foreground: "var(--color-foreground)",
    },
    info: {
      DEFAULT: "var(--color-info)",       // ⬅️ Gray mapped to --color-info
      foreground: "var(--color-foreground)",
    },
    success: {
      DEFAULT: "var(--color-success)",    // ⬅️ Green mapped to --color-success
      foreground: "var(--color-foreground)",
    },
  },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in": "slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}