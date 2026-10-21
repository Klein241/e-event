/**
 * COMPAGNON DE CÉRÉMONIE - MODULE RÉSEAUTAGE CLAYMORPHISM UI
 * Cartes tactiles avec photos réelles en relief Pop-out,
 * modale d'informations détaillées au clic de la carte,
 * et bouton 3D "Saluer" ouvrant un chat privé direct en 1-à-1.
 */

import { Api } from './api.js';
import { AppState } from './state.js';

// Galerie de photos réelles haute définition de personnes élégantes
const DEFAULT_REAL_PHOTOS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80", // Homme chic
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", // Femme élégante
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80", // Homme entrepreneur
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", // Femme créative
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", // Homme consultant
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80"  // Femme designer
];

export const NetworkingModule = {
  container: null,
  searchInput: null,
  profilesListEl: null,
  selectedProfile: null,
  activeChatRecipient: null,

  init() {
    this.container = document.getElementById('networking-tab');
    if (!this.container) return;

    this.searchInput = document.getElementById('networking-search');
    this.profilesListEl = document.getElementById('networking-profiles-list');

    this.bindEvents();
    this.ensureModalsExist();
    this.refresh();
  },

  bindEvents() {
    if (this.searchInput) {
      let timeout = null;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.refresh(e.target.value.trim());
        }, 300);
      });
    }

    const btnEditMyProfile = document.getElementById('btn-edit-my-networking');
    if (btnEditMyProfile) {
      btnEditMyProfile.addEventListener('click', () => {
        if (window.NetworkingWizard && typeof window.NetworkingWizard.open === 'function') {
          window.NetworkingWizard.open();
        }
      });
    }
  },

  async refresh(search = '') {
    let profiles = await Api.getNetworkingProfiles(search);
    
    // Si la liste est vide (première utilisation), enrichissons avec nos profils de prestige
    if (!profiles || profiles.length === 0) {
      profiles = this.getDefaultProfiles();
    } else {
      // S'assurer que chaque profil a une photo réelle
      profiles = profiles.map((p, idx) => ({
        ...p,
        photo_url: p.photo_url || DEFAULT_REAL_PHOTOS[idx % DEFAULT_REAL_PHOTOS.length]
      }));
    }

    // Si l'utilisateur actuel a créé/modifié son profil en local, s'assurer qu'il apparaît en tête
    try {
      const myStored = localStorage.getItem('compagnon_my_net_profile');
      if (myStored) {
        const myProfile = JSON.parse(myStored);
        const existingIdx = profiles.findIndex(p => p.guest_id === myProfile.guest_id || p.full_name === myProfile.full_name);
        if (existingIdx !== -1) {
          profiles[existingIdx] = { ...profiles[existingIdx], ...myProfile };
        } else {
          profiles.unshift(myProfile);
        }
      }
    } catch (e) {
      // Ignorer
    }

    AppState.networkingProfiles = profiles;
    
    // Mettre à jour l'intitulé du bouton (Créer / Modifier)
    if (window.NetworkingWizard && typeof window.NetworkingWizard.updateTriggerButton === 'function') {
      window.NetworkingWizard.updateTriggerButton();
    }

    this.render();
  },

  getDefaultProfiles() {
    return [
      {
        id: "net-1",
        guest_id: "guest-3",
        full_name: "Dr. Emmanuel Kouadio",
        profession: "Directeur Médical & Consultant",
        company: "HealthTech Africa",
        bio: "Passionné de santé publique, d'innovation médicale et de leadership à impact. Heureux d'échanger avec vous ce soir.",
        interests_tags: "Santé, Tech, Leadership, Investissement",
        looking_for: "Partenariats avec des cliniques, développeurs et investisseurs",
        offering: "Conseil médical stratégique et mentorat entrepreneurial",
        whatsapp: "+225 07 00 00 01",
        linkedin: "linkedin.com/in/ekouadio",
        table_number: "Table 3",
        photo_url: DEFAULT_REAL_PHOTOS[0]
      },
      {
        id: "net-2",
        guest_id: "guest-4",
        full_name: "Grâce N'Guessan",
        profession: "Architecte d'Intérieur & Scénographe",
        company: "Grace Studio",
        bio: "Je transforme les espaces de fête et les intérieurs d'exception pour les rendre inoubliables.",
        interests_tags: "Design, Événementiel, Art, Foi",
        looking_for: "Collaborations avec des agences d'événementiel et clients privés",
        offering: "Conception scénographique 3D et direction artistique",
        whatsapp: "+225 05 00 00 02",
        linkedin: "",
        table_number: "Table 4",
        photo_url: DEFAULT_REAL_PHOTOS[1]
      },
      {
        id: "net-3",
        guest_id: "guest-5",
        full_name: "Marc-Aurèle Touré",
        profession: "Directeur des Investissements",
        company: "Aura Capital",
        bio: "Accompagnateur de projets à forte valeur ajoutée en Afrique de l'Ouest. Partageons nos visions ce soir.",
        interests_tags: "Fintech, Agro-industrie, Croissance, Foi",
        looking_for: "Entrepreneurs visionnaires et porteurs de projets structurés",
        offering: "Structuration financière, levée de fonds et conseil",
        whatsapp: "+225 07 08 09 10",
        linkedin: "linkedin.com/in/matoure",
        table_number: "Table 2",
        photo_url: DEFAULT_REAL_PHOTOS[2]
      },
      {
        id: "net-4",
        guest_id: "guest-6",
        full_name: "Estelle Koffi",
        profession: "Experte Marketing & Communication Digitale",
        company: "Brand Elevation Hub",
        bio: "J'aide les marques et dirigeants à bâtir une réputation magnétique et inspirante.",
        interests_tags: "Branding, Stratégie, Médias, Réseau",
        looking_for: "Dirigeants souhaitant booster leur image et visibilité",
        offering: "Stratégie de communication 360° et personal branding",
        whatsapp: "+225 01 02 03 04",
        linkedin: "linkedin.com/in/estellekoffi",
        table_number: "Table 5",
        photo_url: DEFAULT_REAL_PHOTOS[3]
      }
    ];
  },

  render() {
    if (!this.profilesListEl) return;

    const profiles = AppState.networkingProfiles || [];
    if (profiles.length === 0) {
      this.profilesListEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: #94a3b8; grid-column: 1 / -1;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🤝</div>
          <h3 style="font-size: 1.15rem; color: #fffaf0; margin-bottom: 0.35rem;">Soyez le premier à vous présenter !</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Ajoutez votre fiche de réseautage pour briser la glace avec les autres invités.</p>
          <button class="clay-btn-greet" onclick="window.NetworkingWizard?.open()">Créer ma fiche invité ✨</button>
        </div>
      `;
      return;
    }

    this.profilesListEl.innerHTML = profiles.map((p, index) => {
      const photo = p.photo_url || DEFAULT_REAL_PHOTOS[index % DEFAULT_REAL_PHOTOS.length];
      const name = escapeHtml(p.full_name || 'Invité');
      const role = escapeHtml(p.profession || 'Participant');
      const bio = escapeHtml(p.bio || 'Ravi de participer à cette soirée et de faire votre connaissance.');
      const table = escapeHtml(p.table_number || 'Table 1');

      return `
        <div class="clay-profile-card" data-index="${index}" onclick="window.openProfileDetail(${index})">
          
          <!-- Éléments décoratifs en relief flottant -->
          <div class="clay-float-decor">✨</div>

          <!-- 1. PHOTO RÉELLE QUI DÉPASSE DU CADRE (POP-OUT 3D) -->
          <div class="clay-photo-popout">
            <div class="clay-photo-frame">
              <img src="${photo}" alt="${name}" class="clay-photo-img" loading="lazy">
            </div>
          </div>

          <!-- 2. CORPS DE LA CARTE CLAYMORPHISM -->
          <div class="clay-card-body">
            
            <!-- Ligne Nom & Table -->
            <div class="clay-card-toprow">
              <h3 class="clay-card-name" title="${name}">${name}</h3>
              <span class="clay-table-pill">
                <span>📍</span>
                <span>${table}</span>
              </span>
            </div>

            <!-- Métier -->
            <p class="clay-card-role" title="${role}">${role}</p>

            <!-- Début de la Biographie -->
            <p class="clay-card-bio">${bio}</p>

            <!-- Bouton Tactile 3D "Saluer" (Ouvre le chat privé en direct) -->
            <button type="button" class="clay-btn-greet" onclick="event.stopPropagation(); window.openPrivateChat(${index})">
              <span>👋</span>
              <span>Saluer</span>
            </button>
          </div>

        </div>
      `;
    }).join('');
  },

  /**
   * Assure que les modales de détail et de chat privé existent dans le DOM
   */
  ensureModalsExist() {
    // 1. Modale de détail du profil
    if (!document.getElementById('profile-detail-modal')) {
      const modal = document.createElement('div');
      modal.id = 'profile-detail-modal';
      modal.innerHTML = `
        <div class="clay-detail-card">
          <button type="button" class="clay-detail-close" onclick="window.closeProfileDetail()">✕</button>
          
          <div class="clay-detail-header">
            <div class="clay-detail-photo-frame">
              <img id="detail-photo" src="" alt="Photo">
            </div>
            <h3 class="clay-detail-name" id="detail-name"></h3>
            <p class="clay-detail-role" id="detail-role"></p>
            <p class="clay-detail-company" id="detail-company"></p>
            <span class="clay-table-pill" id="detail-table" style="margin-top: 0.25rem;"></span>
          </div>

          <!-- Biographie Complète -->
          <div class="clay-detail-section">
            <h4>À propos</h4>
            <p id="detail-bio"></p>
          </div>

          <!-- Tags & Compétences -->
          <div class="clay-detail-section" id="detail-tags-section">
            <h4>Centres d'intérêt & Expertises</h4>
            <div class="clay-detail-tags" id="detail-tags"></div>
          </div>

          <!-- Synergies (Recherche / Offre) -->
          <div class="clay-detail-section" id="detail-synergy-section">
            <h4>Opportunités & Échanges</h4>
            <div id="detail-looking-box" style="margin-bottom: 0.4rem;">
              <strong style="color: #fb923c; font-size: 0.78rem;">Recherche : </strong>
              <span id="detail-looking" style="font-size: 0.82rem; color: #e2e8f0;"></span>
            </div>
            <div id="detail-offering-box">
              <strong style="color: #4ade80; font-size: 0.78rem;">Offre : </strong>
              <span id="detail-offering" style="font-size: 0.82rem; color: #e2e8f0;"></span>
            </div>
          </div>

          <!-- Actions -->
          <div class="clay-detail-actions">
            <button type="button" class="clay-btn-greet" style="width: 100%; padding: 12px; font-size: 0.95rem;" id="btn-detail-chat">
              <span>👋 Démarrer une conversation privée</span>
            </button>
            <div id="detail-wa-container"></div>
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeProfileDetail();
      });
      document.body.appendChild(modal);
    }

    // 2. Modale de chat privé direct
    if (!document.getElementById('private-chat-modal')) {
      const chatModal = document.createElement('div');
      chatModal.id = 'private-chat-modal';
      chatModal.innerHTML = `
        <div class="private-chat-card">
          <div class="private-chat-header">
            <div class="private-chat-recipient">
              <div class="private-chat-recipient-photo">
                <img id="private-recipient-img" src="" alt="">
              </div>
              <div class="private-chat-recipient-info">
                <h3 id="private-recipient-name">Destinataire</h3>
                <p id="private-recipient-table">Table</p>
              </div>
            </div>
            <button type="button" class="clay-detail-close" onclick="window.closePrivateChat()" style="position: static;">✕</button>
          </div>

          <div class="private-chat-messages" id="private-chat-messages-list">
            <!-- Messages privés injectés ici -->
          </div>

          <form class="private-chat-footer" id="private-chat-form" onsubmit="window.sendPrivateMessage(event)">
            <input type="text" class="private-chat-input" id="private-chat-input" placeholder="Écrivez votre message privé..." required autocomplete="off">
            <button type="submit" class="clay-btn-greet" style="margin-top: 0; padding: 8px 16px;">
              <span>Envoyer 🚀</span>
            </button>
          </form>
        </div>
      `;
      chatModal.addEventListener('click', (e) => {
        if (e.target === chatModal) window.closePrivateChat();
      });
      document.body.appendChild(chatModal);
    }
  }
};

