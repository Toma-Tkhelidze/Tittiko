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
