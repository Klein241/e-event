/**
 * COMPAGNON DE CÉRÉMONIE - Interface Hôtesse Mobile Anti-Scrollade
 * Écran d'accueil 100% boutons de tables 3D, modale de table avec fiches stylisées,
 * popup d'orientation et émargement ultra-réactif.
 */

const GLOSSY_COLORS = [
  'g-red',
  'g-blue',
  'g-orange',
  'g-purple',
  'g-yellow',
  'g-magenta',
  'g-lime',
  'g-green',
  'g-cyan',
  'g-pink',
  'g-black',
  'g-silver'
];

const HostessState = {
  guests: [],
  tables: [],
  hostessName: 'Hôtesse Accueil',
  hostessCode: '',
  selectedTable: null,
  selectedGuest: null,
  homeSearchQuery: '',
  tableSearchQuery: '',
  audioCtx: null
};

// Normalisation universelle et stricte des codes de table (Prime, double prime, guillemets, etc.)
function normalizeTableCode(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/^TABLE\s*/i, '')
    // Unifier tous les guillemets et doubles primes vers deux apostrophes simples ''
    .replace(/[\u0022\u201C\u201D\u2033]/g, "''")
    // Unifier toutes les apostrophes typographiques, primes simples, accents vers '
    .replace(/[\u2018\u2019\u2032\u00B4`]/g, "'")
    .trim();
}

// Normalisation intelligente : minuscules, suppression des accents/diacritiques, unification apostrophes et guillemets
function smartNormalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents (é->e, à->a, ç->c, etc.)
    .replace(/[\u0022\u201C\u201D\u2033]/g, "''") // Unifie guillemets/primes doubles vers ''
    .replace(/[\u2018\u2019\u2032\u00B4`]/g, "'") // Unifie apostrophes/primes simples vers '
    .trim();
}

// Fonction de correspondance multi-critères intelligente pour un invité
function matchesGuest(g, query) {
  if (!query) return true;
  const qClean = smartNormalize(query);
  const terms = qClean.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const name = smartNormalize(g.name || '');
  const cleanTable = normalizeTableCode(g.table_number || '');
  const rawTable = smartNormalize(g.table_number || '');
  const tableWithPrefix = smartNormalize(`table ${cleanTable}`);
  const tableShort = smartNormalize(`t${cleanTable}`);
  const host = smartNormalize(g.invited_by || '');
  const couple = smartNormalize(g.couple_name || '');
  const partner = smartNormalize(g.partner_name || '');
  const phone = (g.phone || '').replace(/\D/g, '');
  const isArrived = Number(g.is_arrived) === 1;
  const statusStr = isArrived ? 'en salle arrive valide present' : 'en attente absent';

  // Corpus complet des métadonnées de l'invité
  const corpus = `${name} ${rawTable} ${cleanTable} ${tableWithPrefix} ${tableShort} ${host} ${couple} ${partner} ${phone} ${statusStr}`;

  // Logique ET : chaque mot recherché doit être présent dans le corpus
  return terms.every(term => corpus.includes(term));
}

// Fonction de correspondance directe pour un code de table
function matchesTableCode(tableCode, query) {
  if (!query) return true;
  const qClean = smartNormalize(query);
  const cleanTable = smartNormalize(normalizeTableCode(tableCode));
  const fullTable = smartNormalize(`table ${cleanTable}`);
  const shortTable = smartNormalize(`t${cleanTable}`);

  return cleanTable.includes(qClean) || 
         fullTable.includes(qClean) || 
         shortTable.includes(qClean) || 
         qClean.includes(cleanTable);
}

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

