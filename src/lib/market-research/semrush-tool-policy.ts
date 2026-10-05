export function isReadOnlyCapability(name: string, description = ""): boolean {
  const operation = `${name} ${description}`.toLowerCase();
  if (/\b(create|update|delete|remove|modify|edit|write|start|launch|run audit|enable|disable|add to campaign|tracking campaign)\b/.test(operation)) return false;
  return /\b(get|list|read|search|report|overview|history|snapshot|discover|keyword|competitor|backlink|traffic|domain|organic|position|issue|page|project)\b/.test(operation);
}

const RESEARCH_CAPABILITIES = new Set([
  "domain_overview", "organic_research", "keyword_research", "competitors_research",
  "backlinks_research", "audience_research", "traffic_overview", "paid_search_research",
  "get_report_schema", "execute_report",
]);

export function isSemrushResearchCapabilityAllowed(name: string, readOnly: boolean): boolean {
  return readOnly && RESEARCH_CAPABILITIES.has(name);
}
