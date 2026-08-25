"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  ["This Week", "/intelligence/reports"], ["Signals", "/intelligence/signals"],
  ["Competitors", "/intelligence/competitors"], ["AI", "/intelligence/ai"],
  ["Regulation", "/intelligence/regulation"], ["Actions", "/intelligence/actions"],
  ["Archive", "/intelligence/archive"],
];

export function IntelligenceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/intelligence/login") return children;
  return <div className="min-h-screen"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link href="/intelligence" className="flex min-w-0 items-center gap-3" aria-label="Financial Services Transformation Intelligence home"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--purple)] font-bold text-white">FI</span><span className="min-w-0"><strong className="block truncate text-sm tracking-wide">TRANSFORMATION INTELLIGENCE</strong><span className="text-xs text-[var(--muted)]">Irish financial services</span></span></Link><details className="utility-menu"><summary aria-label="Open utility menu">RB</summary><div><Link href="/intelligence/about">About</Link><Link href="/intelligence/methodology">Methodology</Link><Link href="/intelligence/sources">Sources</Link><Link href="/intelligence/admin">Administration</Link></div></details></div><nav aria-label="Primary" className="primary-nav mx-auto max-w-[1500px] px-4 sm:px-6"><details><summary>Explore intelligence</summary><div>{nav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</div></details><div className="desktop-nav">{nav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</div></nav></header><main>{children}</main><footer className="mt-12 border-t border-[var(--line)] bg-white"><div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto]"><div><p className="font-semibold">Financial Services Transformation Intelligence</p><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Independent analysis and strategic interpretation by Ross Bloomfield. Ireland-first intelligence covering competitors, customers, technology, regulation and transformation.</p></div><nav aria-label="Secondary" className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--purple)]"><Link href="/intelligence/about">About</Link><Link href="/intelligence/methodology">Methodology</Link><Link href="/intelligence/sources">Sources</Link><Link href="/intelligence/archive">Archive</Link></nav></div></footer></div>;
}