// Bip carillon harmonieux lors de la validation
function playSuccessChime() {
  try {
    const ctx = HostessState.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    HostessState.audioCtx = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12);

    osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

function showToast(text, icon = '✅') {
  const toast = document.getElementById('hostess-toast');
  const tText = document.getElementById('hostess-toast-text');
  const tIcon = document.getElementById('hostess-toast-icon');
  if (!toast || !tText) return;

  tText.textContent = text;
  if (tIcon) tIcon.textContent = icon;

  toast.classList.add('show');
  clearTimeout(window.__hostessToastTimer);
  window.__hostessToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// Détection de l'identité de l'hôtesse (?h=marie)
function initHostessIdentity() {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('h') || params.get('hostess') || '').trim();
  if (code) {
    HostessState.hostessCode = code;
    HostessState.hostessName = code.charAt(0).toUpperCase() + code.slice(1);
    const label = document.getElementById('profile-btn-label');
    const drawerTitle = document.getElementById('drawer-hostess-title');
    if (label) label.textContent = HostessState.hostessName;
    if (drawerTitle) drawerTitle.textContent = `👑 Hôtesse : ${HostessState.hostessName}`;
  }
}

// Obtenir la classe de couleur 3D Glossy pour un code de table
function getTableGlossyColor(tableCode) {
  const clean = normalizeTableCode(tableCode);
  const codeSum = [...clean].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GLOSSY_COLORS[codeSum % GLOSSY_COLORS.length];
}

// Chargement des données hôtesse
async function loadHostessData(isBackground = false) {
  try {
    const res = await fetch('/api/hostess/guests');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    HostessState.guests = Array.isArray(data.guests) ? data.guests : [];
    HostessState.tables = Array.isArray(data.tables) ? data.tables : [];

    updateStatsAndGauges();
    renderGlossyTableButtons();

    // Si une modale de table est ouverte, actualiser son contenu en temps réel
    if (HostessState.selectedTable) {
      renderTableModalContent(HostessState.selectedTable);
    }
  } catch (err) {
    if (!isBackground) {
      console.warn("Erreur chargement données hôtesse:", err);
      showToast("Mode hors-ligne ou connexion réseau lente", "⚠️");
    }
  }
}

// Mise à jour des jauges et badges
function updateStatsAndGauges() {
  const guests = HostessState.guests;
  const total = guests.length;
  const arrived = guests.filter(g => Number(g.is_arrived) === 1).length;
  const rate = total > 0 ? Math.round((arrived / total) * 100) : 0;

  const badgeEl = document.getElementById('profile-kpi-badge');
  if (badgeEl) badgeEl.textContent = `${arrived}/${total}`;

  const counterEl = document.getElementById('tables-total-counter');
  if (counterEl) counterEl.textContent = `${arrived} validé${arrived > 1 ? 's' : ''} sur ${total} invités (${rate}%)`;

  const drawerArr = document.getElementById('drawer-kpi-arrived');
  const drawerTot = document.getElementById('drawer-kpi-total');
  const drawerRate = document.getElementById('drawer-kpi-rate');
  const drawerProg = document.getElementById('drawer-kpi-progress');

  if (drawerArr) drawerArr.textContent = arrived;
  if (drawerTot) drawerTot.textContent = total;
  if (drawerRate) drawerRate.textContent = `${rate}%`;
  if (drawerProg) drawerProg.style.width = `${rate}%`;
}

// Rendu des Boutons 3D Glossy sur l'écran d'accueil avec recherche intelligente
function renderGlossyTableButtons() {
  const container = document.getElementById('glossy-tables-container');
  if (!container) return;

  const q = (HostessState.homeSearchQuery || '').trim();

  // Calcul du nombre d'invités et d'arrivés par table normalisée
  const tableCounts = {};
  const tableArrived = {};
  const tableMatchingGuests = {};

  HostessState.guests.forEach(g => {
    const t = normalizeTableCode(g.table_number || '1');
    tableCounts[t] = (tableCounts[t] || 0) + 1;
    if (Number(g.is_arrived) === 1) {
      tableArrived[t] = (tableArrived[t] || 0) + 1;
    }
    if (q && matchesGuest(g, q)) {
      tableMatchingGuests[t] = (tableMatchingGuests[t] || 0) + 1;
    }
  });

  // Liste des tables uniques
  let tablesList = [];
  if (HostessState.tables && HostessState.tables.length > 0) {
    tablesList = HostessState.tables.map(t => normalizeTableCode(t.table_code));
  } else {
    tablesList = Object.keys(tableCounts);
  }
  Object.keys(tableCounts).forEach(t => tablesList.push(t));

  const uniqueTables = Array.from(new Set(tablesList)).filter(Boolean).sort((a, b) => {
    return a.localeCompare(b, 'fr', { numeric: true });
  });

  // Filtrage intelligent des tables si recherche active
  let displayedTables = uniqueTables;
  if (q) {
    displayedTables = uniqueTables.filter(tCode => {
      const hasMatchingGuests = (tableMatchingGuests[tCode] || 0) > 0;
      const isDirectTableMatch = matchesTableCode(tCode, q);
      return hasMatchingGuests || isDirectTableMatch;
    });
  }

  // Mise à jour du bandeau récapitulatif de recherche
  updateHomeSearchSummary(q, displayedTables, tableMatchingGuests);

  if (displayedTables.length === 0) {
    container.innerHTML = `
      <div class="empty-search-state">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🍽️</span>
        <p style="font-size: 0.95rem; font-weight: 700; color: #fff;">Aucune table ne correspond à « <span style="color: var(--gold-primary);">${escapeHtml(q)}</span> »</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Vérifiez le nom de l'invité ou le numéro de table.</p>
        <button type="button" class="btn-reset" onclick="window.clearHomeSearch()">Effacer la recherche ✕</button>
      </div>
    `;
    return;
  }

  let buttonsHtml = '';
  displayedTables.forEach(tCode => {
    const colorClass = getTableGlossyColor(tCode);
    const count = tableCounts[tCode] || 0;
    const arrived = tableArrived[tCode] || 0;
    const matchingCount = tableMatchingGuests[tCode] || 0;
    const isMatched = q && (matchingCount > 0 || matchesTableCode(tCode, q));

    let counterText = `${arrived}/${count} entrés`;
    if (q && matchingCount > 0) {
      counterText = `🔍 ${matchingCount} trouvé${matchingCount > 1 ? 's' : ''}`;
    }

    buttonsHtml += `
      <button 
        type="button" 
        class="glossy-pill-btn ${colorClass} ${isMatched ? 'search-matched' : ''}" 
        data-table-code="${escapeHtml(tCode)}"
        title="Ouvrir les invités de la Table ${escapeHtml(tCode)}"
      >
        <span>TABLE ${escapeHtml(tCode)}</span>
        <span class="pill-counter">${counterText}</span>
      </button>
    `;
  });

  container.innerHTML = buttonsHtml;

  if (!container.__hasTableListener) {
    container.__hasTableListener = true;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-table-code]');
      if (!btn) return;
      const tCode = btn.getAttribute('data-table-code');
      if (tCode) {
        window.openTableModal(tCode);
      }
    });
  }
}

