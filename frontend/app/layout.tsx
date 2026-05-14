import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LingoClaw — Tear Through Language Barriers",
  description: "AI-powered language learning with LingoClaw. Master Spanish, Japanese, French, and more with personalized lessons, stories, and real-time AI tutoring.",
  icons: { icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐾</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Prevent MetaMask/web3 extensions from crashing when window.ethereum is undefined */}
        <script dangerouslySetInnerHTML={{ __html: "window.ethereum=window.ethereum||{};" }} />
      </head>
      <body className="bg-void text-white antialiased">{children}</body>
    </html>
  );
}
