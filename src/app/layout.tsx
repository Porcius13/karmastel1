import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans, Luckiest_Guy } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin"],
  display: "swap",
});

const luckiestGuy = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FAVDUCK",
  description: "Universal Wishlist Tracker",
};

import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthContextProvider } from "@/context/AuthContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LanguageProvider } from "@/context/LanguageContext";

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
        <link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap" rel="stylesheet" />
      </head>
      <body className={`${jakarta.variable} ${notoSans.variable} ${luckiestGuy.variable} antialiased font-sans bg-background text-[var(--text-main)]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthContextProvider>
            <LanguageProvider>
              {children}
              <ThemeSwitcher />
            </LanguageProvider>
          </AuthContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