// Mise à jour du bandeau récapitulatif de recherche sur l'accueil
function updateHomeSearchSummary(q, displayedTables, tableMatchingGuests) {
  const summaryEl = document.getElementById('home-search-summary');
  const counterEl = document.getElementById('tables-total-counter');
  const totalGuests = HostessState.guests.length;
  const arrivedGuests = HostessState.guests.filter(g => Number(g.is_arrived) === 1).length;
  const rate = totalGuests > 0 ? Math.round((arrivedGuests / totalGuests) * 100) : 0;

  if (!q) {
    if (summaryEl) summaryEl.style.display = 'none';
    if (counterEl) {
      counterEl.textContent = `${arrivedGuests} validé${arrivedGuests > 1 ? 's' : ''} sur ${totalGuests} invités (${rate}%)`;
    }
    return;
  }

  // Calcul du nombre total d'invités correspondants
  const matchingGuests = HostessState.guests.filter(g => matchesGuest(g, q));
  const totalMatches = matchingGuests.length;

  if (counterEl) {
    counterEl.textContent = `🔍 ${totalMatches} invité(s) • ${displayedTables.length} table(s)`;
  }

  if (summaryEl) {
    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
      <div class="home-search-summary-text">
        <span>🔍 <strong>${totalMatches} invité${totalMatches > 1 ? 's' : ''}</strong> dans <strong>${displayedTables.length} table${displayedTables.length > 1 ? 's' : ''}</strong></span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button type="button" class="home-search-summary-btn" onclick="window.openSearchModalDirectly()">
          <span>📋 Liste directe (${totalMatches})</span>
        </button>
        <button type="button" onclick="window.clearHomeSearch()" style="background: rgba(255,255,255,0.12); border: none; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem;" title="Effacer la recherche">
          ✕
        </button>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// MODALE 1 : OUVRIR LA LISTE DES INVITÉS D'UNE TABLE
// -------------------------------------------------------------
window.openTableModal = (tableCode) => {
  const cleanTable = normalizeTableCode(tableCode);
  HostessState.selectedTable = cleanTable;
  HostessState.tableSearchQuery = '';

  const modal = document.getElementById('modal-table-guests');
  const badgeEl = document.getElementById('modal-table-badge');

  if (badgeEl) {
    badgeEl.className = `mini-glossy-table ${getTableGlossyColor(cleanTable)}`;
    badgeEl.textContent = `TABLE ${cleanTable}`;
  }

  // Réinitialisation de la barre de recherche interne à la table
  const searchInput = document.getElementById('table-modal-search-input');
  const clearBtn = document.getElementById('table-modal-search-clear');
  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';

  renderTableModalContent(cleanTable, '');

  if (modal) {
    modal.classList.add('active');
  }
};

window.closeTableModal = () => {
  const modal = document.getElementById('modal-table-guests');
  if (modal) modal.classList.remove('active');
  HostessState.selectedTable = null;
  HostessState.tableSearchQuery = '';
};

// Vider le champ de recherche interne de la table
window.clearTableModalSearch = () => {
  const input = document.getElementById('table-modal-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('table-modal-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';

  HostessState.tableSearchQuery = '';
  if (HostessState.selectedTable) {
    renderTableModalContent(HostessState.selectedTable, '');
  }
};

// Génération du contenu de la modale table (Style ABIGAEL / ADA Milca) avec recherche interne
function renderTableModalContent(cleanTable, searchQuery = HostessState.tableSearchQuery) {
  const listContainer = document.getElementById('modal-table-guests-list');
  const statsEl = document.getElementById('modal-table-stats');
  if (!listContainer) return;

  const guestsOfTable = HostessState.guests.filter(g => normalizeTableCode(g.table_number) === cleanTable);
  const arrivedCount = guestsOfTable.filter(g => Number(g.is_arrived) === 1).length;

  const q = (searchQuery || '').trim();
  const displayedGuests = q ? guestsOfTable.filter(g => matchesGuest(g, q)) : guestsOfTable;

  if (statsEl) {
    if (q) {
      statsEl.textContent = `(${displayedGuests.length}/${guestsOfTable.length} trouvé${displayedGuests.length > 1 ? 's' : ''})`;
    } else {
      statsEl.textContent = `(${arrivedCount}/${guestsOfTable.length} entrés)`;
    }
  }

  if (guestsOfTable.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 16px;">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 6px;">🍽️</span>
        <p>Aucun invité n'est encore assigné à la Table ${escapeHtml(cleanTable)}.</p>
      </div>
    `;
    return;
  }

  if (displayedGuests.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🔍</span>
        <p style="font-size: 0.95rem; font-weight: 700; color: #fff;">Aucun invité ne correspond à « <span style="color: var(--gold-primary);">${escapeHtml(q)}</span> »</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">dans la Table ${escapeHtml(cleanTable)} (${guestsOfTable.length} inscrits)</p>
        <button type="button" onclick="window.clearTableModalSearch()" style="margin-top: 14px; padding: 7px 18px; background: rgba(255,255,255,0.08); border: 1.5px solid var(--border-color); border-radius: var(--radius-full); color: #fff; font-weight: 700; cursor: pointer;">
          Effacer le filtre ✕
        </button>
      </div>
    `;
    return;
  }

  const tableColor = getTableGlossyColor(cleanTable);

  listContainer.innerHTML = displayedGuests.map(g => {
    const isArrived = Number(g.is_arrived) === 1;
    const isCouple = g.ticket_type === 'couple';
    const coupleText = isCouple ? (g.couple_name || (g.partner_name ? `couple ${g.name} et ${g.partner_name}` : 'En couple')) : '';
    const hostText = g.invited_by || 'Hôte officiel';

    const couplePillHtml = coupleText ? `
      <span class="pill-couple">
        <span>💍</span>
        <span>couple ${escapeHtml(coupleText.replace(/^couple\s*/i, ''))}</span>
      </span>
    ` : '';

    const hostPillHtml = `
      <span class="pill-host">
        <span>👑</span>
        <span>${escapeHtml(hostText)}</span>
      </span>
    `;

    const statusBadgeHtml = isArrived
      ? `<span style="color: #10b981; font-weight: 800; font-size: 0.8rem;">✅ En salle</span>`
      : `<span style="color: var(--text-muted); font-size: 0.74rem;">⏳ En attente</span>`;

    return `
      <div 
        class="guest-btn-card ${isArrived ? 'is-arrived' : ''}" 
        data-guest-id="${escapeHtml(g.id)}"
        title="Cliquer pour voir l'orientation et valider l'entrée"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <h2 class="guest-card-name">${escapeHtml(g.name)}</h2>
          <div class="guest-card-status-indicator">
            ${statusBadgeHtml}
          </div>
        </div>

        <!-- Rangée identique aux captures d'écran -->
        <div class="guest-badges-row">
          <span class="mini-glossy-table ${tableColor}">TABLE ${escapeHtml(cleanTable)}</span>
          ${couplePillHtml}
          ${hostPillHtml}
        </div>
      </div>
    `;
  }).join('');

  if (!listContainer.__hasGuestListener) {
    listContainer.__hasGuestListener = true;
    listContainer.addEventListener('click', (e) => {
      const card = e.target.closest('[data-guest-id]');
      if (!card) return;
      const gId = card.getAttribute('data-guest-id');
      if (gId) window.openOrientationPopup(gId);
    });
  }
}

// -------------------------------------------------------------
// MODALE 2 : POPUP D'ORIENTATION & ÉMARGEMENT DE L'INVITÉ
// -------------------------------------------------------------
window.openOrientationPopup = (guestId) => {
  const guest = HostessState.guests.find(g => g.id === guestId);
  if (!guest) return;

  HostessState.selectedGuest = guest;

  const modal = document.getElementById('modal-guest-orientation');
  const nameEl = document.getElementById('orient-guest-name');
  const tableEl = document.getElementById('orient-table-pill');
  const coupleEl = document.getElementById('orient-couple-pill');
  const hostEl = document.getElementById('orient-host-pill');
  const checkinContainer = document.getElementById('orient-checkin-container');

  const cleanTable = normalizeTableCode(guest.table_number || '1');
  const tableColor = getTableGlossyColor(cleanTable);

  if (nameEl) nameEl.textContent = guest.name;
  
  if (tableEl) {
    tableEl.className = `orientation-table-badge ${tableColor}`;
    tableEl.textContent = `TABLE ${cleanTable}`;
  }

  const isCouple = guest.ticket_type === 'couple';
  const coupleText = isCouple ? (guest.couple_name || (guest.partner_name ? `couple ${guest.name} et ${guest.partner_name}` : 'En couple')) : '';
  
  if (coupleEl) {
    if (coupleText) {
      coupleEl.style.display = 'inline-flex';
      coupleEl.innerHTML = `<span>💍</span><span>couple ${escapeHtml(coupleText.replace(/^couple\s*/i, ''))}</span>`;
    } else {
      coupleEl.style.display = 'none';
    }
  }

  if (hostEl) {
    hostEl.innerHTML = `<span>👑</span><span>Invité par : <strong>${escapeHtml(guest.invited_by || 'Hôte officiel')}</strong></span>`;
  }

  renderOrientationCheckinButton();

  if (modal) modal.classList.add('active');
};

window.closeOrientationPopup = () => {
  const modal = document.getElementById('modal-guest-orientation');
  if (modal) modal.classList.remove('active');
  HostessState.selectedGuest = null;
};

// Rendu du bouton d'émargement dans le popup d'orientation
function renderOrientationCheckinButton() {
  const container = document.getElementById('orient-checkin-container');
  const guest = HostessState.selectedGuest;
  if (!container || !guest) return;

  const isArrived = Number(guest.is_arrived) === 1;

  if (!isArrived) {
    container.innerHTML = `
      <button 
        type="button" 
        class="btn-big-checkin pending" 
        data-checkin-status="1"
      >
        <span>🔘</span>
        <span>VALIDER L'ENTRÉE EN SALLE ➔</span>
      </button>
    `;
  } else {
    container.innerHTML = `
      <button 
        type="button" 
        class="btn-big-checkin validated" 
        style="cursor: default;"
      >
        <span>✅</span>
        <span>ENTRÉ(E) EN SALLE ${guest.arrived_at ? '• ' + formatTime(guest.arrived_at) : ''}</span>
      </button>
      <div style="margin-top: 6px;">
        <button 
          type="button" 
          class="btn-cancel-checkin" 
          data-checkin-status="0"
        >
          ↩️ Annuler l'émargement (erreur de clic)
        </button>
      </div>
    `;
  }

  if (!container.__hasCheckinListener) {
    container.__hasCheckinListener = true;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-checkin-status]');
      if (!btn || !HostessState.selectedGuest) return;
      const newStatus = parseInt(btn.getAttribute('data-checkin-status'), 10);
      window.executeCheckin(HostessState.selectedGuest.id, newStatus);
    });
  }
}

