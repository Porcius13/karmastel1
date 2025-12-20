import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-noto)', 'sans-serif'],
                display: ['var(--font-jakarta)', 'sans-serif'],
            },
            colors: {
                background: "var(--background)",
                surface: {
                    DEFAULT: "var(--surface)",
                    secondary: "var(--surface-secondary)"
                },
                // surfaceHighlight: "var(--surface-highlight)", // Removing unused
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)"
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)"
                },
                // Foreground maps to the main text color variable
                foreground: "var(--text-main)",

                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)"
                },
                border: "var(--border)",

                danger: "#EF4444",
                success: "#22C55E"
            },
            borderRadius: {
                lg: "0.75rem",
                xl: "1rem",
                '2xl': "1.5rem"
            },
            boxShadow: {
                // Vibrant glow using CSS variable for theme support
                'glow': 'var(--shadow-glow)',
            }
        },
    },
    plugins: [],
};
export default config;
