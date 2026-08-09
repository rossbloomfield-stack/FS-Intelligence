import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:"/intelligence/",disallow:["/intelligence/admin/","/api/admin/","/api/workflows/"]},sitemap:"https://www.rossbloomfield.com/sitemap.xml",host:"https://www.rossbloomfield.com"}}
