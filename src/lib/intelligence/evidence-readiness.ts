export function answerForEvidenceCount(count:number){
 return count===0
  ? "Evidence currently insufficient to answer this reliably. The approved financial-services evidence store contains no verified source records yet, so I have not generated a speculative answer. Once evidence is ingested and quality-assured, you will be able to inspect the sources behind each material claim."
  : "Verified evidence is available, but synthesis is not enabled in this release. R1 establishes secure streaming and persistence; evidence-grounded synthesis is gated for the next approved release.";
}
