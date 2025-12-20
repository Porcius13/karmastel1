import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Miayis Dashboard",
  description: "Universal Wishlist Tracker",
};

import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthContextProvider } from "@/context/AuthContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased font-sans bg-background text-[var(--text-main)]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthContextProvider>
            {children}
            <ThemeSwitcher />
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
