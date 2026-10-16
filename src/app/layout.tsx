import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import DatabaseSyncProvider from "@/components/DatabaseSyncProvider";

export const metadata: Metadata = {
  title: "Internship Tracker",
  description: "Track your internship applications and DSA practice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <DatabaseSyncProvider>
          <Navigation />
          {children}
        </DatabaseSyncProvider>
      </body>
    </html>
  );
}
