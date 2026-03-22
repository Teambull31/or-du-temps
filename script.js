/**
 * Or du Temps — Interactions Premium
 * - Navbar dynamique (scroll-aware glassmorphism)
 * - Menu hamburger mobile
 * - Scroll reveal via IntersectionObserver
 * - Particles flottantes dans le hero
 * - Slider de témoignages avec auto-avance
 */

/* ══════════════════════════════════
   0. APPLICATION DE LA CONFIG ADMIN
   Toutes les modifications faites dans emma.html
   sont appliquées ici automatiquement au chargement.
══════════════════════════════════ */
(function applyConfig() {
    const _saved = localStorage.getItem('ordutemps_config');
    const cfg = _saved ? JSON.parse(_saved) : (window.__ODT_DEFAULT_CONFIG__ || {});
    if (!Object.keys(cfg).length) return;

    // ── Helpers ──
    function setImg(sel, val) {
        if (!val) return;
        const el = document.querySelector(sel);
        if (el) el.src = val;
    }
    function setText(sel, val) {
        if (!val) return;
        const el = document.querySelector(sel);
        if (el) el.textContent = val;
    }
    // Convertit *mot* en <strong>mot</strong>
    function md(text) {
        return (text || '').replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    }
    // Formate un tarif : "1h30 · 70 €" → "1h30 · <strong>70 €</strong>"
    function formatPrix(raw) {
        if (!raw) return '';
        if (raw.includes('·')) {
            const parts = raw.split('·');
            return parts[0].trim() + ' · <strong>' + parts[1].trim() + '</strong>';
        }
        return raw;
    }

    // ── Photos ──
    setImg('.hero-bg-img', cfg.hero_image);
    setImg('.about-img',   cfg.about_image);
    setImg('.emma-img',    cfg.emma_image);

    // ── Textes hero ──
    setText('.hero-eyebrow',  cfg.hero_eyebrow);
    setText('.hero-subtitle', cfg.hero_subtitle);

    // ── Texte "À propos" (2 paragraphes max) ──
    if (cfg.about_text) {
        const paras   = cfg.about_text.split('\n\n').filter(p => p.trim());
        const aboutPs = document.querySelectorAll('.about-text > p:not(.section-eyebrow)');
        paras.forEach((text, i) => {
            if (aboutPs[i]) aboutPs[i].innerHTML = md(text.trim());
        });
    }
    if (cfg.about_quote) {
        const qEl = document.querySelector('.about-quote span');
        if (qEl) qEl.textContent = '\u201c' + cfg.about_quote + '\u201d';
    }

    // ── Bio Emma ──
    if (cfg.emma_bio) {
        const paras  = cfg.emma_bio.split('\n\n').filter(p => p.trim());
        const emmaPs = document.querySelectorAll('.emma-text-side > p:not(.section-eyebrow)');
        paras.forEach((text, i) => {
            if (emmaPs[i]) emmaPs[i].innerHTML = md(text.trim());
        });
    }
    // Valeurs Emma (3 points forts)
    const emmaVals = document.querySelectorAll('.emma-value span');
    if (cfg.emma_value1 && emmaVals[0]) emmaVals[0].textContent = cfg.emma_value1;
    if (cfg.emma_value2 && emmaVals[1]) emmaVals[1].textContent = cfg.emma_value2;
    if (cfg.emma_value3 && emmaVals[2]) emmaVals[2].textContent = cfg.emma_value3;

    // ── Chiffres clés ──
    const statNums = document.querySelectorAll('.stat-number');
    const statLbls = document.querySelectorAll('.stat-label');
    if (cfg.stat1_number && statNums[0]) statNums[0].textContent = cfg.stat1_number;
    if (cfg.stat1_label  && statLbls[0]) statLbls[0].textContent = cfg.stat1_label;
    if (cfg.stat2_number && statNums[1]) statNums[1].textContent = cfg.stat2_number;
    if (cfg.stat2_label  && statLbls[1]) statLbls[1].textContent = cfg.stat2_label;
    if (cfg.stat3_number && statNums[2]) statNums[2].textContent = cfg.stat3_number;
    if (cfg.stat3_label  && statLbls[2]) statLbls[2].textContent = cfg.stat3_label;

    // ── Téléphone ──
    if (cfg.phone) {
        const tel = cfg.phone.replace(/\s/g, '');
        document.querySelectorAll('a[href^="tel:"]').forEach(a => { a.href = 'tel:' + tel; });
        document.querySelectorAll('a[href^="sms:"]').forEach(a => {
            const body = a.href.includes('?body=') ? a.href.split('?body=')[1] : '';
            a.href = 'sms:' + tel + (body ? '?body=' + body : '');
        });
        const visiblePhone = document.querySelector('#contact-telephone a');
        if (visiblePhone) visiblePhone.textContent = cfg.phone;
    }

    // ── Calendly ──
    if (cfg.calendly_url) {
        document.querySelectorAll('[onclick*="CALENDLY_URL"]').forEach(btn => {
            btn.setAttribute('onclick', "Calendly.initPopupWidget({url:'" + cfg.calendly_url + "'});return false;");
        });
    }

    // ── Adresse ──
    const addrEl = document.querySelector('#contact-adresse p');
    if (addrEl && (cfg.adresse || cfg.adresse_extra !== undefined)) {
        const lignes = (cfg.adresse || '').replace(/\n/g, '<br>');
        const extra  = cfg.adresse_extra ? '<br><em>' + cfg.adresse_extra + '</em>' : '';
        addrEl.innerHTML = lignes + extra;
    }

    // ── Horaires ──
    if (cfg.horaires) {
        const horEl = document.querySelector('#contact-horaires p');
        if (horEl) horEl.innerHTML = cfg.horaires.replace(/\n/g, '<br>');
    }

    // ── Tarifs & descriptions des soins ──
    const soins = {
        'soin-signature':   { prix: cfg.prix_signature, desc: cfg.desc_signature },
        'soin-chinois':     { prix: cfg.prix_chinois,   desc: cfg.desc_chinois   },
        'soin-deep-tissue': { prix: cfg.prix_deep,      desc: cfg.desc_deep      },
        'soin-suedois':     { prix: cfg.prix_suedois,   desc: cfg.desc_suedois   },
        'soin-thai':        { prix: cfg.prix_thai,      desc: cfg.desc_thai      },
        'soin-ado':         { prix: cfg.prix_ado,       desc: cfg.desc_ado       },
    };
    Object.entries(soins).forEach(([id, data]) => {
        const card = document.querySelector('#' + id);
        if (!card) return;
        if (data.prix) {
            const prEl = card.querySelector('.price-tag');
            if (prEl) prEl.innerHTML = formatPrix(data.prix);
        }
        if (data.desc) {
            const descEl = card.querySelector('.card-body p');
            if (descEl) descEl.textContent = data.desc;
        }
    });

    // ── Bandeau tarifs ──
    if (cfg.prix_banner) {
        const bannerEl = document.querySelector('.pricing-banner-inner p');
        if (bannerEl) bannerEl.innerHTML = '<strong>Tarifs adultes\u00a0:</strong> ' + cfg.prix_banner;
    }

    // ── WhatsApp ──
    const waBtn = document.getElementById('whatsapp-btn');
    if (waBtn) {
        if (cfg.whatsapp_enabled === false || cfg.whatsapp_enabled === 'false') {
            waBtn.style.display = 'none';
        } else {
            const waNum = (cfg.whatsapp_number || cfg.phone || '0786398886').replace(/[\s+]/g, '');
            const cleanNum = waNum.startsWith('0') ? '33' + waNum.slice(1) : waNum;
            waBtn.href = 'https://wa.me/' + cleanNum;
        }
    }

    // ── Calendly fallback — si pas configuré, les boutons appellent le tel ──
    if (!cfg.calendly_url) {
        document.querySelectorAll('[onclick*="CALENDLY_URL"]').forEach(btn => {
            const phone = (cfg.phone || '0786398886').replace(/\s/g, '');
            btn.removeAttribute('onclick');
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => { window.location.href = 'tel:' + phone; });
        });
    }

    // ── Réseaux sociaux ──
    const socialWrap = document.getElementById('footer-social');
    const ig = document.getElementById('social-instagram');
    const fb = document.getElementById('social-facebook');
    const tt = document.getElementById('social-tiktok');
    if (cfg.instagram && ig) { ig.href = cfg.instagram; ig.style.display = 'flex'; }
    if (cfg.facebook && fb) { fb.href = cfg.facebook; fb.style.display = 'flex'; }
    if (cfg.tiktok && tt) { tt.href = cfg.tiktok; tt.style.display = 'flex'; }
    if (socialWrap && (cfg.instagram || cfg.facebook || cfg.tiktok)) socialWrap.style.display = 'flex';

    // ── Google My Business ──
    const gmbEl = document.getElementById('footer-gmb');
    if (gmbEl && cfg.gmb_url) { gmbEl.href = cfg.gmb_url; gmbEl.style.display = 'flex'; }

    // ── Meta description SEO ──
    if (cfg.meta_description) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', cfg.meta_description);
    }

    // ── Google Maps embed ──
    if (cfg.map_url) {
        const mapIframe = document.querySelector('.contact-map-wrapper iframe');
        if (mapIframe) mapIframe.src = cfg.map_url;
    }

    // ── Gift CTA phone ──
    const giftCta = document.getElementById('gift-cta-btn');
    if (giftCta && cfg.phone) {
        giftCta.href = 'tel:' + cfg.phone.replace(/\s/g, '');
    }

    // ── Galerie ──
    if (cfg.gallery_images && cfg.gallery_images.length) {
        document.querySelectorAll('.gallery-item').forEach((item, i) => {
            const data = cfg.gallery_images[i];
            if (!data) return;
            const img = item.querySelector('.gallery-img');
            if (data.type === 'youtube' && data.videoId) {
                item.dataset.noLightbox = 'true';
                if (img) {
                    img.src = 'https://img.youtube.com/vi/' + data.videoId + '/maxresdefault.jpg';
                    img.alt = data.alt || '';
                    img.onerror = function() { this.src = 'https://img.youtube.com/vi/' + data.videoId + '/hqdefault.jpg'; this.onerror = null; };
                }
                item.style.cursor = 'pointer';
                item.onclick = function() { window.open('https://www.youtube.com/watch?v=' + data.videoId, '_blank'); };
                const overlaySpan = item.querySelector('.gallery-overlay span');
                if (overlaySpan) overlaySpan.textContent = '▶';
            } else if (data.type === 'video-url' && data.src) {
                item.dataset.noLightbox = 'true';
                if (img) img.style.display = 'none';
                if (item.querySelector('.gallery-video')) return; // évite les doublons
                const video = document.createElement('video');
                video.className = 'gallery-video';
                video.muted = true;
                video.loop = true;
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');
                video.setAttribute('preload', 'auto');
                video.src = data.src;
                item.insertBefore(video, item.querySelector('.gallery-overlay'));
                // Lecture explicite — l'attribut autoplay seul peut être ignoré au refresh
                const tryPlay = () => video.play().catch(() => {});
                video.addEventListener('canplay', tryPlay, { once: true });
                // Fallback via IntersectionObserver si canplay ne se déclenche pas
                if ('IntersectionObserver' in window) {
                    const obs = new IntersectionObserver(entries => {
                        if (entries[0].isIntersecting) { tryPlay(); obs.disconnect(); }
                    }, { threshold: 0.1 });
                    obs.observe(item);
                }
            } else if (data.type === 'gdrive' && data.fileId) {
                if (img) img.style.display = 'none';
                const ph = document.createElement('div');
                ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--noir-3,#1A1310);gap:.4rem;';
                const phIcon = document.createElement('span');
                phIcon.style.cssText = 'font-size:2.2rem;color:#D4A843;opacity:.75;';
                phIcon.textContent = '▶';
                const phLabel = document.createElement('span');
                phLabel.style.cssText = 'font-size:.65rem;letter-spacing:.14em;color:#C8BAA0;opacity:.45;font-family:sans-serif;';
                phLabel.textContent = 'GOOGLE DRIVE';
                ph.appendChild(phIcon);
                ph.appendChild(phLabel);
                item.insertBefore(ph, item.querySelector('.gallery-overlay'));
                item.dataset.noLightbox = 'true';
                item.style.cursor = 'pointer';
                item.onclick = function() { window.open('https://drive.google.com/file/d/' + data.fileId + '/view', '_blank'); };
                const overlaySpanGD = item.querySelector('.gallery-overlay span');
                if (overlaySpanGD) overlaySpanGD.textContent = '▶';
            } else if (data.src) {
                if (img) { img.src = data.src; img.alt = data.alt || ''; }
            }
        });
    }

    // ── FAQ ──
    if (cfg.faq_items && cfg.faq_items.length) {
        const faqList = document.getElementById('faq-list');
        if (faqList) {
            faqList.innerHTML = cfg.faq_items.map(item => `
                <div class="faq-item reveal">
                    <button class="faq-question" aria-expanded="false">
                        <span class="faq-q-text">${item.q}</span>
                        <span class="faq-arrow" aria-hidden="true">+</span>
                    </button>
                    <div class="faq-answer"><p>${item.a}</p></div>
                </div>
            `).join('');
        }
    }

    // ── Témoignages — reconstruction du slider ──
    if (cfg.testimonials && cfg.testimonials.length) {
        const track = document.getElementById('testimonials-track');
        const nav   = document.querySelector('.testimonials-nav');
        if (track && nav) {
            track.innerHTML = cfg.testimonials.map(t => `
                <div class="testimonial-card">
                    <div class="stars" aria-label="5 \u00e9toiles">\u2605\u2605\u2605\u2605\u2605</div>
                    <p>\u201c${t.text}\u201d</p>
                    <div class="testimonial-author">
                        <div class="author-avatar" aria-hidden="true">${(t.name || '?').charAt(0)}</div>
                        <div><strong>${t.name}</strong><span>${t.city}</span></div>
                    </div>
                </div>
            `).join('');
            nav.innerHTML = cfg.testimonials.map((_, i) => `
                <button class="t-dot${i === 0 ? ' t-dot--active' : ''}" aria-label="T\u00e9moignage ${i + 1}"></button>
            `).join('');
        }
    }

    // ── Schema.org — mise à jour dynamique ──
    const schemaEl = document.getElementById('schema-org');
    if (schemaEl) {
        try {
            const schemaData = JSON.parse(schemaEl.textContent);
            if (cfg.phone) {
                const t = cfg.phone.replace(/\s/g, '');
                schemaData.telephone = t.startsWith('0') ? '+33' + t.slice(1) : t;
            }
            if (cfg.adresse) {
                const lines = cfg.adresse.split('\n');
                if (lines[0]) schemaData.address.streetAddress = lines[0];
                if (lines[1]) {
                    const m = lines[1].match(/^(\d{5})\s+(.+)$/);
                    if (m) { schemaData.address.postalCode = m[1]; schemaData.address.addressLocality = m[2]; }
                }
            }
            const sameAs = [];
            if (cfg.instagram) sameAs.push(cfg.instagram);
            if (cfg.facebook) sameAs.push(cfg.facebook);
            if (cfg.tiktok) sameAs.push(cfg.tiktok);
            if (sameAs.length) schemaData.sameAs = sameAs;

            // ── FAQPage — mise à jour dynamique depuis la config ──
            if (cfg.faq_items && cfg.faq_items.length) {
                const graph = schemaData['@graph'] || [];
                const faqNode = graph.find(n => n['@type'] === 'FAQPage');
                if (faqNode) {
                    faqNode.mainEntity = cfg.faq_items.map(item => ({
                        '@type': 'Question',
                        'name': item.q,
                        'acceptedAnswer': { '@type': 'Answer', 'text': item.a }
                    }));
                }
            }

            // ── AggregateRating — depuis la note Google configurée ──
            if (cfg.google_rating && cfg.google_review_count) {
                const graph = schemaData['@graph'] || [];
                const bizNode = graph.find(n => n['@type'] === 'HealthAndBeautyBusiness');
                if (bizNode) {
                    bizNode.aggregateRating = {
                        '@type': 'AggregateRating',
                        'ratingValue': cfg.google_rating,
                        'reviewCount': cfg.google_review_count,
                        'bestRating': '5',
                        'worstRating': '1'
                    };
                }
            }

            schemaEl.textContent = JSON.stringify(schemaData);
        } catch(e) {}
    }

    // ── Badge de notation Google ──
    const ratingBadge = document.getElementById('rating-badge');
    if (ratingBadge && (cfg.google_rating || cfg.google_review_count)) {
        const scoreEl = document.getElementById('rating-score');
        const countEl = document.getElementById('rating-count');
        const linkEl  = document.getElementById('rating-link');
        if (scoreEl && cfg.google_rating) scoreEl.textContent = cfg.google_rating;
        if (countEl && cfg.google_review_count) countEl.textContent = cfg.google_review_count;
        if (linkEl && cfg.gmb_url) linkEl.href = cfg.gmb_url;
        ratingBadge.style.display = 'flex';
    }

    // ── Bons cadeaux — montants configurables ──
    const giftAmountsEl = document.getElementById('gift-amounts');
    if (giftAmountsEl) {
        const amounts = [cfg.gift_amount1, cfg.gift_amount2, cfg.gift_amount3].filter(Boolean);
        if (amounts.length) {
            giftAmountsEl.innerHTML = amounts.map(a => `<span class="gift-amount-badge">${a}</span>`).join('');
            giftAmountsEl.style.display = 'flex';
        }
    }
})();

