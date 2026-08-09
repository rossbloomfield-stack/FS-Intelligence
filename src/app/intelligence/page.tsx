import { Dashboard } from "@/components/intelligence/dashboard";
import{SectionPage}from"@/components/intelligence/section-page";import{fixtureMode}from"@/config/env";
export const dynamic="force-dynamic";
export default function Page(){ return fixtureMode?<Dashboard/>:<SectionPage eyebrow="INTELLIGENCE" title="No published report yet" description="The production dashboard will populate after the first research run passes QA and receives administrator approval."/>; }
