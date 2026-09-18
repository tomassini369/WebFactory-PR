import { publicBaseUrl } from "../lib/order-store.mjs";

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed.", { status:405 });
  const requestUrl = new URL(req.url);
  const baseUrl = publicBaseUrl();
  const response = await fetch(`${baseUrl}/.netlify/functions/create-stripe-connect-onboarding`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      orderId:requestUrl.searchParams.get("orderId"),
      token:requestUrl.searchParams.get("token"),
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.url) {
    const query = `orderId=${encodeURIComponent(requestUrl.searchParams.get("orderId") || "")}&token=${encodeURIComponent(requestUrl.searchParams.get("token") || "")}&error=connect`;
    return Response.redirect(`${baseUrl}/payment-setup?${query}`, 302);
  }
  return Response.redirect(result.url, 302);
};