/* ══════════════════════════════════
   0a-video. GALERIE VIDÉOS — chargement async depuis IndexedDB
══════════════════════════════════ */
(async function applyVideoGallery() {
    const _saved = localStorage.getItem('ordutemps_config');
    const cfg = _saved ? JSON.parse(_saved) : (window.__ODT_DEFAULT_CONFIG__ || {});
    if (!cfg.gallery_images) return;

    function openVDB() {
        return new Promise((res, rej) => {
            const r = indexedDB.open('ordutemps_videos', 1);
            r.onupgradeneeded = e => e.target.result.createObjectStore('videos');
            r.onsuccess = e => res(e.target.result);
            r.onerror = () => rej(r.error);
        });
    }

    for (let i = 0; i < cfg.gallery_images.length; i++) {
        const item = cfg.gallery_images[i];
        if (item.type !== 'video' || !item.videoKey) continue;
        const galleryItem = document.querySelector('.gallery-item[data-index="' + i + '"]');
        if (!galleryItem) continue;
        try {
            const db = await openVDB();
            const blob = await new Promise((res, rej) => {
                const tx = db.transaction('videos', 'readonly');
                const r = tx.objectStore('videos').get(item.videoKey);
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
            if (!blob) continue;
            const url = URL.createObjectURL(blob);
            const img = galleryItem.querySelector('.gallery-img');
            if (img) img.style.display = 'none';
            const video = document.createElement('video');
            video.className = 'gallery-video';
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.setAttribute('playsinline', '');
            video.src = url;
            galleryItem.insertBefore(video, galleryItem.querySelector('.gallery-overlay'));
        } catch(e) {}
    }
})();

/* ══════════════════════════════════
   0b. CALENDLY — fallback même sans config
   (applyConfig retourne tôt si pas de config,
   ce bloc s'assure que les boutons fonctionnent)
══════════════════════════════════ */
(function() {
    const _saved = localStorage.getItem('ordutemps_config');
    const cfg = _saved ? JSON.parse(_saved) : (window.__ODT_DEFAULT_CONFIG__ || {});
    // Si calendly_url est configuré, applyConfig() a déjà mis à jour les onclick
    if (cfg.calendly_url) return;
    // Pas de Calendly → redirige vers le numéro de téléphone
    const phone = (cfg.phone || '0786398886').replace(/\s/g, '');
    document.querySelectorAll('[onclick*="CALENDLY_URL"]').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => { window.location.href = 'tel:' + phone; });
    });
})();

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

