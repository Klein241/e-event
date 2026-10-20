import { Api } from './api.js';
import { AppState } from './state.js';

export const PrayerModule = {
  container: null,
  listEl: null,
  activeFilter: 'all',

  init() {
    this.container = document.getElementById('prayer-tab');
    if (!this.container) return;

    this.listEl = document.getElementById('prayers-list');

    this.bindEvents();
    this.refresh();
  },

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    const btnNew = document.getElementById('btn-new-prayer');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        window.openPrayerModal();
      });
    }

    const filterBtns = this.container.querySelectorAll('.filter-pill');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        
        if (this.activeFilter === 'my') {
          const guestId = AppState.guest ? AppState.guest.id : 'anon';
          const myPrayers = await Api.getMyPrayers(guestId);
          this.renderMyPrayers(myPrayers);
        } else {
          this.render();
        }
      });
    });
  },

  async refresh() {
    const prayers = await Api.getPrayers();
    AppState.prayers = prayers;
    if (this.activeFilter === 'my') {
      const guestId = AppState.guest ? AppState.guest.id : 'anon';
      const myPrayers = await Api.getMyPrayers(guestId);
      this.renderMyPrayers(myPrayers);
    } else {
      this.render();
    }
  },

  renderMyPrayers(myPrayers) {
    if (!this.listEl) return;

    if (!myPrayers || myPrayers.length === 0) {
      this.listEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔒</div>
          <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.25rem;">Aucune requête privée enregistrée</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Confiez vos sujets personnels (famille, travail, santé, foyer) en toute discrétion à notre équipe d'intercession.</p>
          <button class="btn-3d btn-3d-amber" onclick="window.PrayerWizard?.open()">
            <span>🙏 Demander une prière</span>
          </button>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = `
      <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: rgba(212, 175, 55, 0.08); border-left: 3px solid var(--gold-primary); border-radius: 8px; font-size: 0.82rem; color: var(--text-muted);">
        ✨ <strong>Espace Personnel et Confidentiel :</strong> Ces requêtes ne sont visibles que par vous et les intercesseurs du gala.
      </div>
    ` + myPrayers.map(p => {
      const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="prayer-card" style="border: 1px solid rgba(212, 175, 55, 0.35); background: linear-gradient(145deg, #182030, #111827);">
          <div class="prayer-card-header">
            <div class="prayer-author-info">
              <span class="prayer-author-name">🔒 Votre requête personnelle</span>
            </div>
            <span class="prayer-category-tag tag-priere">🙏 Confidentiel</span>
          </div>

          <div class="prayer-card-title" style="color: var(--gold-light);">${escapeHtml(p.title)}</div>
          <div class="prayer-card-content">${escapeHtml(p.content)}</div>

          ${p.whatsapp ? `
            <div style="margin-top: 0.5rem; font-size: 0.78rem; color: var(--emerald-400, #34d399);">
              💬 Suivi WhatsApp associé : <strong>${escapeHtml(p.whatsapp)}</strong>
            </div>
          ` : ''}

          <div class="prayer-card-footer" style="margin-top: 0.75rem;">
            <span class="prayer-date">${dateStr}</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">🛡️ Traité par l'équipe d'intercession</span>
          </div>
        </div>
      `;
    }).join('');
  },

  render() {
    if (!this.listEl) return;

    let items = AppState.prayers || [];
    if (this.activeFilter !== 'all') {
      items = items.filter(p => p.category === this.activeFilter);
    }

    if (items.length === 0) {
      this.listEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🙏</div>
          <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.25rem;">Aucun sujet pour le moment</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Soyez le premier à déposer un vœu ou une requête de prière.</p>
          <button class="btn-primary" onclick="window.openPrayerModal()">Déposer une prière / vœu</button>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = items.map(p => {
      const categoryTagClass = p.category === 'benediction' ? 'tag-benediction' : (p.category === 'grace' ? 'tag-grace' : 'tag-priere');
      const categoryLabel = p.category === 'benediction' ? '✨ Bénédiction' : (p.category === 'grace' ? '🙌 Action de grâce' : '🙏 Prière');
      const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : '';

      return `
        <div class="prayer-card" data-id="${p.id}">
          <div class="prayer-card-header">
            <div class="prayer-author-info">
              <span class="prayer-author-name">${escapeHtml(p.author_name)}</span>
              ${p.table_number ? `<span class="chat-table-tag">${escapeHtml(p.table_number)}</span>` : ''}
            </div>
            <span class="prayer-category-tag ${categoryTagClass}">${categoryLabel}</span>
          </div>

          <div class="prayer-card-title">${escapeHtml(p.title)}</div>
          <div class="prayer-card-content">${escapeHtml(p.content)}</div>

          <div class="prayer-card-footer">
            <span class="prayer-date">${dateStr}</span>
            <button class="btn-support-prayer" onclick="window.supportPrayer('${p.id}')">
              <span>🔥 Amen / Je prie</span>
              <span class="support-counter">${p.prayer_count || 1}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async support(prayerId) {
    const guestId = AppState.guest ? AppState.guest.id : 'anon-guest';
    const result = await Api.supportPrayer(prayerId, guestId);
    
    // Mettre à jour localement
    const item = AppState.prayers.find(p => p.id === prayerId);
    if (item) {
      item.prayer_count = result.prayer_count;
      this.render();
    }

    window.showToast("Votre soutien dans la prière a été enregistré ! 🙏");
  }
};

window.supportPrayer = (id) => PrayerModule.support(id);

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
