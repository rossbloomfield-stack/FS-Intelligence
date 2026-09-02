export type IntelligenceQueryIntent =
  | "market_overview" | "company_strategy" | "company_profile" | "company_comparison"
  | "product_comparison" | "digital_experience" | "regulatory_question" | "compliance_question"
  | "ai_transformation" | "market_trend" | "customer_signal" | "financial_performance"
  | "ownership_ma" | "distribution" | "advice" | "future_scenario"
  | "strategic_recommendation" | "evidence_request" | "follow_up" | "other";

export type ResolvedOrganisation = { id:string; slug:string; name:string; sector:string; jurisdiction:string|null };
export type QueryTimeframe = { label:"current"|"today"|"this_week"|"this_month"|"this_quarter"|"six_months"|"last_year"|"historical"; currentInformationRequired:boolean };
export type IntelligenceQueryPlan = {
  intent:IntelligenceQueryIntent;
  organisations:ResolvedOrganisation[];
  sectors:string[];
  products:string[];
  jurisdictions:string[];
  regulations:string[];
  themes:string[];
  timeframe:QueryTimeframe;
  comparisonRequested:boolean;
  strategicInterpretationRequired:boolean;
  evidenceNeeds:string[];
  freshVerificationRequired:boolean;
};

const intentRules:Array<[IntelligenceQueryIntent,RegExp]> = [
  ["evidence_request",/\b(evidence|sources?|references?|prove|support)\b/i],
  ["market_overview",/\b(matters most|most important developments?|ceos? should care|executive should know|board should know)\b/i],
  ["market_overview",/\b(competitors?|peers?)\b.*\b(doing|worried|threat|pressure|risk|changing)\b/i],
  ["product_comparison",/\b(compare|best|strongest)\b.*\b(product|proposition|pension|mortgage|protection|insurance|savings|investment)\b/i],
  ["company_comparison",/\b(compare|versus|vs\.?|which (?:company|bank|insurer|provider|firm))\b/i],
  ["company_strategy",/\b(strategy|strategic direction|growth priorities|investing in)\b/i],
  ["regulatory_question",/\b(regulat|cpc\b|consumer protection code|dora\b|fida\b|ai act|eiopa|eba\b|esma|central bank)\b/i],
  ["compliance_question",/\b(compliance|finding|requirement|legal advice)\b/i],
  ["ai_transformation",/\b(ai|artificial intelligence|agentic|genai|machine learning)\b/i],
  ["financial_performance",/\b(profit|revenue|income|rote|roe\b|aum\b|assets under management|financial performance|growing fastest)\b/i],
  ["ownership_ma",/\b(owner|ownership|acqui|merger|m&a|disposal|subsidiar|bawag)\b/i],
  ["digital_experience",/\b(digital|mobile app|onboarding|self-service|ux\b|customer journey|personalisation)\b/i],
  ["customer_signal",/\b(customer|consumer|trust|switching|affordability|behaviour|sentiment)\b/i],
  ["distribution",/\b(distribution|broker|intermediar|employer channel|cross-sell)\b/i],
  ["advice",/\b(advice|adviser|advisor|wealth guidance)\b/i],
  ["future_scenario",/\b(next (?:two|three|five|\d+) years?|future|scenario|could disrupt|what if)\b/i],
  ["strategic_recommendation",/\b(should (?:we|an?|the)|recommend|prioriti[sz]e|what (?:must|should) .* do)\b/i],
  ["market_trend",/\b(trend|changing|changed|momentum|accelerat|weakening|market shift)\b/i],
  ["market_overview",/\b(market|sector|industry|ceo|executive|board)\b/i],
];

