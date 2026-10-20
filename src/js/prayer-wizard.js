/**
 * COMPAGNON DE CÉRÉMONIE - Assistant Interactif de Prière par Étapes
 * Carte 1 : Sélection rapide du thème (Famille, Foyer, Enfants, Activités...)
 * Carte 2 : Description, Contact WhatsApp, Note de confidentialité privée
 */

import { Api } from './api.js';
import { AppState } from './state.js';

export const PrayerWizard = {
  selectedTopic: 'Famille',
  currentStep: 1,

  topics: [
    { id: 'famille', label: '👨‍👩‍👧‍👦 Famille' },
    { id: 'foyer', label: '💍 Foyer & Couple' },
    { id: 'enfants', label: '👶 Enfants' },
    { id: 'mari', label: '🤵 Mari / Conjoint' },
    { id: 'femme', label: '👰 Femme / Conjointe' },
    { id: 'parents', label: '👵 Parents' },
    { id: 'activite', label: '💼 Activités & Entreprise' },
    { id: 'sante', label: '🩺 Santé & Guérison' },
    { id: 'finances', label: '📈 Finances & Percée' },
    { id: 'autre', label: '✨ Autre sujet' }
  ],

  init() {
    this.renderTopicButtons();
    this.bindEvents();
  },

  renderTopicButtons() {
    const grid = document.getElementById('prayer-wizard-topics-grid');
    if (!grid) return;

    grid.innerHTML = this.topics.map(t => `
      <button type="button" class="prayer-topic-btn ${t.label.includes(this.selectedTopic) ? 'selected' : ''}" data-topic="${t.label}">
        ${t.label}
      </button>
    `).join('');

    grid.querySelectorAll('.prayer-topic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const topic = e.currentTarget.dataset.topic;
        this.selectTopic(topic);
      });
    });
  },

  selectTopic(topic) {
    this.selectedTopic = topic;
    const grid = document.getElementById('prayer-wizard-topics-grid');
    if (grid) {
      grid.querySelectorAll('.prayer-topic-btn').forEach(btn => {
        if (btn.dataset.topic === topic) btn.classList.add('selected');
        else btn.classList.remove('selected');
      });
    }

    const titleInput = document.getElementById('prayer-wizard-title-preview');
    if (titleInput) titleInput.textContent = topic;

    // Transition automatique vers la Carte 2 après sélection pour fluidité
    setTimeout(() => {
      this.goToStep(2);
    }, 180);
  },

  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    const card1 = document.getElementById('prayer-wizard-card-1');
    const card2 = document.getElementById('prayer-wizard-card-2');
    const pill1 = document.getElementById('prayer-wizard-pill-1');
    const pill2 = document.getElementById('prayer-wizard-pill-2');

    if (stepNumber === 1) {
      if (card1) card1.style.display = 'block';
      if (card2) card2.style.display = 'none';
      if (pill1) pill1.classList.add('active');
      if (pill2) pill2.classList.remove('active');
    } else {
      if (card1) card1.style.display = 'none';
      if (card2) card2.style.display = 'block';
      if (pill1) pill1.classList.add('active');
      if (pill2) pill2.classList.add('active');
      document.getElementById('prayer-wizard-content')?.focus();
    }
  },

  open(presetTopic = null) {
    const modal = document.getElementById('prayer-wizard-modal');
    if (!modal) return;

    if (presetTopic) {
      this.selectedTopic = presetTopic;
    }
    this.renderTopicButtons();
    this.goToStep(1);
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  },

  close() {
    const modal = document.getElementById('prayer-wizard-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        if (!modal.classList.contains('active')) {
          modal.style.display = 'none';
        }
      }, 200);
    }
  },

  bindEvents() {
    const modal = document.getElementById('prayer-wizard-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });
    }

    document.getElementById('btn-close-prayer-wizard')?.addEventListener('click', () => this.close());
    document.getElementById('btn-back-prayer-step1')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('prayer-wizard-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  async handleSubmit(e) {
    e.preventDefault();
    const content = document.getElementById('prayer-wizard-content')?.value.trim();
    const whatsapp = document.getElementById('prayer-wizard-whatsapp')?.value.trim();
    const submitBtn = document.getElementById('btn-submit-prayer-wizard');

    if (!content) {
      alert("Veuillez décrire brièvement votre sujet de prière.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Envoi en cours...</span>`;
    }

    try {
      const payload = {
        guest_id: AppState.guest ? AppState.guest.id : `guest-${Date.now()}`,
        author_name: AppState.guest ? AppState.guest.name : "Invité de Gala",
        table_number: AppState.guest ? AppState.guest.table_number : "Table 1",
        title: this.selectedTopic,
        content,
        whatsapp,
        is_anonymous: 0,
        is_private: 1, // 100% Confidentiel avec l'équipe pastorale
        category: 'priere'
      };

      const result = await Api.submitPrayer(payload);

      // Sauvegarde dans "Mes requêtes" en local
      this.saveToMyPrayers({
        id: result?.id || `local-${Date.now()}`,
        title: this.selectedTopic,
        content,
        whatsapp,
        created_at: new Date().toISOString()
      });

      this.close();
      document.getElementById('prayer-wizard-form')?.reset();

      window.showToast("🙏 Votre requête a été transmise en toute confidentialité à l'équipe d'intercession.", "success");

      // Basculer vers l'onglet prières pour voir "Mes requêtes"
      if (typeof window.switchTab === 'function') {
        window.switchTab('prayer');
      }
    } catch (err) {
      window.showToast(err.message, "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Envoyer ma requête 🙏</span>`;
      }
    }
  },

  saveToMyPrayers(prayer) {
    try {
      const key = 'compagnon_my_prayers';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(prayer);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    } catch (e) {}
  },

  getMyPrayers() {
    try {
      return JSON.parse(localStorage.getItem('compagnon_my_prayers') || '[]');
    } catch (e) {
      return [];
    }
  }
};
