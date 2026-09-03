/* ============================================================================
   ტიტიკო — გადახდისა და შეკვეთის Worker  (Cloudflare)
   რეპოზიტორიაში: server/worker.js
   ============================================================================

   ეს ფაილი საიტთან ერთად არ იტვირთება (GitHub Pages მას არ ემსახურება) —
   მისი კოდი ხელით ან Wrangler-ით იტვირთება პირდაპირ Cloudflare Workers-ში.

   რას აკეთებს ეს ფაილი
   --------------------
   ეს არის საიტის "სერვერი". ბრაუზერს არასდროს ენდობა და სამ საიდუმლოს ინახავს:
   ბოტის ტოკენს, ბანკის გასაღებებს და ფასების ცხრილს.

   შეკვეთის გზა:

     1. საიტი ავსებს ფორმას და აგზავნის აქ          →  POST /pay
     2. Worker ითვლის ფასს (თავისი ცხრილით), ინახავს
        შეკვეთას და ფოტოს, და ბანკს სთხოვს გადახდას
     3. მყიდველი გადადის ბანკის გვერდზე, იხდის
     4. ბანკი გვწერს, რომ გადაიხადა                 →  POST /callback
     5. Worker ამოწმებს ხელმოწერას, გადაამოწმებს
        სტატუსს ბანკთან და მხოლოდ მერე აგზავნის
        შეკვეთას Telegram-ში
     6. success.html ეკითხება, რა მოხდა             →  GET  /order?no=TTK-0001

   სანამ ბანკის გასაღებები არ არის
   -------------------------------
   თუ BOG_CLIENT_ID არ არის შევსებული, Worker ავტომატურად ძველ რეჟიმში მუშაობს:
   შეკვეთას პირდაპირ Telegram-ში აგზავნის, გადახდის გარეშე. ე.ი. საიტი არ ჩერდება,
   სანამ ბანკს ველოდებით. გასაღებების ჩასმისთანავე გადახდა თავისით ჩაირთვება.

   ---------------------------------------------------------------------------
   რა უნდა დაყენდეს Cloudflare-ში (ერთხელ)
   ---------------------------------------------------------------------------
   Workers & Pages → shy-sound-1c56 → Settings

   1) Variables and Secrets:

        BOT_TOKEN          Secret   @BotFather-ის ტოკენი            [უკვე არის]
        CHAT_ID            Secret   შენი ჩატის ID                   [უკვე არის]
        ALLOWED_ORIGIN     Text     https://toma-tkhelidze.github.io [უკვე არის]
        BOG_CLIENT_ID      Secret   ბანკიდან                        [მოგვიანებით]
        BOG_CLIENT_SECRET  Secret   ბანკიდან                        [მოგვიანებით]
        SITE_URL           Text     https://toma-tkhelidze.github.io/Tittiko

   2) Bindings → KV namespace:  ცვლადის სახელი  ORDERS
      (ჯერ Storage & Databases → KV → Create → სახელი "tittiko-orders")

   3) Bindings → R2 bucket:     ცვლადის სახელი  PHOTOS
      (ჯერ R2 → Create bucket → სახელი "tittiko-photos")

   ყოველი ცვლილების შემდეგ → Deploy.
   ============================================================================ */

/* ---------- ბანკის მისამართები ---------- */
const BOG_TOKEN_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const BOG_ORDERS_URL = "https://api.bog.ge/payments/v1/ecommerce/orders";
const BOG_RECEIPT_URL = "https://api.bog.ge/payments/v1/receipt/";

/* ბანკის საჯარო გასაღები — მისით ვამოწმებთ, რომ callback მართლა ბანკიდან მოვიდა */
const BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

/* ---------- ფასების ცხრილი ----------
   ეს არის ერთადერთი ადგილი, სადაც ფასი წერია სერიოზულად. საიტზე ნაჩვენები ფასი
   მხოლოდ ვიტრინაა — მყიდველს ბრაუზერში მისი შეცვლა შეუძლია, ამიტომ თანხას
   ყოველთვის აქედან ვიღებთ. ფასის შეცვლისას ორივე ადგილი უნდა განახლდეს:
   აქ და script.js-ის კატალოგში. */
