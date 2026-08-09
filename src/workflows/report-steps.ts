import {runDiscovery,runMateriality,runQa,runSynthesis,runVerification}from"@/agents/run";
import{scoreMateriality}from"@/schemas/intelligence";
import type{ReportWorkflowInput}from"@/schemas/workflow";

export async function setStatus(reportRunId:string,status:string){
  "use step";
  const{createAdminClient}=await import("@/lib/supabase/admin");const db=createAdminClient();const now=new Date().toISOString();
  await db.from("report_runs").update({status,started_at:status==="discovering"?now:undefined,completed_at:status==="completed"?now:undefined}).eq("id",reportRunId).throwOnError();
  await db.from("report_run_status_history").insert({report_run_id:reportRunId,status}).throwOnError();
}
export async function discover(input:ReportWorkflowInput){
  "use step";
  return runDiscovery(`Research developments whose underlying event or announcement occurred from ${input.periodStart} through ${input.periodEnd}, inclusive. Start with material Irish coverage and retain international benchmarks only with Irish read-across.`,input.researchModel);
}
export async function verify(discovery:Awaited<ReturnType<typeof discover>>,model:string){
  "use step";
  return runVerification(discovery.output,model);
}
export async function score(verified:Awaited<ReturnType<typeof verify>>,model:string){
  "use step";
  const judged=await runMateriality({events:verified.output.events.filter(event=>event.includeForScoring)},model);
  return judged.output.scores.map(input=>({event:verified.output.events.find(event=>event.title===input.eventTitle),materiality:scoreMateriality(input)})).filter(item=>item.event);
}
export async function persistEvidence(reportRunId:string,verified:Awaited<ReturnType<typeof verify>>,scored:Awaited<ReturnType<typeof score>>){
  "use step";
  const{createHash}=await import("node:crypto");const{createAdminClient}=await import("@/lib/supabase/admin");const db=createAdminClient();
  for(const event of verified.output.events){
    const dedupeKey=createHash("sha256").update(`${event.title}|${event.eventDate??event.announcementDate??event.sourcePublicationDate}`).digest("hex");
    const{data:eventRow}=await db.from("candidate_events").upsert({report_run_id:reportRunId,dedupe_key:dedupeKey,title:event.title,sector:event.sector,event_date:event.eventDate,announcement_date:event.announcementDate,source_publication_date:event.sourcePublicationDate,factual_summary:event.factualSummary,potential_irish_relevance:event.potentialIrishRelevance,evidence_limitations:event.evidenceLimitations,discovery_agent:event.discoveryAgent,evidence_classification:event.evidenceClassification,included:event.includeForScoring,exclusion_reason:event.includeForScoring?null:event.verificationWarnings.join("; ")},{onConflict:"report_run_id,dedupe_key"}).select("id").single().throwOnError();
    for(const source of event.sources){const{data:sourceRow}=await db.from("sources").upsert({url:source.url,canonical_url:source.canonicalUrl,title:source.title,publisher:source.publisher,source_type:source.sourceType,publication_date:source.publicationDate,primary_source:source.primarySource,credibility_tier:source.credibilityTier,evidence_classification:event.evidenceClassification,notes:source.notes},{onConflict:"canonical_url"}).select("id").single().throwOnError();const claim=event.verifiedClaims.find(item=>item.sourceUrls.includes(source.url))?.claim??event.factualSummary;await db.from("event_sources").upsert({event_id:eventRow.id,source_id:sourceRow.id,claim,supports_claim:true}).throwOnError();}
    for(const name of event.organisationNames){const{data:org}=await db.from("organisations").select("id").ilike("name",name).limit(1).maybeSingle();if(org)await db.from("event_organisations").upsert({event_id:eventRow.id,organisation_id:org.id}).throwOnError();}
    const item=scored.find(entry=>entry.event?.title===event.title);if(item)await db.from("materiality_scores").upsert({report_run_id:reportRunId,event_id:eventRow.id,strategic_significance:item.materiality.strategicSignificance,customer_impact:item.materiality.customerImpact,commercial_impact:item.materiality.commercialImpact,regulatory_risk_impact:item.materiality.regulatoryRiskImpact,ireland_competitive_relevance:item.materiality.irelandCompetitiveRelevance,immediacy:item.materiality.immediacy,rationale:item.materiality.rationale},{onConflict:"event_id"}).throwOnError();
  }
}
export async function synthesise(verified:Awaited<ReturnType<typeof verify>>,model:string){
  "use step";
  return runSynthesis(verified.output,model);
}
export async function qualityCheck(payload:unknown,model:string){
  "use step";
  return runQa(payload,model);
}
export async function publish(reportRunId:string,briefing:Awaited<ReturnType<typeof synthesise>>){
  "use step";
  const{createAdminClient}=await import("@/lib/supabase/admin");const db=createAdminClient();const{data:run}=await db.from("report_runs").select("report_date").eq("id",reportRunId).single().throwOnError();const slug=String(run.report_date);
  await db.from("reports").upsert({report_run_id:reportRunId,slug,title:`Financial Services Transformation Intelligence — ${slug}`,executive_headline:briefing.output.executiveHeadline,overall_assessment:briefing.output.overallAssessment,content:briefing.output,is_published:true,published_at:new Date().toISOString()},{onConflict:"report_run_id"}).throwOnError();
  await db.from("covering_emails").upsert({report_run_id:reportRunId,subject:briefing.output.coveringEmail.subject,body:briefing.output.coveringEmail.body},{onConflict:"report_run_id"}).throwOnError();
}
