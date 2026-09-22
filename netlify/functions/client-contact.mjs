import nodemailer from "nodemailer";
import { getClientSiteBySlug } from "../lib/client-store.mjs";
import { cleanText, validEmail } from "../lib/order-store.mjs";

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function sameOrigin(req) {
  const origin = req.headers.get("origin") || "";
  if (!origin) return true;
  return origin === new URL(req.url).origin;
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok:false,message:"Method not allowed." }, { status:405 });
  }
  if (!sameOrigin(req)) {
    return Response.json({ ok:false,message:"Invalid origin." }, { status:403 });
  }
  try {
    const payload = await req.json();
    const slug = cleanText(payload.slug, 80);
    const name = cleanText(payload.name, 180);
    const email = cleanText(payload.email, 320);
    const phone = cleanText(payload.phone, 80);
    const message = cleanText(payload.message, 5000);
    if (!slug || !name || !validEmail(email) || !message) {
      return Response.json({ ok:false,message:"Complete the required contact fields." }, { status:400 });
    }

    const site = await getClientSiteBySlug(slug);
    if (!site || site.features?.form === false || !site.business?.email) {
      return Response.json({ ok:false,message:"Contact form is not available." }, { status:404 });
    }

    const user = env("WEBFACTORY_GMAIL_USER");
    const pass = env("WEBFACTORY_GMAIL_APP_PASSWORD");
    if (!user || !pass) {
      return Response.json({ ok:false,message:"Contact delivery is temporarily unavailable." }, { status:503 });
    }

    const tx = nodemailer.createTransport({
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{ user,pass },
    });

    await tx.sendMail({
      from:`WebFactory Contact <${user}>`,
      to:site.business.email,
      replyTo:email,
      subject:`Website contact — ${site.business.name || slug}`,
      text:[
        `Business: ${site.business.name || slug}`,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        "",
        message,
      ].join("\n"),
      headers:{"X-WebFactory-Site-ID":site.siteId},
    });

    return Response.json({ ok:true });
  } catch (error) {
    console.error("client-contact",error);
    return Response.json({ ok:false,message:"The message could not be sent." }, { status:500 });
  }
};

export const config = {
  rateLimit: {
    windowLimit: 10,
    windowSize: 3600,
    aggregateBy: ["ip"],
  },
};