/* ══════════════════════════════════
   6. FORMULAIRE DE CONTACT
══════════════════════════════════ */
(function () {
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('form-submit-btn');
    const feedback = document.getElementById('form-feedback');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.querySelector('#contact-name').value.trim();
        const email = form.querySelector('#contact-email').value.trim();
        const phone = form.querySelector('#contact-phone').value.trim();
        const message = form.querySelector('#contact-message').value.trim();

        // Validation côté client
        let valid = true;
        [form.querySelector('#contact-name'), form.querySelector('#contact-email'), form.querySelector('#contact-message')].forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                valid = false;
            } else {
                field.classList.remove('error');
            }
        });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            form.querySelector('#contact-email').classList.add('error');
            valid = false;
        }

        if (!valid) {
            feedback.textContent = 'Veuillez remplir tous les champs obligatoires.';
            feedback.className = 'form-feedback error';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours…';
        feedback.textContent = '';
        feedback.className = 'form-feedback';

        try {
            const cfg2 = JSON.parse(localStorage.getItem('ordutemps_config') || '{}');
            const formspreeId = cfg2.formspree_id || '';
            if (!formspreeId) {
                feedback.textContent = 'Le formulaire n\'est pas encore configuré. Appelez directement le ' + (cfg2.phone || '07 86 39 88 86') + ' ou envoyez un email.';
                feedback.className = 'form-feedback error';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer le message';
                return;
            }
            const res = await fetch('https://formspree.io/f/' + formspreeId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name, email, phone, message }),
            });

            const data = await res.json();

            if (res.ok) {
                feedback.textContent = 'Votre message a bien été envoyé. Emma vous répondra rapidement.';
                feedback.className = 'form-feedback success';
                form.reset();
            } else {
                feedback.textContent = data.error || 'Une erreur est survenue. Veuillez réessayer.';
                feedback.className = 'form-feedback error';
            }
        } catch {
            feedback.textContent = 'Impossible d\'envoyer le message. Veuillez réessayer plus tard.';
            feedback.className = 'form-feedback error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer le message';
        }
    });
})();

