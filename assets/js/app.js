/* ==========================================================================
   STREAM · stream.com.ly — portal interactions
   • bilingual AR/EN toggle (default: Arabic, persisted)
   • animated “current” background (canvas, reduced-motion aware)
   • scroll reveals, locked-project toast, gentle hero parallax
   ========================================================================== */

(() => {
  "use strict";

  const html = document.documentElement;
  const langBtn = document.getElementById("lang-toggle");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");
  const yearEl = document.getElementById("year");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const META = {
    ar: {
      title: "STREAM · منصة الألعاب والتجارب الرقمية | stream.com.ly",
      description:
        "STREAM هي منصة ألعاب وتجارب رقمية: ألعاب ويب أصلية، أدوات وبرمجيات، ومشاريع قادمة. أول مشروع مباشر: Cyber Michelangelo — لعبة إطلاق نار عمودية بأسلوب HD-2D مع وضع 3D اختياري.",
    },
    en: {
      title: "STREAM · Games & Digital Experiences | stream.com.ly",
      description:
        "STREAM is a platform for original browser games, web tools and experimental software. First live project: Cyber Michelangelo — an HD-2D vertical shmup with an optional 3D mode.",
    },
  };

  /* ------------------------------------------------------------------ */
  /* Language                                                            */
  /* ------------------------------------------------------------------ */

  const STORAGE_KEY = "stream.lang";

  function applyLanguage(lang) {
    const isAr = lang !== "en";
    const next = isAr ? "ar" : "en";
    html.setAttribute("lang", next);
    html.setAttribute("dir", isAr ? "rtl" : "ltr");

    document.querySelectorAll("[data-en][data-ar]").forEach((el) => {
      const value = el.getAttribute(`data-${next}`);
      if (value !== null) el.textContent = value;
    });

    // Titles / descriptions that are not in the DOM.
    document.title = META[next].title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", META[next].description);

    if (langBtn) {
      langBtn.setAttribute("aria-label", isAr ? "Switch to English" : "التبديل إلى العربية");
      langBtn.textContent = isAr ? "English" : "العربية";
    }

    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    window.__STREAM_LANG__ = next;
  }

  function currentLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch { /* ignore */ }
    return html.getAttribute("lang") === "en" ? "en" : "ar";
  }

  const urlLang = new URLSearchParams(window.location.search).get("lang");
  applyLanguage(urlLang === "en" || urlLang === "ar" ? urlLang : currentLang());

  if (langBtn) {
    langBtn.addEventListener("click", () => {
      applyLanguage(window.__STREAM_LANG__ === "ar" ? "en" : "ar");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Locked projects → toast                                             */
  /* ------------------------------------------------------------------ */

  let toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    if (message && toastText) toastText.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3400);
  }

  function lockedMessage() {
    const isAr = window.__STREAM_LANG__ !== "en";
    return isAr
      ? "هذا المشروع قيد التطوير — قريباً في تيّار جديد."
      : "This project is still in development — coming to a new current.";
  }

  document.querySelectorAll('[data-locked="true"]').forEach((card) => {
    const trigger = (event) => {
      event.preventDefault();
      showToast(lockedMessage());
    };
    card.addEventListener("click", trigger);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trigger(event);
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                       */
  /* ------------------------------------------------------------------ */

  const revealTargets = document.querySelectorAll(
    ".section-head, .featured-card, .project-card, .platform-panel, .timeline-item, .cta-card"
  );

  if ("IntersectionObserver" in window && !prefersReduced) {
    revealTargets.forEach((el) => el.classList.add("reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Hero portal parallax                                                */
  /* ------------------------------------------------------------------ */

  const portal = document.querySelector(".portal-frame");
  if (portal && !prefersReduced && window.matchMedia("(pointer: fine)").matches) {
    const hero = portal.closest(".hero");
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      portal.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    });
    hero.addEventListener("pointerleave", () => {
      portal.style.transform = "";
    });
  }

  /* ------------------------------------------------------------------ */
  /* Footer year                                                         */
  /* ------------------------------------------------------------------ */

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------ */
  /* Background canvas: a slow, living “current”                         */
  /* ------------------------------------------------------------------ */

  const canvas = document.getElementById("fx");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let running = true;
  let rafId = 0;
  let lastTime = 0;
  let time = 0;

  const COLORS = ["#22e4c5", "#8b5cf6", "#4cc9f0", "#f5c451"];
  const PARTICLE_COUNT = window.innerWidth < 720 ? 42 : 76;

  function makeParticle(randomY = true) {
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : height * (0.2 + Math.random() * 0.6),
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.22 + 0.05,
      drift: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.45 + 0.12,
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: PARTICLE_COUNT }, () => makeParticle());
  }

  function drawWaves(t) {
    const layers = [
      { amp: 26, freq: 0.0045, speed: 0.00022, color: "rgba(34, 228, 197, 0.09)", width: 1.2, offset: 0.34 },
      { amp: 34, freq: 0.0032, speed: -0.00016, color: "rgba(139, 92, 246, 0.10)", width: 1.4, offset: 0.56 },
      { amp: 22, freq: 0.0061, speed: 0.00031, color: "rgba(76, 201, 240, 0.07)", width: 1, offset: 0.76 },
    ];
    for (const layer of layers) {
      ctx.beginPath();
      const baseY = height * layer.offset;
      for (let x = 0; x <= width; x += 8) {
        const y =
          baseY +
          Math.sin(x * layer.freq + t * layer.speed * 1000) * layer.amp +
          Math.sin(x * layer.freq * 2.3 - t * layer.speed * 700) * layer.amp * 0.4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = layer.width;
      ctx.stroke();
    }
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(64, now - (lastTime || now));
    lastTime = now;
    time += dt;

    ctx.clearRect(0, 0, width, height);

    // Ambient vertical wash.
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(6, 12, 24, 0)");
    grad.addColorStop(1, "rgba(4, 8, 16, 0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    drawWaves(time);

    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.x += p.speed * dt * 0.06;
      p.y += Math.sin(time * 0.0004 + p.phase) * p.drift * 0.06;
      if (p.x > width + 10) {
        p.x = -10;
        p.y = Math.random() * height;
      }
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(rafId);
    }
  });

  if (prefersReduced) {
    // Static, calm background for reduced-motion users.
    ctx.clearRect(0, 0, width, height);
    drawWaves(0);
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  } else {
    rafId = requestAnimationFrame(frame);
  }
  /* ------------------------------------------------------------------ */
  /* Layout debug (only with ?debug=1 — used for visual QA in headless)  */
  /* ------------------------------------------------------------------ */

  if (new URLSearchParams(window.location.search).has("debug")) {
    requestAnimationFrame(() => {
      const offenders = [];
      document.querySelectorAll("body *").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.right > window.innerWidth + 1 || rect.left < -1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 60),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      });
      const data = {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        offenders: offenders.slice(0, 14),
      };
      let pre = document.getElementById("layout-debug");
      if (!pre) {
        pre = document.createElement("pre");
        pre.id = "layout-debug";
        pre.style.cssText = "position:fixed;left:-9999px;top:0;white-space:pre;";
        document.body.appendChild(pre);
      }
      pre.textContent = JSON.stringify(data, null, 1);
    });
  }
})();
