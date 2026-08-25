import {describe,expect,it} from "vitest";
import {makeEvidencePackage,rankEvidence,validateEvidence} from "@/lib/intelligence/evidence";
const base={id:"one",title:"Official update",publisher:"Regulator",url:"https://example.com/update",publication_date:"2026-08-20",source_type:"regulatory",primary_source:true,credibility_tier:1,evidence_classification:"direct",notes:"Supports the stated regulatory status"};
describe("R2 evidence contract",()=>{
 it("fails closed with no references",()=>expect(makeEvidencePackage([]).confidence).toBe("insufficient"));
 it("ranks primary evidence first",()=>expect(rankEvidence([{...base,id:"secondary",primary_source:false,credibility_tier:3},{...base,id:"primary"}]).map(item=>item.sourceId)).toEqual(["primary","secondary"]));
 it("rejects unsafe URLs and collapses duplicates",()=>expect(validateEvidence(rankEvidence([base,{...base,title:"Duplicate"},{...base,id:"unsafe",url:"javascript:alert(1)"}]))).toHaveLength(1));
 it("requires multiple primary references for high confidence",()=>{const refs=rankEvidence([base,{...base,id:"two",url:"https://regulator.example/two"},{...base,id:"three",url:"https://company.example/three",primary_source:false}]);expect(makeEvidencePackage(refs).confidence).toBe("high")});
});
