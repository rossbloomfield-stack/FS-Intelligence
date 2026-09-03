import type { ResolvedOrganisation } from "@/lib/intelligence/query-planner";

export type OrganisationRecord=ResolvedOrganisation&{aliases?:string[]};
const builtInAliases:Record<string,string[]>={
  "bank-of-ireland":["BOI","Bank of Ireland Group"],
  "new-ireland-assurance":["New Ireland","New Ireland Assurance Company"],
  "aib":["AIB Group","Allied Irish Banks"],
  "ptsb":["Permanent TSB"],
  "irish-life":["Irish Life Group"],
};

export function resolveOrganisations(question:string,catalogue:OrganisationRecord[]):ResolvedOrganisation[]{
  const normalised=normalise(question);
  return catalogue.filter(item=>[item.name,item.slug.replaceAll("-"," "),...(item.aliases??[]),...(builtInAliases[item.slug]??[])].some(candidate=>containsPhrase(normalised,normalise(candidate)))).map(({id,slug,name,sector,jurisdiction})=>({id,slug,name,sector,jurisdiction}));
}

export function attachAliases(organisations:ResolvedOrganisation[],aliases:Array<{organisation_id:string;alias:string}>):OrganisationRecord[]{
  const byOrganisation=new Map<string,string[]>();
  for(const item of aliases)byOrganisation.set(item.organisation_id,[...(byOrganisation.get(item.organisation_id)??[]),item.alias]);
  return organisations.map(item=>({...item,aliases:byOrganisation.get(item.id)??[]}));
}
function normalise(value:string){return value.normalize("NFKD").replace(/[’']/g," ").replace(/[^a-zA-Z0-9]+/g," ").trim().toLocaleLowerCase("en-IE")}
function containsPhrase(haystack:string,needle:string){return needle.length>1&&(` ${haystack} `).includes(` ${needle} `)}
