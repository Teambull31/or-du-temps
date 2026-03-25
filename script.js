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

    // Swipe support (touch)
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    track.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(dx) > 50) {
            goTo(dx < 0 ? current + 1 : current - 1);
            startAuto();
        }
    }, { passive: true });
})();

/* ══════════════════════════════════
   6. SCROLL PROGRESS BAR
══════════════════════════════════ */
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
    }, { passive: true });
}

/* ══════════════════════════════════
   7. BACK TO TOP
══════════════════════════════════ */
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        backToTopBtn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ══════════════════════════════════
   8. CUSTOM CURSOR (desktop)
══════════════════════════════════ */
(function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    let mx = -100, my = -100;

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cursor.style.left = mx + 'px';
        cursor.style.top = my + 'px';
    });

    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

    document.querySelectorAll('a, button, [role="button"], .service-card').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
})();

/* ══════════════════════════════════
   9. FAQ ACCORDION
══════════════════════════════════ */
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const isOpen = btn.getAttribute('aria-expanded') === 'true';

        // Close all others
        document.querySelectorAll('.faq-question').forEach(other => {
            if (other !== btn) {
                other.setAttribute('aria-expanded', 'false');
                other.closest('.faq-item').querySelector('.faq-answer').classList.remove('open');
            }
        });

        btn.setAttribute('aria-expanded', String(!isOpen));
        answer.classList.toggle('open', !isOpen);
    });
});

/* ══════════════════════════════════
   10. ACTIVE NAV LINK on scroll
══════════════════════════════════ */
(function () {
    const sections = document.querySelectorAll('section[id], div[id="home"]');
    const navLinks = document.querySelectorAll('.nav-link');

    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { threshold: 0.4, rootMargin: '-72px 0px 0px 0px' });

    sections.forEach(s => sectionObserver.observe(s));
})();
