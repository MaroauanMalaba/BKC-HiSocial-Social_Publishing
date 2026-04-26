import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HiSocial Studio",
  description: "Social Publishing Platform by BKC Consulting",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={jakarta.variable} data-theme="light" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('hs-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}` }}
        />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-sans)", background: "var(--bg-base)", color: "var(--text-1)" }}>
        <div className="glass-canvas" aria-hidden="true"/>
        {children}
      </body>
    </html>
  );
}
