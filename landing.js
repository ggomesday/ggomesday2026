/* ═══════════════════════════════════════════════════════════════
   G.GOMES DAY 2026 — LANDING PAGE SCRIPTS
   ═══════════════════════════════════════════════════════════════ */

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

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("input-name");
      const emailInput = document.getElementById("input-email");

      if (!nameInput.value.trim() || !emailInput.value.trim()) {
        return;
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value)) {
        emailInput.style.borderColor = "#ef4444";
        setTimeout(() => {
          emailInput.style.borderColor = "";
        }, 2000);
        return;
      }

      // Show success state
      if (formContent && formSuccess) {
        formContent.style.display = "none";
        formSuccess.classList.add("show");
      }

      // Reset after 4s
      setTimeout(() => {
        if (formContent && formSuccess) {
          formContent.style.display = "block";
          formSuccess.classList.remove("show");
          form.reset();
        }
      }, 4000);
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


  // ── Initialize All ──
  initScrollAnimations();
  initSmoothScroll();
  initNavbarScroll();
  initMobileMenu();
  initForm();
  initParallaxGlow();
  initActiveNavHighlight();

});
