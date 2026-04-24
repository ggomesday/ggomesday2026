/* ═══════════════════════════════════════════════════════════════
   G.GOMES DAY 2026 — LANDING PAGE SCRIPTS
   ═══════════════════════════════════════════════════════════════ */

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONFIGURAÇÃO SUPABASE
 * ═══════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL = "https://mpxqdabkmhlzdwweuikk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qp8JrbQYrylukDb6UuFRIQ_IyKorZNV";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {

  // ── 1. Scroll Animation Observer ──
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });

    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      observer.observe(el);
    });
  }


  // ── 2. Smooth Scroll for Anchor Links ──
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        const target = document.querySelector(targetId);
        if (target) {
          const navHeight = 80;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth"
          });
        }
        // Close mobile menu if open
        const mobileMenu = document.getElementById("mobile-menu");
        if (mobileMenu && !mobileMenu.classList.contains("hidden")) {
          mobileMenu.classList.add("hidden");
        }
      });
    });
  }


  // ── 3. Navbar Scroll Effect ──
  function initNavbarScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;

    let lastScrollY = 0;

    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 100) {
        navbar.style.background = "rgba(0, 0, 0, 0.8)";
        navbar.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
      } else {
        navbar.style.background = "rgba(0, 0, 0, 0.5)";
        navbar.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
      }

      lastScrollY = currentScrollY;
    }, { passive: true });
  }


  // ── 4. Mobile Menu Toggle ──
  function initMobileMenu() {
    const toggle = document.getElementById("mobile-toggle");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
  }


  // ── 5. Form Handling ──
  function initForm() {
    const form = document.getElementById("signup-form");
    const formContent = document.getElementById("form-content");
    const formSuccess = document.getElementById("form-success");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("input-name");
      const emailInput = document.getElementById("input-email");
      const phoneInput = document.getElementById("input-phone");
      const companyInput = document.getElementById("input-company");
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const company = companyInput ? companyInput.value.trim() : "";

      if (!name || !email) return;

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailInput.style.borderColor = "#ef4444";
        setTimeout(() => { emailInput.style.borderColor = ""; }, 2000);
        return;
      }

      // Disable button during submission
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.innerHTML = '<span>Enviando...</span>';
      }

      try {
        // Enviar para o Supabase
        const { error } = await supabaseClient
          .from('leads')
          .insert([
            { 
              name: name, 
              email: email,
              phone: phone,
              company: company,
              source: 'G.Gomes Day 2026',
              created_at: new Date().toISOString()
            }
          ]);

        if (error) throw error;

        // Show success state
        if (formContent && formSuccess) {
          formContent.style.display = "none";
          formSuccess.classList.add("show");
        }

        // Reset form
        form.reset();

      } catch (err) {
        console.error("Erro ao enviar para o Supabase:", err);
        alert("Houve um erro ao processar sua inscrição. Por favor, tente novamente.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = "1";
          submitBtn.innerHTML = `
            <span>Quero Participar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          `;
        }
      }
    });

    // Input focus effects
    const inputs = form.querySelectorAll(".form-input");
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        input.parentElement.classList.add("focused");
      });
      input.addEventListener("blur", () => {
        input.parentElement.classList.remove("focused");
      });
    });
  }


  // ── 6. Parallax Glow Effect on Hero ──
  function initParallaxGlow() {
    const hero = document.getElementById("hero");
    const glow = document.getElementById("hero-glow");

    if (!hero || !glow) return;

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      glow.style.left = `${x - 20}%`;
      glow.style.top = `${y - 20}%`;
    });
  }


  // ── 7. Active Nav Link Highlighting ──
  function initActiveNavHighlight() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.remove("text-white");
            link.classList.add("text-neutral-400");
            if (link.getAttribute("href") === `#${id}`) {
              link.classList.add("text-white");
              link.classList.remove("text-neutral-400");
            }
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach((section) => observer.observe(section));
  }


  // ── 8. Lazy-load Spline 3D (maior gargalo de performance) ──
  function initSplineLazyLoad() {
    const container = document.getElementById("spline-container");
    const placeholder = document.getElementById("spline-placeholder");
    if (!container || !placeholder) return;

    let splineLoaded = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !splineLoaded) {
          splineLoaded = true;

          // Criar o iframe sob demanda
          const iframe = document.createElement("iframe");
          iframe.className = "contrast-125 opacity-90 absolute top-0 left-0 pointer-events-auto scale-110 md:scale-125 translate-x-0 translate-y-0 md:translate-x-12 md:translate-y-12";
          iframe.frameBorder = "0";
          iframe.style.cssText = "width:100%;height:100%;filter:hue-rotate(85deg) brightness(0.8) saturate(1.5);";
          iframe.src = "https://my.spline.design/nexbotrobotcharacterconcept-f9fb70f64f78f621dac9e33520a8dd0c/";

          // Quando o iframe terminar de carregar, desvanecer o placeholder
          iframe.addEventListener("load", () => {
            placeholder.style.opacity = "0";
            setTimeout(() => {
              placeholder.style.display = "none";
            }, 700);
          });

          container.appendChild(iframe);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "200px 0px" }); // rootMargin: começa a carregar um pouco antes de aparecer

    const heroSection = document.getElementById("hero");
    if (heroSection) {
      observer.observe(heroSection);
    }
  }


  // ── Initialize All ──
  initScrollAnimations();
  initSmoothScroll();
  initNavbarScroll();
  initMobileMenu();
  initForm();
  initParallaxGlow();
  initActiveNavHighlight();
  initSplineLazyLoad();

});
