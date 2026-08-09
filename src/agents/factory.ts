import "server-only";
import { Agent, webSearchTool } from "@openai/agents";
import { discoveryOutputSchema,verificationOutputSchema,materialityOutputSchema,briefingSchema,qaOutputSchema } from "@/schemas/agents";
import { discoveryInstructions } from "@/prompts/discovery";import {verificationInstructions}from"@/prompts/verification";import{synthesisInstructions}from"@/prompts/synthesis";import{qaInstructions}from"@/prompts/qa";
import{materialityInstructions}from"@/prompts/materiality";
export function discoveryAgent(model:string){return new Agent({name:"Market Discovery",model,instructions:discoveryInstructions,tools:[webSearchTool({searchContextSize:"medium"})],outputType:discoveryOutputSchema});}
export function verificationAgent(model:string){return new Agent({name:"Source Verification",model,instructions:verificationInstructions,outputType:verificationOutputSchema});}
export function materialityAgent(model:string){return new Agent({name:"Materiality",model,instructions:materialityInstructions,outputType:materialityOutputSchema});}
export function synthesisAgent(model:string){return new Agent({name:"Executive Synthesis",model,instructions:synthesisInstructions,outputType:briefingSchema});}
export function qaAgent(model:string){return new Agent({name:"QA Red Team",model,instructions:qaInstructions,outputType:qaOutputSchema});}