// ========================================================
// FONCTIONS GLOBALES POUR LA MODALE DE DÉTAIL DU PROFIL
// ========================================================
window.openProfileDetail = (index) => {
  const profiles = AppState.networkingProfiles || [];
  const p = profiles[index];
  if (!p) return;

  NetworkingModule.selectedProfile = p;

  const modal = document.getElementById('profile-detail-modal');
  if (!modal) return;

  const photoEl = document.getElementById('detail-photo');
  const nameEl = document.getElementById('detail-name');
  const roleEl = document.getElementById('detail-role');
  const compEl = document.getElementById('detail-company');
  const tableEl = document.getElementById('detail-table');
  const bioEl = document.getElementById('detail-bio');
  const tagsEl = document.getElementById('detail-tags');
  const tagsSection = document.getElementById('detail-tags-section');
  const lookingEl = document.getElementById('detail-looking');
  const offeringEl = document.getElementById('detail-offering');
  const lookingBox = document.getElementById('detail-looking-box');
  const offeringBox = document.getElementById('detail-offering-box');
  const synergySection = document.getElementById('detail-synergy-section');
  const waContainer = document.getElementById('detail-wa-container');
  const btnChat = document.getElementById('btn-detail-chat');

  if (photoEl) photoEl.src = p.photo_url || DEFAULT_REAL_PHOTOS[0];
  if (nameEl) nameEl.textContent = p.full_name || 'Invité';
  if (roleEl) roleEl.textContent = p.profession || 'Participant au Gala';
  if (compEl) {
    compEl.textContent = p.company ? `chez ${p.company}` : '';
    compEl.style.display = p.company ? 'block' : 'none';
  }
  if (tableEl) tableEl.innerHTML = `<span>📍</span> <span>${p.table_number || 'Table 1'}</span>`;
  if (bioEl) bioEl.textContent = p.bio || 'Aucune biographie renseignée pour le moment.';

  // Tags
  const tags = (p.interests_tags || '').split(',').map(t => t.trim()).filter(Boolean);
  if (tagsEl) {
    if (tags.length > 0) {
      tagsEl.innerHTML = tags.map(t => `<span class="clay-tag-pill">#${escapeHtml(t)}</span>`).join('');
      if (tagsSection) tagsSection.style.display = 'block';
    } else {
      if (tagsSection) tagsSection.style.display = 'none';
    }
  }

  // Synergies
  let hasSynergy = false;
  if (lookingEl && lookingBox) {
    if (p.looking_for) {
      lookingEl.textContent = p.looking_for;
      lookingBox.style.display = 'block';
      hasSynergy = true;
    } else {
      lookingBox.style.display = 'none';
    }
  }
  if (offeringEl && offeringBox) {
    if (p.offering) {
      offeringEl.textContent = p.offering;
      offeringBox.style.display = 'block';
      hasSynergy = true;
    } else {
      offeringBox.style.display = 'none';
    }
  }
  if (synergySection) synergySection.style.display = hasSynergy ? 'block' : 'none';

  // WhatsApp
  if (waContainer) {
    const cleanWa = (p.whatsapp || '').replace(/[^0-9]/g, '');
    if (cleanWa) {
      waContainer.innerHTML = `
        <a href="https://wa.me/${cleanWa}" target="_blank" rel="noopener" class="clay-btn-greet" style="width: 100%; padding: 11px; background: linear-gradient(180deg, #10b981 0%, #059669 100%); box-shadow: 0 6px 14px rgba(16, 185, 129, 0.45); text-decoration: none;">
          <span>💬 Contacter sur WhatsApp</span>
        </a>
      `;
    } else {
      waContainer.innerHTML = '';
    }
  }

  // Bouton Ouvrir Chat Privé
  if (btnChat) {
    btnChat.onclick = () => {
      window.closeProfileDetail();
      window.openPrivateChat(index);
    };
  }

  modal.classList.add('active');
};

