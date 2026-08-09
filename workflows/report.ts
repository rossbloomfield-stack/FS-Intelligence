sed: --: No such file or directory
import {createHook,FatalError}from"workflow";
import{discover,persistEvidence,publish,qualityCheck,score,setStatus,synthesise,verify}from"@/workflows/report-steps";
import type{ReportWorkflowInput}from"@/schemas/workflow";
export async function reportWorkflow(input:ReportWorkflowInput){
  "use workflow";
  await setStatus(input.reportRunId,"discovering");
  const discovery=await discover(input);
  await setStatus(input.reportRunId,"verifying");
  const verified=await verify(discovery,input.analysisModel);
  await setStatus(input.reportRunId,"scoring");
  const scored=await score(verified,input.analysisModel);
  await persistEvidence(input.reportRunId,verified,scored);
  await setStatus(input.reportRunId,"synthesising");
  const briefing=await synthesise(verified,input.synthesisModel);
  await setStatus(input.reportRunId,"quality_check");
  const qa=await qualityCheck({verified,scored,briefing},input.analysisModel);
  if(!qa.output.passed)throw new FatalError(`QA blocked publication: ${qa.output.criticalIssues.join("; ")}`);
  if(!input.autoPublish){await setStatus(input.reportRunId,"awaiting_approval");using approval=createHook<{approved:boolean}>({token:`report-approval:${input.reportRunId}`});const decision=await approval;if(!decision.approved)throw new FatalError("Report rejected by administrator");}
  await setStatus(input.reportRunId,"publishing");await publish(input.reportRunId,briefing);await setStatus(input.reportRunId,"completed");return{reportRunId:input.reportRunId,status:"completed" as const};
}
