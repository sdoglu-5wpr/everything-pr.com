// Retry hero images for specific post IDs.
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.EPR_SUPABASE_URL, process.env.EPR_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const AI_KEY = process.env.LOVABLE_API_KEY;
const IDS = process.argv.slice(2).map(Number);

function slugify(s){return (s||"image").toLowerCase().replace(/<[^>]+>/g," ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"featured";}
function buildAlt(t){return `Editorial illustration for article: ${t.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim()}`.slice(0,240);}
function buildPrompt(p){const ex=(p.excerpt||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,400);return `Editorial cover image for a public-relations industry article. Title: "${p.title}". ${ex?`Context: ${ex}`:""} Style: broad conceptual hero, magazine-quality, subtle gradient background, no text, no logos, 16:9.`;}

async function genImage(prompt, attempt=1){
  const r=await fetch("https://ai.gateway.lovable.dev/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${AI_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"google/gemini-2.5-flash-image",messages:[{role:"user",content:prompt}],modalities:["image","text"]})});
  if(!r.ok)throw new Error(`ai_${r.status}`);
  const j=await r.json();
  const url=j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if(!url?.startsWith("data:")){
    if(attempt<3){await new Promise(r=>setTimeout(r,2000));return genImage(prompt,attempt+1);}
    throw new Error("no_image");
  }
  const c=url.indexOf(",");return{mime:url.slice(5,c).split(";")[0],bytes:Buffer.from(url.slice(c+1),"base64")};
}

for(const id of IDS){
  try{
    const {data:p}=await supabase.from("posts").select("id,slug,title,excerpt,pillar_slug,article_type").eq("id",id).single();
    const {mime,bytes}=await genImage(buildPrompt(p));
    const ext=mime==="image/jpeg"?"jpg":mime==="image/webp"?"webp":"png";
    const fn=`${slugify(p.title)}-featured.${ext}`;
    const now=new Date();
    const path=`auto-featured/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${p.id}-${fn}`;
    const {error:upErr}=await supabase.storage.from("wp-media").upload(path,bytes,{contentType:mime,upsert:true});
    if(upErr)throw new Error(upErr.message);
    const {data:pub}=supabase.storage.from("wp-media").getPublicUrl(path);
    const {data:m}=await supabase.from("media").select("id").order("id",{ascending:false}).limit(1).maybeSingle();
    const nextId=(m?.id??0)+1;
    const {data:ins,error:ie}=await supabase.from("media").insert({id:nextId,url:pub.publicUrl,storage_path:path,filename:fn,mime_type:mime,alt_text:buildAlt(p.title),title:p.title,filesize:bytes.byteLength,uploaded_at:now.toISOString()}).select("id").single();
    if(ie)throw new Error(ie.message);
    await supabase.from("posts").update({featured_media_id:ins.id,modified_at:now.toISOString()}).eq("id",p.id);
    console.log(`OK ${id} -> media#${ins.id}`);
  }catch(e){console.error(`ERR ${id} :: ${e.message}`);}
}
