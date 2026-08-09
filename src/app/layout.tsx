sed: --: No such file or directory
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Financial Services Intelligence", description: "Board-level transformation intelligence for Irish financial services." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