// Action d'émargement / validation
window.executeCheckin = async (guestId, newStatus) => {
  const guest = HostessState.guests.find(g => g.id === guestId);
  if (!guest) return;

  guest.is_arrived = newStatus ? 1 : 0;
  guest.arrived_at = newStatus ? new Date().toISOString() : null;

  if (newStatus === 1) {
    playSuccessChime();
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  }

  // Mettre à jour l'UI instantanément
  updateStatsAndGauges();
  renderGlossyTableButtons();
  if (HostessState.selectedTable) {
    renderTableModalContent(HostessState.selectedTable);
  }
  renderOrientationCheckinButton();

  const msg = newStatus === 1
    ? `${guest.name} est validé(e) à la Table ${normalizeTableCode(guest.table_number)} !`
    : `Émargement annulé pour ${guest.name}`;
  showToast(msg, newStatus === 1 ? '🎉' : '↩️');

  // Envoi à l'API Cloudflare Worker
  try {
    await fetch('/api/hostess/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: guestId,
        is_arrived: newStatus,
        hostess_name: HostessState.hostessName
      })
    });
  } catch (err) {
    console.warn("Erreur synchronisation émargement:", err);
  }
};

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// -------------------------------------------------------------
// MODALE 3 : DRAWER PROFIL & JAUGES D'AFFLUENCE
// -------------------------------------------------------------
window.openProfileDrawer = () => {
  updateStatsAndGauges();
  const modal = document.getElementById('modal-profile-drawer');
  if (modal) modal.classList.add('active');
};

