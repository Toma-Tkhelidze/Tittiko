/* ============================================================================
   ტიტიკო — Telegram proxy (Cloudflare Worker)
   ============================================================================

   რას აკეთებს:
   საიტი შეკვეთას აგზავნის ამ Worker-თან, Worker კი ამატებს ბოტის ტოკენსა და
   chat_id-ს და გადაუგზავნის Telegram-ს. ასე ტოკენი ბრაუზერში არასდროს ჩანს.

   ---------------------------------------------------------------------------
   განთავსება (ერთხელ, ~5 წუთი)
   ---------------------------------------------------------------------------
   1. გახსენი  https://dash.cloudflare.com  →  Workers & Pages  →  Create
        →  Start with Hello World  →  Deploy
   2. Worker-ს დააჭირე  →  Edit code  →  წაშალე ყველაფერი და ჩასვი ეს ფაილი
        →  Deploy
   3. Settings  →  Variables and Secrets  →  დაამატე სამი ცვლადი:

        BOT_TOKEN        (Secret)  @BotFather-ისგან მიღებული ტოკენი
        CHAT_ID          (Secret)  შენი ჩატის ID  (@userinfobot გეტყვის)
        ALLOWED_ORIGIN   (Text)    https://toma-tkhelidze.github.io

      → Deploy
   4. დააკოპირე Worker-ის მისამართი (მაგ. https://titiko-tg.<შენი>.workers.dev)
      და ჩასვი script.js-ში, PROXY_URL-ის ადგილას.

   ---------------------------------------------------------------------------
   შენიშვნა: ALLOWED_ORIGIN ზღუდავს, რომელ საიტს შეუძლია Worker-ის გამოძახება
   ბრაუზერიდან. თუ დომენს შეცვლი, აქაც განაახლე.
   ============================================================================ */

const ALLOWED_METHODS = new Set(["sendMessage", "sendPhoto"]);
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB — Telegram-ის ფოტოს ლიმიტზე ოდნავ მეტი

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const originOk = allowed === "*" || origin === allowed;

    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(allowed) });
    }

    if (request.method !== "POST") {
      return reply({ ok: false, description: "Method not allowed" }, 405, allowed);
    }

    if (!originOk) {
      return reply({ ok: false, description: "Origin not allowed" }, 403, allowed);
    }

    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return reply({ ok: false, description: "Worker is missing BOT_TOKEN / CHAT_ID" }, 500, allowed);
    }

    // --- which Telegram method was requested (last path segment) ---
    const method = new URL(request.url).pathname.split("/").filter(Boolean).pop() || "";
    if (!ALLOWED_METHODS.has(method)) {
      return reply({ ok: false, description: "Unsupported method" }, 400, allowed);
    }

    const declaredSize = Number(request.headers.get("Content-Length") || 0);
    if (declaredSize > MAX_BODY_BYTES) {
      return reply({ ok: false, description: "Payload too large" }, 413, allowed);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return reply({ ok: false, description: "Expected multipart/form-data" }, 400, allowed);
    }

    // the client never gets to choose these
    form.set("chat_id", env.CHAT_ID);
    form.set("parse_mode", "HTML");

    let tgResponse;
    try {
      tgResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
        method: "POST",
        body: form,
      });
    } catch (err) {
      return reply({ ok: false, description: "Telegram unreachable: " + err.message }, 502, allowed);
    }

    // pass Telegram's own JSON (and status) straight back to the page
    const text = await tgResponse.text();
    return new Response(text, {
      status: tgResponse.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(allowed) },
    });
  },
};

function corsHeaders(allowed) {
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function reply(payload, status, allowed) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(allowed) },
  });
}