window.closeProfileDetail = () => {
  const modal = document.getElementById('profile-detail-modal');
  if (modal) modal.classList.remove('active');
};

// ========================================================
// FONCTIONS GLOBALES POUR LE CHAT PRIVÉ DIRECT
// ========================================================
window.openPrivateChat = (index) => {
  const profiles = AppState.networkingProfiles || [];
  const recipient = profiles[index];
  if (!recipient) return;

  NetworkingModule.activeChatRecipient = recipient;

  const chatModal = document.getElementById('private-chat-modal');
  if (!chatModal) return;

  const imgEl = document.getElementById('private-recipient-img');
  const nameEl = document.getElementById('private-recipient-name');
  const tableEl = document.getElementById('private-recipient-table');
  const messagesList = document.getElementById('private-chat-messages-list');
  const inputEl = document.getElementById('private-chat-input');

  if (imgEl) imgEl.src = recipient.photo_url || DEFAULT_REAL_PHOTOS[0];
  if (nameEl) nameEl.textContent = recipient.full_name;
  if (tableEl) tableEl.textContent = `${recipient.table_number || 'Table 1'} • ${recipient.profession || 'Participant'}`;

  // Récupérer l'historique privé dans localStorage
  const chatKey = `private_chat_${recipient.guest_id || recipient.id || recipient.full_name}`;
  const history = JSON.parse(localStorage.getItem(chatKey) || '[]');

  renderPrivateMessages(history, recipient);

  if (inputEl) {
    if (history.length === 0) {
      inputEl.value = `👋 Bonsoir ${recipient.full_name} ! Ravi de faire votre connaissance au gala.`;
    } else {
      inputEl.value = '';
    }
  }

  chatModal.classList.add('active');
  setTimeout(() => {
    if (inputEl) {
      inputEl.focus();
      if (history.length === 0) {
        inputEl.select();
      }
    }
  }, 200);
};

