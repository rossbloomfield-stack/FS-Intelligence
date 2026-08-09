import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rossbloomfield.com"),
  title: { default:"Financial Services Transformation Intelligence | Ross Bloomfield", template:"%s | Ross Bloomfield" },
  description:"Board-level intelligence on AI, digital transformation, competitors, regulation and customer change across Irish and global financial services.",
  authors:[{name:"Ross Bloomfield"}], creator:"Ross Bloomfield",
  openGraph:{siteName:"Financial Services Transformation Intelligence",locale:"en_IE",type:"website"},
  twitter:{card:"summary_large_image"},
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-IE"><body>{children}</body></html>;
}
