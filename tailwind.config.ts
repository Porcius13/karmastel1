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
                background: "#0F172A", // Deep Charcoal
                surface: "#1E293B",     // Card Background
                surfaceHighlight: "#334155", // Hover states
                primary: {
                    DEFAULT: "#F9F506", // Acid Yellow
                    foreground: "#000000"
                },
                muted: {
                    DEFAULT: "#64748B",
                    foreground: "#94A3B8"
                },
                danger: "#EF4444",
                success: "#22C55E"
            },
            borderRadius: {
                lg: "0.75rem",
                xl: "1rem",
                '2xl': "1.5rem"
            },
        },
    },
    plugins: [],
};
export default config;