/* ══════════════════════════════════
   7. GALERIE LIGHTBOX
══════════════════════════════════ */
(function() {
    let images = [];
    let current = 0;

    function buildImages() {
        images = Array.from(document.querySelectorAll('.gallery-img')).map(img => ({ src: img.src, alt: img.alt }));
    }

    document.querySelectorAll('.gallery-item').forEach((item, i) => {
        item.addEventListener('click', () => {
            if (item.dataset.noLightbox === 'true') return;
            buildImages(); openLightboxAt(i);
        });
    });

    window.closeLightbox = function() {
        const lb = document.getElementById('lightbox');
        if (!lb) return;
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    window.lightboxNav = function(dir) {
        if (!images.length) return;
        current = (current + dir + images.length) % images.length;
        const img = document.getElementById('lightbox-img');
        if (img) {
            img.style.opacity = '0';
            setTimeout(() => { img.src = images[current].src; img.alt = images[current].alt; img.style.opacity = '1'; }, 180);
        }
    };

    function openLightboxAt(i) {
        current = i;
        const lb = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        if (!lb || !img || !images[i]) return;
        img.src = images[i].src;
        img.alt = images[i].alt;
        img.style.opacity = '1';
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    document.addEventListener('keydown', e => {
        const lb = document.getElementById('lightbox');
        if (!lb?.classList.contains('open')) return;
        if (e.key === 'Escape') window.closeLightbox();
        if (e.key === 'ArrowLeft') window.lightboxNav(-1);
        if (e.key === 'ArrowRight') window.lightboxNav(1);
    });
})();

/* ══════════════════════════════════
   8. FAQ ACCORDÉON
══════════════════════════════════ */
function initFaqListeners(container) {
    (container || document).querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            (container || document).querySelectorAll('.faq-question').forEach(other => {
                if (other !== btn) {
                    other.setAttribute('aria-expanded', 'false');
                    other.nextElementSibling?.classList.remove('open');
                }
            });
            btn.setAttribute('aria-expanded', String(!isOpen));
            answer?.classList.toggle('open', !isOpen);
        });
    });
}
initFaqListeners();

