const TEMPLATE_SLUGS = new Set([
  "brisa-cocina","northline-barber","aura-beauty","balance-wellness","luna-market",
  "summit-advisory","isla-living","atelier-nueve","aqua-shine-carwash","verde-vivo-landscaping",
  "sonido-vivo-artist","motorlab-garage","manos-de-confianza-care","pour-house-bartending",
  "mesa-boricua-catering","pulse-dj-services","solid-build-construction","fresh-home-cleaning",
  "sealpro-roofing","agua-clara-plumbing","volt-pro-electric","precision-auto-body","bella-vita-salon"
]);

const ALLOWED_FEATURES = new Set([
  "products","services","cart","whatsapp","calls","social","form","maps","bookings","calendar"
]);
const ALLOWED_SECTIONS = new Set(["catalog","team","about","gallery","contact"]);
const ALLOWED_LAYOUTS = new Set(["split","centered","editorial","showcase"]);
const ALLOWED_STYLES = new Set(["Modern","Luxury","Minimal","Bold"]);

function env(name) {
  return globalThis.Netlify?.env?.get(name) || process.env[name] || "";
}
function text(value, max = 1200) {
  return String(value || "").trim().slice(0, max);
}
function hex(value, fallback = "") {
  const result = text(value, 20);
  return /^#[0-9a-fA-F]{6}$/.test(result) ? result : fallback;
}
function number(value, min, max, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.min(max, Math.max(min, result)) : fallback;
}
function extractJson(raw) {
  const cleaned = String(raw || "").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain valid JSON.");
  return JSON.parse(cleaned.slice(start,end+1));
}
function sanitize(result = {}) {
  const business = result.business && typeof result.business === "object" ? result.business : {};
  const design = result.design && typeof result.design === "object" ? result.design : {};
  const features = result.features && typeof result.features === "object" ? result.features : {};

  const catalog = Array.isArray(result.catalog) ? result.catalog.slice(0,20).map((item) => ({
    type: item?.type === "service" ? "service" : "product",
    nameEn: text(item?.nameEn,220),
    nameEs: text(item?.nameEs,220),
    descriptionEn: text(item?.descriptionEn,1200),
    descriptionEs: text(item?.descriptionEs,1200),
    price: number(item?.price,0,100000,0),
    requiresAppointment: item?.type === "service" && Boolean(item?.requiresAppointment),
    duration: item?.type === "service" ? number(item?.duration,15,480,45) : 0,
  })).filter((item)=>item.nameEn || item.nameEs) : [];

  const team = Array.isArray(result.team) ? result.team.slice(0,12).map((member) => ({
    name: text(member?.name,180),
    roleEn: text(member?.roleEn,180),
    roleEs: text(member?.roleEs,180),
    serviceIndexes: Array.isArray(member?.serviceIndexes)
      ? [...new Set(member.serviceIndexes.map((value)=>Math.floor(Number(value))).filter((value)=>Number.isInteger(value)&&value>=0&&value<catalog.length))].slice(0,20)
      : [],
  })).filter((member)=>member.name) : [];

  const safeFeatures = {};
  for (const [key,value] of Object.entries(features)) if (ALLOWED_FEATURES.has(key)) safeFeatures[key] = Boolean(value);

  return {
    summaryEn: text(result.summaryEn,500),
    summaryEs: text(result.summaryEs,500),
    business: {
      nameEn: text(business.nameEn,180),
      nameEs: text(business.nameEs,180),
      descriptionEn: text(business.descriptionEn,1800),
      descriptionEs: text(business.descriptionEs,1800),
      category: text(business.category,180),
    },
    design: {
      templateSlug: TEMPLATE_SLUGS.has(text(design.templateSlug,80)) ? text(design.templateSlug,80) : "",
      customLayout: ALLOWED_LAYOUTS.has(design.customLayout) ? design.customLayout : "split",
      style: ALLOWED_STYLES.has(design.style) ? design.style : "Modern",
      primary: hex(design.primary,"#0B1529"),
      secondary: hex(design.secondary,"#3C86F6"),
      sectionOrder: Array.isArray(design.sectionOrder)
        ? [...new Set(design.sectionOrder.filter((value)=>ALLOWED_SECTIONS.has(value)))].slice(0,5)
        : ["catalog","team","about","gallery","contact"],
    },
    features: safeFeatures,
    catalog,
    team,
  };
}

