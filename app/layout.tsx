import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BKC HiSocial — Social Publishing",
  description: "Internal social publishing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full bg-neutral-950 text-neutral-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
