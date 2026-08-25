export function answerForEvidenceCount(count:number){
 return count===0
  ? "Evidence currently insufficient to answer this reliably. The approved financial-services evidence store contains no verified source records yet, so I have not generated a speculative answer. Once evidence is ingested and quality-assured, you will be able to inspect the sources behind each material claim."
  : "Verified primary evidence is available and its provenance is shown alongside this response. Evidence-grounded synthesis is not enabled in R2, so I have not generated a substantive answer from these sources.";
}

export function answerForRetrieval(count:number,gaps:string[]){
 if(count===0)return answerForEvidenceCount(0);
 const gapText=gaps.length?` Remaining evidence gaps: ${gaps.join(" ")}`:"";
 return `I found ${count} directly relevant approved primary ${count===1?"reference":"references"} and have shown their provenance alongside this response. Evidence-grounded synthesis is not enabled in R3, so I have not converted retrieval results into a substantive conclusion.${gapText}`;
}