/* ══════════════════════════════════
   9. BACK TO TOP
══════════════════════════════════ */
(function() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ══════════════════════════════════
   10. COOKIE BANNER RGPD
══════════════════════════════════ */
(function() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    const consent = localStorage.getItem('ordutemps_cookies');

    if (consent === null) {
        setTimeout(() => banner.classList.add('visible'), 1200);
    } else if (consent === 'true') {
        loadGA();
    }

    window.setCookieConsent = function(accepted) {
        localStorage.setItem('ordutemps_cookies', String(accepted));
        banner.classList.remove('visible');
        if (accepted) loadGA();
    };

    function loadGA() {
        const cfg = JSON.parse(localStorage.getItem('ordutemps_config') || '{}');
        const gaId = cfg.ga_id;
        if (!gaId || window._gaInit) return;
        window._gaInit = true;
        const s = document.createElement('script');
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
        s.async = true;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', gaId);
    }
})();

/* ══════════════════════════════════
   11. ACCÈS ADMIN — 5 clics sur le logo footer
   (discret, non visible pour les visiteurs)
══════════════════════════════════ */
(function () {
    const footerBrand = document.querySelector('.footer-brand');
    if (!footerBrand) return;

    let clicks = 0;
    let timer;

    footerBrand.style.cursor = 'default';
    footerBrand.addEventListener('click', () => {
        clicks++;
        clearTimeout(timer);
        // Réinitialise le compteur après 3 secondes d'inactivité
        timer = setTimeout(() => { clicks = 0; }, 3000);
        if (clicks >= 5) {
            clicks = 0;
            window.location.href = 'emma.html';
        }
    });
})();

