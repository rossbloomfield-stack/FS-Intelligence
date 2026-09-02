import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {fireEvent,render,screen} from "@testing-library/react";
import {createElement,Fragment,useState} from "react";
import {AnalysisAnswer} from "@/components/intelligence-chat/analysis-answer";
import {EvidencePanel} from "@/components/intelligence-chat/evidence-panel";
import {fallbackAnalysis,normaliseAnalysis} from "@/lib/intelligence/analysis";
import {makeEvidencePackage,type EvidenceReference} from "@/lib/intelligence/evidence";

const reference:EvidenceReference={id:"ref-1",sourceId:"source-1",title:"Official results",publisher:"AIB",url:"https://aib.example/results",publicationDate:"2026-08-01",sourceType:"company_results",primary:true,classification:"primary_company",claimSupported:"AIB reported a verified strategic update.",supportStrength:"supporting",rank:1};

describe("contextual intelligence synthesis",()=>{
 it("removes model-invented citation identifiers",()=>{
  const evidence=makeEvidencePackage([reference]);
  const answer=normaliseAnalysis({headline:"Direct conclusion",executiveSummary:"Summary",evidenceFindings:[{title:"Supported",analysis:"Verified",referenceIds:["ref-1","ref-invented"]},{title:"Unsupported",analysis:"Drop this",referenceIds:["ref-invented"]}],strategicInterpretation:null,irishMarketImplication:null,counterEvidence:[],whatToWatch:[],confidenceReason:"One primary source",followUpQuestions:["What changed?","Show evidence"]},evidence);
  expect(answer.evidenceFindings).toEqual([{title:"Supported",analysis:"Verified",referenceIds:["ref-1"]}]);
  expect(answer.confidence).toBe("medium");
 });

 it("fails closed when no evidence can be retrieved",()=>{
  const answer=fallbackAnalysis(makeEvidencePackage([]));
  expect(answer.confidence).toBe("insufficient");
  expect(answer.headline).toContain("not enough approved evidence");
 });

 it("uses one focused conversation surface and evidence on demand",()=>{
  const client=readFileSync(join(process.cwd(),"src/components/intelligence-chat/intelligence-chat.tsx"),"utf8");
  expect(client).toContain("What would you like to understand about the market?");
  expect(client).not.toContain("conversation-context");
  expect(client).toContain("selectedReferenceId");
 });

 it("applies the Irish Life design language without weakening the conversation",()=>{
  const shell=readFileSync(join(process.cwd(),"src/components/intelligence/shell.tsx"),"utf8");
  const client=readFileSync(join(process.cwd(),"src/components/intelligence-chat/intelligence-chat.tsx"),"utf8");
  const styles=readFileSync(join(process.cwd(),"src/app/globals.css"),"utf8");
  expect(shell).toContain("/brand/irish-life-logo.svg");
  expect(shell).toContain("Irish Life Market Intelligence home");
  expect(client).toContain('accent:"teal"');
  expect(styles).toContain(".prompt-grid .prompt-card-teal");
  expect(styles).toContain("Irish Life Market Intelligence — conversational product surface");
  expect(styles).toContain('font-family:"Assistant"');
 });

 it("routes retrieved evidence through contextual model synthesis",()=>{
  const route=readFileSync(join(process.cwd(),"src/app/api/intelligence/chat/route.ts"),"utf8");
  expect(route).toContain("synthesiseIntelligenceAnswer");
  expect(route).toContain("contextualQuestion");
  expect(route).toContain("data-analysis");
 });

 it("opens the evidence sheet from the answer summary",()=>{
  const evidence=makeEvidencePackage([reference]);
  const analysis=normaliseAnalysis({headline:"Direct conclusion",executiveSummary:"Summary",evidenceFindings:[{title:"Supported",analysis:"Verified",referenceIds:["ref-1"]}],strategicInterpretation:null,irishMarketImplication:null,counterEvidence:[],whatToWatch:[],confidenceReason:"One source",followUpQuestions:["What changed?","Show evidence"]},evidence);
  function Harness(){const[open,setOpen]=useState(false);return createElement(Fragment,null,createElement(AnalysisAnswer,{analysis,evidence,onEvidence:()=>setOpen(true),onAsk:()=>{}}),createElement(EvidencePanel,{mobile:true,evidence,open,onClose:()=>setOpen(false)}))}
  render(createElement(Harness));
  fireEvent.click(screen.getByRole("button",{name:/Medium evidence/}));
  expect(screen.getByRole("dialog",{name:"Evidence behind this answer"})).toBeTruthy();
 });
});
