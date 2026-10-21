import { Api } from './api.js';
import { AppState } from './state.js';

// ============================================================
// DICTIONNAIRE COMPLET D'ÉMOJIS PAR CATÉGORIES
// ============================================================
const EMOJI_CATEGORIES = {
  faces: [
    '😀','😃','😄','😁','😆','🥹','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌',
    '😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩',
    '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😮‍💨',
    '😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫣','🤭',
    '🥱','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','😴','🤤','😪','😵',
    '🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠'
  ],
  hands: [
    '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','🫷','🫸','👌','🤌','🤏','✌️','🫰','🤞',
    '🤟','🤘','🤙','👈','👉','👆','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌',
    '🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾'
  ],
  hearts: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘',
    '💝','💟','☮️','✝️','☪️','🪯','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉'
  ],
  party: [
    '🥂','🍾','🍷','🍸','🍹','🍺','🍻','🍽️','🍴','🥄','🍰','🎂','🧁','🥧','🍫','🍬','🍭',
    '🍮','🍯','☕','🫖','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍕','🥪','🥗','🍿','🍩'
  ],
  faith: [
    '✨','🌟','💫','⭐','🕊️','👑','💍','💎','💐','🌸','🌹','🌺','🌷','🕯️','📖','🎵','🎶',
    '🎸','🎹','🎷','🎺','🎻','🪘','🥁','🎤','🎧','📣','📢','🔔','🎼','🪄','🎊','🎉','🎈','🎁'
  ]
};

