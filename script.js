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

  /* ---------- book filter + search + sort ---------- */
  var filters = document.querySelectorAll(".filter");
  var bookGrid = document.getElementById("bookGrid");
  var cards = bookGrid ? bookGrid.querySelectorAll(".book-card") : [];
  var searchInput = document.getElementById("bookSearch");
  var sortSelect = document.getElementById("bookSort");
  var resultCount = document.getElementById("resultCount");
  var emptyState = document.getElementById("emptyState");
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
    if (resultCount) resultCount.innerHTML = "ნაპოვნია <strong>" + visible + "</strong> წიგნი";
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
        orderBtn.setAttribute(
          "href",
          "mailto:hello@tittiko.ge?subject=" + encodeURIComponent("შეკვეთა: " + book.title)
        );
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
