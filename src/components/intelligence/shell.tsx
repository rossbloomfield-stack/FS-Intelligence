import Link from "next/link";
import { Bell, ChevronDown, Search } from "lucide-react";

const nav = [
  ["Overview", "/intelligence"],
  ["This Week", "/intelligence/reports"],
  ["Signals & Indicators", "/intelligence/signals"],
  ["Competitors", "/intelligence/competitors"],
  ["AI & Transformation", "/intelligence/ai"],
  ["Regulation", "/intelligence/regulation"],
  ["Customer Signals", "/intelligence/customers"],
  ["Strategic Actions", "/intelligence/actions"],
  ["Sources", "/intelligence/sources"],
  ["Archive", "/intelligence/archive"],
  ["Admin", "/intelligence/admin"],
];

export function IntelligenceShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4"><Link href="/intelligence" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[var(--purple)] font-bold text-white">FI</span><span><strong className="block text-sm tracking-wide">TRANSFORMATION INTELLIGENCE</strong><span className="text-xs text-[var(--muted)]">Irish financial services</span></span></Link><div className="flex items-center gap-2"><button aria-label="Search" className="rounded-lg p-2 hover:bg-[var(--paper)]"><Search size={19}/></button><button aria-label="Notifications" className="relative rounded-lg p-2 hover:bg-[var(--paper)]"><Bell size={19}/><span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--orange)]"/></button><button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm">RB <ChevronDown size={15}/></button></div></div><nav aria-label="Primary" className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-6">{nav.map(([label,href])=><Link key={`${label}-${href}`} href={href} className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-[var(--muted)] hover:border-[var(--orange)] hover:text-[var(--ink)]">{label}</Link>)}</nav></header><main>{children}</main></div>;
}
