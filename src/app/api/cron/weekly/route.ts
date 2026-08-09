sed: --: No such file or directory
import{isDublinThursdayEight}from"@/lib/research/reporting-period";import{startWeeklyReport}from"@/lib/research/start-report";
export async function GET(request:Request){const secret=process.env.CRON_SECRET;if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});if(!isDublinThursdayEight())return Response.json({skipped:true,reason:"Outside Europe/Dublin schedule window"});const result=await startWeeklyReport();return Response.json(result,{status:result.duplicate?200:202});}