const HARD_COVER_EXTRA = 10;

const BOOKS = {
  superhero:  { title: "პატარა სუპერგმირი",            price: 65 },
  earth:      { title: "მოგზაურობა დედამიწის გარშემო", price: 65 },
  space:      { title: "კოსმოსური თავგადასავალი",      price: 65 },
  animals:    { title: "ცხოველთა აკადემია",            price: 65 },
  cars:       { title: "მანქანების ქალაქი",            price: 65 },
  ocean:      { title: "წყალქვეშა თავგადასავალი",      price: 65 },
  dino:       { title: "დინოზავრების სამყარო",         price: 65 },
  princess:   { title: "პრინცესას თავგადასავალი",      price: 65 },
  fairy:      { title: "ფერიების ბაღი",                price: 65 },
  abc:        { title: "ანბანის ჯადოქრობა",            price: 65 },
  rainbow:    { title: "ცისარტყელას მოგონება",         price: 65 },
  football:   { title: "ფეხბურთის ვარსკვლავი",         price: 65 },
  history:    { title: "ისტორიაში მოგზაურობა",         price: 65 },
  friendship: { title: "მეგობრობის ჯადო",              price: 65 },
};

const ANIMATIONS = {
  hero:     { title: "შენ ხარ გმირი",              price: 45 },
  planet:   { title: "ცისფერი პლანეტა",            price: 45 },
  spring:   { title: "გაზაფხულის ზეიმი",           price: 45 },
  starways: { title: "ვარსკვლავური მოგზაურობა",    price: 45 },
  sea:      { title: "ზღვის სიღრმეში",             price: 45 },
  birthday: { title: "დაბადების დღის სასწაული",    price: 45 },
};

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;   /* 10 MB — იგივე, რაც ფორმაშია */
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const ORDER_TTL_MINUTES = 30;               /* რამდენ ხანს ელოდება გადაუხდელი შეკვეთა */
const KEEP_ORDER_DAYS = 90;

/* ============================================================================
   მარშრუტიზაცია
   ============================================================================ */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const allowed = env.ALLOWED_ORIGIN || "*";

    /* ბრაუზერი ჯერ "ნებართვას" ეკითხება — CORS preflight */
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(allowed) });
    }

    /* callback ბანკიდან მოდის, არა ბრაუზერიდან — მას origin-ის შემოწმება არ ეხება */
    if (path === "/callback" && request.method === "POST") {
      return handleCallback(request, env, ctx);
    }

    /* ყველა დანარჩენს მხოლოდ ჩვენი საიტი ეძახის */
    const origin = request.headers.get("Origin") || "";
    if (allowed !== "*" && origin !== allowed) {
      return json({ ok: false, error: "Origin not allowed" }, 403, allowed);
    }

    if (path === "/pay" && request.method === "POST") return handlePay(request, env, ctx);
    if (path === "/order" && request.method === "GET") return handleOrderStatus(url, env, allowed);

    return json({ ok: false, error: "Not found" }, 404, allowed);
  },
};

/* ============================================================================
   1. შეკვეთის მიღება და გადახდის დაწყება
   ============================================================================ */
