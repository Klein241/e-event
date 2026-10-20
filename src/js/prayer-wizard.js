/**
 * COMPAGNON DE CEREMONIE - Assistant Interactif de Priere par Etapes
 * Carte 1 : Selection rapide du theme
 * Carte 2 : Description + Contact WhatsApp
 * Carte 3 : Informations pastorales enrichies (pour qui, qui appelle, eglise)
 */

import { Api } from './api.js';
import { AppState } from './state.js';

export const PrayerWizard = {
  selectedTopic: 'Famille',
  currentStep: 1,

  topics: [
    { id: 'famille', label: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 Famille' },
    { id: 'foyer', label: '\uD83D\uDC8D Foyer & Couple' },
    { id: 'enfants', label: '\uD83D\uDC76 Enfants' },
    { id: 'mari', label: '\uD83E\uDD35 Mari / Conjoint' },
    { id: 'femme', label: '\uD83D\uDC70 Femme / Conjointe' },
    { id: 'parents', label: '\uD83D\uDC75 Parents' },
    { id: 'activite', label: '\uD83D\uDCBC Activites & Entreprise' },
    { id: 'sante', label: '\uD83E\uDE7A Sante & Guerison' },
    { id: 'finances', label: '\uD83D\uDCC8 Finances & Percee' },
    { id: 'autre', label: '\u2728 Autre sujet' }
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
        this.selectTopic(e.currentTarget.dataset.topic);
      });
    });
  },

  selectTopic(topic) {
    this.selectedTopic = topic;
    const grid = document.getElementById('prayer-wizard-topics-grid');
    if (grid) {
      grid.querySelectorAll('.prayer-topic-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.topic === topic);
      });
    }
    const titleInput = document.getElementById('prayer-wizard-title-preview');
    if (titleInput) titleInput.textContent = topic;
    setTimeout(() => { this.goToStep(2); }, 180);
  },

  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    [1, 2, 3].forEach(n => {
      const card = document.getElementById(`prayer-wizard-card-${n}`);
      if (card) card.style.display = (n === stepNumber) ? 'block' : 'none';
      const pill = document.getElementById(`prayer-wizard-pill-${n}`);
      if (pill) pill.classList.toggle('active', n <= stepNumber);
    });
    if (stepNumber === 2) document.getElementById('prayer-wizard-content')?.focus();
    if (stepNumber === 3) document.getElementById('prayer-wizard-target-person')?.focus();
  },

  open(presetTopic = null) {
    const modal = document.getElementById('prayer-wizard-modal');
    if (!modal) return;
    if (presetTopic) this.selectedTopic = presetTopic;
    this.renderTopicButtons();
    this.goToStep(1);
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
  },

  close() {
    const modal = document.getElementById('prayer-wizard-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => { if (!modal.classList.contains('active')) modal.style.display = 'none'; }, 200);
    }
  },

  bindEvents() {
    const modal = document.getElementById('prayer-wizard-modal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.close(); });

    document.getElementById('btn-close-prayer-wizard')?.addEventListener('click', () => this.close());
    document.getElementById('btn-back-prayer-step1')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('btn-next-prayer-step3')?.addEventListener('click', () => {
      const content = document.getElementById('prayer-wizard-content')?.value.trim();
      if (!content) { alert('Veuillez decrire brievement votre sujet de priere.'); return; }
      this.goToStep(3);
    });
    document.getElementById('btn-back-prayer-step2')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('prayer-wizard-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

    const hasChurchSelect = document.getElementById('prayer-wizard-has-church');
    if (hasChurchSelect) {
      hasChurchSelect.addEventListener('change', () => {
        const churchDetails = document.getElementById('prayer-wizard-church-details');
        if (churchDetails) churchDetails.style.display = hasChurchSelect.value === 'oui' ? 'block' : 'none';
      });
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const content = document.getElementById('prayer-wizard-content')?.value.trim();
    const whatsapp = document.getElementById('prayer-wizard-whatsapp')?.value.trim();
    const targetPerson = document.getElementById('prayer-wizard-target-person')?.value.trim() || '';
    const fullName = document.getElementById('prayer-wizard-full-name')?.value.trim() || '';
    const residenceLocation = document.getElementById('prayer-wizard-residence')?.value.trim() || '';
    const hasChurchVal = document.getElementById('prayer-wizard-has-church')?.value || 'non';
    const hasChurch = hasChurchVal === 'oui' ? 1 : 0;
    const churchName = document.getElementById('prayer-wizard-church-name')?.value.trim() || '';
    const churchDuration = document.getElementById('prayer-wizard-church-duration')?.value.trim() || '';
    const submitBtn = document.getElementById('btn-submit-prayer-wizard');

    if (!content) { alert('Veuillez decrire votre sujet de priere.'); this.goToStep(2); return; }
    if (!residenceLocation) { alert('Le lieu de residence est obligatoire (pour que nous puissions vous rejoindre si vous le souhaitez).'); return; }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>Envoi en cours...</span>'; }

    try {
      const payload = {
        guest_id: AppState.guest ? AppState.guest.id : `guest-${Date.now()}`,
        author_name: AppState.guest ? AppState.guest.name : (fullName || 'Invite de Gala'),
        table_number: AppState.guest ? AppState.guest.table_number : 'Table 1',
        title: this.selectedTopic,
        content,
        whatsapp,
        is_anonymous: 0,
        is_private: 1,
        category: 'priere',
        target_person: targetPerson,
        full_name: fullName,
        residence_location: residenceLocation,
        has_church: hasChurch,
        church_name: hasChurch ? churchName : '',
        church_duration: hasChurch ? churchDuration : '',
      };

      const result = await Api.submitPrayer(payload);
      this.saveToMyPrayers({
        id: result?.id || `local-${Date.now()}`,
        title: this.selectedTopic, content, whatsapp, target_person: targetPerson,
        created_at: new Date().toISOString()
      });

      this.close();
      document.getElementById('prayer-wizard-form')?.reset();
      const churchDetails = document.getElementById('prayer-wizard-church-details');
      if (churchDetails) churchDetails.style.display = 'none';

      window.showToast("\uD83D\uDE4F Votre requete a ete transmise en toute confidentialite a l'equipe d'intercession.", 'success');
      if (typeof window.switchTab === 'function') window.switchTab('prayer');
    } catch (err) {
      window.showToast(err.message, 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Envoyer ma requete \uD83D\uDE4F</span>'; }
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
    try { return JSON.parse(localStorage.getItem('compagnon_my_prayers') || '[]'); }
    catch (e) { return []; }
  }
};
