import "server-only";
import { run } from "@openai/agents";
import { discoveryAgent,materialityAgent,qaAgent,synthesisAgent,verificationAgent } from "./factory";
import { discoveryOutputSchema,materialityOutputSchema,qaOutputSchema,verificationOutputSchema,briefingSchema,type VerificationOutput } from "@/schemas/agents";

function requireOutput<T>(value:unknown,parse:(v:unknown)=>T):T{if(value==null)throw new Error("Agent returned no structured output");return parse(value);}
export async function runDiscovery(input:string,model:string){const result=await run(discoveryAgent(model),input,{maxTurns:12});return {output:requireOutput(result.finalOutput,v=>discoveryOutputSchema.parse(v)),responseId:result.lastResponseId};}
export async function runVerification(input:unknown,model:string){const result=await run(verificationAgent(model),JSON.stringify(input),{maxTurns:4});return {output:requireOutput(result.finalOutput,v=>verificationOutputSchema.parse(v)),responseId:result.lastResponseId};}
export async function runMateriality(input:VerificationOutput,model:string){const result=await run(materialityAgent(model),JSON.stringify(input),{maxTurns:4});return{output:requireOutput(result.finalOutput,v=>materialityOutputSchema.parse(v)),responseId:result.lastResponseId};}
export async function runSynthesis(events:VerificationOutput,model:string){const result=await run(synthesisAgent(model),JSON.stringify(events),{maxTurns:4});return {output:requireOutput(result.finalOutput,v=>briefingSchema.parse(v)),responseId:result.lastResponseId};}
export async function runQa(input:unknown,model:string){const result=await run(qaAgent(model),JSON.stringify(input),{maxTurns:4});return {output:requireOutput(result.finalOutput,v=>qaOutputSchema.parse(v)),responseId:result.lastResponseId};}
