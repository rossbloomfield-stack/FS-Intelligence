const zone="Europe/Dublin" as const;
function localParts(date:Date){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23",weekday:"short"}).formatToParts(date);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
function isoDate(date:Date){return date.toISOString().slice(0,10);}
export function previousSevenCompleteDays(now=new Date()){const p=localParts(now);const localToday=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);const end=new Date(localToday);end.setUTCDate(end.getUTCDate()-1);const start=new Date(end);start.setUTCDate(start.getUTCDate()-6);return{periodStart:isoDate(start),periodEnd:isoDate(end),reportDate:`${p.year}-${p.month}-${p.day}`,timezone:zone};}
export function isDublinThursdayEight(now=new Date()){const p=localParts(now);return p.weekday==="Thu"&&p.hour==="08";}
