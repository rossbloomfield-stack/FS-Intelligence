export function answerForEvidenceCount(count:number){
 return count===0
  ? "Evidence currently insufficient to answer this reliably. The approved financial-services evidence store contains no verified source records yet, so I have not generated a speculative answer. Once evidence is ingested and quality-assured, you will be able to inspect the sources behind each material claim."
  : "Verified primary evidence is available and its provenance is shown alongside this response. Evidence-grounded synthesis is not enabled in R2, so I have not generated a substantive answer from these sources.";
}
