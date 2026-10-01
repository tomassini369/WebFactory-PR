import { safeAthJson } from "./ath-domain.mjs";

function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }


export function renderAthCheckoutPage({site, session, record, token, publicToken}) {
    const es=session.lang === "es";
    const total = record.amountTotal / 100;
    const checkout = { env: "production", publicToken: publicToken, timeout: 600, orderType: "", theme: "btn", lang: session.lang,
      total, subtotal: (record.amountTotal - Number(record.tax || 0)) / 100, tax: Number(record.tax || 0) / 100,
      metadata1: session.metadata1, metadata2: session.metadata2,
      items: (record.items || []).map((item) => ({ name: item.name, description: item.description || "", quantity: item.quantity, price: item.unitAmount / 100, tax: null, metadata: item.id })), phoneNumber: "" };
    // Each checkout owns its own official SDK globals. Private tokens are never rendered.
    return  `<!doctype html><html lang="${session.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATH Móvil · ${escapeHtml(site.business?.name)}</title><style>
      :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;font:16px/1.5 system-ui;background:#f3f6fb;color:#0b1529;padding:20px}main{width:min(100%,520px);padding:28px;border-radius:24px;background:#fff;border:1px solid #dce8f7}h1{font-size:26px;line-height:1.2}.amount{font-size:36px;font-weight:750}small,p{color:#52647d}button,a{font:inherit}button{background:#2868d5;color:#fff;border:0;border-radius:12px;padding:14px;cursor:pointer}a{color:#2260c4}label{display:grid;gap:8px}input{font:inherit;padding:12px;border:1px solid #8798ad;border-radius:10px;background:#fff;color:#0b1529;width:100%}#message{white-space:pre-wrap}#recovery{display:grid;gap:12px;margin-top:24px}#recovery[hidden]{display:none}@media(prefers-color-scheme:dark){body{background:#080e1c;color:#f7faff}main{background:#121c2e;border-color:#334762}small,p{color:#bac8dc}input{background:#0d1526;color:#f7faff}a{color:#8ab8ff}}
      </style></head><body><main><small>WEBFACTORY · ATH MÓVIL</small><h1>${escapeHtml(site.business?.name || "Business")}</h1><div class="amount">$${total.toFixed(2)} USD</div><p>${es ? "Confirma el pago en tu aplicación ATH Móvil. El dinero se envía a la cuenta ATH Business de este negocio." : "Confirm payment in your ATH Móvil app. Funds go to this business’s ATH Business account."}</p><div id="ATHMovil_Checkout_Button_payment"${record.athSettledAt ? " hidden" : ""}></div><p id="message" role="status">${record.athSettledAt ? (es ? "Pago verificado por ATH Móvil." : "Payment verified by ATH Móvil.") : ""}</p><div id="recovery" hidden><label>${es ? "Referencia del pago en ATH Móvil" : "ATH Móvil payment reference"}<input id="reference" autocomplete="off" maxlength="180"></label><button id="verify">${es ? "Verificar pago" : "Verify payment"}</button></div><p><a href="${escapeHtml(session.returnUrl || `/sites/${site.slug}`)}">${es ? "Regresar al negocio" : "Return to business"}</a></p></main>
      <script>
      const ATHM_Checkout = ${safeAthJson(checkout)};
      const sessionToken = ${safeAthJson(token)};
      const es = ${es};
      const message = document.getElementById('message');
      const recovery = document.getElementById('recovery');
      let verifying = false;
      async function verifyReference(referenceNumber){
        if(verifying)return;verifying=true;document.getElementById('verify').disabled=true;
        message.textContent=es?'Verificando con ATH Móvil…':'Verifying with ATH Móvil…';
        try{
          const response=await fetch('/.netlify/functions/ath-payment-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:sessionToken,referenceNumber})});
          const result=await response.json();if(!response.ok||!result.paid)throw new Error(result.message||'Verification pending.');
          document.getElementById('ATHMovil_Checkout_Button_payment').hidden=true;recovery.hidden=true;
          message.textContent=(es?'Pago verificado. Referencia: ':'Payment verified. Reference: ')+result.referenceNumber;
        }catch(error){message.textContent=error.message;recovery.hidden=false;document.getElementById('reference').value=referenceNumber||'';}
        finally{verifying=false;document.getElementById('verify').disabled=false;}
      }
      async function authorizationATHM(){
        document.getElementById('ATHMovil_Checkout_Button_payment').hidden=true;
        try{const response=await authorization();const data=typeof response==='string'?JSON.parse(response):response;const reference=data?.data?.referenceNumber||data?.referenceNumber;
          if(!reference)throw new Error(es?'Verifica el estado en ATH e introduce la referencia del pago.':'Check payment status in ATH and enter your payment reference.');
          await verifyReference(reference);
        }catch(error){message.textContent=error.message;recovery.hidden=false;}
      }
      function cancelATHM(){message.textContent=es?'Proceso cancelado. Comprueba en ATH si se realizó algún pago.':'Checkout cancelled. Check ATH for any completed payment.';recovery.hidden=false;}
      function expiredATHM(){message.textContent=es?'El proceso venció. Si pagaste, introduce la referencia para verificarlo.':'Checkout expired. If you paid, enter the payment reference to verify it.';recovery.hidden=false;}
      document.getElementById('verify').onclick=()=>verifyReference(document.getElementById('reference').value.trim());
      </script>${record.athSettledAt ? "" : '<script src="https://payments.athmovil.com/api/modal/js/athmovil_base.js" onerror="document.getElementById(\'message\').textContent=es?\'No se pudo cargar ATH Móvil. Recarga para intentar de nuevo.\':\'ATH Móvil could not load. Reload to try again.\';"></script>'}</body></html>`;
}
