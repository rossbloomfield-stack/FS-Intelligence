import "server-only";

function enabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export const marketResearchFlags = Object.freeze({
  semrushResearch: enabled("ENABLE_SEMRUSH_RESEARCH"),
  contentDrafts: enabled("ENABLE_CONTENT_DRAFTS"),
  visualReferences: enabled("ENABLE_VISUAL_REFERENCES"),
  aiVisibilityImports: enabled("ENABLE_AI_VISIBILITY_IMPORTS"),
});

export function getSemrushConnectionState(): "disabled" | "not_configured" | "configured" {
  if (!marketResearchFlags.semrushResearch) return "disabled";
  if (!process.env.SEMRUSH_API_KEY?.trim()) return "not_configured";
  return "configured";
}
