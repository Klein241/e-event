import { Api } from './api.js';
import { AppState } from './state.js';

export const ChatModule = {
  container: null,
  listEl: null,
  inputEl: null,
  sendBtn: null,
  pinnedBannerEl: null,

  init() {
    this.container = document.getElementById('chat-tab');
    if (!this.container) return;

    this.listEl = document.getElementById('chat-messages-list');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('btn-send-chat');
    this.pinnedBannerEl = document.getElementById('pinned-banner');

    this.bindEvents();
    this.refresh();
  },

  bindEvents() {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Quick emoji bar
    const emojiBtns = this.container.querySelectorAll('.quick-emoji-btn');
    emojiBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        if (this.inputEl) {
          this.inputEl.value += emoji + ' ';
          this.inputEl.focus();
        }
      });
    });
  },

  async refresh() {
    const messages = await Api.getChatMessages();
    AppState.chatMessages = messages;
    this.render();
  },

  render() {
    if (!this.listEl) return;

    // Messages épinglés
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

      return `
        <div class="chat-message ${isMine ? 'is-mine' : ''} ${isAnnouncement ? 'is-announcement' : ''}" data-id="${msg.id}">
          <div class="chat-avatar">${isAnnouncement ? '📢' : (msg.table_number ? '🥂' : '🎉')}</div>
          <div class="chat-body">
            <div class="chat-meta">
              <span class="chat-author">${escapeHtml(msg.guest_name)}</span>
              <span class="chat-table-tag">${escapeHtml(msg.table_number || 'Invité')}</span>
              <span class="chat-time">${timeStr}</span>
            </div>
            <div class="chat-text">${escapeHtml(msg.message)}</div>
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
    if (!text) return;

    if (!AppState.guest) {
      window.openOnboarding();
      return;
    }

    const payload = {
      guest_id: AppState.guest.id,
      guest_name: AppState.guest.name,
      table_number: AppState.guest.table_number,
      message: text,
      message_type: 'text'
    };

    this.inputEl.value = '';
    const newMsg = await Api.sendChatMessage(payload);
    AppState.chatMessages.push(newMsg);
    this.render();
  },

  async react(messageId, emoji) {
    await Api.reactToMessage(messageId, emoji);
    this.refresh();
  }
};

window.reactMsg = (id, emoji) => {
  ChatModule.react(id, emoji);
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
