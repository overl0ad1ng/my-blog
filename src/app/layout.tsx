import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Aside from "@/components/Aside";
import { ScrollArea } from "@/components/ScrollArea";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "<overl0ad1ng>",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-neutral-900 text-white font-mono">
        <Suspense fallback={<aside className="w-64 shrink-0 px-4 py-6" />}>
          <Aside />
        </Suspense>
        <ScrollArea className="max-h-screen min-w-0 flex-1">
          <div className="p-6">
            {children}
          </div>
        </ScrollArea>
      </body>
    </html>
  );
}
