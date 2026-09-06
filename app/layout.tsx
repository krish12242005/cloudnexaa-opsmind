"use client";
import "./globals.css";
import "./premium-ui.css";
import "./globals.css";
import AppShell from "./components/AppShell";
import ScanRefreshBridge from "./components/ScanRefreshBridge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppShell><ScanRefreshBridge />{children}</AppShell>
      </body>
    </html>
  );
}


