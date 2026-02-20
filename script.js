/**
 * Or du Temps — Interactions Premium
 * - Navbar dynamique (scroll-aware glassmorphism)
 * - Menu hamburger mobile
 * - Scroll reveal via IntersectionObserver
 * - Particles flottantes dans le hero
 * - Slider de témoignages avec auto-avance
 */

/* ══════════════════════════════════
   1. NAVBAR — Glassmorphism au scroll
══════════════════════════════════ */
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
});

document.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    });
});

/* ══════════════════════════════════
   2. SMOOTH SCROLL
══════════════════════════════════ */
const NAV_OFFSET = 72;

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const id = anchor.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
    });
});

/* ══════════════════════════════════
   3. SCROLL REVEAL
══════════════════════════════════ */
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
});

/* ── Hero parallax on scroll ── */
const heroBgImg = document.querySelector('.hero-bg-img');
if (heroBgImg) {
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        heroBgImg.style.transform = `translateY(${y * 0.25}px)`;
    }, { passive: true });
}

/* ══════════════════════════════════
   4. HERO PARTICLES
══════════════════════════════════ */
function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;

    const COUNT = 30;
    const SIZES = [1, 1.5, 2, 2.5, 3];

    for (let i = 0; i < COUNT; i++) {
        const p = document.createElement('span');
        p.className = 'particle';

        const size = SIZES[Math.floor(Math.random() * SIZES.length)];
        const x = Math.random() * 100;            // % horizontal
        const duration = 12 + Math.random() * 20;       // seconds
        const delay = Math.random() * -duration;      // stagger

        p.style.cssText = `
            width:${size}px;
            height:${size}px;
            left:${x}%;
            opacity:${0.2 + Math.random() * 0.5};
            animation-duration:${duration}s;
            animation-delay:${delay}s;
        `;
        container.appendChild(p);
    }
}

createParticles();

/* ══════════════════════════════════
   5. TESTIMONIALS SLIDER
══════════════════════════════════ */
(function () {
    const track = document.getElementById('testimonials-track');
    const dots = document.querySelectorAll('.t-dot');
    if (!track || !dots.length) return;

    let current = 0;
    let timer;
    const TOTAL = dots.length;
    const DELAY = 5000;

    function goTo(index) {
        current = (index + TOTAL) % TOTAL;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('t-dot--active', i === current));
    }

    function startAuto() {
        clearInterval(timer);
        timer = setInterval(() => goTo(current + 1), DELAY);
    }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            goTo(i);
            startAuto();
        });
    });

    startAuto();

    // Pause on hover
    track.closest('.testimonials-section')?.addEventListener('mouseenter', () => clearInterval(timer));
    track.closest('.testimonials-section')?.addEventListener('mouseleave', startAuto);
})();