async function handlePay(request, env, ctx) {
  const allowed = env.ALLOWED_ORIGIN || "*";

  /* გასაგები შეცდომა, თუ Cloudflare-ში საცავები ჯერ არ არის მიბმული */
  if (!env.ORDERS || !env.PHOTOS) {
    return json({ ok: false, error: "Worker is missing the ORDERS (KV) or PHOTOS (R2) binding" }, 500, allowed);
  }

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) {
    return json({ ok: false, error: "მონაცემები ძალიან დიდია" }, 413, allowed);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "არასწორი ფორმატი" }, 400, allowed);
  }

  /* --- 1.1 რას უკვეთავს და რა ღირს (ბრაუზერის ფასს არ ვეკითხებით) --- */
  const isAnim = str(form.get("order_type_key")) === "animation";
  const itemId = str(form.get("book_id"));
  const item = (isAnim ? ANIMATIONS : BOOKS)[itemId];

  if (!item) {
    return json({ ok: false, error: "პროდუქტი ვერ მოიძებნა" }, 400, allowed);
  }

  const coverType = isAnim ? "" : str(form.get("cover_type"));
  if (!isAnim && coverType !== "hard" && coverType !== "soft") {
    return json({ ok: false, error: "აირჩიე ყდის ტიპი" }, 400, allowed);
  }

  const coverExtra = coverType === "hard" ? HARD_COVER_EXTRA : 0;
  const total = item.price + coverExtra;

  /* --- 1.2 სავალდებულო ველები — იგივე შემოწმება, რაც ბრაუზერში --- */
  const order = {
    kind: isAnim ? "ანიმაცია" : "წიგნი",
    item_id: itemId,
    item_title: item.title,
    base_price: item.price,
    cover_type: coverType,
    cover_extra: coverExtra,
    total: total,

    child_name: str(form.get("child_name")),
    child_name_story: str(form.get("child_name_story")),
    child_age: str(form.get("child_age")),
    child_gender: str(form.get("child_gender")),
    hair_color: str(form.get("hair_color")),
    skin_tone: str(form.get("skin_tone")),
    eye_color: str(form.get("eye_color")),
    dedication: str(form.get("dedication")),

    customer_name: str(form.get("customer_name")),
    phone: str(form.get("phone")),
    email: str(form.get("email")),
    city: isAnim ? "" : str(form.get("city")),
    address: isAnim ? "" : str(form.get("address")),
    comment: str(form.get("comment")),
  };

  const missing = requiredMissing(order, isAnim);
  if (missing) {
    return json({ ok: false, error: "შეუვსებელი ველი: " + missing }, 400, allowed);
  }
  if (!isEmail(order.email)) {
    return json({ ok: false, error: "ელ-ფოსტა არასწორია" }, 400, allowed);
  }
  if (!isGeorgianPhone(order.phone)) {
    return json({ ok: false, error: "ტელეფონის ნომერი არასწორია" }, 400, allowed);
  }

  /* --- 1.3 ფოტო --- */
  const photo = form.get("photo");
  if (!photo || typeof photo === "string" || !photo.size) {
    return json({ ok: false, error: "ბავშვის ფოტო აუცილებელია" }, 400, allowed);
  }
  if (!/^image\/(jpe?g|png)$/i.test(photo.type)) {
    return json({ ok: false, error: "ფოტო მხოლოდ JPG ან PNG" }, 400, allowed);
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return json({ ok: false, error: "ფოტო 10 MB-ზე დიდია" }, 400, allowed);
  }

  /* --- 1.4 შეკვეთის ნომერი --- */
  const orderNo = await nextOrderNo(env);
  order.order_no = orderNo;
  order.created_at = new Date().toISOString();
  order.status = "pending";

  /* --- 1.5 ფოტოს შენახვა R2-ში, შეკვეთის — KV-ში --- */
  const photoKey = "orders/" + orderNo + (photo.type === "image/png" ? ".png" : ".jpg");
  order.photo_key = photoKey;

  await env.PHOTOS.put(photoKey, await photo.arrayBuffer(), {
    httpMetadata: { contentType: photo.type },
  });
  await saveOrder(env, order);

  /* --- 1.6 გადახდა --- */

  /* ჯერ ბანკის გასაღებები არ გვაქვს → ძველი რეჟიმი, შეკვეთა პირდაპირ Telegram-ში */
  if (!env.BOG_CLIENT_ID || !env.BOG_CLIENT_SECRET) {
    order.status = "no_payment";
    await saveOrder(env, order);
    ctx.waitUntil(notifyTelegram(env, order, "⚠️ <b>გადახდის გარეშე</b> — ბანკი ჯერ არ არის ჩართული"));
    return json({ ok: true, mode: "telegram", order_no: orderNo }, 200, allowed);
  }

  let redirect;
  try {
    /* callback-ის მისამართს თვითონ მოთხოვნიდან ვიღებთ — ცალკე ცვლადი არ სჭირდება */
    redirect = await createBogOrder(env, order, new URL(request.url).origin);
  } catch (err) {
    order.status = "create_failed";
    order.error = String(err && err.message ? err.message : err);
    await saveOrder(env, order);
    return json({ ok: false, error: "გადახდის დაწყება ვერ მოხერხდა. სცადე თავიდან." }, 502, allowed);
  }

  return json({ ok: true, mode: "payment", order_no: orderNo, redirect: redirect }, 200, allowed);
}

