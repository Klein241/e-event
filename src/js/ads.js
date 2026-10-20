/**
 * ============================================================
 * COMPAGNON DE CÉRÉMONIE - MODULE ANNONCES & VITRINE 3D 360°
 * Vitrine pastel claymorphic (Image Modèle) & Viewer 360° tactile
 * ============================================================
 */

import { Api } from './api.js';

export const AdsModule = {
  ads: [],
  activeAd: null,
  rotationY: 0,
  rotationX: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  autoSpinInterval: null,
  isAutoSpinning: false,

  async init() {
    await this.fetchAds();
    this.setupModalEvents();
  },

  getDefaultAds() {
    return [
      {
        id: 'ad-1',
        title: 'Ouvrages & Dédicaces',
        brand: 'Pasteur KAMZOLES',
        tagline: 'Dédicace Spéciale',
        description: 'Découvrez les livres d\'impact et d\'exhortation du Pasteur KAMZOLES Charly Ingénu. Disponibles à la table d\'honneur avec signatures personnalisées.',
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        redirect_url: 'https://wa.me/?text=Bonjour%20je%20souhaite%20r%C3%A9server%20un%20livre%20du%20Pasteur%20KAMZOLES',
        theme_color: 'sage',
        icon_emoji: '📚',
        price_tag: 'Disponible ce soir',
        views_count: 0,
        clicks_count: 0,
        is_active: 1,
        order_index: 1
      },
      {
        id: 'ad-2',
        title: 'Le Rocher des Âges',
        brand: 'Salle de Réception Royale',
        tagline: 'Partenaire Hôte',
        description: 'Cadre d\'exception pour vos mariages, banquets et galas prestigieux. Salons climatisés, acoustique feutrée et service d\'honneur.',
        image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80',
        redirect_url: 'https://wa.me/?text=Bonjour%20je%20souhaite%20des%20informations%20sur%20la%20salle%20Le%20Rocher%20des%20Ages',
        theme_color: 'peach',
        icon_emoji: '🏰',
        price_tag: 'Partenaire Officiel',
        views_count: 0,
        clicks_count: 0,
        is_active: 1,
        order_index: 2
      },
      {
        id: 'ad-3',
        title: 'Parfums & Parures',
        brand: 'Maison Prestige Gala',
        tagline: 'Élégance Royale',
        description: 'Essences rares, coffrets d\'exception et tenues d\'apparat sur mesure créés pour illuminer vos grands rendez-vous de fête.',
        image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
        redirect_url: 'https://wa.me/?text=Bonjour%20je%20souhaite%20d%C3%A9couvrir%20les%20parfums%20Prestige%20Gala',
        theme_color: 'honey',
        icon_emoji: '👑',
        price_tag: 'Offre Privilège',
        views_count: 0,
        clicks_count: 0,
        is_active: 1,
        order_index: 3
      },
      {
        id: 'ad-4',
        title: 'Orfèvrerie & Cadeaux',
        brand: 'Atelier Céleste',
        tagline: 'Souvenirs d\'Art',
        description: 'Bijoux symboliques en or et argent, gravures d\'alliance et objets d\'art créés pour perpétuer la mémoire de ce dîner de gala.',
        image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80',
        redirect_url: 'https://wa.me/?text=Bonjour%20je%20souhaite%20consulter%20le%20catalogue%20d%27orf%C3%A8vrerie',
        theme_color: 'blue',
        icon_emoji: '💎',
        price_tag: 'Collection 2026',
        views_count: 0,
        clicks_count: 0,
        is_active: 1,
        order_index: 4
      }
    ];
  },

  async fetchAds() {
    try {
      const data = await Api.request('/ads');
      if (Array.isArray(data) && data.length > 0) {
        this.ads = data.filter(a => a.is_active !== 0);
      } else {
        this.ads = this.getDefaultAds();
      }
      this.render();
      // Incrémenter les vues réelles
      for (const ad of this.ads) {
        Api.request(`/ads/${ad.id}/view`, { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Chargement annonces hors-ligne:', err);
      this.ads = this.getDefaultAds();
      this.render();
    }
  },

  render() {
    const container = document.getElementById('home-ads-showcase');
    if (!container) return;

    if (!this.ads || this.ads.length === 0) {
      container.innerHTML = '';
      return;
    }

    const cardsHtml = this.ads.map(ad => {
      const themeClass = `theme-${ad.theme_color || 'peach'}`;
      const imgSrc = ad.image_data || ad.image_url || '';
      const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${escapeHtml(ad.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:18px;" onerror="this.parentNode.innerHTML='<span style=font-size:2rem>${ad.icon_emoji || '🛍️'}</span>'">`
        : `<span style="font-size:2rem">${ad.icon_emoji || '🛍️'}</span>`;

      return `
        <div class="clay-ad-card ${themeClass}" onclick="window.AdsModule.openModal3D('${ad.id}')" title="Cliquer pour voir en 3D 360°">
          <div class="clay-ad-img-box">
            ${imgHtml}
          </div>
          <div class="clay-ad-label">${escapeHtml(ad.title)}</div>
          <div class="clay-ad-value">${escapeHtml(ad.price_tag || ad.tagline || 'Gala')}</div>
          <div class="clay-ad-delta">
            <span>✨</span>
            <span>3D 360°</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
    this.renderVitrinePage();
  },

  renderVitrinePage() {
    const vitrineGallery = document.getElementById('vitrine-full-gallery');
    if (!vitrineGallery) return;

    if (!this.ads || this.ads.length === 0) {
      vitrineGallery.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">Aucun produit disponible pour le moment.</p>';
      return;
    }

    vitrineGallery.innerHTML = this.ads.map(ad => {
      const imgSrc = ad.image_data || ad.image_url || '';
      const thumbHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${escapeHtml(ad.title)}" onerror="this.parentNode.innerHTML='<span style=font-size:2rem>${ad.icon_emoji || '🛍️'}</span>'">`
        : `<span style="font-size:2rem">${ad.icon_emoji || '🛍️'}</span>`;

      return `
        <div class="vitrine-item-card" onclick="window.AdsModule.openModal3D('${ad.id}')" title="Découvrir en 3D 360°">
          <div class="vitrine-item-thumb">
            ${thumbHtml}
          </div>
          <div class="vitrine-item-info">
            <span class="vitrine-item-brand">${escapeHtml(ad.brand || 'Partenaire Officiel')}</span>
            <div class="vitrine-item-title">${escapeHtml(ad.title)}</div>
            <div class="vitrine-item-tagline">${escapeHtml(ad.description || ad.tagline || '')}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <span style="font-size:0.75rem; font-weight:700; color:#b45309;">${escapeHtml(ad.price_tag || 'Disponible ce soir')}</span>
              <span style="font-size:0.75rem; font-weight:700; color:#ea580c;">Voir 3D ➔</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openModal3D(adId) {
    let ad = this.ads.find(a => a.id === adId);
    if (!ad) {
      // Fallback si l'annonce est dans le catalogue par défaut
      const defaultAds = this.getDefaultAds();
      ad = defaultAds.find(a => a.id === adId) || defaultAds[0];
    }
    if (!ad) return;

    this.activeAd = ad;
    this.rotationY = 0;
    this.rotationX = 0;

    const modal = document.getElementById('modal-ad-360');
    if (!modal) {
      console.error("[AdsModule] Modale #modal-ad-360 introuvable dans le DOM");
      return;
    }

    // Afficher la modale immédiatement pour une réactivité instantanée
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));

    // Remplir les informations textuelles
    const brandEl = document.getElementById('modal-3d-brand');
    const titleEl = document.getElementById('modal-3d-title');
    const descEl = document.getElementById('modal-3d-desc');
    const priceEl = document.getElementById('modal-3d-price');
    if (brandEl) brandEl.textContent = ad.brand || 'Partenaire Officiel';
    if (titleEl) titleEl.textContent = ad.title;
    if (descEl) descEl.textContent = ad.description || ad.tagline || '';
    if (priceEl) priceEl.textContent = ad.price_tag || '';

    // Gestion de l'image ou du fallback emoji
    const imgEl = document.getElementById('product-3d-img');
    const emojiEl = document.getElementById('product-3d-emoji-fallback');
    const src = ad.image_data || ad.image_url || '';

    if (imgEl) {
      if (src) {
        imgEl.src = src;
        imgEl.style.display = 'block';
        if (emojiEl) emojiEl.style.display = 'none';
      } else {
        imgEl.style.display = 'none';
        if (emojiEl) {
          emojiEl.textContent = ad.icon_emoji || '🛍️';
          emojiEl.style.display = 'flex';
        }
      }
    }

    const ctaBtn = document.getElementById('btn-3d-cta');
    if (ctaBtn) {
      ctaBtn.href = ad.redirect_url || '#';
      ctaBtn.target = ad.redirect_url ? '_blank' : '_self';
    }

    this.updateTransform();

    // Démarrer auto-spin doux pendant 4 secondes
    this.startAutoSpin();

    // Télémétrie asynchrone non-bloquante
    try {
      if (Api && typeof Api.request === 'function' && ad.id && !ad.id.startsWith('ad-default')) {
        Api.request(`/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
      }
    } catch (_) {}
  },

  closeModal3D() {
    const modal = document.getElementById('modal-ad-360');
    if (modal) modal.style.display = 'none';
    this.stopAutoSpin();
  },

  setupModalEvents() {
    const stage = document.getElementById('turntable-stage-3d');
    if (!stage) return;

    // Déplacement / Drag Souris
    stage.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.stopAutoSpin();
      this.startX = e.clientX;
      this.startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      this.startX = e.clientX;
      this.startY = e.clientY;

      this.rotationY = (this.rotationY + deltaX * 0.9) % 360;
      this.rotationX = Math.max(-25, Math.min(25, this.rotationX - deltaY * 0.4));
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Événements Tactiles Mobiles (Touch)
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.stopAutoSpin();
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
      }
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.startX;
      const deltaY = e.touches[0].clientY - this.startY;
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;

      this.rotationY = (this.rotationY + deltaX * 1.1) % 360;
      this.rotationX = Math.max(-20, Math.min(20, this.rotationX - deltaY * 0.35));
      this.updateTransform();
    }, { passive: true });

    stage.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  },

  updateTransform() {
    const obj = document.getElementById('product-object-3d');
    const shadow = document.getElementById('turntable-shadow-3d');
    const angleText = document.getElementById('turntable-angle-indicator');

    const cleanAngle = Math.round(((this.rotationY % 360) + 360) % 360);

    if (obj) {
      obj.style.transform = `rotateY(${this.rotationY}deg) rotateX(${this.rotationX}deg)`;
    }

    if (shadow) {
      const skew = Math.sin((this.rotationY * Math.PI) / 180) * 12;
      const scale = 1 + Math.cos((this.rotationY * Math.PI) / 180) * 0.12;
      shadow.style.transform = `skewX(${skew}deg) scale(${scale})`;
    }

    if (angleText) {
      angleText.textContent = `${cleanAngle}°`;
    }
  },

  toggleAutoSpin() {
    if (this.isAutoSpinning) {
      this.stopAutoSpin();
    } else {
      this.startAutoSpin();
    }
  },

  startAutoSpin() {
    this.stopAutoSpin();
    this.isAutoSpinning = true;
    const btn = document.getElementById('btn-auto-spin');
    if (btn) btn.classList.add('active');

    this.autoSpinInterval = setInterval(() => {
      this.rotationY = (this.rotationY + 1.5) % 360;
      this.updateTransform();
    }, 25);
  },

  stopAutoSpin() {
    if (this.autoSpinInterval) {
      clearInterval(this.autoSpinInterval);
      this.autoSpinInterval = null;
    }
    this.isAutoSpinning = false;
    const btn = document.getElementById('btn-auto-spin');
    if (btn) btn.classList.remove('active');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

window.AdsModule = AdsModule;
