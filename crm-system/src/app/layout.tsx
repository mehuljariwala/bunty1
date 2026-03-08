import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/components/SidebarContext";
import { AuthProvider } from "@/lib/auth-context";
import AuthGate from "@/components/AuthGate";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "Bloom CRM",
  description: "Simple, friendly customer relationship management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-crm-bg text-crm-text">
        <QueryProvider>
          <SidebarProvider>
            <AuthProvider>
              <AuthGate>{children}</AuthGate>
            </AuthProvider>
          </SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
