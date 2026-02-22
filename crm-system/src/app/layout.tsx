import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { SidebarProvider } from "@/components/SidebarContext";
import CommandPalette from "@/components/CommandPalette";
import MainContent from "@/components/MainContent";

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
        <SidebarProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent>
              <TopBar />
              <main className="flex-1 p-4 lg:p-8">{children}</main>
            </MainContent>
          </div>
          <CommandPalette />
        </SidebarProvider>
      </body>
    </html>
  );
}
