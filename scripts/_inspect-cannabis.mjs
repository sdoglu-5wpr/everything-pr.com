import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.EPR_SUPABASE_URL, process.env.EPR_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from("pillars").select("subtitle, body_html, faq").eq("slug","cannabis").maybeSingle();
console.log("SUBTITLE:", data.subtitle);
console.log("---BODY (first 2000)---");
console.log(data.body_html.slice(0, 2000));
console.log("---FAQ---");
console.log(JSON.stringify(data.faq.slice(0,2), null, 2));
