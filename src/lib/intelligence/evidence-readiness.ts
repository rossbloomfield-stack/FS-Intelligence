import type { EvidenceReference } from "@/lib/intelligence/evidence";

export function answerForEvidenceCount(count:number){
 return count===0
  ? "Evidence currently insufficient to answer this reliably. The approved financial-services evidence store contains no verified source records yet, so I have not generated a speculative answer. Once evidence is ingested and quality-assured, you will be able to inspect the sources behind each material claim."
  : "Verified primary evidence is available and its provenance is shown alongside this response. Evidence-grounded synthesis is not enabled in R2, so I have not generated a substantive answer from these sources.";
}

export function answerForRetrieval(references:EvidenceReference[],gaps:string[]){
 if(references.length===0)return answerForEvidenceCount(0);
 const findings=references.slice(0,5).map((reference,index)=>`${index+1}. ${sentence(reference.claimSupported)} [${reference.rank}]`).join("\n");
 const limitations=gaps.length?`\n\nEvidence limits\n${gaps.map(gap=>`- ${gap}`).join("\n")}`:"";
 return `What the approved evidence shows\n\n${findings}\n\nThe evidence panel contains the source, publisher, date and classification for each numbered reference.${limitations}`;
}

function sentence(value:string){
 const compact=value.replace(/\s+/g," ").trim();
 if(compact.length<=500)return compact;
 return `${compact.slice(0,497).trimEnd()}…`;
}