window.closeProfileDrawer = () => {
  const modal = document.getElementById('modal-profile-drawer');
  if (modal) modal.classList.remove('active');
};

// -------------------------------------------------------------
// MODALE 4 : RECHERCHE INTELLIGENTE GLOBALE & ACCUEIL
// -------------------------------------------------------------
function handleSearchInput(query) {
  const q = (query || '').trim();
  HostessState.homeSearchQuery = q;
  const clearBtn = document.getElementById('search-clear');

  if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';

  // Met à jour les boutons 3D et le bandeau de l'accueil en temps réel
  renderGlossyTableButtons();

  // Pré-remplit la modale des résultats complets
  renderSearchResultsList(q);
}

// Rendu des résultats dans la modale détaillée
function renderSearchResultsList(query) {
  const q = (query || '').trim();
  const countEl = document.getElementById('search-results-count');
  const listContainer = document.getElementById('search-results-list');
  if (!listContainer) return;

  if (!q) {
    listContainer.innerHTML = '';
    if (countEl) countEl.textContent = '(0)';
    return;
  }

  const results = HostessState.guests.filter(g => matchesGuest(g, q));

  if (countEl) countEl.textContent = `(${results.length})`;

  if (results.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
        <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🔍</span>
        <p style="font-size: 0.95rem; font-weight: 700; color: #fff;">Aucun invité ne correspond à « <span style="color: var(--gold-primary);">${escapeHtml(q)}</span> ».</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">Vérifiez l'orthographe du prénom, du nom ou de la table.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = results.map(g => {
    const isArrived = Number(g.is_arrived) === 1;
    const cleanTable = normalizeTableCode(g.table_number || '1');
    const tableColor = getTableGlossyColor(cleanTable);
    const isCouple = g.ticket_type === 'couple';
    const coupleText = isCouple ? (g.couple_name || (g.partner_name ? `couple ${g.name} et ${g.partner_name}` : 'En couple')) : '';
    const hostText = g.invited_by || 'Hôte officiel';

    const couplePillHtml = coupleText ? `
      <span class="pill-couple">
        <span>💍</span>
        <span>couple ${escapeHtml(coupleText.replace(/^couple\s*/i, ''))}</span>
      </span>
    ` : '';

    return `
      <div 
        class="guest-btn-card ${isArrived ? 'is-arrived' : ''}" 
        data-guest-id="${escapeHtml(g.id)}"
        title="Cliquer pour voir l'orientation et valider l'entrée"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <h2 class="guest-card-name">${escapeHtml(g.name)}</h2>
          <div class="guest-card-status-indicator">
            ${isArrived ? '<span style="color: #10b981; font-weight: 800; font-size: 0.8rem;">✅ En salle</span>' : '<span style="color: var(--text-muted); font-size: 0.74rem;">⏳ En attente</span>'}
          </div>
        </div>
        <div class="guest-badges-row">
          <span class="mini-glossy-table ${tableColor}">TABLE ${escapeHtml(cleanTable)}</span>
          ${couplePillHtml}
          <span class="pill-host">👑 ${escapeHtml(hostText)}</span>
        </div>
      </div>
    `;
  }).join('');

  if (!listContainer.__hasSearchGuestListener) {
    listContainer.__hasSearchGuestListener = true;
    listContainer.addEventListener('click', (e) => {
      const card = e.target.closest('[data-guest-id]');
      if (!card) return;
      const gId = card.getAttribute('data-guest-id');
      if (gId) window.openOrientationPopup(gId);
    });
  }
}