/* ══════════════════════════════════
   12. ANIMATION DES CHIFFRES CLÉS
   Les stats comptent de 0 jusqu'à leur valeur
══════════════════════════════════ */
(function() {
    function animateCounter(el) {
        const raw = el.textContent.trim();
        const match = raw.match(/^(\d+(?:\.\d+)?)(\D*)$/);
        if (!match) return; // "7j/7" etc. — pas animable
        const target = parseFloat(match[1]);
        const suffix = match[2];
        const duration = 1600;
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = (Number.isInteger(target) ? Math.round(eased * target) : (eased * target).toFixed(1)) + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.stat-number').forEach(animateCounter);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsBand = document.querySelector('.stats-band');
    if (statsBand) statsObserver.observe(statsBand);
})();

/* ══════════════════════════════════
   13. SCROLL SPY — Nav active au scroll
══════════════════════════════════ */
(function() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    if (!navLinks.length) return;

    const sectionIds = Array.from(navLinks).map(l => l.getAttribute('href').slice(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            navLinks.forEach(link => {
                link.classList.toggle('nav-link--active', link.getAttribute('href') === '#' + id);
            });
        });
    }, {
        threshold: 0.25,
        rootMargin: '-' + (typeof window !== 'undefined' ? 72 : 72) + 'px 0px -40% 0px'
    });

    sections.forEach(s => spyObserver.observe(s));
})();