function renderPrivateMessages(messages, recipient) {
  const list = document.getElementById('private-chat-messages-list');
  if (!list) return;

  if (!messages || messages.length === 0) {
    const name = recipient ? escapeHtml(recipient.full_name) : 'cet invité';
    list.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <span style="font-size: 2.2rem;">🤝</span>
        <strong style="color: var(--text-main); font-size: 0.95rem;">Commencez la discussion privée</strong>
        <p style="font-size: 0.8rem; margin: 0; max-width: 260px;">Envoyez un message amical à ${name}. Vos échanges sont directs et confidentiels.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = messages.map(m => `
    <div class="private-bubble ${m.sender === 'me' ? 'sent' : 'received'}">
      <div>${escapeHtml(m.text)}</div>
      <div class="private-bubble-time">${m.time || ''}</div>
    </div>
  `).join('');

  list.scrollTop = list.scrollHeight;
}

window.sendPrivateMessage = (event) => {
  event.preventDefault();
  const recipient = NetworkingModule.activeChatRecipient;
  if (!recipient) return;

  const inputEl = document.getElementById('private-chat-input');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  const chatKey = `private_chat_${recipient.guest_id || recipient.id || recipient.full_name}`;
  let history = JSON.parse(localStorage.getItem(chatKey) || '[]');

  history.push({
    sender: 'me',
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  localStorage.setItem(chatKey, JSON.stringify(history));
  renderPrivateMessages(history);

  inputEl.value = '';
  window.showToast(`Message envoyé à ${recipient.full_name} ! 💬`, "success");
};

window.closePrivateChat = () => {
  const chatModal = document.getElementById('private-chat-modal');
  if (chatModal) chatModal.classList.remove('active');
};

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
