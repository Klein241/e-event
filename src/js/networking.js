/**
 * COMPAGNON DE CÉRÉMONIE - MODULE RÉSEAUTAGE CLAYMORPHISM UI
 * Cartes tactiles avec photos réelles Pop-out 3D, statut de présence en ligne / hors-ligne,
 * filtres dynamiques, et chat privé 1-à-1 synchronisé en direct (WebSocket & D1).
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
  currentStatusFilter: 'all', // 'all' | 'online' | 'offline'
  currentAttachment: null,
  activeConversation: [],

  init() {
    this.container = document.getElementById('networking-tab');
    if (!this.container) return;

    this.searchInput = document.getElementById('networking-search');
    this.profilesListEl = document.getElementById('networking-profiles-list');

    this.bindEvents();
    this.ensureModalsExist();
    this.refresh();

    // Écouter les événements privés temps réel
    window.addEventListener('realtime-private-message', (e) => {
      this.handleIncomingPrivateMessage(e.detail);
    });
    window.addEventListener('realtime-delete-private-message', (e) => {
      this.handleDeletedPrivateMessage(e.detail);
    });
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

  setStatusFilter(filter) {
    this.currentStatusFilter = filter;
    document.querySelectorAll('.net-status-pill').forEach(pill => pill.classList.remove('active'));
    const activePill = document.getElementById(`net-filter-${filter}`);
    if (activePill) activePill.classList.add('active');
    this.render();
  },

  async refresh(search = '') {
    let profiles = await Api.getNetworkingProfiles(search);
    
    // Si la liste est vide (première utilisation), enrichir avec nos profils
    if (!profiles || profiles.length === 0) {
      profiles = this.getDefaultProfiles();
    } else {
      profiles = profiles.map((p, idx) => ({
        ...p,
        photo_url: p.photo_url || DEFAULT_REAL_PHOTOS[idx % DEFAULT_REAL_PHOTOS.length],
        is_online: p.is_online !== undefined ? Number(p.is_online) : 0
      }));
    }

    // Profil local prioritaire
    try {
      const myStored = localStorage.getItem('compagnon_my_net_profile');
      if (myStored) {
        const myProfile = JSON.parse(myStored);
        const existingIdx = profiles.findIndex(p => p.guest_id === myProfile.guest_id || p.full_name === myProfile.full_name);
        if (existingIdx !== -1) {
          profiles[existingIdx] = { ...profiles[existingIdx], ...myProfile, is_online: 1 };
        } else {
          profiles.unshift({ ...myProfile, is_online: 1 });
        }
      }
    } catch (e) {}

    AppState.networkingProfiles = profiles;
    
    // Mise à jour des compteurs de présence dans les filtres
    const onlineCount = profiles.filter(p => p.is_online === 1).length;
    const offlineCount = profiles.length - onlineCount;
    
    const countAllEl = document.getElementById('net-count-all');
    const countOnlineEl = document.getElementById('net-count-online');
    const countOfflineEl = document.getElementById('net-count-offline');

    if (countAllEl) countAllEl.textContent = profiles.length;
    if (countOnlineEl) countOnlineEl.textContent = onlineCount;
    if (countOfflineEl) countOfflineEl.textContent = offlineCount;

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
        photo_url: DEFAULT_REAL_PHOTOS[0],
        is_online: 1
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
        photo_url: DEFAULT_REAL_PHOTOS[1],
        is_online: 1
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
        photo_url: DEFAULT_REAL_PHOTOS[2],
        is_online: 0,
        seconds_ago: 320
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
        photo_url: DEFAULT_REAL_PHOTOS[3],
        is_online: 0,
        seconds_ago: 1800
      }
    ];
  },

  render() {
    if (!this.profilesListEl) return;

    let profiles = AppState.networkingProfiles || [];

    // Application du filtre de présence
    if (this.currentStatusFilter === 'online') {
      profiles = profiles.filter(p => p.is_online === 1);
    } else if (this.currentStatusFilter === 'offline') {
      profiles = profiles.filter(p => p.is_online !== 1);
    }

    if (profiles.length === 0) {
      this.profilesListEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: #94a3b8; grid-column: 1 / -1;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🤝</div>
          <h3 style="font-size: 1.15rem; color: #fffaf0; margin-bottom: 0.35rem;">Aucun invité dans cette catégorie</h3>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Changez de filtre ou ajoutez votre propre fiche pour briser la glace.</p>
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
      const isOnline = p.is_online === 1;

      let statusMarkup = '';
      if (isOnline) {
        statusMarkup = `
          <span class="clay-presence-badge online" title="Cet invité est actuellement sur l'application">
            <span class="clay-presence-dot"></span> En ligne
          </span>
        `;
      } else {
        const secs = p.seconds_ago || 0;
        let lastSeen = 'Hors ligne';
        if (secs > 0 && secs < 3600) lastSeen = `Vu il y a ${Math.round(secs / 60)} min`;
        else if (secs >= 3600) lastSeen = `Vu il y a ${Math.round(secs / 3600)} h`;

        statusMarkup = `
          <span class="clay-presence-badge offline" title="${lastSeen}">
            ⚪ ${lastSeen}
          </span>
        `;
      }

      return `
        <div class="clay-profile-card" data-index="${index}" onclick="window.openProfileDetail(${index})">
          
          <div class="clay-float-decor">✨</div>

          <!-- 1. PHOTO RÉELLE QUI DÉPASSE DU CADRE (POP-OUT 3D) -->
          <div class="clay-photo-popout">
            <div class="clay-photo-frame">
              <img src="${photo}" alt="${name}" class="clay-photo-img" loading="lazy">
            </div>
          </div>

          <!-- 2. CORPS DE LA CARTE CLAYMORPHISM -->
          <div class="clay-card-body">
            
            <div class="clay-card-toprow">
              <h3 class="clay-card-name" title="${name}">${name}</h3>
              <span class="clay-table-pill">
                <span>📍</span>
                <span>${table}</span>
              </span>
            </div>

            <!-- Statut En Ligne / Déconnecté -->
            <div style="margin-bottom: 0.35rem;">
              ${statusMarkup}
            </div>

            <!-- Métier -->
            <p class="clay-card-role" title="${role}">${role}</p>

            <!-- Biographie -->
            <p class="clay-card-bio">${bio}</p>

            <!-- Bouton Tactile 3D "Saluer" (Ouvre le chat privé sans message factice) -->
            <button type="button" class="clay-btn-greet" onclick="event.stopPropagation(); window.openPrivateChat(${index})">
              <span>👋</span>
              <span>Saluer</span>
            </button>
          </div>

        </div>
      `;
    }).join('');
  },

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
            <div id="detail-status-badge"></div>
            <p class="clay-detail-role" id="detail-role"></p>
            <p class="clay-detail-company" id="detail-company"></p>
            <span class="clay-table-pill" id="detail-table" style="margin-top: 0.25rem;"></span>
          </div>

          <div class="clay-detail-section">
            <h4>À propos</h4>
            <p id="detail-bio"></p>
          </div>

          <div class="clay-detail-section" id="detail-tags-section">
            <h4>Centres d'intérêt & Expertises</h4>
            <div class="clay-detail-tags" id="detail-tags"></div>
          </div>

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

    // 2. Modale de chat privé direct complet (Emoji, Attachments, Suppression, Temps Réel)
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
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span id="private-recipient-table" style="font-size: 0.72rem; color: #DC6941;">Table 1</span>
                  <span id="private-recipient-status" class="clay-presence-badge online" style="font-size: 0.65rem; padding: 1px 6px;">🟢 En ligne</span>
                </div>
              </div>
            </div>
            <button type="button" class="clay-detail-close" onclick="window.closePrivateChat()" style="position: static;">✕</button>
          </div>

          <!-- Zone prévisualisation pièce jointe -->
          <div class="private-chat-attachment-preview" id="private-attachment-preview" style="display: none;">
            <span id="private-attachment-icon">📎</span>
            <span id="private-attachment-name" style="font-weight: 700; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
            <span id="private-attachment-badge" style="color: #059669; font-weight: 700;"></span>
            <button type="button" onclick="NetworkingModule.clearAttachment()" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; font-size: 1rem;">✕</button>
          </div>

          <div class="private-chat-messages" id="private-chat-messages-list">
            <!-- Messages privés injectés ici -->
          </div>

          <form class="private-chat-footer" id="private-chat-form" onsubmit="window.sendPrivateMessage(event)">
            <button type="button" class="btn-private-icon" onclick="NetworkingModule.quickEmojiPrompt()" title="Ajouter un émoji">😊</button>
            <button type="button" class="btn-private-icon" onclick="document.getElementById('private-file-input').click()" title="Joindre une photo ou document (ultra-compressé)">📎</button>
            <input type="file" id="private-file-input" style="display: none;" accept="image/*,application/pdf" onchange="NetworkingModule.handleAttachment(event)">
            <input type="text" class="private-chat-input" id="private-chat-input" placeholder="Écrivez votre message privé..." autocomplete="off">
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
  },

  // ============================================================
  // GESTION DES PIÈCES JOINTES EN CHAT PRIVÉ (ULTRA-COMPRESSION)
  // ============================================================
  async handleAttachment(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

    if (isImage) {
      try {
        const compressed = await this.compressImage(file, 1200, 0.80);
        const sizeKb = Math.round((compressed.length * 3 / 4) / 1024);
        this.currentAttachment = {
          dataUrl: compressed,
          type: 'photo',
          name: file.name,
          sizeKb
        };
        this.showAttachmentPreview(file.name, `⚡ ${sizeKb} Ko`, '🖼️');
      } catch (e) {
        window.showToast("Erreur compression : " + e.message, "error");
      }
    } else if (isPdf) {
      if (file.size > 1.2 * 1024 * 1024) {
        window.showToast("PDF trop volumineux (max 1.2 Mo)", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const sizeKb = Math.round(file.size / 1024);
        this.currentAttachment = {
          dataUrl: e.target.result,
          type: 'document',
          name: file.name,
          sizeKb
        };
        this.showAttachmentPreview(file.name, `📄 ${sizeKb} Ko`, '📄');
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  },

  compressImage(file, maxDimension = 1200, quality = 0.80) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let outputFormat = 'image/webp';
          let dataUrl = canvas.toDataURL(outputFormat, quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            outputFormat = 'image/jpeg';
            dataUrl = canvas.toDataURL(outputFormat, quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Image illisible"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Lecture fichier échouée"));
      reader.readAsDataURL(file);
    });
  },

  showAttachmentPreview(name, badge, icon) {
    const box = document.getElementById('private-attachment-preview');
    const nameEl = document.getElementById('private-attachment-name');
    const badgeEl = document.getElementById('private-attachment-badge');
    const iconEl = document.getElementById('private-attachment-icon');
    if (box && nameEl) {
      nameEl.textContent = name;
      if (badgeEl) badgeEl.textContent = badge;
      if (iconEl) iconEl.textContent = icon;
      box.style.display = 'flex';
    }
  },

  clearAttachment() {
    this.currentAttachment = null;
    const box = document.getElementById('private-attachment-preview');
    if (box) box.style.display = 'none';
  },

  quickEmojiPrompt() {
    const emojis = ['👋','😊','🤝','✨','🥂','👏','❤️','🎉','🔥','🙏'];
    const em = prompt(`Choisissez un émoji ou copiez celui de votre choix :\n${emojis.join(' ')}`, '👋');
    if (em) {
      const input = document.getElementById('private-chat-input');
      if (input) {
        input.value += em + ' ';
        input.focus();
      }
    }
  },

  handleIncomingPrivateMessage(msg) {
    const recipient = this.activeChatRecipient;
    if (!recipient) return;

    const myId = AppState.guest ? AppState.guest.id : 'me';
    const otherId = recipient.guest_id || recipient.id;

    // Concerne la conversation active ?
    const isThisConvo = (msg.sender_id === otherId && msg.recipient_id === myId) ||
                        (msg.sender_id === myId && msg.recipient_id === otherId);
    if (isThisConvo) {
      if (!this.activeConversation.some(m => m.id === msg.id)) {
        this.activeConversation.push(msg);
        this.renderPrivateConversation(this.activeConversation, recipient);
      }
    }
  },

  handleDeletedPrivateMessage(data) {
    if (data && data.id) {
      this.activeConversation = this.activeConversation.filter(m => m.id !== data.id);
      this.renderPrivateConversation(this.activeConversation, this.activeChatRecipient);
    }
  },

  renderPrivateConversation(messages, recipient) {
    const list = document.getElementById('private-chat-messages-list');
    if (!list) return;

    if (!messages || messages.length === 0) {
      const name = recipient ? escapeHtml(recipient.full_name) : 'cet invité';
      list.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
          <span style="font-size: 2.2rem;">🤝</span>
          <strong style="color: var(--text-main); font-size: 0.95rem;">Discussion privée confidentielle</strong>
          <p style="font-size: 0.8rem; margin: 0; max-width: 260px;">Échangez directement avec ${name}. Vos messages sont sécurisés et synchronisés en direct.</p>
        </div>
      `;
      return;
    }

    const myId = AppState.guest ? AppState.guest.id : 'me';

    list.innerHTML = messages.map(m => {
      const isMine = m.sender_id === myId || m.sender === 'me';
      const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (m.time || '');

      let mediaHtml = '';
      if (m.media_url) {
        if (m.media_url.startsWith('data:image/') || m.media_url.match(/\.(jpeg|jpg|png|webp)/i)) {
          mediaHtml = `
            <img src="${m.media_url}" class="private-attached-img" onclick="window.openChatLightbox('${m.media_url}', '${escapeHtml(m.sender_name || '')}')" alt="Photo">
          `;
        } else {
          mediaHtml = `
            <a href="${m.media_url}" download="document" target="_blank" class="private-attached-file">
              <span>📄 Télécharger document</span>
            </a>
          `;
        }
      }

      const deleteBtn = isMine ? `
        <button type="button" class="btn-private-delete" onclick="NetworkingModule.deleteMessage('${m.id}')" title="Supprimer ce message">🗑️</button>
      ` : '';

      return `
        <div class="private-bubble ${isMine ? 'sent' : 'received'}">
          ${m.message ? `<div>${escapeHtml(m.message)}</div>` : ''}
          ${mediaHtml}
          <div class="private-bubble-meta">
            ${deleteBtn}
            <div class="private-bubble-time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    list.scrollTop = list.scrollHeight;
  },

  async deleteMessage(msgId) {
    if (!confirm("Supprimer ce message privé ?")) return;
    const myId = AppState.guest ? AppState.guest.id : 'me';
    try {
      await Api.deletePrivateMessage(msgId, myId);
      this.activeConversation = this.activeConversation.filter(m => m.id !== msgId);
      this.renderPrivateConversation(this.activeConversation, this.activeChatRecipient);
      window.showToast("Message supprimé 🗑️", "success");
    } catch (e) {
      window.showToast("Erreur suppression: " + e.message, "error");
    }
  }
};

// ========================================================
// FONCTIONS GLOBALES EXPOSÉES
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
  const statusBadge = document.getElementById('detail-status-badge');

  if (photoEl) photoEl.src = p.photo_url || DEFAULT_REAL_PHOTOS[0];
  if (nameEl) nameEl.textContent = p.full_name || 'Invité';
  if (roleEl) roleEl.textContent = p.profession || 'Participant au Gala';
  if (compEl) {
    compEl.textContent = p.company ? `chez ${p.company}` : '';
    compEl.style.display = p.company ? 'block' : 'none';
  }
  if (tableEl) tableEl.innerHTML = `<span>📍</span> <span>${p.table_number || 'Table 1'}</span>`;
  if (bioEl) bioEl.textContent = p.bio || 'Aucune biographie renseignée pour le moment.';

  if (statusBadge) {
    if (p.is_online === 1) {
      statusBadge.innerHTML = `<span class="clay-presence-badge online" style="margin-top: 4px;"><span class="clay-presence-dot"></span> Connecté en direct</span>`;
    } else {
      statusBadge.innerHTML = `<span class="clay-presence-badge offline" style="margin-top: 4px;">⚪ Hors ligne</span>`;
    }
  }

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
// OUVERTURE DU CHAT PRIVÉ DIRECT SYNCHRONE
// ========================================================
window.openPrivateChat = async (index) => {
  const profiles = AppState.networkingProfiles || [];
  const recipient = profiles[index];
  if (!recipient) return;

  NetworkingModule.activeChatRecipient = recipient;

  const chatModal = document.getElementById('private-chat-modal');
  if (!chatModal) return;

  const imgEl = document.getElementById('private-recipient-img');
  const nameEl = document.getElementById('private-recipient-name');
  const tableEl = document.getElementById('private-recipient-table');
  const statusEl = document.getElementById('private-recipient-status');
  const inputEl = document.getElementById('private-chat-input');

  if (imgEl) imgEl.src = recipient.photo_url || DEFAULT_REAL_PHOTOS[0];
  if (nameEl) nameEl.textContent = recipient.full_name;
  if (tableEl) tableEl.textContent = `${recipient.table_number || 'Table 1'}`;

  if (statusEl) {
    if (recipient.is_online === 1) {
      statusEl.className = 'clay-presence-badge online';
      statusEl.innerHTML = '<span class="clay-presence-dot"></span> En ligne';
    } else {
      statusEl.className = 'clay-presence-badge offline';
      statusEl.textContent = '⚪ Hors ligne';
    }
  }

  // Récupération des vrais messages de conversation entre les deux invités depuis D1
  const myId = AppState.guest ? AppState.guest.id : 'me';
  const otherId = recipient.guest_id || recipient.id;

  NetworkingModule.activeConversation = await Api.getPrivateMessages(myId, otherId);
  NetworkingModule.renderPrivateConversation(NetworkingModule.activeConversation, recipient);

  if (inputEl) {
    if (NetworkingModule.activeConversation.length === 0) {
      inputEl.value = `👋 Bonsoir ${recipient.full_name} ! Ravi de faire votre connaissance au gala.`;
    } else {
      inputEl.value = '';
    }
  }

  NetworkingModule.clearAttachment();
  chatModal.classList.add('active');

  setTimeout(() => {
    if (inputEl) {
      inputEl.focus();
      if (NetworkingModule.activeConversation.length === 0) {
        inputEl.select();
      }
    }
  }, 200);
};

window.sendPrivateMessage = async (event) => {
  event.preventDefault();
  const recipient = NetworkingModule.activeChatRecipient;
  if (!recipient) return;

  const inputEl = document.getElementById('private-chat-input');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  const attachment = NetworkingModule.currentAttachment;
  if (!text && !attachment) return;

  if (!AppState.guest) {
    window.openOnboarding();
    return;
  }

  const myId = AppState.guest.id;
  const otherId = recipient.guest_id || recipient.id;

  const payload = {
    sender_id: myId,
    sender_name: AppState.guest.name,
    recipient_id: otherId,
    recipient_name: recipient.full_name,
    message: text,
    media_url: attachment ? attachment.dataUrl : null,
    message_type: attachment ? attachment.type : 'text'
  };

  inputEl.value = '';
  NetworkingModule.clearAttachment();

  try {
    const savedMsg = await Api.sendPrivateMessage(payload);
    if (savedMsg) {
      NetworkingModule.activeConversation.push(savedMsg);
      NetworkingModule.renderPrivateConversation(NetworkingModule.activeConversation, recipient);
      window.showToast(`Message envoyé à ${recipient.full_name} 💬`, "success");
    }
  } catch (err) {
    window.showToast("Erreur envoi message : " + err.message, "error");
  }
};

window.closePrivateChat = () => {
  const chatModal = document.getElementById('private-chat-modal');
  if (chatModal) chatModal.classList.remove('active');
  NetworkingModule.activeChatRecipient = null;
  NetworkingModule.clearAttachment();
};

window.NetworkingModule = NetworkingModule;

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