/* ══════════════════════════════════
   14. BARRE DE PROGRESSION AU SCROLL
══════════════════════════════════ */
(function() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    function updateBar() {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = total > 0 ? (scrolled / total * 100).toFixed(2) + '%' : '0%';
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();
})();

/* ══════════════════════════════════
   15. SKELETON LOADING — Galerie
══════════════════════════════════ */
(function() {
    document.querySelectorAll('.gallery-img').forEach(img => {
        if (img.complete && img.naturalWidth > 0) return;
        const item = img.closest('.gallery-item');
        if (item) item.classList.add('loading');
        img.addEventListener('load', () => item?.classList.remove('loading'));
        img.addEventListener('error', () => item?.classList.remove('loading'));
    });
})();

/* ══════════════════════════════════
   16. BOUTON PARTAGER (Web Share API)
══════════════════════════════════ */
(function() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;
    if (!navigator.share) { btn.style.display = 'none'; return; }
    btn.style.display = 'inline-flex';
    btn.addEventListener('click', async () => {
        const cfg = JSON.parse(localStorage.getItem('ordutemps_config') || '{}');
        try {
            await navigator.share({
                title: 'Or du Temps — Massage Bien-être',
                text: cfg.hero_subtitle || 'Une parenthèse hors du temps pour votre corps et votre esprit.',
                url: window.location.href
            });
        } catch(e) {
            if (e.name !== 'AbortError') {
                await navigator.clipboard?.writeText(window.location.href).catch(() => {});
            }
        }
    });
})();
