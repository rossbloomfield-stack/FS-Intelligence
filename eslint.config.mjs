import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const config=[...nextVitals, ...nextTs, { ignores: [".next/**","node_modules/**","next-env.d.ts","src/lib/supabase/database.types.ts","src/app/.well-known/workflow/**"] }];
export default config;
