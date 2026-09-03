/* ============================================================
   ტიტიკო (Tittiko) — interactions
   ============================================================ */
(function () {
  "use strict";

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

  /* ---------- catalog filter + search + sort (books.html & animations.html) ---------- */
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
    var visible = 0;
    cards.forEach(function (card) {
      var matchesCat = activeFilter === "all" || card.dataset.cat === activeFilter;
      var matchesQuery = !query || cardTitle(card).indexOf(query) !== -1;
      var show = matchesCat && matchesQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
    if (resultCount) resultCount.innerHTML = "ნაპოვნია <strong>" + visible + "</strong> " + resultUnit;
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
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

  if (cards.length) applyFilters();

  /* ============================================================
     BOOK CATALOG DATA  (single source of truth for detail pages)
     ============================================================ */
  var BOOKS = {
    superhero:  { title: "პატარა სუპერგმირი", emoji: "🦸", cover: "cover--c1", cat: "boys", age: "2–8", price: "₾65",
      blurb: "შენი პატარა ერთ დილას აღმოაჩენს, რომ განსაკუთრებული ძალა აქვს. მოსასხამი მხრებზე გადააქვს და ქალაქს ეშველება — ეხმარება მეზობლებს, პოულობს დაკარგულ კნუტს და სწავლობს, რომ ნამდვილი გმირობა სიკეთეა." },
    earth:      { title: "მოგზაურობა დედამიწის გარშემო", emoji: "🌍", cover: "cover--c2", cat: "learn", age: "2–8", price: "₾65",
      blurb: "ჯადოსნურ ზურგჩანთასთან ერთად ბავშვი გარშემოვლით მოგზაურობს დედამიწაზე — ხედავს ჩინეთის დიდ კედელს, ამაზონის ჯუნგლებსა და ეგვიპტის პირამიდებს, ეცნობა ახალ კულტურებს და აღმოაჩენს, რომ სამყარო საოცრებებითაა სავსე." },
    space:      { title: "კოსმოსური თავგადასავალი", emoji: "🚀", cover: "cover--c3", cat: "boys", age: "2–8", price: "₾65",
      blurb: "პატარა ასტრონავტი რაკეტით ვარსკვლავებისკენ მიფრინავს. ის დახტის მთვარეზე, მეგობრდება ცნობისმოყვარე უცხოპლანეტელს და აღმოაჩენს, რომ ცნობისმოყვარეობა ყველაზე შორს მიმყვანი საწვავია." },
    animals:    { title: "ცხოველთა აკადემია", emoji: "🐾", cover: "cover--c4", cat: "learn", age: "2–8", price: "₾65",
      blurb: "ცხოველთა აკადემიაში შენი ბავშვი სწავლობს, როგორ ლაპარაკობენ დელფინები, რატომ არ იძინებს ბუ ღამით და როგორ ეხმარებიან ჭიანჭველები ერთმანეთს. ყოველი გაკვეთილი ახალი მეგობრობით სრულდება." },
    cars:       { title: "მანქანების ქალაქი", emoji: "🚗", cover: "cover--c5", cat: "boys", age: "2–8", price: "₾65",
      blurb: "მანქანების ქალაქში ყველა ბორბალზეა! შენი პატარა მართავს სახანძრო მანქანას, ეხმარება გაჭედილ ავტობუსს და აშენებს ხიდს, რომელიც მთელ ქალაქს აერთიანებს." },
    ocean:      { title: "წყალქვეშა თავგადასავალი", emoji: "🐠", cover: "cover--c6", cat: "learn", age: "2–8", price: "₾65",
      blurb: "ღრმა ოკეანეში, ფერად რიფებს შორის, შენი ბავშვი ცურავს კუებთან ერთად, პოულობს დაკარგულ სამარხს და სწავლობს, რომ ზღვის დაცვა ყველა პატარა გმირის საქმეა." },
    dino:       { title: "დინოზავრების სამყარო", emoji: "🦕", cover: "cover--c7", cat: "boys", age: "2–8", price: "₾65",
      blurb: "დროის მანქანა ბავშვს დინოზავრების ეპოქაში გადაისვრის. ის კვერცხიდან გამოსულ პატარა ტრიცერატოპსს უვლის და აღმოაჩენს, რომ სიმამაცე ზომაზე არ არის დამოკიდებული." },
    princess:   { title: "პრინცესას თავგადასავალი", emoji: "👑", cover: "cover--c8", cat: "girls", age: "2–8", price: "₾65",
      blurb: "ჯადოსნურ სამეფოში პატარა პრინცესა ვეება გულით მართავს — ის აშოშმინებს გაბრაზებულ დრაკონს, სცემს პატივს ყველა სტუმარს და სწავლობს, რომ ნამდვილი გვირგვინი კეთილი გულია." },
    fairy:      { title: "ფერიების ბაღი", emoji: "🧚", cover: "cover--c1", cat: "girls", age: "2–8", price: "₾65",
      blurb: "ღამის ბაღში ფერიები ყვავილებს აღვიძებენ. შენი ბავშვი მათ ეხმარება ცვარის შეგროვებაში, ცისარტყელას შეღებვასა და პეპლების საცეკვაოდ მომზადებაში." },
    abc:        { title: "ანბანის ჯადოქრობა", emoji: "🔤", cover: "cover--c2", cat: "learn", age: "3–7", price: "₾65",
      blurb: "ყოველი ასო ცოცხლდება და პატარა თავგადასავალს იწყებს. „ა“ ანგელოზს ეძებს, „ბ“ ბაყაყს დაეწია — და შენი ბავშვი თამაშ-თამაშ სწავლობს მთელ ანბანს." },
    rainbow:    { title: "ცისარტყელას მოგონება", emoji: "🌈", cover: "cover--c5", cat: "girls", age: "2–8", price: "₾65",
      blurb: "წვიმის შემდეგ ცისარტყელა ცას გადაება. შენი პატარა თითოეულ ფერს ცალკე ხვდება, ისმენს მათ ისტორიებს და აღმოაჩენს, რომ ერთად ისინი ჯადოს ქმნიან." },
    football:   { title: "ფეხბურთის ვარსკვლავი", emoji: "⚽", cover: "cover--c7", cat: "boys", age: "3–8", price: "₾65",
      blurb: "დიდი მატჩის დღეა. შენი ბავშვი გუნდს გამარჯვებისკენ მიუძღვება — არა მარტო გოლებით, არამედ იმით, რომ ყველა მოთამაშეს ურიგებს ბურთს და მხარში უდგას." },
    history:    { title: "ისტორიაში მოგზაურობა", emoji: "🏛️", cover: "cover--c6", cat: "learn", age: "4–8", price: "₾65",
      blurb: "დროის მანქანით შენი ბავშვი ხვდება რაინდებს, ხედავს პირველ ოლიმპიურ თამაშებს და საუბრობს გამომგონებლებთან — ისტორია ცოცხალ თავგადასავლად იქცევა." },
    friendship: { title: "მეგობრობის ჯადო", emoji: "🤝", cover: "cover--c4", cat: "girls", age: "2–8", price: "₾65",
      blurb: "ახალ სკოლაში შენი პატარა მარტოა — სანამ არ გაიცნობს გოგონას, რომელსაც ისეთივე ზღაპრები უყვარს. ერთად ისინი აღმოაჩენენ, რომ მეგობრობა ყველაზე ძლიერი ჯადოა." }
  };

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
      if (card.dataset.wired) return;
      var id = bookIdForCard(card);
      if (!id) return;
      var href = "book.html?id=" + encodeURIComponent(id);
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
      document.title = book.title + " — ტიტიკო";
      setText("bookCrumb", book.title);
      setText("bookTitle", book.title);
      setText("bookPrice", book.price);
      setText("bookBlurb", book.blurb);
      setText("bookAge", "ასაკი " + book.age);

      var cover = document.getElementById("bookCover");
      if (cover) {
        cover.className = "cover cover--lg " + book.cover;
        var ce = cover.querySelector(".cover__emoji");
        var ct = cover.querySelector(".cover__title");
        if (ce) ce.textContent = book.emoji;
        if (ct) ct.textContent = book.title;
      }

      var orderBtn = document.getElementById("orderBtn");
      if (orderBtn) {
        orderBtn.setAttribute("href", "order.html?id=" + encodeURIComponent(params.get("id")));
      }

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

  /* ============================================================
     ANIMATION CATALOG DATA
     ============================================================ */
  var ANIMATIONS = {
    hero:     { title: "შენ ხარ გმირი", emoji: "🦸", thumb: "anim-thumb--a", cat: "adventure", age: "2–8", duration: "3–5 წთ", price: "₾45",
      blurb: "შენი ბავშვი მთავარ როლში — ის ქალაქს გადაარჩენს, დაეხმარება მეგობრებს და მიხვდება, რომ ნამდვილი ზესახელა კეთილი გულია. სახელი, გარეგნობა და ხმაც კი მასზეა მორგებული." },
    planet:   { title: "ცისფერი პლანეტა", emoji: "🌍", thumb: "anim-thumb--b", cat: "learn", age: "2–8", duration: "3–5 წთ", price: "₾45",
      blurb: "პატარა მკვლევარი კოსმოსური ხომალდით დედამიწას გარშემოუვლის და ხედავს, რა მშვენიერი და მყიფეა ჩვენი ცისფერი პლანეტა. გზად სწავლობს, როგორ გავუფრთხილდეთ ბუნებას." },
    spring:   { title: "გაზაფხულის ზეიმი", emoji: "🌸", thumb: "anim-thumb--c", cat: "seasonal", age: "2–8", duration: "3–5 წთ", price: "₾45",
      blurb: "თოვლი დნება და ბაღი იღვიძებს — შენი ბავშვი ფერიებს ეხმარება ყვავილების გაფურჩქვნასა და პეპლების გამოღვიძებაში. ფერადი, მხიარული და სითბოთი სავსე ისტორია." },
    starways: { title: "ვარსკვლავური მოგზაურობა", emoji: "🚀", thumb: "anim-thumb--d", cat: "adventure", age: "2–8", duration: "4–6 წთ", price: "₾45",
      blurb: "რაკეტა ეშვება და შენი პატარა ასტრონავტი ვარსკვლავებს შორის მიფრინავს. ის აღმოაჩენს ახალ პლანეტებს, მეგობრდება რობოტთან და მიხვდება, რომ ცნობისმოყვარეობა უსაზღვროა." },
    sea:      { title: "ზღვის სიღრმეში", emoji: "🐬", thumb: "anim-thumb--e", cat: "learn", age: "2–8", duration: "3–5 წთ", price: "₾45",
      blurb: "ღრმა ოკეანეში, ფერად რიფებს შორის, შენი ბავშვი დელფინებთან ერთად ცურავს და პოულობს დაკარგულ საგანძურს. თან სწავლობს, რატომ არის ზღვის სისუფთავე ასე მნიშვნელოვანი." },
    birthday: { title: "დაბადების დღის სასწაული", emoji: "🎂", thumb: "anim-thumb--f", cat: "seasonal", age: "2–8", duration: "3–5 წთ", price: "₾45",
      blurb: "დაბადების დღის დილას შენს ბავშვს ჯადოსნური სტუმრები ეწვევიან და დღეს დაუვიწყარს გახდიან. სახელით მოძღვნილი სიმღერითა და ტორტით — იდეალური საჩუქარი." }
  };

  var animTitleToId = {};
  Object.keys(ANIMATIONS).forEach(function (id) { animTitleToId[ANIMATIONS[id].title.trim()] = id; });

  function wireAnimCards(scope) {
    (scope || document).querySelectorAll(".anim-card").forEach(function (card) {
      if (card.dataset.wired) return;
      var id = card.dataset.id;
      if (!id) {
        var h3 = card.querySelector("h3");
        var t = (card.dataset.title || (h3 ? h3.textContent : "") || "").trim();
        id = animTitleToId[t] || null;
      }
      if (!id) return;
      var href = "animation.html?id=" + encodeURIComponent(id);
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
  wireAnimCards();

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
      document.title = anim.title + " — ტიტიკო";
      aSet("animCrumb", anim.title);
      aSet("animTitle", anim.title);
      aSet("animPrice", anim.price);
      aSet("animBlurb", anim.blurb);
      aSet("animAge", "ასაკი " + anim.age);
      aSet("animDuration", anim.duration);

      var aThumb = document.getElementById("animThumb");
      if (aThumb) {
        aThumb.className = "anim-thumb anim-thumb--lg " + anim.thumb;
        var albl = aThumb.querySelector(".anim-thumb__label");
        if (albl) albl.textContent = anim.title;
      }

      var animOrderBtn = document.getElementById("animOrderBtn");
      if (animOrderBtn) {
        animOrderBtn.setAttribute("href", "order.html?type=animation&id=" + encodeURIComponent(aParams.get("id")));
      }

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
    /* ------------------------------------------------------------------
       შეკვეთა იგზავნება Cloudflare Worker-ის გავლით, რომელიც ინახავს
       BOT_TOKEN-სა და CHAT_ID-ს სერვერზე — ისინი ბრაუზერში არ ჩანს.
       Worker-ის კოდი: server/worker.js  (განთავსების ინსტრუქცია იქვეა)
       ძველი, გადახდის გარეშე მუშაობდა ვერსია: server/legacy/telegram-worker.js

       ჩასვი შენი Worker-ის მისამართი, ბოლო დახრილი ხაზის გარეშე:
       ------------------------------------------------------------------ */
    var PROXY_URL = "https://shy-sound-1c56.txelidze-toma.workers.dev";

    var TG_CAPTION_LIMIT = 1024;   /* sendPhoto caption limit  */
    var TG_MESSAGE_LIMIT = 4096;   /* sendMessage text limit   */

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

      /* live cover name preview */
      var childName = orderForm.elements.child_name;
      var previewName = document.getElementById("previewName");
      if (childName && previewName) {
        var updatePreview = function () {
          var v = childName.value.trim();
          previewName.textContent = v ? v : "შენი ბავშვი";
        };
        childName.addEventListener("input", updatePreview);
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

      /* ---------- Telegram helpers ---------- */

      /* escape the five characters Telegram's HTML parse_mode cares about */
      function tgEscape(v) {
        return String(v == null ? "" : v)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      /* "label: value" line, skipped entirely when the field is empty */
      function tgLine(label, value) {
        var v = (value == null ? "" : String(value)).trim();
        return v ? "<b>" + label + ":</b> " + tgEscape(v) + "\n" : "";
      }

      function buildCaption() {
        var f = orderForm.elements;
        var val = function (name) {
          var el = f[name];
          if (!el) return "";
          if (el.type === "radio" || (el.length && el[0] && el[0].type === "radio")) {
            var picked = orderForm.querySelector('input[name="' + name + '"]:checked');
            return picked ? picked.value : "";
          }
          return el.value || "";
        };

        var coverLabel = "";
        if (!oIsAnim) {
          var ct = val("cover_type");
          coverLabel = ct === "soft" ? "რბილი ყდა" : ct === "hard" ? "მაგარი ყდა" : "";
        }

        var extra = coverExtra();

        var text =
          "🎁 <b>ახალი შეკვეთა — ტიტიკო</b>\n\n" +
          tgLine(oKind, oItem.title) +
          tgLine("ფასი", money(oBasePrice)) +
          (extra ? tgLine("მაგარი ყდა", "+" + money(extra)) : "") +
          tgLine("ჯამი", money(oBasePrice + extra)) +
          "\n<b>👶 ბავშვი</b>\n" +
          tgLine("სახელი", val("child_name")) +
          tgLine("მოთხრობითში", val("child_name_story")) +
          tgLine("ასაკი", val("child_age")) +
          tgLine("სქესი", val("child_gender")) +
          tgLine("თმის ფერი", val("hair_color")) +
          tgLine("კანის ტონი", val("skin_tone")) +
          tgLine("თვალის ფერი", val("eye_color")) +
          tgLine("ყდის ტიპი", coverLabel) +
          tgLine("მიძღვნა", val("dedication")) +
          "\n<b>📞 შემკვეთი</b>\n" +
          tgLine("სახელი", val("customer_name")) +
          tgLine("ტელეფონი", val("phone")) +
          tgLine("ელ-ფოსტა", val("email")) +
          tgLine("ქალაქი", val("city")) +
          tgLine("მისამართი", val("address")) +
          tgLine("კომენტარი", val("comment"));

        return text.trim();
      }

      /* the Worker injects chat_id + the bot token, then forwards to Telegram */
      function tgCall(method, body) {
        return fetch(PROXY_URL.replace(/\/+$/, "") + "/" + method, { method: "POST", body: body })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.description || "Telegram API error");
            return res;
          });
      }

      function tgSendMessage(text) {
        var body = new FormData();
        body.append("text", text.slice(0, TG_MESSAGE_LIMIT));
        return tgCall("sendMessage", body);
      }

      function tgSendPhoto(file, caption) {
        var body = new FormData();
        body.append("photo", file);
        body.append("caption", caption);
        return tgCall("sendPhoto", body);
      }

      /* ---------- submit ---------- */
      orderForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (currentStep !== steps.length - 1) return;

        var status = document.getElementById("orderStatus");
        var submitBtn = document.getElementById("wizardSubmit");
        var submitLabel = "შეკვეთის გაგზავნა";

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

        var caption = buildCaption();
        var photoFile = photo && photo.files && photo.files[0];

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "იგზავნება…"; }
        if (status) { status.className = "form-status"; status.textContent = ""; }

        var request;
        if (photoFile) {
          /* caption is capped at 1024 chars — if it overflows, send the photo
             with a short header and the full details as a follow-up message */
          if (caption.length <= TG_CAPTION_LIMIT) {
            request = tgSendPhoto(photoFile, caption);
          } else {
            request = tgSendPhoto(photoFile, "🎁 <b>ახალი შეკვეთა — " + tgEscape(oItem.title) + "</b>")
              .then(function () { return tgSendMessage(caption); });
          }
        } else {
          request = tgSendMessage(caption);
        }

        request
          .then(function () {
            var wrap = document.getElementById("orderWrap");
            var done = document.getElementById("orderSuccess");
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
          })
          .then(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
          });
      });
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
