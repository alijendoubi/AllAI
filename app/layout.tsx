import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AnalyticsProvider } from "@/components/providers/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "InboxPilot — AI Email Assistant",
  description: "Never miss a client follow-up with AI-powered email triage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="min-h-full bg-[#0F0F0F] text-[#F5F5F5] antialiased">
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
