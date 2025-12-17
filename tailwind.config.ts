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
            colors: {
                background: "var(--background)",
                surface: "var(--surface)",
                surfaceHighlight: "var(--surface-highlight)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "#271A12" // Always dark text on peach buttons for accessibility
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
                // Vibrant peach glow
                'glow': '0 0 40px -10px rgba(251, 146, 60, 0.4)',
            }
        },
    },
    plugins: [],
};
export default config;