// Ouvrir directement la modale des résultats
window.openSearchModalDirectly = () => {
  const searchModal = document.getElementById('modal-search-results');
  const q = HostessState.homeSearchQuery.trim();
  renderSearchResultsList(q);
  if (searchModal) searchModal.classList.add('active');
};

// Vider la recherche d'accueil
window.clearHomeSearch = () => {
  const searchInput = document.getElementById('hostess-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';

  HostessState.homeSearchQuery = '';
  renderGlossyTableButtons();
  window.closeSearchModal();
};

window.closeSearchModal = () => {
  const searchModal = document.getElementById('modal-search-results');
  if (searchModal) searchModal.classList.remove('active');
};

// Initialisation globale
document.addEventListener('DOMContentLoaded', () => {
  initHostessIdentity();

  const profileBtn = document.getElementById('btn-open-profile-drawer');
  if (profileBtn) {
    profileBtn.addEventListener('click', window.openProfileDrawer);
  }

  // Barre de recherche de l'accueil
  const searchInput = document.getElementById('hostess-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });

    // Ouvrir la liste complète des résultats si on appuie sur Entrée
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.openSearchModalDirectly();
      }
    });
  }

  const searchClear = document.getElementById('search-clear');
  if (searchClear) {
    searchClear.addEventListener('click', window.clearHomeSearch);
  }

  // Barre de recherche interne à la modale de table
  const tableSearchInput = document.getElementById('table-modal-search-input');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      HostessState.tableSearchQuery = q;
      const tClear = document.getElementById('table-modal-search-clear');
      if (tClear) tClear.style.display = q ? 'flex' : 'none';
      if (HostessState.selectedTable) {
        renderTableModalContent(HostessState.selectedTable, q);
      }
    });
  }

  const tableSearchClear = document.getElementById('table-modal-search-clear');
  if (tableSearchClear) {
    tableSearchClear.addEventListener('click', window.clearTableModalSearch);
  }

  // Fermer les modales au clic sur l'overlay
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        HostessState.selectedGuest = null;
        if (modal.id === 'modal-table-guests') {
          HostessState.selectedTable = null;
          HostessState.tableSearchQuery = '';
        }
      }
    });
  });

  loadHostessData();

  // Rafraîchissement automatique en tâche de fond toutes les 12 secondes
  setInterval(() => {
    loadHostessData(true);
  }, 12000);
});