/* ---------- ბანკთან შეკვეთის შექმნა ---------- */
async function createBogOrder(env, order, workerOrigin) {
  const token = await bogToken(env);
  const site = (env.SITE_URL || "").replace(/\/+$/, "");

  const basket = [{
    product_id: order.item_id,
    description: order.item_title,
    quantity: 1,
    unit_price: order.base_price,
  }];
  if (order.cover_extra) {
    basket.push({
      product_id: "hard-cover",
      description: "მაგარი ყდა",
      quantity: 1,
      unit_price: order.cover_extra,
    });
  }

  const body = {
    callback_url: workerOrigin + "/callback",
    external_order_id: order.order_no,
    purchase_units: {
      currency: "GEL",
      total_amount: order.total,
      basket: basket,
    },
    redirect_urls: {
      success: site + "/success.html?no=" + encodeURIComponent(order.order_no),
      fail: site + "/fail.html?no=" + encodeURIComponent(order.order_no),
    },
    ttl: ORDER_TTL_MINUTES,
    capture: "automatic",
  };

  const res = await fetch(BOG_ORDERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "ka",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error("BOG " + res.status + ": " + JSON.stringify(data).slice(0, 300));
  }

  const link = data && data._links && data._links.redirect && data._links.redirect.href;
  if (!link) throw new Error("ბანკმა გადახდის ბმული არ დააბრუნა");

  /* ბანკის შიდა ნომერს ვინახავთ — callback-ში მისით ვამოწმებთ სტატუსს */
  order.bog_order_id = data.id || "";
  await saveOrder(env, order);

  return link;
}

/* ---------- ბანკის ტოკენი (1 საათი ცოცხლობს, ვქეშავთ) ---------- */
async function bogToken(env) {
  const cached = await env.ORDERS.get("bog_token");
  if (cached) return cached;

  const res = await fetch(BOG_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(env.BOG_CLIENT_ID + ":" + env.BOG_CLIENT_SECRET),
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error("ბანკთან ავტორიზაცია ვერ მოხერხდა (" + res.status + ")");
  }

  /* ვადაზე ცოტა ადრე ვაქრობთ, რომ ზუსტად ვადის ბოლოს არ დაგვიწიოს */
  const ttl = Math.max(60, (Number(data.expires_in) || 3600) - 120);
  await env.ORDERS.put("bog_token", data.access_token, { expirationTtl: ttl });

  return data.access_token;
}

/* ============================================================================
   2. ბანკის callback — "გადაიხადა"
   ============================================================================ */
