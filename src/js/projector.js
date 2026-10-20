import { Api } from './api.js';

export const ProjectorModule = {
  container: null,
  pollTimer: null,

  init() {
    this.container = document.getElementById('projector-view');
    if (!this.container) return;

    this.refresh();
  },

  async refresh() {
    const feed = await Api.getProjectorFeed();
    if (!feed) return;

    this.render(feed);
  },

  render(feed) {
    if (!this.container) return;

    const eventTitleEl = document.getElementById('projector-event-name');
    const guestCountEl = document.getElementById('projector-guests-count');
    const prayerCountEl = document.getElementById('projector-prayers-count');
    const mainCardEl = document.getElementById('projector-main-content');
    const sideLeaderboardEl = document.getElementById('projector-side-leaderboard');

    if (eventTitleEl && feed.event) {
      eventTitleEl.textContent = feed.event.name;
    }
    if (guestCountEl) {
      guestCountEl.textContent = feed.active_guests_count || 12;
    }
    if (prayerCountEl) {
      prayerCountEl.textContent = feed.total_prayers || 24;
    }

    // Contenu principal (Quiz en direct, Duel ou Message épinglé)
    if (mainCardEl) {
      if (feed.active_quiz) {
        mainCardEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); padding: 0.35rem 0.85rem; border-radius: 999px; color: #fbbf24; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.05em;">
              <span>🤖</span><span>M.C. CÉLESTE IA EN DIRECT</span>
            </div>
            <span style="background: rgba(212,175,55,0.2); color: var(--gold-primary); font-weight: 800; padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.95rem;">
              +${feed.active_quiz.points || 100} PTS
            </span>
          </div>

          <h2 style="font-size: 2.2rem; font-weight: 800; line-height: 1.3; margin-bottom: 2rem;">
            ${escapeHtml(feed.active_quiz.question)}
          </h2>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="background: rgba(255,255,255,0.06); padding: 1.25rem; border-radius: var(--radius-md); font-size: 1.2rem; font-weight: 600; border: 1px solid var(--border-subtle);">
              <span style="color: var(--gold-primary); font-weight: 800;">A.</span> ${escapeHtml(feed.active_quiz.option_a)}
            </div>
            <div style="background: rgba(255,255,255,0.06); padding: 1.25rem; border-radius: var(--radius-md); font-size: 1.2rem; font-weight: 600; border: 1px solid var(--border-subtle);">
              <span style="color: var(--gold-primary); font-weight: 800;">B.</span> ${escapeHtml(feed.active_quiz.option_b)}
            </div>
            ${feed.active_quiz.option_c ? `
              <div style="background: rgba(255,255,255,0.06); padding: 1.25rem; border-radius: var(--radius-md); font-size: 1.2rem; font-weight: 600; border: 1px solid var(--border-subtle);">
                <span style="color: var(--gold-primary); font-weight: 800;">C.</span> ${escapeHtml(feed.active_quiz.option_c)}
              </div>
            ` : ''}
            ${feed.active_quiz.option_d ? `
              <div style="background: rgba(255,255,255,0.06); padding: 1.25rem; border-radius: var(--radius-md); font-size: 1.2rem; font-weight: 600; border: 1px solid var(--border-subtle);">
                <span style="color: var(--gold-primary); font-weight: 800;">D.</span> ${escapeHtml(feed.active_quiz.option_d)}
              </div>
            ` : ''}
          </div>
        `;
      } else if (feed.pinned_messages && feed.pinned_messages.length > 0) {
        const pm = feed.pinned_messages[0];
        mainCardEl.innerHTML = `
          <div style="font-size: 1.1rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 800; margin-bottom: 0.5rem;">
            📢 ANNONCE DE LA CÉLÉBRATION
          </div>
          <h2 style="font-size: 2rem; font-weight: 700; line-height: 1.4; margin-bottom: 1.5rem;">
            ${escapeHtml(pm.message)}
          </h2>
          <div style="font-size: 1.2rem; color: var(--text-muted);">
            — ${escapeHtml(pm.guest_name)} (${escapeHtml(pm.table_number)})
          </div>
        `;
      } else {
        mainCardEl.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">🤖</div>
            <div style="display: inline-block; background: rgba(212,175,55,0.15); border: 1px solid var(--gold-primary); border-radius: 999px; padding: 0.35rem 1rem; color: var(--gold-primary); font-size: 0.9rem; font-weight: 800; text-transform: uppercase; margin-bottom: 1rem; letter-spacing: 0.08em;">
              M.C. CÉLESTE IA • MAÎTRE DE CÉRÉMONIE VIRTUEL
            </div>
            <h2 style="font-size: 2.2rem; font-weight: 800; background: var(--gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.75rem;">
              Bienvenue au Grand Dîner de Gala !
            </h2>
            <p style="font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; line-height: 1.4;">
              Flashez le QR Code de votre table pour participer aux Défis Bibliques, lancer des Duels de Table et déposer vos prières en direct !
            </p>
          </div>
        `;
      }
    }

    // Leaderboard latéral
    if (sideLeaderboardEl && feed.leaderboard) {
      const list = Array.isArray(feed.leaderboard) ? feed.leaderboard : (feed.leaderboard.tables || []);
      sideLeaderboardEl.innerHTML = list.map((t, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 1rem;">
          <span style="font-weight: 700;">#${idx + 1} ${escapeHtml(t.table_number)}</span>
          <span style="color: var(--gold-primary); font-weight: 800;">${t.total_points || 0} pts</span>
        </div>
      `).join('');
    }
  }
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
