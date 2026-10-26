import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const interFont = localFont({
  src: "../public/fonts/inter/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Botchat",
  title: {
    default: "Botchat - Expert AI Chat Workspace",
    template: "%s | Botchat",
  },
  description:
    "A chat-first AI workspace for expert personas, multi-session conversations, streaming responses, file attachments, and readable markdown/code output.",
  keywords: [
    "Botchat",
    "AI chat workspace",
    "expert AI assistant",
    "multi-session chat",
    "AI dashboard",
    "Supabase chat",
  ],
  authors: [{ name: "Botchat" }],
  creator: "Botchat",
  publisher: "Botchat",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/botchat-mark.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/botchat-mark.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Botchat",
    title: "Botchat - Expert AI Chat Workspace",
    description:
      "Build focused conversations with expert personas, streaming AI responses, attachments, and polished markdown/code output.",
    images: [
      {
        url: "/botchat-community-share.png",
        width: 1200,
        height: 630,
        alt: "Botchat expert AI chat workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Botchat - Expert AI Chat Workspace",
    description:
      "A chat-first dashboard for expert personas, multi-session AI conversations, and readable markdown/code output.",
    images: ["/botchat-community-share.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={interFont.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
