import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROAST ME Miniapp",
  description: "Cheeky Farcaster roasts, fueled by your latest casts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

