import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'oklch(98% 0.005 280 / <alpha-value>)',
        surface: 'oklch(100% 0 0 / <alpha-value>)',
        ink: 'oklch(20% 0.02 280 / <alpha-value>)',
        muted: 'oklch(55% 0.02 280 / <alpha-value>)',
        line: 'oklch(92% 0.01 280 / <alpha-value>)',
        accent: 'oklch(62% 0.18 25 / <alpha-value>)',
        up: 'oklch(60% 0.18 145 / <alpha-value>)',
        down: 'oklch(60% 0.22 25 / <alpha-value>)'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
