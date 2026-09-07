/* ============================================================
   ტიტიკო (Tittiko) — interactions
   ============================================================ */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Cloudflare Worker-ის მისამართი — ინახავს ბოტის ტოკენს, ბანკის
     გასაღებებსა და ფასების ცხრილს. ორივე order.html-ის ფორმა და
     success/fail გვერდები ამას იყენებენ. Worker-ის კოდი: server/worker.js
     ------------------------------------------------------------------ */
  var PROXY_URL = "https://shy-sound-1c56.txelidze-toma.workers.dev";

  /* ============================================================
     0 · პატარა დამხმარეები
     ============================================================ */

  /* localStorage პრივატულ რეჟიმში ან გამორთული cookie-ებით სროლას იწყებს,
     ამიტომ ყველა წვდომა აქ არის შეფუთული — საიტი ამაზე არ უნდა ჩავარდეს. */
  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ეკრანიდან წასული ელემენტი — მისი გამომწერი აღარ გვჭირდება */
  function isLive(node) {
    return !node || typeof node.isConnected !== "boolean" || node.isConnected;
  }

  /* ---------- toast — მოკლე დადასტურება ეკრანის ქვედა კიდეზე ---------- */
  var toastTimer = null;

  /* action — ან ბმულის მისამართი, ან ფუნქცია (მაგ. „დაბრუნება“) */
  function toast(msg, actionLabel, action) {
    var box = document.getElementById("toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      box.className = "toast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }

    box.textContent = "";
    var text = document.createElement("span");
    text.className = "toast__msg";
    text.textContent = msg;
    box.appendChild(text);

    if (actionLabel && action) {
      var trigger;
      if (typeof action === "function") {
        trigger = document.createElement("button");
        trigger.type = "button";
        trigger.addEventListener("click", function () {
          clearTimeout(toastTimer);
          box.classList.remove("is-shown");
          action();
        });
      } else {
        trigger = document.createElement("a");
        trigger.href = action;
      }
      trigger.className = "toast__action";
      trigger.textContent = actionLabel;
      box.appendChild(trigger);
    }

    box.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove("is-shown"); }, 3600);
  }

  /* ============================================================
     1 · კატალოგის მონაცემები — ერთადერთი წყარო მთელი საიტისთვის.
     ბარათები HTML-ში წერია (ძებნის რობოტებისთვის), დანარჩენს —
     მოკლე აღწერას, გულის ღილაკს, ძებნის სიტყვებს — აქედან ვამატებთ.
     ============================================================ */
  var BOOKS = {
    superhero:  { title: "პატარა სუპერგმირი", emoji: "🦸", cover: "cover--c1", cat: "boys", age: "2–8", price: "₾65",
      theme: "სუპერგმირები", keywords: "გმირი მოსასხამი ქალაქი სიკეთე კნუტი მეზობელი",
      short: "მოსასხამი მხრებზე, კეთილი გული და ქალაქი, რომელსაც შველა სჭირდება.",
      blurb: "შენი პატარა ერთ დილას აღმოაჩენს, რომ განსაკუთრებული ძალა აქვს. მოსასხამი მხრებზე გადააქვს და ქალაქს ეშველება — ეხმარება მეზობლებს, პოულობს დაკარგულ კნუტს და სწავლობს, რომ ნამდვილი გმირობა სიკეთეა." },
    earth:      { title: "მოგზაურობა დედამიწის გარშემო", emoji: "🌍", cover: "cover--c2", cat: "learn", age: "2–8", price: "₾65",
      theme: "მოგზაურობა", keywords: "ქვეყანა კულტურა ჩინეთი კედელი ამაზონი ჯუნგლები ეგვიპტე პირამიდა გეოგრაფია",
      short: "ჯადოსნური ზურგჩანთით — ჩინეთის კედლიდან ეგვიპტის პირამიდებამდე.",
      blurb: "ჯადოსნურ ზურგჩანთასთან ერთად ბავშვი გარშემოვლით მოგზაურობს დედამიწაზე — ხედავს ჩინეთის დიდ კედელს, ამაზონის ჯუნგლებსა და ეგვიპტის პირამიდებს, ეცნობა ახალ კულტურებს და აღმოაჩენს, რომ სამყარო საოცრებებითაა სავსე." },
    space:      { title: "კოსმოსური თავგადასავალი", emoji: "🚀", cover: "cover--c3", cat: "boys", age: "2–8", price: "₾65",
      theme: "კოსმოსი", keywords: "ასტრონავტი რაკეტა ვარსკვლავი მთვარე უცხოპლანეტელი პლანეტა",
      short: "რაკეტა ვარსკვლავებისკენ, ხტუნვა მთვარეზე და ცნობისმოყვარე უცხოპლანეტელი.",
      blurb: "პატარა ასტრონავტი რაკეტით ვარსკვლავებისკენ მიფრინავს. ის დახტის მთვარეზე, მეგობრდება ცნობისმოყვარე უცხოპლანეტელს და აღმოაჩენს, რომ ცნობისმოყვარეობა ყველაზე შორს მიმყვანი საწვავია." },
    animals:    { title: "ცხოველთა აკადემია", emoji: "🐾", cover: "cover--c4", cat: "learn", age: "2–8", price: "₾65",
      theme: "ცხოველები", keywords: "დელფინი ბუ ჭიანჭველა ბუნება სკოლა გაკვეთილი",
      short: "დელფინები, ბუები და ჭიანჭველები — გაკვეთილები, რომლებიც მეგობრობით სრულდება.",
      blurb: "ცხოველთა აკადემიაში შენი ბავშვი სწავლობს, როგორ ლაპარაკობენ დელფინები, რატომ არ იძინებს ბუ ღამით და როგორ ეხმარებიან ჭიანჭველები ერთმანეთს. ყოველი გაკვეთილი ახალი მეგობრობით სრულდება." },
    cars:       { title: "მანქანების ქალაქი", emoji: "🚗", cover: "cover--c5", cat: "boys", age: "2–8", price: "₾65",
      theme: "მანქანები", keywords: "მანქანა სახანძრო ავტობუსი ხიდი ქალაქი ტექნიკა ბორბალი",
      short: "სახანძრო მანქანა, გაჭედილი ავტობუსი და ხიდი, რომელიც ქალაქს აერთიანებს.",
      blurb: "მანქანების ქალაქში ყველა ბორბალზეა! შენი პატარა მართავს სახანძრო მანქანას, ეხმარება გაჭედილ ავტობუსს და აშენებს ხიდს, რომელიც მთელ ქალაქს აერთიანებს." },
    ocean:      { title: "წყალქვეშა თავგადასავალი", emoji: "🐠", cover: "cover--c6", cat: "learn", age: "2–8", price: "₾65",
      theme: "ოკეანე", keywords: "ზღვა წყალი კუ თევზი რიფი საგანძური ეკოლოგია",
      short: "ფერადი რიფები, ზღვის კუები და დაკარგული სამარხი ოკეანის ფსკერზე.",
      blurb: "ღრმა ოკეანეში, ფერად რიფებს შორის, შენი ბავშვი ცურავს კუებთან ერთად, პოულობს დაკარგულ სამარხს და სწავლობს, რომ ზღვის დაცვა ყველა პატარა გმირის საქმეა." },
    dino:       { title: "დინოზავრების სამყარო", emoji: "🦕", cover: "cover--c7", cat: "boys", age: "2–8", price: "₾65",
      theme: "დინოზავრები", keywords: "დინოზავრი ტრიცერატოპსი დროის მანქანა კვერცხი სიმამაცე",
      short: "დროის მანქანა, პატარა ტრიცერატოპსი და სიმამაცე, რომელიც ზომაზე არ არის დამოკიდებული.",
      blurb: "დროის მანქანა ბავშვს დინოზავრების ეპოქაში გადაისვრის. ის კვერცხიდან გამოსულ პატარა ტრიცერატოპსს უვლის და აღმოაჩენს, რომ სიმამაცე ზომაზე არ არის დამოკიდებული." },
    princess:   { title: "პრინცესას თავგადასავალი", emoji: "👑", cover: "cover--c8", cat: "girls", age: "2–8", price: "₾65",
      theme: "ზღაპარი", keywords: "პრინცესა დრაკონი სამეფო გვირგვინი ზღაპარი",
      short: "ჯადოსნური სამეფო, გაბრაზებული დრაკონი და გვირგვინი, რომელიც სინამდვილეში კეთილი გულია.",
      blurb: "ჯადოსნურ სამეფოში პატარა პრინცესა ვეება გულით მართავს — ის აშოშმინებს გაბრაზებულ დრაკონს, სცემს პატივს ყველა სტუმარს და სწავლობს, რომ ნამდვილი გვირგვინი კეთილი გულია." },
    fairy:      { title: "ფერიების ბაღი", emoji: "🧚", cover: "cover--c1", cat: "girls", age: "2–8", price: "₾65",
      theme: "ფერიები", keywords: "ფერია ბაღი ყვავილი პეპელა ცვარი ცისარტყელა ღამე",
      short: "ღამის ბაღი, ცვარის შეგროვება და პეპლების საცეკვაოდ მომზადება.",
      blurb: "ღამის ბაღში ფერიები ყვავილებს აღვიძებენ. შენი ბავშვი მათ ეხმარება ცვარის შეგროვებაში, ცისარტყელას შეღებვასა და პეპლების საცეკვაოდ მომზადებაში." },
    abc:        { title: "ანბანის ჯადოქრობა", emoji: "🔤", cover: "cover--c2", cat: "learn", age: "3–7", price: "₾65",
      theme: "ანბანი", keywords: "ასო ანბანი კითხვა სწავლა ბაყაყი ანგელოზი სკოლისთვის",
      short: "ყოველი ასო ცოცხლდება და თამაშ-თამაშ ასწავლის მთელ ანბანს.",
      blurb: "ყოველი ასო ცოცხლდება და პატარა თავგადასავალს იწყებს. „ა“ ანგელოზს ეძებს, „ბ“ ბაყაყს დაეწია — და შენი ბავშვი თამაშ-თამაშ სწავლობს მთელ ანბანს." },
    rainbow:    { title: "ცისარტყელას მოგონება", emoji: "🌈", cover: "cover--c5", cat: "girls", age: "2–8", price: "₾65",
      theme: "ფერები", keywords: "ცისარტყელა წვიმა ფერი ცა მოგონება",
      short: "შვიდი ფერი, შვიდი ისტორია და ერთი დიდი ჯადო წვიმის შემდეგ.",
      blurb: "წვიმის შემდეგ ცისარტყელა ცას გადაება. შენი პატარა თითოეულ ფერს ცალკე ხვდება, ისმენს მათ ისტორიებს და აღმოაჩენს, რომ ერთად ისინი ჯადოს ქმნიან." },
    football:   { title: "ფეხბურთის ვარსკვლავი", emoji: "⚽", cover: "cover--c7", cat: "boys", age: "3–8", price: "₾65",
      theme: "სპორტი", keywords: "ფეხბურთი ბურთი გუნდი მატჩი გოლი სპორტი",
      short: "დიდი მატჩი, სადაც გამარჯვება ბურთის გაზიარებით იწყება.",
      blurb: "დიდი მატჩის დღეა. შენი ბავშვი გუნდს გამარჯვებისკენ მიუძღვება — არა მარტო გოლებით, არამედ იმით, რომ ყველა მოთამაშეს ურიგებს ბურთს და მხარში უდგას." },
    history:    { title: "ისტორიაში მოგზაურობა", emoji: "🏛️", cover: "cover--c6", cat: "learn", age: "4–8", price: "₾65",
      theme: "ისტორია", keywords: "რაინდი ოლიმპიური თამაშები გამომგონებელი წარსული დროის მანქანა",
      short: "რაინდები, პირველი ოლიმპიადა და გამომგონებლები — ერთ თავგადასავალში.",
      blurb: "დროის მანქანით შენი ბავშვი ხვდება რაინდებს, ხედავს პირველ ოლიმპიურ თამაშებს და საუბრობს გამომგონებლებთან — ისტორია ცოცხალ თავგადასავლად იქცევა." },
    friendship: { title: "მეგობრობის ჯადო", emoji: "🤝", cover: "cover--c4", cat: "girls", age: "2–8", price: "₾65",
      theme: "მეგობრობა", keywords: "მეგობარი სკოლა ზღაპარი ახალი გარემო",
      short: "ახალი სკოლა, პირველი მეგობრობა და ზღაპრები, რომლებიც ორივეს უყვარს.",
      blurb: "ახალ სკოლაში შენი პატარა მარტოა — სანამ არ გაიცნობს გოგონას, რომელსაც ისეთივე ზღაპრები უყვარს. ერთად ისინი აღმოაჩენენ, რომ მეგობრობა ყველაზე ძლიერი ჯადოა." }
  };

  var ANIMATIONS = {
    hero:     { title: "შენ ხარ გმირი", emoji: "🦸", thumb: "anim-thumb--a", cat: "adventure", age: "2–8", duration: "3–5 წთ", price: "₾45",
      theme: "თავგადასავალი", keywords: "გმირი ქალაქი ზესახელა მეგობრობა",
      short: "ქალაქის გადარჩენა, მეგობრების დახმარება და კეთილი ზესახელა.",
      blurb: "შენი ბავშვი მთავარ როლში — ის ქალაქს გადაარჩენს, დაეხმარება მეგობრებს და მიხვდება, რომ ნამდვილი ზესახელა კეთილი გულია. სახელი, გარეგნობა და ხმაც კი მასზეა მორგებული." },
    planet:   { title: "ცისფერი პლანეტა", emoji: "🌍", thumb: "anim-thumb--b", cat: "learn", age: "2–8", duration: "3–5 წთ", price: "₾45",
      theme: "ბუნება", keywords: "დედამიწა კოსმოსი ეკოლოგია მკვლევარი ხომალდი",
      short: "კოსმოსური ხომალდი, დედამიწის გარშემოვლა და ბუნების გაფრთხილება.",
      blurb: "პატარა მკვლევარი კოსმოსური ხომალდით დედამიწას გარშემოუვლის და ხედავს, რა მშვენიერი და მყიფეა ჩვენი ცისფერი პლანეტა. გზად სწავლობს, როგორ გავუფრთხილდეთ ბუნებას." },
    spring:   { title: "გაზაფხულის ზეიმი", emoji: "🌸", thumb: "anim-thumb--c", cat: "seasonal", age: "2–8", duration: "3–5 წთ", price: "₾45",
      theme: "სეზონური", keywords: "გაზაფხული ყვავილი ფერია პეპელა ბაღი თოვლი",
      short: "თოვლი დნება, ბაღი იღვიძებს და ფერიები ზეიმს იწყებენ.",
      blurb: "თოვლი დნება და ბაღი იღვიძებს — შენი ბავშვი ფერიებს ეხმარება ყვავილების გაფურჩქვნასა და პეპლების გამოღვიძებაში. ფერადი, მხიარული და სითბოთი სავსე ისტორია." },
    starways: { title: "ვარსკვლავური მოგზაურობა", emoji: "🚀", thumb: "anim-thumb--d", cat: "adventure", age: "2–8", duration: "4–6 წთ", price: "₾45",
      theme: "კოსმოსი", keywords: "რაკეტა ასტრონავტი პლანეტა რობოტი ვარსკვლავი",
      short: "რაკეტა, ახალი პლანეტები და მეგობარი რობოტი ვარსკვლავებს შორის.",
      blurb: "რაკეტა ეშვება და შენი პატარა ასტრონავტი ვარსკვლავებს შორის მიფრინავს. ის აღმოაჩენს ახალ პლანეტებს, მეგობრდება რობოტთან და მიხვდება, რომ ცნობისმოყვარეობა უსაზღვროა." },
    sea:      { title: "ზღვის სიღრმეში", emoji: "🐬", thumb: "anim-thumb--e", cat: "learn", age: "2–8", duration: "3–5 წთ", price: "₾45",
      theme: "ოკეანე", keywords: "დელფინი ზღვა რიფი საგანძური წყალი ეკოლოგია",
      short: "დელფინები, ფერადი რიფები და დაკარგული საგანძური ოკეანის ფსკერზე.",
      blurb: "ღრმა ოკეანეში, ფერად რიფებს შორის, შენი ბავშვი დელფინებთან ერთად ცურავს და პოულობს დაკარგულ საგანძურს. თან სწავლობს, რატომ არის ზღვის სისუფთავე ასე მნიშვნელოვანი." },
    birthday: { title: "დაბადების დღის სასწაული", emoji: "🎂", thumb: "anim-thumb--f", cat: "seasonal", age: "2–8", duration: "3–5 წთ", price: "₾45",
      theme: "დაბადების დღე", keywords: "დაბადების დღე ტორტი სიმღერა საჩუქარი ზეიმი",
      short: "ჯადოსნური სტუმრები, სახელობითი სიმღერა და დაუვიწყარი დაბადების დღე.",
      blurb: "დაბადების დღის დილას შენს ბავშვს ჯადოსნური სტუმრები ეწვევიან და დღეს დაუვიწყარს გახდიან. სახელით მოძღვნილი სიმღერითა და ტორტით — იდეალური საჩუქარი." }
  };

  var CATALOG = { book: BOOKS, anim: ANIMATIONS };

  function itemOf(type, id) {
    var group = CATALOG[type];
    return (group && Object.prototype.hasOwnProperty.call(group, id)) ? group[id] : null;
  }
  function itemKey(type, id) { return type + ":" + id; }

  /* "book:space" → {type:"book", id:"space"}; უცნობი პროდუქტი → null */
  function parseKey(key) {
    if (typeof key !== "string") return null;
    var i = key.indexOf(":");
    if (i < 1) return null;
    var type = key.slice(0, i), id = key.slice(i + 1);
    return itemOf(type, id) ? { type: type, id: id } : null;
  }

  function detailHref(type, id) {
    return (type === "anim" ? "animation.html?id=" : "book.html?id=") + encodeURIComponent(id);
  }

  /* შეკვეთის ბმული — კატალოგში შეყვანილ სახელსა და ასაკს თან გაჰყვება */
  function orderHref(type, id) {
    var q = (type === "anim" ? "type=animation&" : "") + "id=" + encodeURIComponent(id);
    var name = childName();
    if (name) q += "&name=" + encodeURIComponent(name);
    var age = childAge();
    if (age) q += "&age=" + encodeURIComponent(age);
    return "order.html?" + q;
  }

  /* "2–8" → {min:2, max:8} — გრძელი ტირეც და დეფისიც მუშაობს */
  function ageRange(item) {
    var text = String((item && item.age) || "");
    var pair = text.match(/(\d+)\s*[–—-]\s*(\d+)/);
    if (pair) return { min: +pair[1], max: +pair[2] };
    var single = text.match(/\d+/);
    return single ? { min: +single[0], max: +single[0] } : null;
  }

  /* ============================================================
     2 · „ვისთვის ვეძებთ საჩუქარს“ — სახელი და ასაკი მთელ საიტს გასდევს
     ============================================================ */
  var NAME_KEY = "titiko:childName";
  var AGE_KEY = "titiko:childAge";

  function childName() {
    var v = store.get(NAME_KEY, "");
    return typeof v === "string" ? v.trim().slice(0, 24) : "";
  }
  function childAge() {
    var v = String(store.get(AGE_KEY, ""));
    return /^[2-8]$/.test(v) ? v : "";
  }

  /* ყდაზე დასაწერი სათაური — სახელი თუ ვიცით, წიგნი მას „ეკუთვნის“.
     მხოლოდ წიგნებზე: მათი სათაურები არსებითი სახელებია და „ნიკა და …“
     ბუნებრივად იკითხება. */
  function coverTitle(title) {
    var name = childName();
    return name ? name + " და " + title : title;
  }

  /* ანიმაციების სათაურები წინადადებებია („შენ ხარ გმირი“) — მათში სახელის
     ჩასმა ქართულად უხერხულია, ამიტომ ცალკე ბეჯს ვაჩვენებთ. */
  function applyWhoBadge(host, override) {
    if (!host) return;
    var badge = host.querySelector(".anim-thumb__who");
    var name = typeof override === "string" ? override.trim().slice(0, 24) : childName();
    if (!name) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "anim-thumb__who";
      host.appendChild(badge);
    }
    badge.textContent = "🎬 მთავარ როლში: " + name;
  }

  /* აღწერებში „შენი ბავშვი“ სახელით ჩანაცვლდება. მხოლოდ იმ ფორმებს
     ვცვლით, სადაც ქართული ბრუნვა ცალსახად სწორი გამოდის. */
  function personalize(text) {
    var name = childName();
    if (!name || !text) return text || "";
    /* replace()-ის მეორე არგუმენტში „$“ სპეციალური სიმბოლოა */
    var safe = name.replace(/\$/g, "$$$$");
    return String(text)
      .replace(/შენს ბავშვს/g, safe + "ს")
      .replace(/შენი ბავშვი/g, safe)
      .replace(/შენი პატარა(?=[\s,.!?]|$)/g, safe);
  }

  /* ============================================================
     3 · რჩეულები — ბრაუზერში შენახული სია (ანგარიშის გარეშე)
     ============================================================ */
  var FAV_KEY = "titiko:favorites";
  var favListeners = [];

  function favRead() {
    var raw = store.get(FAV_KEY, []);
    if (!Array.isArray(raw)) return [];
    var seen = {}, out = [];
    raw.forEach(function (key) {
      if (seen[key] || !parseKey(key)) return;   /* დუბლი და წაშლილი პროდუქტი ჩუმად ცვივა */
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function favNotify() {
    var list = favRead();
    favListeners = favListeners.filter(function (l) { return isLive(l.node); });
    favListeners.forEach(function (l) { l.fn(list); });
  }

  function favToggle(key) {
    var list = favRead();
    var i = list.indexOf(key);
    if (i === -1) list.unshift(key); else list.splice(i, 1);
    store.set(FAV_KEY, list);
    favNotify();
    return i === -1;                              /* true = დაემატა */
  }

  function favAddMany(keys) {
    var list = favRead();
    var added = 0;
    keys.forEach(function (key) {
      if (parseKey(key) && list.indexOf(key) === -1) { list.unshift(key); added++; }
    });
    if (added) { store.set(FAV_KEY, list); favNotify(); }
    return added;
  }

  function favClear() {
    store.set(FAV_KEY, []);
    favNotify();
  }

  function onFavChange(fn, node) {
    favListeners.push({ fn: fn, node: node || null });
    fn(favRead());
  }

  /* სხვა ტაბში დამატებული გული აქაც უნდა აისახოს */
  window.addEventListener("storage", function (e) {
    if (e.key === FAV_KEY) favNotify();
  });

  /* ---------- გულის ღილაკი ---------- */
  function favButton(type, id) {
    var key = itemKey(type, id);
    var item = itemOf(type, id);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-btn";

    var icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "♥";
    btn.appendChild(icon);

    function paint(on) {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      var label = (on ? "რჩეულებიდან ამოღება" : "რჩეულებში დამატება") +
        (item ? " — " + item.title : "");
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var added = favToggle(key);
      if (added && !reducedMotion()) {
        btn.classList.remove("is-popping");
        void btn.offsetWidth;                     /* ანიმაციის გადატვირთვა */
        btn.classList.add("is-popping");
      }
      toast(
        added ? "„" + (item ? item.title : "") + "“ რჩეულებშია" : "რჩეულებიდან ამოღებულია",
        added ? "სიის ნახვა" : "დაბრუნება",
        added ? "favorites.html" : function () { favToggle(key); }
      );
    });

    onFavChange(function (list) { paint(list.indexOf(key) !== -1); }, btn);
    return btn;
  }

  /* ---------- ნავიგაციის გული (JS-ით ემატება ყველა გვერდზე) ---------- */
  (function mountNavFav() {
    var inner = document.querySelector(".nav__inner");
    if (!inner || document.getElementById("navFav")) return;

    var link = document.createElement("a");
    link.id = "navFav";
    link.className = "nav__fav";
    link.href = "favorites.html";
    link.innerHTML = '<span class="nav__fav-ic" aria-hidden="true">♥</span>' +
                     '<span class="nav__fav-count" id="navFavCount">0</span>';

    var toggle = inner.querySelector(".nav__toggle");
    if (toggle) inner.insertBefore(link, toggle); else inner.appendChild(link);

    if (/favorites\.html$/.test(window.location.pathname)) link.classList.add("is-active");

    onFavChange(function (list) {
      var count = list.length;
      link.classList.toggle("has-items", count > 0);
      var badge = document.getElementById("navFavCount");
      if (badge) badge.textContent = count;
      var label = count ? "რჩეულები — " + count + " პროდუქტი" : "რჩეულები — სია ცარიელია";
      link.setAttribute("aria-label", label);
      link.title = label;
    }, link);
  })();

  /* ============================================================
     4 · ვადები — ერთ ადგილას, რომ მთელ საიტზე ერთი და იგივე ეწეროს.
     ⚠ ციფრები რეალურ ვადებზე უნდა გასწორდეს (შდრ. delivery.html).
     ============================================================ */
  var LEAD = {
    makeMin: 2, makeMax: 3,          /* დამზადება — სამუშაო დღე */
    shipMin: 1, shipMax: 2,          /* თბილისში მიწოდება — სამუშაო დღე */
    digitalMin: 1, digitalMax: 2     /* ანიმაციის ფაილი — სამუშაო დღე */
  };

  var GE_MONTHS_WHEN = [
    "იანვარს", "თებერვალს", "მარტს", "აპრილს", "მაისს", "ივნისს",
    "ივლისს", "აგვისტოს", "სექტემბერს", "ოქტომბერს", "ნოემბერს", "დეკემბერს"
  ];

  function addBusinessDays(from, days) {
    var d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    var left = days;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) left--;           /* შაბათ-კვირა არ ითვლება */
    }
    return d;
  }

  /* "15–18 სექტემბერს" ან "29 სექტემბერს – 2 ოქტომბერს" */
  function dateRangeText(from, minDays, maxDays) {
    var a = addBusinessDays(from, minDays);
    var b = addBusinessDays(from, maxDays);
    if (a.getTime() === b.getTime()) {
      return a.getDate() + " " + GE_MONTHS_WHEN[a.getMonth()];
    }
    if (a.getMonth() === b.getMonth()) {
      return a.getDate() + "–" + b.getDate() + " " + GE_MONTHS_WHEN[b.getMonth()];
    }
    return a.getDate() + " " + GE_MONTHS_WHEN[a.getMonth()] + " – " +
           b.getDate() + " " + GE_MONTHS_WHEN[b.getMonth()];
  }

  function bookEtaText() {
    return dateRangeText(new Date(), LEAD.makeMin + LEAD.shipMin, LEAD.makeMax + LEAD.shipMax);
  }
  function animEtaText() {
    return dateRangeText(new Date(), LEAD.digitalMin, LEAD.digitalMax);
  }

  /* ============================================================
     5 · ბარათების გამდიდრება მონაცემებიდან
     HTML-ში ბარათი მინიმალურია; მოკლე აღწერას, გულს, ძებნის
     სიტყვებსა და ასაკს აქ ვამატებთ — ერთი წყაროდან, ხელით არსად.
     ============================================================ */
  function decorateCard(card, type, id) {
    var item = itemOf(type, id);
    if (!item || card.dataset.decorated) return;
    card.dataset.decorated = "1";
    card.dataset.favKey = itemKey(type, id);

    var range = ageRange(item);
    if (range) {
      card.dataset.ageMin = String(range.min);
      card.dataset.ageMax = String(range.max);
    }
    card.dataset.keywords = [item.title, item.theme, item.short, item.keywords, item.blurb]
      .join(" ").toLowerCase();

    /* მოკლე აღწერა — ამის გარეშე ყველა ბარათი ერთნაირად იკითხებოდა */
    var body = card.querySelector(".book-card__body, .anim-card__body");
    var meta = card.querySelector(".book-card__meta");
    if (body && item.short && !body.querySelector(".book-card__short")) {
      var line = document.createElement("p");
      line.className = "book-card__short";
      line.textContent = item.short;
      if (meta) meta.insertAdjacentElement("afterend", line);
      else body.appendChild(line);
      card.classList.add("has-short");
    }

    /* გული — ყდის ზედა-მარჯვენა კუთხეში */
    var art = card.querySelector(".cover, .anim-thumb");
    if (art && !art.querySelector(".fav-btn")) art.appendChild(favButton(type, id));

    /* ბავშვის სახელი — წიგნზე ყდის სათაურში, ანიმაციაზე ცალკე ბეჯად */
    if (type === "anim") {
      if (art) {
        art.dataset.whoHost = "1";
        applyWhoBadge(art);
      }
    } else {
      var coverTitleEl = card.querySelector(".cover__title");
      if (coverTitleEl) {
        coverTitleEl.dataset.baseTitle = item.title;
        coverTitleEl.textContent = coverTitle(item.title);
      }
    }
  }

  /* სახელის შეცვლისას ყველა ყდა, ბეჯი და აღწერა ერთად განახლდება */
  function refreshPersonalization(scope) {
    var root = scope || document;
    root.querySelectorAll("[data-base-title]").forEach(function (el) {
      el.textContent = coverTitle(el.dataset.baseTitle);
    });
    root.querySelectorAll("[data-base-text]").forEach(function (el) {
      el.textContent = personalize(el.dataset.baseText);
    });
    root.querySelectorAll("[data-who-host]").forEach(function (el) { applyWhoBadge(el); });
  }

  /* ============================================================
     6 · კატალოგი — „ვისთვის ვეძებთ“, ფილტრი, ძებნა, დალაგება
     ============================================================ */
  var filters = document.querySelectorAll(".filter");
  var bookGrid = document.getElementById("bookGrid") || document.getElementById("animGrid");
  var cards = bookGrid ? bookGrid.querySelectorAll(".book-card, .anim-card") : [];
  var searchInput = document.getElementById("bookSearch");
  var sortSelect = document.getElementById("bookSort");
  var resultCount = document.getElementById("resultCount");
  var emptyState = document.getElementById("emptyState");
  var resultUnit = resultCount ? (resultCount.dataset.unit || "წიგნი") : "წიგნი";
  var activeFilter = "all";
  var originalOrder = Array.prototype.slice.call(cards);

  function cardTitle(card) {
    var h3 = card.querySelector("h3");
    return (card.dataset.title || (h3 ? h3.textContent : "") || "").toLowerCase().trim();
  }

  function applyFilters() {
    var query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    var age = childAge();
    var visible = 0;

    cards.forEach(function (card) {
      var matchesCat = activeFilter === "all" || card.dataset.cat === activeFilter;
      var matchesQuery = !query ||
        (card.dataset.keywords || cardTitle(card)).indexOf(query) !== -1;
      var matchesAge = true;
      if (age && card.dataset.ageMin) {
        matchesAge = +age >= +card.dataset.ageMin && +age <= +card.dataset.ageMax;
      }
      var show = matchesCat && matchesQuery && matchesAge;
      card.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });

    if (resultCount) {
      var suffix = age ? " · " + age + " წლისთვის" : "";
      resultCount.innerHTML = "ნაპოვნია <strong>" + visible + "</strong> " + resultUnit + suffix;
    }
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  filters.forEach(function (btn) {
    /* role="tablist"-ს ნამდვილი ტაბები სჭირდება — აქ ჩვეულებრივი
       ჩამრთველებია, ამიტომ aria-pressed უფრო სწორია */
    btn.setAttribute("aria-pressed", btn.classList.contains("is-active") ? "true" : "false");
    btn.addEventListener("click", function () {
      filters.forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  if (searchInput) searchInput.addEventListener("input", applyFilters);

  if (sortSelect && bookGrid) {
    sortSelect.addEventListener("change", function () {
      var mode = sortSelect.value;
      var list = Array.prototype.slice.call(cards);
      if (mode === "az" || mode === "za") {
        list.sort(function (a, b) {
          var cmp = cardTitle(a).localeCompare(cardTitle(b), "ka");
          return mode === "az" ? cmp : -cmp;
        });
      } else {
        list = originalOrder;
      }
      list.forEach(function (card) { bookGrid.appendChild(card); });
    });
  }

  /* ---------- „ვისთვის ეძებ საჩუქარს?“ ---------- */
  (function whoBar() {
    var nameInput = document.getElementById("whoName");
    var ageSelect = document.getElementById("whoAge");
    var clearBtn = document.getElementById("whoClear");
    if (!nameInput && !ageSelect) return;

    var timer = null;

    function syncClearBtn() {
      if (clearBtn) clearBtn.hidden = !childName() && !childAge();
    }

    if (nameInput) {
      nameInput.value = childName();
      nameInput.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          store.set(NAME_KEY, nameInput.value.trim().slice(0, 24));
          refreshPersonalization();
          syncClearBtn();
        }, 250);
      });
    }

    if (ageSelect) {
      ageSelect.value = childAge();
      ageSelect.addEventListener("change", function () {
        store.set(AGE_KEY, ageSelect.value);
        applyFilters();
        syncClearBtn();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        store.remove(NAME_KEY);
        store.remove(AGE_KEY);
        if (nameInput) nameInput.value = "";
        if (ageSelect) ageSelect.value = "";
        refreshPersonalization();
        applyFilters();
        syncClearBtn();
      });
    }

    syncClearBtn();
  })();

  /* ცარიელ შედეგზე გამოსავალი ერთ დაწკაპუნებაზე იყოს */
  if (emptyState && !emptyState.querySelector(".empty-state__reset")) {
    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn--ghost btn--sm empty-state__reset";
    resetBtn.textContent = "ფილტრების გასუფთავება";
    resetBtn.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      store.remove(AGE_KEY);
      var whoAge = document.getElementById("whoAge");
      if (whoAge) whoAge.value = "";
      var whoClear = document.getElementById("whoClear");
      if (whoClear) whoClear.hidden = !childName();
      activeFilter = "all";
      filters.forEach(function (b) {
        var on = b.dataset.filter === "all";
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyFilters();
    });
    emptyState.appendChild(resetBtn);
  }

  /* ============================================================
     7 · ბარათის აწყობა მონაცემებიდან (რჩეულების გვერდისთვის)
     ============================================================ */
  function buildCard(type, id) {
    var item = itemOf(type, id);
    if (!item) return null;

    var card = document.createElement("article");
    card.className = type === "anim" ? "anim-card" : "book-card";
    card.dataset.id = id;
    card.dataset.title = item.title;
    card.dataset.cat = item.cat;

    var art = document.createElement("div");
    if (type === "anim") {
      art.className = "anim-thumb " + item.thumb;
      var play = document.createElement("span");
      play.className = "play play--static";
      play.setAttribute("aria-hidden", "true");
      play.textContent = "▶";
      var label = document.createElement("span");
      label.className = "anim-thumb__label";
      label.textContent = item.title;
      art.appendChild(play);
      art.appendChild(label);
    } else {
      art.className = "cover " + item.cover;
      var emoji = document.createElement("span");
      emoji.className = "cover__emoji";
      emoji.textContent = item.emoji;
      var coverTitleEl = document.createElement("span");
      coverTitleEl.className = "cover__title";
      coverTitleEl.textContent = item.title;
      var brand = document.createElement("span");
      brand.className = "cover__brand";
      brand.textContent = "ტიტიკო";
      art.appendChild(emoji);
      art.appendChild(coverTitleEl);
      art.appendChild(brand);
    }

    var body = document.createElement("div");
    body.className = type === "anim" ? "anim-card__body" : "book-card__body";

    var heading = document.createElement("h3");
    heading.textContent = item.title;

    var meta = document.createElement("p");
    meta.className = "book-card__meta";
    meta.textContent = type === "anim"
      ? item.duration + " · ასაკი " + item.age
      : "ასაკი " + item.age + " · მაგარი ყდა";

    var foot = document.createElement("div");
    foot.className = "book-card__foot";
    var price = document.createElement("span");
    price.className = "price";
    price.textContent = item.price;
    var cta = document.createElement("a");
    cta.className = "btn btn--primary btn--sm";
    cta.href = orderHref(type, id);
    cta.textContent = "შეკვეთა";
    foot.appendChild(price);
    foot.appendChild(cta);

    body.appendChild(heading);
    body.appendChild(meta);
    body.appendChild(foot);

    card.appendChild(art);
    card.appendChild(body);

    decorateCard(card, type, id);          /* მოკლე აღწერა + გული + სახელი ყდაზე */

    card.classList.add("book-card--link");
    card.addEventListener("click", function (e) {
      if (e.target.closest("a") || e.target.closest("button")) return;
      window.location.href = detailHref(type, id);
    });

    /* აქ ბარათი უკვე სრულად აწყობილია — wireBookCards/wireAnimCards-მა
       ღილაკის ბმული (შეკვეთა) დეტალურ გვერდზე არ უნდა გადააწეროს */
    card.dataset.wired = "1";

    return card;
  }

  /* ============================================================
     8 · რჩეულების გვერდი (favorites.html)
     ?ids=book:space,anim:hero — გაზიარებული სია (მაგ. ბებიისთვის)
     ============================================================ */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error("copy-unavailable"));
    });
  }

  var favPage = document.getElementById("favPage");
  if (favPage) {
    var favGrid = document.getElementById("favGrid");
    var favEmpty = document.getElementById("favEmpty");
    var favTools = document.getElementById("favTools");
    var favLead = document.getElementById("favLead");
    var favShareBtn = document.getElementById("favShare");
    var favClearBtn = document.getElementById("favClear");
    var favSharedBox = document.getElementById("favShared");
    var favSharedAdd = document.getElementById("favSharedAdd");
    var favShareOut = document.getElementById("favShareLink");

    /* ბმულიდან მოსული სია */
    var sharedParam = new URLSearchParams(window.location.search).get("ids");
    var sharedKeys = [];
    if (sharedParam) {
      var seenShared = {};
      sharedParam.split(",").forEach(function (raw) {
        var key;
        try { key = decodeURIComponent(raw.trim()); } catch (e) { return; }
        if (!parseKey(key) || seenShared[key]) return;
        seenShared[key] = true;
        sharedKeys.push(key);
      });
    }
    var isSharedView = sharedKeys.length > 0;

    if (favSharedBox) favSharedBox.hidden = !isSharedView;

    function favShareUrl(keys) {
      var base = window.location.href.split("#")[0].split("?")[0];
      return base + "?ids=" + keys.map(encodeURIComponent).join(",");
    }

    function renderFav(list) {
      var keys = isSharedView ? sharedKeys : list;

      if (favGrid) {
        favGrid.textContent = "";
        keys.forEach(function (key) {
          var parsed = parseKey(key);
          if (!parsed) return;
          var card = buildCard(parsed.type, parsed.id);
          if (card) favGrid.appendChild(card);
        });
        favGrid.hidden = keys.length === 0;
      }

      if (favEmpty) favEmpty.hidden = keys.length !== 0;
      if (favTools) favTools.hidden = isSharedView || keys.length === 0;

      if (favLead) {
        favLead.textContent = isSharedView
          ? "ეს სია შენ გაგიზიარეს — " + keys.length + " პროდუქტი."
          : (keys.length
              ? "შენს სიაშია " + keys.length + " პროდუქტი. სია ამ ბრაუზერშია შენახული."
              : "");
      }

      if (favSharedAdd) {
        var missing = sharedKeys.filter(function (k) { return list.indexOf(k) === -1; });
        favSharedAdd.hidden = !isSharedView || missing.length === 0;
        favSharedAdd.textContent = "დაამატე ჩემს რჩეულებში (" + missing.length + ")";
      }
    }

    onFavChange(renderFav, favPage);

    if (favSharedAdd) {
      favSharedAdd.addEventListener("click", function () {
        var added = favAddMany(sharedKeys);
        toast(added
          ? added + " პროდუქტი დაემატა შენს რჩეულებში"
          : "ყველა პროდუქტი უკვე შენს სიაშია", "ჩემი სია", "favorites.html");
      });
    }

    if (favShareBtn) {
      favShareBtn.addEventListener("click", function () {
        var list = favRead();
        if (!list.length) return;
        var url = favShareUrl(list);

        if (favShareOut) {
          favShareOut.value = url;
          favShareOut.hidden = false;
        }

        if (navigator.share) {
          navigator.share({ title: "ტიტიკო — ჩემი რჩეულები", url: url })
            .catch(function () { /* გაუქმება შეცდომა არ არის */ });
          return;
        }

        copyText(url)
          .then(function () { toast("ბმული დაკოპირდა — გაუზიარე ვისაც უნდა აჩუქოს"); })
          .catch(function () { toast("ბმული ქვემოთ არის — დააკოპირე ხელით"); });
      });
    }

    if (favClearBtn) {
      favClearBtn.addEventListener("click", function () {
        var backup = favRead();
        if (!backup.length) return;
        favClear();
        if (favShareOut) favShareOut.hidden = true;
        toast("სია გასუფთავდა", "დაბრუნება", function () { favAddMany(backup.slice().reverse()); });
      });
    }
  }

  /* ============================================================
     9 · გადასაფურცლი ყდა — ყდა და შიგთავსის ნიმუში ერთსა და იმავე
     ბარათში. ერთი გადასრიალება (ან დაკლიკება) და გვერდი იფურცლება.
     რეალური სკანები რომ დაემატოს: BOOKS[id].pages = ["assets/img/…", …]
     ============================================================ */
  function buildFlipbook(item) {
    var flip = document.getElementById("bookFlip");
    var track = document.getElementById("bookFlipTrack");
    var cover = document.getElementById("bookCover");
    if (!flip || !track || !cover || !item) return;

    var coverPage = cover.closest(".flipbook__page");
    if (!coverPage) return;

    /* ---------- გვერდების აწყობა ---------- */
    var tones = ["is-t1", "is-t2", "is-t3", "is-t4"];
    var usesPhotos = Array.isArray(item.pages) && item.pages.length > 0;

    /* ძველი გვერდები (სხვა წიგნიდან) რომ არ დაგროვდეს */
    Array.prototype.slice.call(track.querySelectorAll(".flipbook__page"))
      .forEach(function (page) { if (page !== coverPage) page.remove(); });

    function addPage(build) {
      var page = document.createElement("div");
      page.className = "flipbook__page";
      var sheet = build();
      page.appendChild(sheet);
      track.appendChild(page);
      return sheet;
    }

    if (usesPhotos) {
      item.pages.forEach(function (src, i) {
        addPage(function () {
          var sheet = document.createElement("figure");
          sheet.className = "flipbook__sheet flipbook__sheet--photo";
          var img = document.createElement("img");
          img.src = src;
          img.loading = "lazy";
          img.alt = item.title + " — გვერდი " + (i + 1);
          sheet.appendChild(img);
          return sheet;
        });
      });
    } else {
      /* მიძღვნა + ისტორიის გვერდები + დასასრული — ყოველ წიგნს ერთნაირი,
         სრულფასოვანი ნიმუში რომ ჰქონდეს.
         „შენს ბავშვს“ personalize()-ში მიცემით ბრუნვად იქცევა („ნიკას“),
         სახელის გარეშე კი ისედაც სწორად იკითხება. */
      var sentences = String(item.blurb || "").match(/[^.!?]+[.!?]/g) || [String(item.blurb || "")];
      var spreads = [{ art: "🎁", text: "ეს წიგნი ეკუთვნის შენს ბავშვს" }];

      sentences.slice(0, 3).forEach(function (sentence) {
        var text = sentence.trim();
        if (text) spreads.push({ art: item.emoji, text: text });
      });

      spreads.push({ art: "💛", text: "…და ეს მხოლოდ დასაწყისია." });

      spreads.forEach(function (spread, i) {
        addPage(function () {
          var sheet = document.createElement("figure");
          sheet.className = "flipbook__sheet " + tones[i % tones.length];

          var art = document.createElement("div");
          art.className = "flipbook__art";
          art.setAttribute("aria-hidden", "true");
          art.textContent = spread.art;

          var caption = document.createElement("figcaption");
          caption.className = "flipbook__text";

          var line = document.createElement("p");
          line.dataset.baseText = spread.text;
          line.textContent = personalize(spread.text);

          var num = document.createElement("span");
          num.className = "flipbook__num";
          num.textContent = "გვ. " + (i + 1);

          caption.appendChild(line);
          caption.appendChild(num);
          sheet.appendChild(art);
          sheet.appendChild(caption);
          return sheet;
        });
      });
    }

    var pages = Array.prototype.slice.call(track.querySelectorAll(".flipbook__page"));
    var sheets = pages.map(function (p) { return p.querySelector(".flipbook__sheet, .cover"); });
    var total = pages.length;

    var prevBtn = document.getElementById("bookFlipPrev");
    var nextBtn = document.getElementById("bookFlipNext");
    var dotsBox = document.getElementById("bookFlipDots");
    var counter = document.getElementById("bookFlipCount");
    var foot = document.getElementById("bookFlipFoot");
    var note = document.getElementById("bookFlipNote");

    if (note) note.hidden = usesPhotos;          /* ნამდვილ სკანებზე „მაკეტის“ წარწერა ზედმეტია */

    if (total < 2) {                             /* ერთი გვერდი — ფურცვლას აზრი არ აქვს */
      if (foot) foot.hidden = true;
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      return;
    }

    flip.classList.add("is-ready");
    if (foot) foot.hidden = false;
    if (prevBtn) prevBtn.hidden = false;
    if (nextBtn) nextBtn.hidden = false;

    /* ---------- წერტილები ---------- */
    var dots = [];
    if (dotsBox) {
      dotsBox.textContent = "";
      pages.forEach(function (page, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "flipbook__dot";
        dot.setAttribute("aria-label", i === 0 ? "ყდა" : "გვერდი " + i);
        dot.addEventListener("click", function () { goTo(i); });
        dotsBox.appendChild(dot);
        dots.push(dot);
      });
    }

    var index = 0;

    function pageWidth() { return track.clientWidth || 1; }

    function paint() {
      pages.forEach(function (page, i) {
        var on = i === index;
        page.classList.toggle("is-active", on);
        /* ფოკუსი მხოლოდ ხილულ გვერდზე — Tab-ით უხილავზე არ გადავიდეს */
        page.setAttribute("aria-hidden", on ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        var on = i === index;
        dot.classList.toggle("is-on", on);
        dot.setAttribute("aria-current", on ? "true" : "false");
      });
      if (counter) counter.textContent = (index + 1) + " / " + total;
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === total - 1;
    }

    /* ფურცვლისას ფურცელი ოდნავ იხრება — 3D შეგრძნება ნამდვილი წიგნივით.
       ტრანსფორმი ცალკე ფენაზეა (და არა scroll-snap-ის უჯრაზე), თორემ
       ბრაუზერს მიმაგრების წერტილი ერევა და სქროლი ხტუნავს.
       გაჩერების შემდეგ 3D ფენას ვშლით: მუდმივი perspective-ის ქვეშ ზოგი
       ბრაუზერი გრადიენტს გაფითრებულად ხატავს. */
    var settleTimer = null;

    function clearDepth() {
      clearTimeout(settleTimer);
      settleTimer = null;
      track.classList.remove("is-turning");
      sheets.forEach(function (sheet) {
        if (!sheet) return;
        sheet.style.transform = "";
        sheet.style.opacity = "";
      });
    }

    function paintDepth() {
      if (reducedMotion()) { clearDepth(); return; }

      track.classList.add("is-turning");
      var w = pageWidth();
      var center = track.scrollLeft + w / 2;

      sheets.forEach(function (sheet, i) {
        if (!sheet) return;
        var offset = ((i + 0.5) * w - center) / w;
        if (offset < -1) offset = -1;
        if (offset > 1) offset = 1;
        var away = Math.abs(offset);
        sheet.style.transform = "rotateY(" + (offset * -14).toFixed(2) + "deg) scale(" + (1 - away * 0.07).toFixed(3) + ")";
        sheet.style.opacity = (1 - away * 0.45).toFixed(3);
      });

      clearTimeout(settleTimer);
      settleTimer = setTimeout(clearDepth, 220);
    }

    /* გადასვლას თვითონ ვამუშავებთ: scrollTo({behavior:"smooth"}) მიმაგრებულ
       (scroll-snap) კონტეინერში ყველა ბრაუზერში სანდოდ არ მუშაობს — ზოგან
       სულ არაფერს აკეთებს. scrollLeft-ის პირდაპირი წერა ყველგან მუშაობს. */
    var tween = null;
    var TURN_MS = 420;

    function goTo(i, instant) {
      index = Math.max(0, Math.min(total - 1, i));
      var target = pageWidth() * index;
      paint();

      if (tween) { cancelAnimationFrame(tween); tween = null; }

      /* დამალულ ტაბში requestAnimationFrame არ ირთვება — ანიმაცია გაიჭედებოდა,
         ამიტომ იქ პირდაპირ ვხტებით */
      if (instant || reducedMotion() || document.hidden) {
        track.scrollLeft = target;
        clearDepth();
        return;
      }

      var from = track.scrollLeft;
      var delta = target - from;
      if (!delta) { paintDepth(); return; }

      var startedAt = 0;
      tween = requestAnimationFrame(function step(now) {
        if (!startedAt) startedAt = now;
        var progress = Math.min(1, (now - startedAt) / TURN_MS);
        var eased = 1 - Math.pow(1 - progress, 3);          /* ease-out cubic */
        track.scrollLeft = from + delta * eased;
        paintDepth();
        if (progress < 1) {
          tween = requestAnimationFrame(step);
        } else {
          tween = null;
          track.scrollLeft = target;
          paintDepth();
        }
      });
    }

    /* ---------- სქროლი (თითით გადასრიალება, ტრეკპედი) ----------
       ნომრის დათვლა იაფია და პირდაპირ ხდება — მხოლოდ 3D დახრას ვზღუდავთ
       კადრით, თორემ rAF-ის გაჩერებისას მთვლელიც გაიყინებოდა. */
    var raf = null;
    track.addEventListener("scroll", function () {
      if (!tween) {                              /* ჩვენივე ანიმაციას ხელს არ ვუშლით */
        var landed = Math.round(track.scrollLeft / pageWidth());
        if (landed !== index && landed >= 0 && landed < total) {
          index = landed;
          paint();
        }
      }
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        paintDepth();
      });
    }, { passive: true });

    /* ---------- დაკლიკება: შემდეგი გვერდი, ბოლოდან ისევ ყდაზე ---------- */
    track.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) return;
      goTo(index >= total - 1 ? 0 : index + 1);
    });

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1); });

    /* ---------- კლავიატურა ---------- */
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "End") { e.preventDefault(); goTo(total - 1); }
    });

    /* ფანჯრის ზომის ცვლილებაზე მიმდინარე გვერდი ადგილზე უნდა დარჩეს */
    window.addEventListener("resize", function () {
      goTo(index, true);
      paintDepth();
    });

    goTo(0, true);
  }

  /* ============================================================
     10 · შეკვეთის ავტოშენახვა — ნახევრად შევსებული ფორმა არ იკარგება.
     ფოტო და თანხმობის ველები განზრახ არ ინახება.
     ============================================================ */
  var DRAFT_KEY = "titiko:draft";
  var DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;

  function draftSkip(el) {
    return !el.name || el.disabled ||
      el.type === "hidden" || el.type === "file" || el.type === "checkbox" ||
      el.type === "submit" || el.type === "button" || el.type === "reset";
  }

  function draftRead(sig) {
    var draft = store.get(DRAFT_KEY, null);
    if (!draft || typeof draft !== "object" || draft.sig !== sig) return null;
    if (!draft.at || (Date.now() - draft.at) > DRAFT_TTL) {
      store.remove(DRAFT_KEY);
      return null;
    }
    return (draft.fields && typeof draft.fields === "object") ? draft.fields : null;
  }

  function draftSave(form, sig) {
    var fields = {};
    var filled = 0;
    Array.prototype.slice.call(form.elements).forEach(function (el) {
      if (draftSkip(el)) return;
      if (el.type === "radio") {
        if (el.checked) { fields[el.name] = el.value; filled++; }
        return;
      }
      var value = (el.value || "").trim();
      if (value) { fields[el.name] = value; filled++; }
    });

    if (!filled) { store.remove(DRAFT_KEY); return; }
    store.set(DRAFT_KEY, { at: Date.now(), sig: sig, fields: fields });
  }

  function draftApply(form, fields) {
    var applied = 0;
    Object.keys(fields).forEach(function (name) {
      var el = form.elements[name];
      if (!el) return;
      var value = fields[name];
      if (typeof value !== "string") return;
      try {
        el.value = value;                 /* RadioNodeList-საც მუშაობს */
        applied++;
      } catch (e) { /* ველი აღარ არსებობს — გამოვტოვოთ */ }
    });
    return applied;
  }

  function draftDrop() { store.remove(DRAFT_KEY); }

  /* ---------- current year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- sticky nav shadow ---------- */
  var nav = document.querySelector(".nav");
  function onScrollNav() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8);
  }
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- logo → back to top (no reload when already home) ---------- */
  var navLogo = document.getElementById("navLogo");
  if (navLogo) {
    navLogo.addEventListener("click", function (e) {
      var path = window.location.pathname.split("/").pop();
      if (path === "" || path === "index.html") {
        e.preventDefault();
        closeMenu();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    });
  }

  /* ---------- active link on scroll (home page only — other pages keep their static is-active) ---------- */
  if (document.getElementById("books")) {
    var sections = ["books", "animations", "how", "contact"]
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));

    var setActiveLink = function () {
      var pos = window.scrollY + window.innerHeight * 0.35;
      var current = "top";
      sections.forEach(function (sec) {
        if (sec.offsetTop <= pos) current = sec.id;
      });
      links.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + current);
      });
    };
    setActiveLink();
    window.addEventListener("scroll", setActiveLink, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  var titleToId = {};
  Object.keys(BOOKS).forEach(function (id) { titleToId[BOOKS[id].title.trim()] = id; });

  function bookIdForCard(card) {
    if (card.dataset.id) return card.dataset.id;
    var h3 = card.querySelector("h3");
    var t = (card.dataset.title || (h3 ? h3.textContent : "") || "").trim();
    return titleToId[t] || null;
  }

  /* ---------- make catalog cards link to their detail page ---------- */
  function wireBookCards(scope) {
    (scope || document).querySelectorAll(".book-card").forEach(function (card) {
      var id = bookIdForCard(card);
      if (!id) return;
      decorateCard(card, "book", id);
      if (card.dataset.wired) return;
      var href = detailHref("book", id);
      var btn = card.querySelector(".btn");
      if (btn) btn.setAttribute("href", href);
      card.classList.add("book-card--link");
      card.addEventListener("click", function (e) {
        if (e.target.closest("a") || e.target.closest("button")) return;
        window.location.href = href;
      });
      card.dataset.wired = "1";
    });
  }
  wireBookCards();

  /* ---------- book detail page ---------- */
  var bookPage = document.querySelector("[data-book-page]");
  if (bookPage) {
    var params = new URLSearchParams(window.location.search);
    var book = BOOKS[params.get("id")];
    var notFound = document.getElementById("bookNotFound");

    if (!book) {
      bookPage.hidden = true;
      if (notFound) notFound.hidden = false;
    } else {
      var setText = function (id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      var bookId = params.get("id");
      document.title = book.title + " — ტიტიკო";
      setText("bookCrumb", book.title);
      setText("bookTitle", book.title);
      setText("bookPrice", book.price);
      setText("bookAge", "ასაკი " + book.age);
      setText("bookTheme", book.theme);

      var blurbEl = document.getElementById("bookBlurb");
      if (blurbEl) {
        blurbEl.dataset.baseText = book.blurb;
        blurbEl.textContent = personalize(book.blurb);
      }

      /* მიწოდების თარიღი — ვადები LEAD-იდან, ერთი წყაროდან */
      setText("bookEta", bookEtaText());
      setText("bookMake", LEAD.makeMin + "–" + LEAD.makeMax + " სამუშაო დღე");

      var cover = document.getElementById("bookCover");
      if (cover) {
        /* მხოლოდ ფერის კლასს ვცვლით — className-ის გადაწერა ყდას
           flipbook__sheet-საც ჩამოაცლიდა */
        Array.prototype.slice.call(cover.classList).forEach(function (name) {
          if (/^cover--c\d+$/.test(name)) cover.classList.remove(name);
        });
        cover.classList.add(book.cover);
        var ce = cover.querySelector(".cover__emoji");
        var ct = cover.querySelector(".cover__title");
        if (ce) ce.textContent = book.emoji;
        if (ct) { ct.dataset.baseTitle = book.title; ct.textContent = coverTitle(book.title); }
      }

      /* გული ფურცვლის ჩარჩოზეა და არა ყდაზე — თორემ პირველივე
         გადაფურცვლაზე ეკრანიდან გავიდოდა */
      var favHost = document.getElementById("bookFlip") || cover;
      if (favHost && !favHost.querySelector(".fav-btn")) {
        favHost.appendChild(favButton("book", bookId));
      }

      var orderBtn = document.getElementById("orderBtn");
      if (orderBtn) orderBtn.setAttribute("href", orderHref("book", bookId));

      buildFlipbook(book);

      /* related books — same category first, then fill to 4 */
      var relatedGrid = document.getElementById("relatedGrid");
      var relatedSection = document.getElementById("related");
      if (relatedGrid && relatedSection) {
        var currentId = params.get("id");
        var ids = Object.keys(BOOKS).filter(function (id) { return id !== currentId; });
        ids.sort(function (a, b) {
          var sa = BOOKS[a].cat === book.cat ? 0 : 1;
          var sb = BOOKS[b].cat === book.cat ? 0 : 1;
          return sa - sb;
        });
        ids.slice(0, 4).forEach(function (id) {
          var b = BOOKS[id];
          var art = document.createElement("article");
          art.className = "book-card";
          art.dataset.id = id;
          art.innerHTML =
            '<div class="cover ' + b.cover + '">' +
              '<span class="cover__emoji">' + b.emoji + '</span>' +
              '<span class="cover__title">' + b.title + '</span>' +
              '<span class="cover__brand">ტიტიკო</span>' +
            '</div>' +
            '<div class="book-card__body">' +
              '<h3>' + b.title + '</h3>' +
              '<p class="book-card__meta">ასაკი ' + b.age + ' · მაგარი ყდა</p>' +
              '<div class="book-card__foot">' +
                '<span class="price">' + b.price + '</span>' +
                '<a href="#" class="btn btn--primary btn--sm">პერსონალიზება</a>' +
              '</div>' +
            '</div>';
          relatedGrid.appendChild(art);
        });
        relatedSection.hidden = false;
        wireBookCards(relatedSection);
      }
    }
  }

  var animTitleToId = {};
  Object.keys(ANIMATIONS).forEach(function (id) { animTitleToId[ANIMATIONS[id].title.trim()] = id; });

  function wireAnimCards(scope) {
    (scope || document).querySelectorAll(".anim-card").forEach(function (card) {
      var id = card.dataset.id;
      if (!id) {
        var h3 = card.querySelector("h3");
        var t = (card.dataset.title || (h3 ? h3.textContent : "") || "").trim();
        id = animTitleToId[t] || null;
      }
      if (!id) return;
      decorateCard(card, "anim", id);
      if (card.dataset.wired) return;
      var href = detailHref("anim", id);
      var btn = card.querySelector(".btn");
      if (btn) btn.setAttribute("href", href);

      /* ▶ ღილაკი ბარათის შუაში აქამდე არაფერს აკეთებდა — ახლა გვერდზე გადადის */
      var playBtn = card.querySelector("button.play");
      if (playBtn) {
        playBtn.setAttribute("aria-label", "ნახვა — " + ANIMATIONS[id].title);
        playBtn.addEventListener("click", function () { window.location.href = href; });
      }

      card.classList.add("book-card--link");
      card.addEventListener("click", function (e) {
        if (e.target.closest("a") || e.target.closest("button")) return;
        window.location.href = href;
      });
      card.dataset.wired = "1";
    });
  }
  wireAnimCards();

  /* ბარათები უკვე გამდიდრებულია — ახლა შეიძლება ფილტრის გაშვება */
  if (cards.length) applyFilters();

  /* ---------- animation detail page (animation.html) ---------- */
  var animPage = document.querySelector("[data-animation-page]");
  if (animPage) {
    var aParams = new URLSearchParams(window.location.search);
    var anim = ANIMATIONS[aParams.get("id")];
    var animNotFound = document.getElementById("animNotFound");

    if (!anim) {
      animPage.hidden = true;
      if (animNotFound) animNotFound.hidden = false;
    } else {
      var aSet = function (id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      var animId = aParams.get("id");
      document.title = anim.title + " — ტიტიკო";
      aSet("animCrumb", anim.title);
      aSet("animTitle", anim.title);
      aSet("animPrice", anim.price);
      aSet("animAge", "ასაკი " + anim.age);
      aSet("animDuration", anim.duration);
      aSet("animEta", animEtaText());

      var animBlurbEl = document.getElementById("animBlurb");
      if (animBlurbEl) {
        animBlurbEl.dataset.baseText = anim.blurb;
        animBlurbEl.textContent = personalize(anim.blurb);
      }

      var aThumb = document.getElementById("animThumb");
      if (aThumb) {
        aThumb.className = "anim-thumb anim-thumb--lg " + anim.thumb;
        var albl = aThumb.querySelector(".anim-thumb__label");
        if (albl) albl.textContent = anim.title;
        aThumb.dataset.whoHost = "1";
        applyWhoBadge(aThumb);
        if (!aThumb.querySelector(".fav-btn")) aThumb.appendChild(favButton("anim", animId));
      }

      var animOrderBtn = document.getElementById("animOrderBtn");
      if (animOrderBtn) animOrderBtn.setAttribute("href", orderHref("anim", animId));

      var animRelGrid = document.getElementById("animRelatedGrid");
      var animRelSec = document.getElementById("animRelated");
      if (animRelGrid && animRelSec) {
        var curAnim = aParams.get("id");
        var animIds = Object.keys(ANIMATIONS).filter(function (id) { return id !== curAnim; });
        animIds.sort(function (a, b) {
          return (ANIMATIONS[a].cat === anim.cat ? 0 : 1) - (ANIMATIONS[b].cat === anim.cat ? 0 : 1);
        });
        animIds.slice(0, 3).forEach(function (id) {
          var an = ANIMATIONS[id];
          var art = document.createElement("article");
          art.className = "anim-card";
          art.dataset.id = id;
          art.innerHTML =
            '<div class="anim-thumb ' + an.thumb + '">' +
              '<button class="play" type="button" aria-label="ნახვა">▶</button>' +
              '<span class="anim-thumb__label">' + an.title + '</span>' +
            '</div>' +
            '<div class="anim-card__body">' +
              '<h3>' + an.title + '</h3>' +
              '<p class="book-card__meta">' + an.duration + ' · ასაკი ' + an.age + '</p>' +
              '<div class="book-card__foot">' +
                '<span class="price">' + an.price + '</span>' +
                '<a href="#" class="btn btn--primary btn--sm">პერსონალიზება</a>' +
              '</div>' +
            '</div>';
          animRelGrid.appendChild(art);
        });
        animRelSec.hidden = false;
        wireAnimCards(animRelSec);
      }
    }
  }

  /* ============================================================
     ORDER / PERSONALIZATION PAGE  (order.html)
     ============================================================ */
  var orderForm = document.getElementById("orderForm");
  if (orderForm) {
    /* შეკვეთა მთლიანად (მონაცემები + ფოტო) POST-დება Worker-ის /pay-ზე
       (PROXY_URL ფაილის თავშია). Worker ორ რეჟიმში მუშაობს:
         - ბანკის გასაღებების გარეშე  → შეკვეთა პირდაპირ მიდის Telegram-ში
         - გასაღებებით                → აბრუნებს ბანკის გვერდის ბმულს და
                                          მომხმარებელი იქ გადადის გადასახდელად */

    var oParams = new URLSearchParams(window.location.search);
    var oIsAnim = oParams.get("type") === "animation";
    var oItem = (oIsAnim ? ANIMATIONS : BOOKS)[oParams.get("id")];
    var oKind = oIsAnim ? "ანიმაცია" : "წიგნი";
    var orderNotFound = document.getElementById("orderNotFound");
    var orderWrap = document.getElementById("orderWrap");

    if (!oItem) {
      if (orderWrap) orderWrap.hidden = true;
      if (orderNotFound) orderNotFound.hidden = false;
    } else {
      var oSet = function (id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      var oVal = function (name, value) {
        var el = orderForm.elements[name];
        if (el) el.value = value;
      };

      document.title = "შეკვეთა: " + oItem.title + " — ტიტიკო";
      oSet("orderCrumb", oItem.title);
      oSet("orderBookTitle", oItem.title);
      oSet("orderPrice", oItem.price);
      oSet("summaryBook", oItem.title);
      oSet("summaryPrice", oItem.price);
      oSet("summaryTotal", oItem.price);

      var oMedia = document.getElementById("orderMedia");
      if (oMedia) {
        if (oIsAnim) {
          oMedia.innerHTML =
            '<div class="anim-thumb anim-thumb--lg ' + oItem.thumb + '">' +
              '<button class="play" type="button" aria-label="ნახვა">▶</button>' +
              '<span class="anim-thumb__label">' + oItem.title + '</span>' +
            '</div>';
        } else {
          var oCover = document.getElementById("orderCover");
          if (oCover) {
            oCover.className = "cover cover--lg " + oItem.cover;
            var oce = oCover.querySelector(".cover__emoji");
            var oct = oCover.querySelector(".cover__title");
            if (oce) oce.textContent = oItem.emoji;
            if (oct) oct.textContent = oItem.title;
          }
        }
      }

      oVal("book", oItem.title);
      oVal("book_id", oParams.get("id"));
      oVal("price", oItem.price);
      oVal("order_type", oKind);
      oVal("order_type_key", oIsAnim ? "animation" : "book");   /* Worker-ისთვის — არა საჩვენებელი ტექსტი */

      oSet("summaryEta", oIsAnim ? animEtaText() : bookEtaText());

      /* ============================================================
         ნახევრად შევსებული ფორმის აღდგენა.
         ჯერ დრაფტი, მერე კატალოგში შეყვანილი სახელი/ასაკი — ისე, რომ
         მომხმარებლის ნაწერი არასდროს გადაიფაროს. ფოტოს ბრაუზერი
         უსაფრთხოებისთვის ვერ იმახსოვრებს, თანხმობის ველს კი განზრახ
         არ ვინახავთ. ყველაფერი ქვემოთ მოსული ინიციალიზაციის წინ ხდება,
         რომ ფასმა, პრევიუმ და თვალის ამომრჩევმა სწორი მნიშვნელობა დაინახოს.
         ============================================================ */
      var oSig = (oIsAnim ? "anim" : "book") + ":" + oParams.get("id");
      var oDraft = draftRead(oSig);
      var oRestored = oDraft ? draftApply(orderForm, oDraft) : 0;

      if (!oRestored) {
        var urlName = (oParams.get("name") || "").trim().slice(0, 24) || childName();
        var urlAge = (oParams.get("age") || "").trim() || childAge();
        if (urlName && orderForm.elements.child_name && !orderForm.elements.child_name.value) {
          orderForm.elements.child_name.value = urlName;
        }
        if (/^[2-8]$/.test(urlAge) && orderForm.elements.child_age && !orderForm.elements.child_age.value) {
          orderForm.elements.child_age.value = urlAge;
        }
      }

      var catLink = document.getElementById("orderCatLink");
      if (catLink) {
        catLink.textContent = oIsAnim ? "ანიმაციები" : "წიგნები";
        catLink.setAttribute("href", oIsAnim ? "animations.html" : "books.html");
      }

      /* highlight the matching nav item */
      if (oIsAnim) {
        var navBooks = document.querySelector('.nav__menu a[href="books.html"]');
        var navAnims = document.querySelector('.nav__menu a[href="animations.html"]');
        if (navBooks) navBooks.classList.remove("is-active");
        if (navAnims) navAnims.classList.add("is-active");
      }

      if (oIsAnim) {
        /* animation = digital product: drop cover type + physical delivery */
        var ctField = orderForm.querySelector('[name="cover_type"]');
        if (ctField && ctField.closest(".field")) ctField.closest(".field").hidden = true;
        var addrRow = document.getElementById("orderAddressRow");
        if (addrRow) {
          addrRow.hidden = true;
          addrRow.querySelectorAll("input").forEach(function (i) { i.required = false; });
        }
        oSet("stepBookHeading", "დამატებითი დეტალები");
        oSet("stepBookSub", "მიძღვნის ტექსტი ანიმაციის დასაწყისში გამოჩნდება.");
        oSet("stepDeliveryHeading", "კონტაქტი");
        oSet("stepDeliverySub", "მზა ანიმაციას ამ ელ-ფოსტაზე გამოგიგზავნით.");
        oSet("orderPrivacyNote", "🔒 ციფრულ ფაილს (MP4) გამოგიგზავნით მითითებულ ელფოსტაზე.");
      } else {
        /* cover type from URL (?coverType=hard|soft) */
        var coverType = oParams.get("coverType");
        if (coverType && orderForm.elements.cover_type) {
          var ctRadio = orderForm.querySelector('input[name="cover_type"][value="' + coverType + '"]');
          if (ctRadio) ctRadio.checked = true;
        }
      }

      /* ---------- price: a hard cover adds a surcharge ---------- */
      var HARD_COVER_EXTRA = 10;
      var oCurrency = String(oItem.price).replace(/[\d.,\s]/g, "") || "₾";
      var oBasePrice = parseFloat(String(oItem.price).replace(/[^\d.]/g, "")) || 0;
      var summaryCoverRow = document.getElementById("summaryCoverRow");

      function coverExtra() {
        if (oIsAnim) return 0;
        var picked = orderForm.querySelector('input[name="cover_type"]:checked');
        return picked && picked.value === "hard" ? HARD_COVER_EXTRA : 0;
      }

      function money(n) { return oCurrency + n; }

      function updateTotals() {
        var extra = coverExtra();
        if (summaryCoverRow) summaryCoverRow.hidden = extra === 0;
        oSet("summaryCoverPrice", "+" + money(extra || HARD_COVER_EXTRA));
        oSet("summaryTotal", money(oBasePrice + extra));
        oVal("price", money(oBasePrice + extra));
      }

      Array.prototype.slice.call(orderForm.querySelectorAll('input[name="cover_type"]'))
        .forEach(function (r) { r.addEventListener("change", updateTotals); });
      updateTotals();

      /* live cover name preview — ყდაზეც და ხაზშიც.
         სახელს ერთდროულად ვინახავთ, რომ კატალოგში დაბრუნებისას იქაც ჩანდეს. */
      var childNameInput = orderForm.elements.child_name;
      var previewName = document.getElementById("previewName");
      var orderCoverTitle = document.querySelector("#orderMedia .cover__title");
      var orderThumb = document.querySelector("#orderMedia .anim-thumb");
      if (childNameInput) {
        var updatePreview = function () {
          var typed = childNameInput.value.trim().slice(0, 24);
          if (previewName) previewName.textContent = typed || "შენი ბავშვი";
          if (oIsAnim) applyWhoBadge(orderThumb, typed);
          else if (orderCoverTitle) {
            orderCoverTitle.textContent = typed ? typed + " და " + oItem.title : oItem.title;
          }
        };
        childNameInput.addEventListener("input", updatePreview);
        childNameInput.addEventListener("change", function () {
          store.set(NAME_KEY, childNameInput.value.trim().slice(0, 24));
        });
        updatePreview();
      }

      /* ============================================================
         VALIDATION — every field is required; errors are shown inline
         under the field instead of the browser's native bubble.
         ============================================================ */

      /* ქართული ნომრები: მობილური 5XXXXXXXX · ქალაქის 3XXXXXXXX */
      var GE_PHONE_RE = /^(?:5|3)\d{8}$/;
      var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

      function fieldWrap(el) { return el.closest(".field") || el.parentElement; }

      /* the error line is created on demand and kept above the grey hint */
      function errorSlot(el) {
        var wrap = fieldWrap(el);
        if (!wrap) return null;
        var slot = wrap.querySelector(".field__error");
        if (!slot) {
          slot = document.createElement("p");
          slot.className = "field__error";
          var hint = wrap.querySelector(".field__hint");
          if (hint) wrap.insertBefore(slot, hint);
          else wrap.appendChild(slot);
        }
        return slot;
      }

      function setFieldError(el, msg) {
        var wrap = fieldWrap(el);
        var slot = errorSlot(el);
        if (wrap) wrap.classList.add("is-invalid");
        if (slot) slot.textContent = msg;
        el.setAttribute("aria-invalid", "true");
        el.dataset.touched = "1";
      }

      function clearFieldError(el) {
        var wrap = fieldWrap(el);
        var slot = wrap && wrap.querySelector(".field__error");
        if (wrap) wrap.classList.remove("is-invalid");
        if (slot) slot.textContent = "";
        el.removeAttribute("aria-invalid");
      }

      /* returns "" when the field is fine, otherwise the message to show */
      function fieldError(el) {
        if (el.type === "radio") {
          var group = orderForm.querySelectorAll('input[name="' + el.name + '"]');
          var groupRequired = false;
          group.forEach(function (r) { if (r.required) groupRequired = true; });
          if (!groupRequired) return "";
          if (orderForm.querySelector('input[name="' + el.name + '"]:checked')) return "";
          var wrap = fieldWrap(el);
          return (wrap && wrap.dataset.error) || "აირჩიე ერთ-ერთი ვარიანტი";
        }

        if (el.type === "checkbox") {
          if (!el.required || el.checked) return "";
          var cbWrap = fieldWrap(el);
          return (cbWrap && cbWrap.dataset.error) || "მონიშნე ეს ველი";
        }

        if (el.type === "file") {
          if (!el.required) return "";
          return (el.files && el.files.length) ? "" : "ატვირთე ბავშვის ფოტო";
        }

        var v = (el.value || "").trim();

        if (!v) {
          if (!el.required) return "";
          var emptyWrap = fieldWrap(el);
          if (emptyWrap && emptyWrap.dataset.error) return emptyWrap.dataset.error;
          return el.tagName === "SELECT" ? "აირჩიე ვარიანტი სიიდან" : "ეს ველი სავალდებულოა";
        }

        if (el.type === "email") {
          return EMAIL_RE.test(v) ? "" : "ელ-ფოსტა არასწორია — მაგ. name@mail.com";
        }

        if (el.type === "tel") {
          var digits = v.replace(/\D/g, "").replace(/^0+/, "").replace(/^995/, "");
          return GE_PHONE_RE.test(digits)
            ? "" : "შეიყვანე ქართული ნომერი — მაგ. +995 599 12 34 56";
        }

        var min = parseInt(el.getAttribute("minlength"), 10);
        if (min && v.length < min) return "მინიმუმ " + min + " სიმბოლო";

        return "";
      }

      /* A field is "touched" once it has been checked at least once. Until then
         we stay quiet; afterwards we clear the error as soon as it is fixed and
         flag it again on blur if it breaks a second time. */
      Array.prototype.slice.call(orderForm.querySelectorAll("input, select, textarea"))
        .forEach(function (el) {
          if (el.type === "hidden") return;

          var clearWhenFixed = function () {
            if (!el.dataset.touched) return;
            if (!fieldError(el)) clearFieldError(el);
          };

          el.addEventListener("input", clearWhenFixed);
          el.addEventListener("change", clearWhenFixed);
          el.addEventListener("blur", function () {
            if (!el.dataset.touched) return;
            var msg = fieldError(el);
            if (msg) setFieldError(el, msg); else clearFieldError(el);
          });
        });

      /* ---------- eye colour: a dropdown that shows the actual iris ----------
         The <select> stays in the DOM (screen-reader hidden, not focusable) so
         validation and submission keep working; this only draws it. */
      var eyePicker = document.getElementById("eyePicker");
      var eyeTrigger = document.getElementById("eyeTrigger");
      var eyeList = document.getElementById("eyeList");
      var eyeSelect = orderForm.elements.eye_color;

      if (eyePicker && eyeTrigger && eyeList && eyeSelect) {
        var eyeValue = document.getElementById("eyeValue");
        var eyeSwatch = document.getElementById("eyeCurrentSwatch");
        var eyeOpts = Array.prototype.slice.call(eyeList.querySelectorAll(".picker__opt"));

        function eyeSetOpen(open) {
          eyeList.hidden = !open;
          eyePicker.classList.toggle("is-open", open);
          eyeTrigger.setAttribute("aria-expanded", open ? "true" : "false");
        }

        function eyeIsOpen() { return !eyeList.hidden; }

        function eyePick(value) {
          eyeSelect.value = value;
          eyeSelect.dispatchEvent(new Event("change", { bubbles: true }));

          var chosen = null;
          eyeOpts.forEach(function (o) {
            var on = o.dataset.value === value;
            o.setAttribute("aria-selected", on ? "true" : "false");
            if (on) chosen = o;
          });

          eyeValue.textContent = value || "აირჩიე";
          if (eyeSwatch) {
            eyeSwatch.hidden = !chosen;
            eyeSwatch.className = "eye" + (chosen ? " " + chosen.dataset.tone : "");
          }
        }

        eyeTrigger.addEventListener("click", function () { eyeSetOpen(!eyeIsOpen()); });

        eyeOpts.forEach(function (opt, i) {
          opt.addEventListener("click", function () {
            eyePick(opt.dataset.value);
            eyeSetOpen(false);
            eyeTrigger.focus();
          });
          opt.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              opt.click();
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              var nextIdx = e.key === "ArrowDown" ? i + 1 : i - 1;
              if (eyeOpts[nextIdx]) eyeOpts[nextIdx].focus();
            } else if (e.key === "Escape") {
              eyeSetOpen(false);
              eyeTrigger.focus();
            }
          });
        });

        eyeTrigger.addEventListener("keydown", function (e) {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            eyeSetOpen(true);
            var current = eyeOpts.filter(function (o) { return o.getAttribute("aria-selected") === "true"; })[0];
            (current || eyeOpts[0]).focus();
          } else if (e.key === "Escape") {
            eyeSetOpen(false);
          }
        });

        document.addEventListener("click", function (e) {
          if (eyeIsOpen() && !eyePicker.contains(e.target)) eyeSetOpen(false);
        });

        /* keep the trigger in step with the select when the form is reset */
        orderForm.addEventListener("reset", function () {
          setTimeout(function () { eyePick(eyeSelect.value); }, 0);
        });

        eyePick(eyeSelect.value);
      }

      /* ---------- photo: confirm the upload with a thumbnail card ---------- */
      var photo = orderForm.elements.photo;
      var photoBox = document.getElementById("photoBox");
      var photoPreview = document.getElementById("photoPreview");
      var photoThumb = document.getElementById("photoThumb");
      var photoName = document.getElementById("photoName");
      var photoSize = document.getElementById("photoSize");
      var photoRemove = document.getElementById("photoRemove");
      var photoChange = document.getElementById("photoChange");
      var photoUrl = "";

      function humanSize(bytes) {
        return bytes < 1024 * 1024
          ? Math.max(1, Math.round(bytes / 1024)) + " KB"
          : (bytes / (1024 * 1024)).toFixed(1) + " MB";
      }

      function clearPhoto() {
        if (photoUrl) { URL.revokeObjectURL(photoUrl); photoUrl = ""; }
        if (photo) photo.value = "";
        if (photoThumb) photoThumb.removeAttribute("src");
        if (photoPreview) photoPreview.hidden = true;
        if (photoBox) photoBox.hidden = false;
      }

      function showPhoto(f) {
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoUrl = URL.createObjectURL(f);
        if (photoThumb) photoThumb.src = photoUrl;
        if (photoName) photoName.textContent = f.name;
        if (photoSize) photoSize.textContent = humanSize(f.size);
        if (photoBox) photoBox.hidden = true;
        if (photoPreview) photoPreview.hidden = false;
      }

      if (photo) {
        photo.addEventListener("change", function () {
          var f = photo.files && photo.files[0];
          if (!f) { clearPhoto(); return; }
          if (!/image\/(jpe?g|png)/i.test(f.type)) {
            clearPhoto();
            setFieldError(photo, "მხოლოდ JPG ან PNG ფორმატი — სხვა ფაილი არ იტვირთება.");
            return;
          }
          if (f.size > 10 * 1024 * 1024) {
            clearPhoto();
            setFieldError(photo, "ფაილი 10 MB-ზე დიდია — აირჩიე პატარა ზომის ფოტო.");
            return;
          }
          clearFieldError(photo);
          showPhoto(f);
        });
      }

      if (photoRemove) photoRemove.addEventListener("click", clearPhoto);
      if (photoChange) photoChange.addEventListener("click", function () { if (photo) photo.click(); });

      /* drag & drop straight onto the dropzone */
      if (photoBox) {
        ["dragenter", "dragover"].forEach(function (evt) {
          photoBox.addEventListener(evt, function (e) {
            e.preventDefault();
            photoBox.classList.add("is-drag");
          });
        });
        ["dragleave", "dragend", "drop"].forEach(function (evt) {
          photoBox.addEventListener(evt, function () { photoBox.classList.remove("is-drag"); });
        });
      }

      /* --- wizard steps --- */
      var steps = Array.prototype.slice.call(orderForm.querySelectorAll(".wizard__step"));
      var navItems = Array.prototype.slice.call(orderForm.querySelectorAll(".wizard__nav li"));
      var backBtn = document.getElementById("wizardBack");
      var nextBtn = document.getElementById("wizardNext");
      var wizardSubmitBtn = document.getElementById("wizardSubmit");
      var submitBtn = wizardSubmitBtn;
      var submitLabel = "შეკვეთის გაგზავნა";
      var currentStep = 0;

      function showStep(i) {
        currentStep = i;
        steps.forEach(function (s, idx) { s.classList.toggle("is-active", idx === i); });
        navItems.forEach(function (n, idx) {
          n.classList.toggle("is-active", idx === i);
          n.classList.toggle("is-done", idx < i);
        });
        var last = i === steps.length - 1;
        if (backBtn) backBtn.hidden = i === 0;
        if (nextBtn) nextBtn.hidden = last;
        if (wizardSubmitBtn) wizardSubmitBtn.hidden = !last;
        var st = document.getElementById("orderStatus");
        if (st) { st.textContent = ""; st.className = "form-status"; }
        orderForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      /* visible, enabled fields of one step — one entry per radio group */
      function stepFields(i) {
        var seen = {};
        return Array.prototype.slice.call(steps[i].querySelectorAll("input, select, textarea"))
          .filter(function (el) {
            if (el.disabled || el.type === "hidden") return false;
            if (el.closest("[hidden]")) return false;          /* skipped for animations */
            if (el.type === "radio") {
              if (seen[el.name]) return false;
              seen[el.name] = true;
            }
            return true;
          });
      }

      function validateStep(i) {
        var firstBad = null;

        stepFields(i).forEach(function (el) {
          el.dataset.touched = "1";
          var msg = fieldError(el);
          if (msg) {
            setFieldError(el, msg);
            if (!firstBad) firstBad = el;
          } else {
            clearFieldError(el);
          }
        });

        var st = document.getElementById("orderStatus");

        if (!firstBad) {
          if (st) { st.textContent = ""; st.className = "form-status"; }
          return true;
        }

        if (st) {
          st.className = "form-status form-status--err";
          st.textContent = "შეავსე მონიშნული ველები სწორად, რომ გააგრძელო.";
        }

        var wrap = fieldWrap(firstBad);
        if (wrap) {
          wrap.classList.remove("shake");
          void wrap.offsetWidth;                                /* restart the animation */
          wrap.classList.add("shake");
          wrap.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        /* a field drawn by a custom control points at the element to focus */
        var focusEl = firstBad.dataset.focusTarget
          ? document.getElementById(firstBad.dataset.focusTarget)
          : (firstBad.type === "file" ? null : firstBad);

        if (focusEl) {
          try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); }
        }
        return false;
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (validateStep(currentStep)) showStep(currentStep + 1);
        });
      }
      if (backBtn) {
        backBtn.addEventListener("click", function () {
          showStep(Math.max(0, currentStep - 1));
        });
      }
      navItems.forEach(function (n, idx) {
        n.addEventListener("click", function () {
          if (idx < currentStep) showStep(idx);
        });
      });
      showStep(0);

      /* ---------- ავტოშენახვა + აღდგენის შეტყობინება ----------
         ველები ინახება ამ ბრაუზერში, 7 დღით. ტელეფონის ზარმა ან შემთხვევით
         დახურულმა ტაბმა 4-ნაბიჯიანი ფორმა თავიდან არ უნდა შეავსებინოს. */
      var draftTimer = null;
      Array.prototype.slice.call(orderForm.querySelectorAll("input, select, textarea"))
        .forEach(function (el) {
          if (draftSkip(el)) return;
          var queueSave = function () {
            clearTimeout(draftTimer);
            draftTimer = setTimeout(function () { draftSave(orderForm, oSig); }, 400);
          };
          el.addEventListener("input", queueSave);
          el.addEventListener("change", queueSave);
        });

      if (oRestored) {
        var resumeBox = document.createElement("div");
        resumeBox.className = "resume";
        resumeBox.setAttribute("role", "status");

        var resumeText = document.createElement("p");
        resumeText.className = "resume__text";
        resumeText.textContent = "აღვადგინეთ შენი ნახევრად შევსებული შეკვეთა. ფოტო ხელახლა უნდა ატვირთო.";

        var resumeReset = document.createElement("button");
        resumeReset.type = "button";
        resumeReset.className = "resume__reset";
        resumeReset.textContent = "დაიწყე თავიდან";
        resumeReset.addEventListener("click", function () {
          clearTimeout(draftTimer);
          draftDrop();

          /* form.reset() აქ არ გამოგვადგება — ის დამალულ ველებსაც (book, price)
             ნაგულისხმევზე დააბრუნებდა, ისინი კი JS-ით შეივსო. */
          Array.prototype.slice.call(orderForm.elements).forEach(function (el) {
            if (!el.name || el.type === "hidden" || el.type === "submit" ||
                el.type === "button" || el.type === "reset") return;
            if (el.type === "radio" || el.type === "checkbox") el.checked = el.defaultChecked;
            else el.value = "";
            delete el.dataset.touched;
            el.removeAttribute("aria-invalid");
          });

          clearPhoto();
          orderForm.querySelectorAll(".is-invalid").forEach(function (wrap) {
            wrap.classList.remove("is-invalid");
            var slot = wrap.querySelector(".field__error");
            if (slot) slot.textContent = "";
          });

          /* თვალის ამომრჩევი reset-ს უსმენს — მას ვაცნობებთ, რომ დაცარიელდა */
          orderForm.dispatchEvent(new Event("reset"));
          updateTotals();
          if (typeof updatePreview === "function") updatePreview();

          resumeBox.remove();
          showStep(0);
        });

        resumeBox.appendChild(resumeText);
        resumeBox.appendChild(resumeReset);

        var firstStep = orderForm.querySelector(".wizard__step");
        if (firstStep) orderForm.insertBefore(resumeBox, firstStep);
      }

      /* ---------- submit ---------- */
      orderForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (currentStep !== steps.length - 1) return;

        var status = document.getElementById("orderStatus");

        /* re-check every step — a visitor can edit an earlier one and come back */
        for (var si = 0; si < steps.length; si++) {
          if (!validateStep(si)) {
            if (si !== currentStep) showStep(si);
            validateStep(si);
            return;
          }
        }

        if (!PROXY_URL || PROXY_URL === "PASTE_YOUR_WORKER_URL_HERE") {
          if (status) {
            status.className = "form-status form-status--warn";
            status.textContent = "ფორმა მზადაა, თუმცა ჯერ არ არის დაკავშირებული — ჩასვი Worker-ის მისამართი script.js-ში (PROXY_URL).";
          }
          return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "იგზავნება…"; }
        if (status) { status.className = "form-status"; status.textContent = ""; }

        /* მთელი ფორმა — ველებიც და ფოტოც — ერთი მოთხოვნით მიდის Worker-ს.
           ის თვითონ ითვლის ფასს, ინახავს შეკვეთას და, ბანკის გასაღებების
           მიხედვით, ან პირდაპირ Telegram-ს წერს, ან ბანკის გვერდზე გვაგზავნის. */
        fetch(PROXY_URL.replace(/\/+$/, "") + "/pay", {
          method: "POST",
          body: new FormData(orderForm),
        })
          .then(function (r) {
            return r.json().then(function (data) { return { httpOk: r.ok, data: data }; });
          })
          .then(function (res) {
            var data = res.data || {};
            if (!res.httpOk || !data.ok) {
              throw new Error(data.error || "შეკვეთის დამუშავება ვერ მოხერხდა");
            }

            /* ბანკი ჩართულია — მომხმარებელი მის დაცულ გვერდზე მიდის გადასახდელად */
            if (data.mode === "payment" && data.redirect) {
              window.location.href = data.redirect;
              return;
            }

            /* ბანკი ჯერ არ არის ჩართული — შეკვეთა უკვე Telegram-ში მივიდა */
            var wrap = document.getElementById("orderWrap");
            var done = document.getElementById("orderSuccess");
            clearTimeout(draftTimer);
            draftDrop();                                  /* შეკვეთა გავიდა — დრაფტი აღარ გვჭირდება */
            orderForm.reset();
            clearPhoto();
            if (wrap) wrap.hidden = true;
            if (done) { done.hidden = false; done.scrollIntoView({ behavior: "smooth" }); }
          })
          .catch(function (err) {
            if (status) {
              status.className = "form-status form-status--err";
              status.textContent = "გაგზავნა ვერ მოხერხდა: " + err.message + ". სცადე თავიდან ან დაგვირეკე.";
            }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
          });
      });

      /* ---------- ბანკიდან "უკან" დაბრუნება ----------
         ბრაუზერი გვერდს ქეშიდან აღადგენს ზუსტად ისეთს, როგორიც დავტოვეთ:
         ღილაკი გამორთული, წარწერა "იგზავნება…" — ე.ი. მიტოვებული გადახდის
         შემდეგ ხელახლა შეკვეთა შეუძლებელი ხდებოდა. ფოტოს ველს კი ბრაუზერი
         უსაფრთხოებისთვის ასუფთავებს, ბარათი კი ეკრანზე რჩებოდა და ადამიანს
         ეგონა, რომ ფოტო ისევ მიბმულია. ორივეს აქ ვასწორებთ. */
      window.addEventListener("pageshow", function (e) {
        if (!e.persisted) return;

        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
        if (photo && !(photo.files && photo.files.length)) clearPhoto();

        var st = document.getElementById("orderStatus");
        if (st) { st.textContent = ""; st.className = "form-status"; }
      });
    }
  }

  /* ============================================================
     RESULT PAGE  (success.html · fail.html)
     ბანკი მომხმარებელს აქ აბრუნებს გადახდის შემდეგ. success.html-ს
     "fail"-ისგან განასხვავებს data-kind — ორივეს იგივე მარკაპი აქვს.
     ============================================================ */
  var resultPage = document.getElementById("resultPage");
  if (resultPage) {
    var isFailPage = resultPage.dataset.kind === "fail";
    var rParams = new URLSearchParams(window.location.search);
    var rOrderNo = (rParams.get("no") || "").trim();

    var rIcon = document.getElementById("resultIcon");
    var rTitle = document.getElementById("resultTitle");
    var rText = document.getElementById("resultText");
    var rCard = document.getElementById("resultCard");
    var rOrderNoEl = document.getElementById("resultOrderNo");
    var rItemEl = document.getElementById("resultItem");
    var rTotalEl = document.getElementById("resultTotal");
    var rRetry = document.getElementById("resultRetry");

    function rPaint(icon, title, text) {
      if (rIcon) rIcon.textContent = icon;
      if (rTitle) rTitle.textContent = title;
      if (rText) rText.textContent = text;
    }

    if (!/^TTK-[A-Za-z0-9-]+$/.test(rOrderNo)) {
      /* ბმულში შეკვეთის ნომერი აკლია — პირდაპირ ამ გვერდზე მოსვლა, არა ბანკიდან */
      rPaint(
        isFailPage ? "😕" : "🤔",
        isFailPage ? "რაღაც არასწორად წავიდა" : "შეკვეთა ვერ მოიძებნა",
        "ბმული არასრულია. თუ ბანკიდან ახლახან დაბრუნდით, დაგვიკავშირდით."
      );
    } else {
      if (rOrderNoEl) rOrderNoEl.textContent = rOrderNo;
      if (isFailPage) {
        rPaint("😕", "გადახდა ვერ შესრულდა", "თანხა არ ჩამოგჭრილათ. სცადეთ თავიდან, ან სცადეთ სხვა ბარათით.");
      } else {
        rPaint("⏳", "მოწმდება…", "გთხოვთ, დაელოდოთ — ვამოწმებთ გადახდის სტატუსს.");
      }

      /* success.html-ზე Worker-ის callback ხანდახან წამებით იგვიანებს ჩვენს
         წინ — რამდენჯერმე ვცდით, სანამ საბოლოო შედეგს დავაფიქსირებთ.
         ცდა ქსელის ცალკეულ შეფერხებაზეც არ უნდა გაჩერდეს, თორემ გვერდი
         სამუდამოდ "მოწმდება…"-ზე გაიყინება. */
      var rAttempts = 0;
      var R_MAX_ATTEMPTS = 5;
      var R_POLL_MS = 2000;

      /* ბანკის საბოლოო "არა" — ამათზე ლოდინს აზრი აღარ აქვს */
      var R_FAILED = ["rejected", "blocked", "refunded", "refund_requested", "refunded_partially"];

      function rHandle(data) {
        var ok = data && data.ok;

        if (ok) {
          if (rItemEl) rItemEl.textContent = data.item || "—";
          if (rTotalEl) rTotalEl.textContent = "₾" + data.total;
          if (rCard) rCard.hidden = false;
        }

        if (isFailPage) {
          /* ბანკმა უკვე გვითხრა, რომ ვერ შესრულდა — აქ მხოლოდ იმ
             პროდუქტისკენ ვამზადებთ "თავიდან ცდა" ბმულს, ცდას აღარ ვიმეორებთ */
          if (ok && rRetry && data.item_id) {
            rRetry.href = "order.html?id=" + encodeURIComponent(data.item_id) +
              (data.is_animation ? "&type=animation" : "");
          }
          return;
        }

        if (ok && data.status === "completed") {
          draftDrop();                                 /* გადახდილი შეკვეთის დრაფტი აღარ გვჭირდება */
          rPaint("🎉", "შეკვეთა მიღებულია!", "გმადლობთ! ჩვენი გუნდი მალე დაგიკავშირდებათ დეტალების დასაზუსტებლად.");
          return;
        }

        /* ბანკმა გადახდა უარყო — წარმატებას არ ვამბობთ, თუნდაც ეს
           success.html იყოს (აქ პირდაპირი ბმულითაც შეიძლება მოხვედრა) */
        if (ok && R_FAILED.indexOf(data.status) !== -1) {
          rPaint("😕", "გადახდა ვერ შესრულდა", "ბანკმა გადახდა არ დაადასტურა. სცადეთ თავიდან, ან დაგვიკავშირდით.");
          return;
        }

        if (rAttempts < R_MAX_ATTEMPTS) {
          setTimeout(rPoll, R_POLL_MS);
        } else {
          /* სტატუსი ჯერ არ დაზუსტებულა — callback იგვიანებს ან ვერ
             ვუკავშირდებით. გადახდას დადასტურებულად არ ვაცხადებთ:
             უბრალოდ ვამბობთ, რას ვამოწმებთ და რა მოხდება შემდეგ. */
          rPaint("⏳", "ვამოწმებთ გადახდას", "სტატუსი ჯერ არ დაზუსტებულა. თუ თანხა ჩამოგეჭრათ, შეკვეთა მიღებულია და მალე დაგიკავშირდებით.");
        }
      }

      function rPoll() {
        rAttempts++;
        fetch(PROXY_URL.replace(/\/+$/, "") + "/order?no=" + encodeURIComponent(rOrderNo))
          .then(function (r) { return r.json(); })
          .then(rHandle)
          .catch(function () { rHandle(null); });
      }

      rPoll();
    }
  }

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      faqItems.forEach(function (other) {
        other.classList.remove("is-open");
        var oa = other.querySelector(".faq-a");
        var oq = other.querySelector(".faq-q");
        if (oa) oa.style.maxHeight = null;
        if (oq) oq.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        a.style.maxHeight = a.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- hero parallax (pointer) ---------- */
  var stage = document.querySelector(".stage");
  if (stage && window.matchMedia("(hover: hover)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var layers = stage.querySelectorAll(".float-badge, .sticker");
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach(function (el, i) {
        var depth = (i + 1) * 8;
        el.style.transform = "translate(" + (dx * depth) + "px," + (dy * depth) + "px)";
      });
    });
    stage.addEventListener("mouseleave", function () {
      layers.forEach(function (el) { el.style.transform = ""; });
    });
  }

  /* ---------- to-top button ---------- */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("is-shown", window.scrollY > 600);
    }, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