async function handleCallback(request, env, ctx) {
  /* ხელმოწერა ითვლება ზუსტად იმ ბაიტებზე, რაც მოვიდა — ამიტომ ჯერ ტექსტად
     ვკითხულობთ და მხოლოდ შემოწმების შემდეგ ვშლით JSON-ად */
  const raw = await request.text();
  const signature = request.headers.get("Callback-Signature") || "";

  if (!signature || !(await verifySignature(raw, signature))) {
    /* ხელმოწერა არ დაემთხვა — ან ვიღაც თავს ბანკად ასაღებს, ან მოთხოვნა დაზიანდა */
    return new Response("bad signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const info = (payload && payload.body) || {};
  const orderNo = info.external_order_id || "";
  const bogOrderId = info.order_id || "";

  if (!orderNo) return new Response("ok", { status: 200 });

  const order = await getOrder(env, orderNo);
  if (!order) return new Response("ok", { status: 200 });

  /* callback-ს მარტო არ ვენდობით — სტატუსს თვითონ ვეკითხებით ბანკს */
  let status = "";
  try {
    status = await bogStatus(env, bogOrderId || order.bog_order_id);
  } catch {
    status = ((info.order_status || {}).key) || "";
  }

  order.status = status || "unknown";
  order.paid_at = new Date().toISOString();
  await saveOrder(env, order);

  if (status !== "completed") {
    return new Response("ok", { status: 200 });
  }

  /* ერთი შეკვეთა — ერთი შეტყობინება, თუნდაც ბანკმა callback ორჯერ გამოგზავნოს */
  const already = await env.ORDERS.get("sent:" + orderNo);
  if (already) return new Response("ok", { status: 200 });
  await env.ORDERS.put("sent:" + orderNo, "1", { expirationTtl: 60 * 60 * 24 * KEEP_ORDER_DAYS });

  ctx.waitUntil(notifyTelegram(env, order, "✅ <b>გადახდილია</b>"));

  return new Response("ok", { status: 200 });
}

/* ---------- სტატუსის დამოუკიდებელი გადამოწმება ---------- */
async function bogStatus(env, bogOrderId) {
  if (!bogOrderId) throw new Error("no order id");
  const token = await bogToken(env);
  const res = await fetch(BOG_RECEIPT_URL + encodeURIComponent(bogOrderId), {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) throw new Error("receipt " + res.status);
  const data = await res.json();
  return (data && data.order_status && data.order_status.key) || "";
}

/* ---------- ხელმოწერის შემოწმება (SHA256withRSA) ---------- */
async function verifySignature(rawBody, signatureB64) {
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      pemToBytes(BOG_PUBLIC_KEY),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64ToBytes(signatureB64),
      new TextEncoder().encode(rawBody)
    );
  } catch {
    return false;
  }
}

/* ============================================================================
   3. სტატუსი success.html-ისთვის
   ============================================================================ */
async function handleOrderStatus(url, env, allowed) {
  const orderNo = url.searchParams.get("no") || "";
  const order = await getOrder(env, orderNo);

  if (!order) return json({ ok: false, error: "შეკვეთა ვერ მოიძებნა" }, 404, allowed);

  /* გვერდს მხოლოდ ის ვუთხრათ, რაც სჭირდება — მისამართი და ტელეფონი აქ არ გადის */
  return json({
    ok: true,
    order_no: order.order_no,
    status: order.status,
    total: order.total,
    item: order.item_title,
    kind: order.kind,
  }, 200, allowed);
}

/* ============================================================================
   Telegram
   ============================================================================ */
async function notifyTelegram(env, order, header) {
  const caption = buildCaption(order, header);

  /* ფოტო R2-დან */
  let photo = null;
  try {
    const obj = await env.PHOTOS.get(order.photo_key);
    if (obj) photo = await obj.arrayBuffer();
  } catch { /* ფოტოს გარეშეც შეკვეთა უნდა მივიდეს */ }

  if (photo) {
    const body = new FormData();
    body.append("chat_id", env.CHAT_ID);
    body.append("parse_mode", "HTML");
    body.append("caption", caption.slice(0, 1024));
    body.append("photo", new Blob([photo]), order.order_no + ".jpg");

    const res = await tg(env, "sendPhoto", body);

    /* თუ ტექსტი 1024 სიმბოლოს გადააჭარბა, დანარჩენს ცალკე ვგზავნით */
    if (res && caption.length > 1024) await sendText(env, caption);
    return;
  }

  await sendText(env, caption);
}

async function sendText(env, text) {
  const body = new FormData();
  body.append("chat_id", env.CHAT_ID);
  body.append("parse_mode", "HTML");
  body.append("text", text.slice(0, 4096));
  return tg(env, "sendMessage", body);
}

async function tg(env, method, body) {
  try {
    const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/" + method, {
      method: "POST",
      body: body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildCaption(order, header) {
  const line = (label, value) => {
    const v = String(value == null ? "" : value).trim();
    return v ? "<b>" + label + ":</b> " + esc(v) + "\n" : "";
  };

  const coverLabel = order.cover_type === "hard" ? "მაგარი ყდა"
    : order.cover_type === "soft" ? "რბილი ყდა" : "";

  return (
    "🎁 <b>შეკვეთა " + esc(order.order_no) + "</b>\n" +
    header + "\n\n" +
    line(order.kind, order.item_title) +
    line("ფასი", "₾" + order.base_price) +
    (order.cover_extra ? line("მაგარი ყდა", "+₾" + order.cover_extra) : "") +
    line("ჯამი", "₾" + order.total) +
    "\n<b>👶 ბავშვი</b>\n" +
    line("სახელი", order.child_name) +
    line("მიცემითში", order.child_name_story) +
    line("ასაკი", order.child_age) +
    line("სქესი", order.child_gender) +
    line("თმის ფერი", order.hair_color) +
    line("კანის ტონი", order.skin_tone) +
    line("თვალის ფერი", order.eye_color) +
    line("ყდის ტიპი", coverLabel) +
    line("მიძღვნა", order.dedication) +
    "\n<b>📞 შემკვეთი</b>\n" +
    line("სახელი", order.customer_name) +
    line("ტელეფონი", order.phone) +
    line("ელ-ფოსტა", order.email) +
    line("ქალაქი", order.city) +
    line("მისამართი", order.address) +
    line("კომენტარი", order.comment)
  ).trim();
}

/* ============================================================================
   შენახვა
   ============================================================================ */
async function saveOrder(env, order) {
  await env.ORDERS.put("order:" + order.order_no, JSON.stringify(order), {
    expirationTtl: 60 * 60 * 24 * KEEP_ORDER_DAYS,
  });
}

async function getOrder(env, orderNo) {
  if (!/^TTK-[A-Za-z0-9-]+$/.test(orderNo || "")) return null;
  const raw = await env.ORDERS.get("order:" + orderNo);
  return raw ? JSON.parse(raw) : null;
}

/* შეკვეთის ნომერი: TTK-0001, TTK-0002 …
   KV-ს ატომური მთვლელი არ აქვს, ამიტომ დაკავებულ ნომერს ვამოწმებთ და ვცდილობთ
   შემდეგს. ამ მოცულობაზე (დღეში რამდენიმე შეკვეთა) სავსებით საკმარისია. */
async function nextOrderNo(env) {
  for (let i = 0; i < 10; i++) {
    const current = parseInt((await env.ORDERS.get("counter")) || "0", 10) || 0;
    const n = current + 1 + i;
    const no = "TTK-" + String(n).padStart(4, "0");

    if (await env.ORDERS.get("order:" + no)) continue;   /* დაკავებულია */

    await env.ORDERS.put("counter", String(n));
    return no;
  }
  /* თუ ვერაფერს მივაგენით — დროზე დაფუძნებული ნომერი, ყოველთვის უნიკალური */
  return "TTK-" + Date.now();
}

/* ============================================================================
   დამხმარეები
   ============================================================================ */
function str(v) { return typeof v === "string" ? v.trim() : ""; }

function esc(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function requiredMissing(order, isAnim) {
  const need = [
    ["child_name", "ბავშვის სახელი"],
    ["child_name_story", "სახელი მიცემით ბრუნვაში"],
    ["child_age", "ასაკი"],
    ["child_gender", "სქესი"],
    ["hair_color", "თმის ფერი"],
    ["skin_tone", "კანის ტონი"],
    ["eye_color", "თვალის ფერი"],
    ["customer_name", "სახელი და გვარი"],
    ["phone", "ტელეფონი"],
    ["email", "ელ-ფოსტა"],
  ];
  if (!isAnim) {
    need.push(["city", "ქალაქი"], ["address", "მისამართი"]);
  }
  for (const [key, label] of need) {
    if (!order[key]) return label;
  }
  return null;
}

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v); }

function isGeorgianPhone(v) {
  const digits = String(v).replace(/\D/g, "").replace(/^0+/, "").replace(/^995/, "");
  return /^(?:5|3)\d{8}$/.test(digits);
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return base64ToBytes(b64);
}

function base64ToBytes(b64) {
  const bin = atob(String(b64).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function cors(allowed) {
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(payload, status, allowed) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: { "Content-Type": "application/json", ...cors(allowed) },
  });
}