export const ChatModule = {
  container: null,
  listEl: null,
  inputEl: null,
  sendBtn: null,
  pinnedBannerEl: null,
  ws: null,
  wsReconnectTimer: null,
  heartbeatTimer: null,
  presenceData: { online: [], offline: [], online_count: 0, total_count: 0 },
  currentPresenceFilter: 'online',
  currentAttachment: null, // { file, dataUrl, type, name, sizeKb }
  activeEmojiCategory: 'faces',

  init() {
    this.container = document.getElementById('chat-tab');
    if (!this.container) return;

    this.listEl = document.getElementById('chat-messages-list');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('btn-send-chat');
    this.pinnedBannerEl = document.getElementById('pinned-banner');

    this.bindEvents();
    this.initWebSocket();
    this.refresh();
    this.startPresenceAndHeartbeat();
    this.renderEmojiGrid();
  },

  bindEvents() {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Quick emoji bar
    const emojiBtns = this.container.querySelectorAll('.quick-emoji-btn:not(.quick-emoji-more)');
    emojiBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        this.insertEmoji(emoji);
      });
    });

    // Onglets de catégories d'emojis
    const catBtns = document.querySelectorAll('.emoji-cat-btn');
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeEmojiCategory = btn.dataset.cat || 'faces';
        this.renderEmojiGrid();
      });
    });

    // Recherche d'emojis
    const searchEmojiInput = document.getElementById('emoji-search-input');
    if (searchEmojiInput) {
      searchEmojiInput.addEventListener('input', (e) => {
        this.filterEmojiGrid(e.target.value.trim());
      });
    }

    // Filtre recherche présence
    const presenceSearch = document.getElementById('presence-search-input');
    if (presenceSearch) {
      presenceSearch.addEventListener('input', () => {
        this.renderPresenceList();
      });
    }
  },

  // ============================================================
  // WEBSOCKET REALTIME (ALTERNATIVE SUPABASE SUR CLOUDFLARE)
  // ============================================================
  initWebSocket() {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/api/chat/ws`;

      if (this.ws) {
        try { this.ws.close(); } catch(e){}
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Realtime WebSocket] Connecté avec succès au canal de direct ! ⚡');
        // Ping liveness régulier
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleRealtimeEvent(payload);
        } catch (err) {
          console.warn('[Realtime WebSocket] Message non-JSON:', event.data);
        }
      };

      this.ws.onclose = () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        // Reconnexion automatique avec recul
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = setTimeout(() => {
          this.initWebSocket();
        }, 3500);
      };

      this.ws.onerror = (err) => {
        console.warn('[Realtime WebSocket] Erreur connexion (bascule polling fluide active) :', err);
      };
    } catch (e) {
      console.warn('[Realtime WebSocket] Non supporté, bascule polling active :', e);
    }
  },

  handleRealtimeEvent(event) {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'new_message': {
        const msg = event.payload || event.data;
        if (msg && msg.id) {
          // Éviter les doublons
          const exists = AppState.chatMessages.some(m => m.id === msg.id);
          if (!exists) {
            AppState.chatMessages.push(msg);
            this.render();
          }
        }
        break;
      }
      case 'delete_message': {
        const delId = (event.payload && event.payload.id) || (event.data && event.data.id);
        if (delId) {
          AppState.chatMessages = AppState.chatMessages.filter(m => m.id !== delId);
          this.render();
        }
        break;
      }
      case 'reaction': {
        const data = event.payload || event.data;
        if (data && data.id) {
          const target = AppState.chatMessages.find(m => m.id === data.id);
          if (target) {
            target.reactions_json = typeof data.reactions === 'string' ? data.reactions : JSON.stringify(data.reactions);
            this.render();
          }
        }
        break;
      }
      case 'pin_toggle': {
        const data = event.payload || event.data;
        if (data && data.id) {
          AppState.chatMessages.forEach(m => {
            if (m.id === data.id) m.is_pinned = data.is_pinned;
            else if (data.is_pinned === 1) m.is_pinned = 0;
          });
          this.render();
        }
        break;
      }
      case 'new_private_message': {
        const msg = event.payload || event.data;
        if (msg) {
          window.dispatchEvent(new CustomEvent('realtime-private-message', { detail: msg }));
          const myId = AppState.guest ? AppState.guest.id : null;
          if (myId && msg.recipient_id === myId) {
            const privateModal = document.getElementById('private-chat-modal');
            const isOpen = privateModal && privateModal.classList.contains('active');
            if (!isOpen) {
              window.showToast(`💬 Nouveau message privé de ${msg.sender_name || 'un invité'} !`, "info");
            }
          }
        }
        break;
      }
      case 'delete_private_message': {
        const data = event.payload || event.data;
        if (data) {
          window.dispatchEvent(new CustomEvent('realtime-delete-private-message', { detail: data }));
        }
        break;
      }
    }
  },

  // ============================================================
  // GESTION DU STATUT DE PRÉSENCE (EN LIGNE / HORS-LIGNE)
  // ============================================================
  startPresenceAndHeartbeat() {
    this.sendHeartbeat();
    this.refreshPresence();

    // Heartbeat toutes les 25 secondes
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
      this.refreshPresence();
    }, 25000);
  },

  async sendHeartbeat() {
    const guestId = AppState.guest ? AppState.guest.id : null;
    if (guestId) {
      await Api.sendGuestHeartbeat(guestId);
    }
  },

  async refreshPresence() {
    try {
      const data = await Api.getGuestsPresence();
      if (data) {
        this.presenceData = data;
        const onlineCountEl = document.getElementById('chat-online-count');
        const totalGuestsEl = document.getElementById('chat-total-guests-count');
        const badgeOnline = document.getElementById('count-badge-online');
        const badgeOffline = document.getElementById('count-badge-offline');
        const badgeAll = document.getElementById('count-badge-all');

        const onlineCount = data.online_count || (data.online ? data.online.length : 0);
        const offlineCount = data.offline_count || (data.offline ? data.offline.length : 0);
        const totalCount = data.total_count || (onlineCount + offlineCount);

        if (onlineCountEl) onlineCountEl.textContent = `${onlineCount} en ligne`;
        if (totalGuestsEl) totalGuestsEl.textContent = `${totalCount} invité${totalCount > 1 ? 's' : ''}`;
        if (badgeOnline) badgeOnline.textContent = onlineCount;
        if (badgeOffline) badgeOffline.textContent = offlineCount;
        if (badgeAll) badgeAll.textContent = totalCount;

        // Si la modale de présence est ouverte, mettre à jour la liste
        const modal = document.getElementById('modal-guests-presence');
        if (modal && modal.style.display === 'flex') {
          this.renderPresenceList();
        }
      }
    } catch (e) {
      console.warn('Erreur présence:', e);
    }
  },

  setPresenceFilter(filter) {
    this.currentPresenceFilter = filter;
    document.querySelectorAll('.presence-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`presence-tab-${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
    this.renderPresenceList();
  },

  renderPresenceList() {
    const listEl = document.getElementById('presence-list-scroll');
    if (!listEl) return;

    const searchInput = document.getElementById('presence-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    let list = [];
    if (this.currentPresenceFilter === 'online') {
      list = [...(this.presenceData.online || [])];
    } else if (this.currentPresenceFilter === 'offline') {
      list = [...(this.presenceData.offline || [])];
    } else {
      list = [...(this.presenceData.online || []), ...(this.presenceData.offline || [])];
    }

    if (query) {
      list = list.filter(g => 
        (g.name && g.name.toLowerCase().includes(query)) ||
        (g.table_number && String(g.table_number).toLowerCase().includes(query)) ||
        (g.profession && g.profession.toLowerCase().includes(query)) ||
        (g.company && g.company.toLowerCase().includes(query))
      );
    }

    if (list.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🔍</span>
          <p style="font-size: 0.85rem; margin: 0;">Aucun invité ne correspond à cette recherche.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = list.map(g => {
      const isOnline = g.is_online === 1;
      const cleanTable = String(g.table_number || '1').replace(/^table\s*/i, '');
      const detailStr = g.profession ? `${g.profession}` : (g.company ? `chez ${g.company}` : `Participant`);
      
      let relativeStatus = 'En ligne';
      if (!isOnline) {
        const secs = g.seconds_ago || 0;
        if (secs < 60) relativeStatus = 'Vu il y a quelques secondes';
        else if (secs < 3600) relativeStatus = `Vu il y a ${Math.round(secs / 60)} min`;
        else relativeStatus = `Vu il y a ${Math.round(secs / 3600)} h`;
      }

      return `
        <div class="presence-guest-row">
          <div class="presence-guest-left">
            <div class="presence-avatar-box">
              ${g.photo_url ? `<img src="${g.photo_url}" alt="${escapeHtml(g.name)}">` : `<span>${g.avatar_emoji || '🎉'}</span>`}
              <span class="presence-dot-badge ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Connecté' : 'Déconnecté'}"></span>
            </div>
            <div class="presence-guest-meta">
              <h4 class="presence-guest-name">${escapeHtml(g.name)}</h4>
              <div class="presence-guest-detail">
                <span style="font-weight: 700; color: var(--terracotta-accent);">Table ${cleanTable}</span>
                <span>•</span>
                <span class="presence-status-pill ${isOnline ? 'online' : 'offline'}">${relativeStatus}</span>
              </div>
            </div>
          </div>
          <button type="button" class="presence-guest-action" onclick="ChatModule.mentionOrChatGuest('${escapeHtml(g.name)}')">
            <span>💬 Parler</span>
          </button>
        </div>
      `;
    }).join('');
  },

  mentionOrChatGuest(guestName) {
    window.closeGuestsPresenceModal();
    if (this.inputEl) {
      this.inputEl.value = `@${guestName} ` + this.inputEl.value;
      this.inputEl.focus();
    }
  },

  // ============================================================
  // PALETTE COMPLÈTE D'ÉMOJIS
  // ============================================================
  toggleEmojiPicker(forceState) {
    const picker = document.getElementById('chat-emoji-picker');
    if (!picker) return;

    const isVisible = picker.style.display !== 'none';
    const nextState = forceState !== undefined ? forceState : !isVisible;

    picker.style.display = nextState ? 'flex' : 'none';
    if (nextState) {
      this.renderEmojiGrid();
      const search = document.getElementById('emoji-search-input');
      if (search) {
        search.value = '';
        setTimeout(() => search.focus(), 100);
      }
    }
  },

  renderEmojiGrid(emojis = null) {
    const grid = document.getElementById('emoji-grid-content');
    if (!grid) return;

    const list = emojis || EMOJI_CATEGORIES[this.activeEmojiCategory] || EMOJI_CATEGORIES.faces;
    grid.innerHTML = list.map(em => `
      <button type="button" class="emoji-cell" onclick="ChatModule.insertEmoji('${em}')" title="${em}">${em}</button>
    `).join('');
  },

  filterEmojiGrid(query) {
    if (!query) {
      this.renderEmojiGrid();
      return;
    }
    const all = Object.values(EMOJI_CATEGORIES).flat();
    // Unique list
    const unique = [...new Set(all)];
    this.renderEmojiGrid(unique);
  },

  insertEmoji(emoji) {
    if (!this.inputEl) return;
    const start = this.inputEl.selectionStart || this.inputEl.value.length;
    const end = this.inputEl.selectionEnd || this.inputEl.value.length;
    const text = this.inputEl.value;
    this.inputEl.value = text.substring(0, start) + emoji + text.substring(end);
    this.inputEl.focus();
    this.inputEl.selectionStart = this.inputEl.selectionEnd = start + emoji.length;
  },

  // ============================================================
  // GESTION DES PIÈCES JOINTES & ULTRA-COMPRESSION INTELLIGENTE
  // ============================================================
  async handleFileInput(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileType = file.type || '';
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

    // Garde-fou taille brute avant compression (max 15 Mo pour photo avant compression)
    if (file.size > 15 * 1024 * 1024) {
      window.showToast("Le fichier sélectionné est trop volumineux (max 15 Mo)", "error");
      event.target.value = '';
      return;
    }

    const previewContainer = document.getElementById('chat-attachment-preview');
    const previewImg = document.getElementById('attachment-preview-img');
    const previewThumbBox = document.getElementById('attachment-preview-thumb-box');
    const previewName = document.getElementById('attachment-preview-name');
    const previewBadge = document.getElementById('attachment-preview-badge');

    if (isImage) {
      try {
        // Ultra-compression intelligente via HTML5 Canvas (max 1200px, 0.78 webp ou 0.82 jpeg)
        const compressedDataUrl = await this.compressImage(file, 1200, 0.80);
        const sizeKb = Math.round((compressedDataUrl.length * 3 / 4) / 1024);

        this.currentAttachment = {
          file,
          dataUrl: compressedDataUrl,
          type: 'photo',
          name: fileName,
          sizeKb
        };

        if (previewImg) previewImg.src = compressedDataUrl;
        if (previewThumbBox) previewThumbBox.style.display = 'flex';
        if (previewName) previewName.textContent = fileName;
        if (previewBadge) previewBadge.textContent = `⚡ Photo optimisée (${sizeKb} Ko)`;
        if (previewContainer) previewContainer.style.display = 'flex';

        window.showToast(`Photo compressée avec succès : ${sizeKb} Ko`, "success");
      } catch (err) {
        window.showToast("Erreur lors de la compression de la photo : " + err.message, "error");
      }
    } else if (isPdf) {
      if (file.size > 1.2 * 1024 * 1024) {
        window.showToast("Le PDF dépasse la taille autorisée pour le direct (max 1.2 Mo)", "error");
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const sizeKb = Math.round(file.size / 1024);
        this.currentAttachment = {
          file,
          dataUrl: e.target.result,
          type: 'document',
          name: fileName,
          sizeKb
        };

        if (previewThumbBox) {
          previewThumbBox.innerHTML = '<span style="font-size: 1.4rem;">📄</span>';
        }
        if (previewName) previewName.textContent = fileName;
        if (previewBadge) previewBadge.textContent = `📄 Document PDF (${sizeKb} Ko)`;
        if (previewContainer) previewContainer.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    } else {
      window.showToast("Format non supporté (Photos JPG, PNG, WebP ou PDF uniquement)", "warning");
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

          // Support WebP si disponible, sinon fallback JPEG
          let outputFormat = 'image/webp';
          let dataUrl = canvas.toDataURL(outputFormat, quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            outputFormat = 'image/jpeg';
            dataUrl = canvas.toDataURL(outputFormat, quality);
          }
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Impossible de charger l'image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(file);
    });
  },

  clearAttachment() {
    this.currentAttachment = null;
    const previewContainer = document.getElementById('chat-attachment-preview');
    if (previewContainer) previewContainer.style.display = 'none';
  },

  // ============================================================
  // SYNCHRONISATION DES MESSAGES & RENDU DU CHAT
  // ============================================================
  async refresh() {
    try {
      const messages = await Api.getChatMessages();
      AppState.chatMessages = messages || [];
      this.render();
    } catch (e) {
      console.warn('Erreur rafraîchissement chat:', e);
    }
  },

  render() {
    if (!this.listEl) return;

    // Messages épinglés par le MC
    const pinned = AppState.chatMessages.find(m => m.is_pinned === 1);
    if (pinned && this.pinnedBannerEl) {
      this.pinnedBannerEl.style.display = 'flex';
      const textEl = this.pinnedBannerEl.querySelector('.pinned-text');
      if (textEl) textEl.textContent = `${pinned.guest_name} (${pinned.table_number}): ${pinned.message}`;
    } else if (this.pinnedBannerEl) {
      this.pinnedBannerEl.style.display = 'none';
    }

    // Messages normaux
    const currentGuestId = AppState.guest ? AppState.guest.id : null;
    this.listEl.innerHTML = AppState.chatMessages.map(msg => {
      const isMine = currentGuestId && (msg.guest_id === currentGuestId);
      const isAnnouncement = msg.message_type === 'announcement';
      const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      
      let reactions = { heart: 0, applause: 0, fire: 0, pray: 0 };
      if (msg.reactions_json) {
        try { reactions = typeof msg.reactions_json === 'string' ? JSON.parse(msg.reactions_json) : msg.reactions_json; } catch(e){}
      }

      // Rendu de la pièce jointe éventuelle
      let mediaMarkup = '';
      if (msg.media_url) {
        if (msg.media_url.startsWith('data:image/') || msg.media_url.match(/\.(jpeg|jpg|png|webp|gif)/i)) {
          mediaMarkup = `
            <div class="chat-attached-image-wrapper" onclick="window.openChatLightbox('${msg.media_url}', '${escapeHtml(msg.guest_name)}')">
              <img src="${msg.media_url}" alt="Photo de ${escapeHtml(msg.guest_name)}" class="chat-attached-image" loading="lazy">
            </div>
          `;
        } else {
          mediaMarkup = `
            <a href="${msg.media_url}" download="piece-jointe-gala" target="_blank" rel="noopener" class="chat-attachment-pill">
              <span>📄</span>
              <span>Télécharger le document joint</span>
            </a>
          `;
        }
      }

      // Bouton de suppression pour ses propres messages
      const deleteBtn = isMine ? `
        <button type="button" class="btn-msg-delete" onclick="window.deleteChatMessage('${msg.id}')" title="Supprimer ce message">
          🗑️
        </button>
      ` : '';

      return `
        <div class="chat-message ${isMine ? 'is-mine' : ''} ${isAnnouncement ? 'is-announcement' : ''}" data-id="${msg.id}">
          <div class="chat-avatar">${isAnnouncement ? '📢' : (msg.table_number ? '🥂' : '🎉')}</div>
          <div class="chat-body">
            <div class="chat-meta">
              <span class="chat-author">${escapeHtml(msg.guest_name)}</span>
              <span class="chat-table-tag">Table ${escapeHtml(String(msg.table_number || '1').replace(/^table\s*/i, ''))}</span>
              <span class="chat-time">${timeStr}</span>
              ${deleteBtn}
            </div>
            ${msg.message ? `<div class="chat-text">${escapeHtml(msg.message)}</div>` : ''}
            ${mediaMarkup}
            <div class="chat-reactions-row">
              <button class="reaction-chip" onclick="window.reactMsg('${msg.id}', 'heart')">❤️ ${reactions.heart || 0}</button>
              <button class="reaction-chip" onclick="window.reactMsg('${msg.id}', 'applause')">👏 ${reactions.applause || 0}</button>
              <button class="reaction-chip" onclick="window.reactMsg('${msg.id}', 'fire')">🔥 ${reactions.fire || 0}</button>
              <button class="reaction-chip" onclick="window.reactMsg('${msg.id}', 'pray')">🙏 ${reactions.pray || 0}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Dérouler vers le bas
    this.listEl.scrollTop = this.listEl.scrollHeight;
  },

  async sendMessage() {
    if (!this.inputEl) return;
    const text = this.inputEl.value.trim();
    const attachment = this.currentAttachment;

    if (!text && !attachment) return;

    if (!AppState.guest) {
      window.openOnboarding();
      return;
    }

    const payload = {
      guest_id: AppState.guest.id,
      guest_name: AppState.guest.name,
      table_number: AppState.guest.table_number,
      message: text,
      message_type: attachment ? attachment.type : 'text',
      media_url: attachment ? attachment.dataUrl : null
    };

    this.inputEl.value = '';
    this.clearAttachment();
    this.toggleEmojiPicker(false);

    try {
      const newMsg = await Api.sendChatMessage(payload);
      if (newMsg && !AppState.chatMessages.some(m => m.id === newMsg.id)) {
        AppState.chatMessages.push(newMsg);
        this.render();
      }
    } catch (err) {
      window.showToast("Erreur lors de l'envoi du message : " + err.message, "error");
    }
  },

  async deleteMessage(messageId) {
    if (!confirm("Voulez-vous vraiment supprimer ce message du chat ?")) {
      return;
    }

    const guestId = AppState.guest ? AppState.guest.id : null;
    try {
      await Api.deleteChatMessage(messageId, guestId);
      AppState.chatMessages = AppState.chatMessages.filter(m => m.id !== messageId);
      this.render();
      window.showToast("Message supprimé 🗑️", "success");
    } catch (err) {
      window.showToast("Impossible de supprimer le message : " + err.message, "error");
    }
  },

  async react(messageId, emoji) {
    try {
      await Api.reactToMessage(messageId, emoji);
      this.refresh();
    } catch (e) {
      console.warn("Erreur réaction:", e);
    }
  }
};

// ============================================================
// FONCTIONS GLOBALES EXPOSÉES
// ============================================================
window.reactMsg = (id, emoji) => {
  ChatModule.react(id, emoji);
};

window.deleteChatMessage = (id) => {
  ChatModule.deleteMessage(id);
};

window.openGuestsPresenceModal = () => {
  const modal = document.getElementById('modal-guests-presence');
  if (modal) {
    modal.style.display = 'flex';
    ChatModule.refreshPresence();
    ChatModule.renderPresenceList();
  }
};

window.closeGuestsPresenceModal = () => {
  const modal = document.getElementById('modal-guests-presence');
  if (modal) modal.style.display = 'none';
};

window.openChatLightbox = (src, caption) => {
  const modal = document.getElementById('chat-lightbox-modal');
  const img = document.getElementById('chat-lightbox-img');
  const cap = document.getElementById('chat-lightbox-caption');
  const dl = document.getElementById('chat-lightbox-download');
  if (modal && img) {
    img.src = src;
    if (cap) cap.textContent = caption ? `Partagé par ${caption}` : 'Photo partagée';
    if (dl) dl.href = src;
    modal.style.display = 'flex';
  }
};

window.closeChatLightbox = () => {
  const modal = document.getElementById('chat-lightbox-modal');
  if (modal) modal.style.display = 'none';
};

window.ChatModule = ChatModule;

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