const evidenceByIntent:Record<IntelligenceQueryIntent,string[]> = {
  market_overview:["recent_material_events","strategic_themes","regulatory_items"], company_strategy:["strategy_profile","recent_material_events","financial_metrics"],
  company_profile:["organisation_profile","strategy_profile","recent_material_events"], company_comparison:["strategy_profile","financial_metrics","digital_capabilities","ai_initiatives","recent_material_events"],
  product_comparison:["products","competitor_pages","pricing"], digital_experience:["digital_capabilities","competitor_pages","recent_material_events"],
  regulatory_question:["primary_regulation","regulatory_items"], compliance_question:["primary_regulation","compliance_findings"], ai_transformation:["ai_initiatives","recent_material_events"],
  market_trend:["strategic_themes","historical_reports","recent_material_events"], customer_signal:["customer_signals","market_research"], financial_performance:["financial_metrics","company_results"],
  ownership_ma:["ownership_events","organisation_relationships"], distribution:["products","distribution_channels"], advice:["products","digital_capabilities","recent_material_events"],
  future_scenario:["strategic_patterns","historical_reports","recent_material_events"], strategic_recommendation:["strategic_patterns","recent_material_events","regulatory_items"],
  evidence_request:["conversation_claims","sources"], follow_up:["conversation_context","sources"], other:["sources"]
};

export function planIntelligenceQuery(question:string,organisations:ResolvedOrganisation[]):IntelligenceQueryPlan{
  const comparisonRequested=/\b(compare|versus|vs\.?)\b/i.test(question)||organisations.length>1;
  let intent=intentRules.find(([,pattern])=>pattern.test(question))?.[0]??(organisations.length?"company_profile":"other");
  if(comparisonRequested&&organisations.length>1)intent="company_comparison";
  else if(organisations.length===1&&intent==="market_overview")intent="company_strategy";
  const timeframe=parseTimeframe(question);
  const regulations=matches(question,["Consumer Protection Code","DORA","FIDA","AI Act"]);
  const products=extractProducts(question);
  const themes=matches(question,["agentic AI","open finance","digital advice","operational resilience","financial wellbeing","personalisation"]);
  const freshVerificationRequired=timeframe.currentInformationRequired||intent==="regulatory_question"||intent==="compliance_question";
  return {intent,organisations,sectors:[...new Set(organisations.map(item=>item.sector))],products,jurisdictions:[...new Set(organisations.map(item=>item.jurisdiction).filter((v):v is string=>Boolean(v)))],regulations,themes,timeframe,comparisonRequested,strategicInterpretationRequired:["company_strategy","company_comparison","future_scenario","strategic_recommendation","market_overview"].includes(intent),evidenceNeeds:evidenceByIntent[intent],freshVerificationRequired};
}

function parseTimeframe(question:string):QueryTimeframe{
  const rules:Array<[QueryTimeframe["label"],RegExp]>=[["today",/\b(today|latest|right now|currently)\b/i],["this_week",/\bthis week\b/i],["this_month",/\bthis month\b/i],["this_quarter",/\bthis quarter\b/i],["six_months",/\b(?:last|past) six months\b/i],["last_year",/\b(?:last|past) year\b/i],["historical",/\b(?:since|before|after|changed|history|historical)\b/i]];
  const label=rules.find(([,pattern])=>pattern.test(question))?.[0]??"current";
  return {label,currentInformationRequired:["today","this_week","this_month","this_quarter"].includes(label)||/\b(latest|current)\b/i.test(question)};
}
function matches(question:string,values:string[]){return values.filter(value=>question.toLocaleLowerCase("en-IE").includes(value.toLocaleLowerCase("en-IE")))}

function extractProducts(question:string){
  const value=question.toLocaleLowerCase("en-IE");
  const categories:Array<[string,RegExp]>=[
    ["mortgage_protection",/\bmortgage protection\b/],
    ["health_insurance",/\bhealth insurance\b/],
    ["pensions",/\bpensions?\b/],
    ["investments",/\binvestments?\b/],
    ["wealth",/\bwealth\b/],
    ["mortgages",/\bmortgages?\b/],
    ["protection",/\bprotection\b/],
    ["savings",/\bsavings?\b/],
    ["payments",/\bpayments?\b/],
  ];
  const matched=categories.filter(([,pattern])=>pattern.test(value)).map(([category])=>category);
  if(matched.includes("mortgage_protection"))return matched.filter(category=>category!=="mortgages"&&category!=="protection");
  if(matched.includes("health_insurance"))return matched.filter(category=>category!=="protection");
  return matched;
}
