/**
 * COMPAGNON DE CÉRÉMONIE - Assistant Réseautage en 4 Cartes
 * - Formulaire unique : l'utilisateur ne crée sa fiche qu'une seule fois et peut la modifier.
 * - Chaque case du formulaire est STRICTEMENT OBLIGATOIRE (photo réelle, nom, métier, entreprise, bio, tags, recherche, offre, whatsapp).
 * - Upload direct de photo réelle (selfie/galerie) avec compression canvas et aperçu immédiat.
 */

import { Api } from './api.js';
import { AppState } from './state.js';
import { NetworkingModule } from './networking.js';

export const NetworkingWizard = {
  currentStep: 1,
  isEditing: false,

  init() {
    this.bindEvents();
    this.updateTriggerButton();
  },

  getMyProfile() {
    try {
      const stored = localStorage.getItem('compagnon_my_net_profile');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // Ignorer
    }
    // Ou chercher dans AppState si son guestId correspond
    if (AppState.guest && AppState.networkingProfiles) {
      return AppState.networkingProfiles.find(p => p.guest_id === AppState.guest.id) || null;
    }
    return null;
  },

  updateTriggerButton() {
    const btn = document.getElementById('btn-edit-my-networking');
    if (!btn) return;

    const myProfile = this.getMyProfile();
    if (myProfile) {
      btn.innerHTML = `<span>✏️ Modifier ma fiche de contact</span>`;
    } else {
      btn.innerHTML = `<span>✨ Créer ma fiche de contact</span>`;
    }
  },

  open() {
    const modal = document.getElementById('networking-wizard-modal');
    if (!modal) return;

    const myProfile = this.getMyProfile();
    this.isEditing = !!myProfile;

    // Mettre à jour les titres de la modale
    const titleEl = document.getElementById('net-wizard-modal-title');
    const subEl = document.getElementById('net-wizard-modal-subtitle');
    const submitText = document.getElementById('btn-submit-net-text');

    if (this.isEditing) {
      if (titleEl) titleEl.textContent = "✏️ Modifier ma Fiche Réseautage";
      if (subEl) subEl.textContent = "Mettez à jour vos coordonnées ou votre photo. Vos modifications seront visibles immédiatement.";
      if (submitText) submitText.textContent = "💾 Enregistrer les modifications 🚀";
      this.fillFormWithProfile(myProfile);
    } else {
      if (titleEl) titleEl.textContent = "🤝 Créer ma Fiche Réseautage VIP";
      if (subEl) subEl.textContent = "Remplissez chaque champ pour publier votre fiche de contact (Modifiable à tout moment).";
      if (submitText) submitText.textContent = "🚀 Publier ma fiche de réseautage";
      this.prefillDefaults();
    }

    this.goToStep(1);
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('active');
    });
  },

  close() {
    const modal = document.getElementById('networking-wizard-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        if (!modal.classList.contains('active')) {
          modal.style.display = 'none';
        }
      }, 200);
    }
  },

  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    for (let i = 1; i <= 4; i++) {
      const card = document.getElementById(`net-step-card-${i}`);
      const pill = document.getElementById(`net-progress-pill-${i}`);
      if (card) card.style.display = (i === stepNumber) ? 'block' : 'none';
      if (pill) {
        if (i <= stepNumber) pill.classList.add('active');
        else pill.classList.remove('active');
      }
    }
  },

  fillFormWithProfile(p) {
    if (!p) return;
    const nameEl = document.getElementById('net-step-fullname');
    const profEl = document.getElementById('net-step-profession');
    const compEl = document.getElementById('net-step-company');
    const bioEl = document.getElementById('net-step-bio');
    const tagsEl = document.getElementById('net-step-interests');
    const lookEl = document.getElementById('net-step-looking-for');
    const offEl = document.getElementById('net-step-offering');
    const waEl = document.getElementById('net-step-whatsapp');
    const photoHidden = document.getElementById('net-step-photo-url');

    if (nameEl) nameEl.value = p.full_name || '';
    if (profEl) profEl.value = p.profession || '';
    if (compEl) compEl.value = p.company || '';
    if (bioEl) bioEl.value = p.bio || '';
    if (tagsEl) tagsEl.value = p.interests_tags || '';
    if (lookEl) lookEl.value = p.looking_for || '';
    if (offEl) offEl.value = p.offering || '';
    if (waEl) waEl.value = p.whatsapp || '';

    if (p.photo_url) {
      if (photoHidden) photoHidden.value = p.photo_url;
      this.showPhotoPreview(p.photo_url);
    }
  },

  prefillDefaults() {
    if (AppState.guest) {
      const nameInput = document.getElementById('net-step-fullname');
      if (nameInput && !nameInput.value) nameInput.value = AppState.guest.name || '';
    }
  },

  showPhotoPreview(url) {
    const previewContainer = document.getElementById('net-photo-preview-container');
    const previewImg = document.getElementById('net-photo-preview-img');
    const placeholderBox = document.getElementById('net-photo-placeholder-box');

    if (previewImg) previewImg.src = url;
    if (previewContainer) previewContainer.style.display = 'block';
    if (placeholderBox) placeholderBox.style.display = 'none';
  },

  bindEvents() {
    const modal = document.getElementById('networking-wizard-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });
    }

    document.getElementById('btn-close-net-wizard')?.addEventListener('click', () => this.close());

    // Validation stricte Étape 1 -> 2
    document.getElementById('btn-net-to-step2')?.addEventListener('click', () => {
      const photoUrl = document.getElementById('net-step-photo-url')?.value.trim();
      const name = document.getElementById('net-step-fullname')?.value.trim();
      const profession = document.getElementById('net-step-profession')?.value.trim();

      if (!photoUrl) {
        window.showToast("📸 Votre photo réelle est obligatoire pour générer la carte.", "error");
        return;
      }
      if (!name) {
        window.showToast("Votre Nom et Prénom sont obligatoires.", "error");
        document.getElementById('net-step-fullname')?.focus();
        return;
      }
      if (!profession) {
        window.showToast("Votre Métier / Fonction est obligatoire.", "error");
        document.getElementById('net-step-profession')?.focus();
        return;
      }
      this.goToStep(2);
    });

    document.getElementById('btn-net-back-step1')?.addEventListener('click', () => this.goToStep(1));

    // Validation stricte Étape 2 -> 3
    document.getElementById('btn-net-to-step3')?.addEventListener('click', () => {
      const company = document.getElementById('net-step-company')?.value.trim();
      const bio = document.getElementById('net-step-bio')?.value.trim();
      const interests = document.getElementById('net-step-interests')?.value.trim();

      if (!company) {
        window.showToast("Le nom de votre Entreprise / Structure est obligatoire.", "error");
        document.getElementById('net-step-company')?.focus();
        return;
      }
      if (!bio) {
        window.showToast("Votre mini biographie est obligatoire.", "error");
        document.getElementById('net-step-bio')?.focus();
        return;
      }
      if (!interests) {
        window.showToast("Vos centres d'intérêt / tags sont obligatoires.", "error");
        document.getElementById('net-step-interests')?.focus();
        return;
      }
      this.goToStep(3);
    });

    document.getElementById('btn-net-back-step2')?.addEventListener('click', () => this.goToStep(2));

    // Validation stricte Étape 3 -> 4
    document.getElementById('btn-net-to-step4')?.addEventListener('click', () => {
      const lookingFor = document.getElementById('net-step-looking-for')?.value.trim();
      const offering = document.getElementById('net-step-offering')?.value.trim();

      if (!lookingFor) {
        window.showToast("Veuillez préciser ce que vous recherchez.", "error");
        document.getElementById('net-step-looking-for')?.focus();
        return;
      }
      if (!offering) {
        window.showToast("Veuillez préciser ce que vous offrez / vos compétences.", "error");
        document.getElementById('net-step-offering')?.focus();
        return;
      }
      this.goToStep(4);
    });

    document.getElementById('btn-net-back-step3')?.addEventListener('click', () => this.goToStep(3));

    // Soumission finale avec validation complète
    document.getElementById('networking-wizard-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  async handleSubmit(e) {
    e.preventDefault();

    const photoUrl = document.getElementById('net-step-photo-url')?.value.trim();
    const fullName = document.getElementById('net-step-fullname')?.value.trim();
    const profession = document.getElementById('net-step-profession')?.value.trim();
    const company = document.getElementById('net-step-company')?.value.trim();
    const bio = document.getElementById('net-step-bio')?.value.trim();
    const interests = document.getElementById('net-step-interests')?.value.trim();
    const lookingFor = document.getElementById('net-step-looking-for')?.value.trim();
    const offering = document.getElementById('net-step-offering')?.value.trim();
    const whatsapp = document.getElementById('net-step-whatsapp')?.value.trim();
    const submitBtn = document.getElementById('btn-submit-net-wizard');

    // Vérification exhaustive de TOUTES les cases
    if (!photoUrl) {
      window.showToast("📸 La photo de profil est obligatoire.", "error");
      this.goToStep(1);
      return;
    }
    if (!fullName) {
      window.showToast("Le Nom et Prénom sont obligatoires.", "error");
      this.goToStep(1);
      return;
    }
    if (!profession) {
      window.showToast("Le Métier / Fonction est obligatoire.", "error");
      this.goToStep(1);
      return;
    }
    if (!company || !bio || !interests) {
      window.showToast("Tous les champs de l'étape 2 sont obligatoires.", "error");
      this.goToStep(2);
      return;
    }
    if (!lookingFor || !offering) {
      window.showToast("Tous les champs de l'étape 3 sont obligatoires.", "error");
      this.goToStep(3);
      return;
    }
    if (!whatsapp) {
      window.showToast("Le numéro WhatsApp est obligatoire pour être contacté.", "error");
      this.goToStep(4);
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Enregistrement en cours...</span>`;
    }

    try {
      const guestId = AppState.guest ? AppState.guest.id : `guest-${Date.now()}`;
      const payload = {
        guest_id: guestId,
        full_name: fullName,
        profession,
        photo_url: photoUrl,
        company,
        bio,
        interests_tags: interests,
        looking_for: lookingFor,
        offering,
        whatsapp,
        table_number: AppState.guest ? AppState.guest.table_number : 'Table 1'
      };

      await Api.saveNetworkingProfile(payload);
      localStorage.setItem('compagnon_my_net_profile', JSON.stringify(payload));

      this.close();
      this.updateTriggerButton();

      const successMsg = this.isEditing 
        ? "✨ Votre fiche de réseautage a été modifiée avec succès !" 
        : "🤝 Votre fiche de réseautage est désormais publiée pour tous les invités !";
      window.showToast(successMsg, "success");

      // Rafraîchir les profils
      if (NetworkingModule && typeof NetworkingModule.refresh === 'function') {
        NetworkingModule.refresh();
      }

      if (typeof window.updateHomeMetrics === 'function') {
        window.updateHomeMetrics();
      }

      // Basculer vers l'onglet réseautage
      if (typeof window.switchTab === 'function') {
        window.switchTab('networking');
      }
    } catch (err) {
      window.showToast(err.message, "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span id="btn-submit-net-text">${this.isEditing ? '💾 Enregistrer les modifications 🚀' : 'Publier ma fiche de réseautage 🚀'}</span>`;
      }
    }
  }
};

/**
 * Gestion de l'upload avec compression automatique d'image via Canvas
 */
window.handleNetPhotoUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Redimensionnement et compression pour une performance maximale sur mobile
      const canvas = document.createElement('canvas');
      const maxDim = 420;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);

      const hiddenInput = document.getElementById('net-step-photo-url');
      if (hiddenInput) hiddenInput.value = compressedBase64;

      NetworkingWizard.showPhotoPreview(compressedBase64);
      window.showToast("Photo importée avec succès ! ✨", "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};
