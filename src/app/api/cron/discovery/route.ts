import { startDueSourceDiscovery } from "@/lib/intelligence/ingestion/start-discovery";
import { isDublinEight } from "@/lib/research/reporting-period";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isDublinEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside the 08:00 Europe/Dublin schedule window",
    });
  }

  const discovery = await startDueSourceDiscovery(4);
  return Response.json(
    { skipped: false, forced: force, discovery },
    { status: discovery.started.length ? 202 : 200 },
  );
}