export default async (req) => {
  if (req.method !== "POST") return Response.json({ok:false,message:"Method not allowed."},{status:405});
  try {
    const body = await req.json();
    const prompt = text(body?.prompt,1400);
    if (prompt.length < 10) return Response.json({ok:false,message:"Describe the business or the changes you want."},{status:400});

    const apiKey = env("ANTHROPIC_API_KEY");
    const baseUrl = env("ANTHROPIC_BASE_URL");
    if (!apiKey || !baseUrl) {
      return Response.json({ok:false,message:"Factory AI is not active on this deployment yet."},{status:503});
    }

    const current = body?.current && typeof body.current === "object" ? body.current : {};
    const system = `You are Factory AI, a website configuration assistant inside the existing WebFactory PR multi-tenant SaaS.

CRITICAL ARCHITECTURE RULES:
- NEVER create or suggest a new Netlify site, deployment, repository, branch, domain, standalone app, or external customer project.
- Every customer website MUST remain a tenant rendered by the existing WebFactory runtime at /sites/:slug.
- You only generate structured Builder configuration. You cannot modify code, secrets, Stripe accounts, webhooks, Netlify settings, GitHub, authentication, payment credentials, or deployment infrastructure.
- Do not return HTML, JavaScript, markdown, shell commands, or prose outside JSON.
- English is primary and Spanish is secondary. Generate both languages for customer-facing content.
- Preserve factual user data. Never invent phone numbers, emails, addresses, credentials, licenses, certifications, or claims the user did not provide.
- You may recommend one existing Template or Custom. Existing Template slugs: ${[...TEMPLATE_SLUGS].join(", ")}.
- Catalog may contain at most 20 proposed starter items in one response. Team may contain at most 12 proposed members.
- For team.serviceIndexes use zero-based indexes into the catalog array you return.
- Do not include payment configuration, Google credentials, customer personal data, or integrations.

Return ONLY valid JSON with this exact top-level shape:
{
 "summaryEn":"",
 "summaryEs":"",
 "business":{"nameEn":"","nameEs":"","descriptionEn":"","descriptionEs":"","category":""},
 "design":{"templateSlug":"","customLayout":"split|centered|editorial|showcase","style":"Modern|Luxury|Minimal|Bold","primary":"#RRGGBB","secondary":"#RRGGBB","sectionOrder":["catalog","team","about","gallery","contact"]},
 "features":{"products":true,"services":true,"cart":true,"whatsapp":true,"calls":true,"social":true,"form":true,"maps":true,"bookings":true,"calendar":true},
 "catalog":[{"type":"product|service","nameEn":"","nameEs":"","descriptionEn":"","descriptionEs":"","price":0,"requiresAppointment":false,"duration":0}],
 "team":[{"name":"","roleEn":"","roleEs":"","serviceIndexes":[0]}]
}
Use empty arrays when the prompt does not justify catalog or team generation.`;

    const userPayload = {
      request: prompt,
      current: {
        business: {
          nameEn: text(current?.business?.nameEn || current?.business?.name,180),
          nameEs: text(current?.business?.nameEs,180),
          category: text(current?.business?.category,180),
          descriptionEn: text(current?.business?.descriptionEn || current?.business?.description,1200),
          descriptionEs: text(current?.business?.descriptionEs,1200),
        },
        design: {
          templateSlug: text(current?.design?.templateSlug,80),
          customLayout: text(current?.design?.customLayout,40),
          style: text(current?.design?.style,40),
          primary: text(current?.design?.primary,20),
          secondary: text(current?.design?.secondary,20),
          sectionOrder: Array.isArray(current?.design?.sectionOrder) ? current.design.sectionOrder.slice(0,5) : [],
        },
        features: current?.features || {},
        catalog: Array.isArray(current?.catalog) ? current.catalog.slice(0,20).map((item)=>({
          type:item?.type==="service"?"service":"product",
          nameEn:text(item?.nameEn||item?.name,220),
          nameEs:text(item?.nameEs,220),
          descriptionEn:text(item?.descriptionEn||item?.description,700),
          descriptionEs:text(item?.descriptionEs,700),
          price:number(item?.price,0,100000,0),
          requiresAppointment:Boolean(item?.requiresAppointment),
          duration:number(item?.duration,0,480,0),
        })) : [],
        team: Array.isArray(current?.team) ? current.team.slice(0,12).map((member)=>({
          name:text(member?.name,180),roleEn:text(member?.roleEn||member?.role,180),roleEs:text(member?.roleEs,180),
        })) : [],
      }
    };

    const response = await fetch(`${baseUrl.replace(/\/$/,"")}/v1/messages`, {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key":apiKey,
        "anthropic-version":"2023-06-01",
      },
      body:JSON.stringify({
        model: env("WEBFACTORY_AI_MODEL") || "claude-sonnet-5",
        max_tokens:3500,
        temperature:0.35,
        system,
        messages:[{role:"user",content:JSON.stringify(userPayload)}],
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || "Factory AI could not generate the website configuration.");
    const raw = Array.isArray(result?.content) ? result.content.filter((part)=>part?.type==="text").map((part)=>part.text).join("\n") : "";
    const proposal = sanitize(extractJson(raw));
    return Response.json({ok:true,proposal,model:result?.model || env("WEBFACTORY_AI_MODEL") || "claude-sonnet-5"},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return Response.json({ok:false,message:error?.message || "Factory AI could not complete the request."},{status:500,headers:{"Cache-Control":"no-store"}});
  }
};

export const config = {
  path: "/api/builder-ai",
  rateLimit: {
    windowLimit: 4,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
