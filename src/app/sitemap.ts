import type { MetadataRoute } from "next";
const paths=["/intelligence","/intelligence/reports","/intelligence/signals","/intelligence/competitors","/intelligence/ai","/intelligence/regulation","/intelligence/actions","/intelligence/archive","/intelligence/methodology","/intelligence/about","/intelligence/sources"];
export default function sitemap():MetadataRoute.Sitemap{return paths.map(path=>({url:`https://www.rossbloomfield.com${path}`,changeFrequency:path==="/intelligence"?"daily":"weekly",priority:path==="/intelligence"?1:.7}))}
