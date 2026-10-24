// =========================================================================
// ESPACE SUPERVISEUR - GESTION DES INVITÉS & FICHES D'ÉVANGÉLISATION
// =========================================================================

let allGuests = [];
let activeFilter = 'all';
let searchQuery = '';
let currentGuestId = null;
let pollTimer = null;

// Détection temps réel des arrivées en salle
const knownArrivedGuestIds = new Set();
let isInitialArrivalLoaded = false;
const newlyArrivedGuestIds = new Set();

// Éléments DOM
const guestsListEl = document.getElementById('supervisor-guests-list');
const searchInputEl = document.getElementById('supervisor-search');
const filterBtns = document.querySelectorAll('.filter-btn');
const kpiCards = document.querySelectorAll('.kpi-card');
const btnRefresh = document.getElementById('btn-refresh-data');

// Modal et Formulaire Évangélisation
const modalEvang = document.getElementById('modal-evangelization');
const formEvang = document.getElementById('form-evangelization');
const btnCloseSheet = document.getElementById('btn-close-sheet');
const btnCancelSheet = document.getElementById('btn-cancel-sheet');
const btnSubmitSheet = document.getElementById('btn-submit-sheet');

// Bannière Note Épinglée
const pinnedBannerEl = document.getElementById('supervisor-pinned-note-banner');
const pinnedTextEl = document.getElementById('supervisor-pinned-note-text');
const pinnedAuthorEl = document.getElementById('supervisor-pinned-note-author');

// Toast
const toastEl = document.getElementById('toast');

function showToast(message, duration = 3500) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// -------------------------------------------------------------
// GESTION DE L'IDENTITÉ DU SUPERVISEUR
// -------------------------------------------------------------
function getSupervisorName() {
  return localStorage.getItem('supervisor_name') || '';
}

function updateSupervisorIdentityUI() {
  const currentName = getSupervisorName();
  const displayEl = document.getElementById('current-supervisor-name-display');
  if (displayEl) {
    displayEl.textContent = currentName ? currentName : 'Définir mon nom';
  }
}

window.promptChangeSupervisorName = function() {
  const current = getSupervisorName();
  const input = prompt("Entrez votre nom / signature de Superviseur (ex: Pasteur Paul, Diacre Thomas, Superviseur Marc) :", current);
  if (input !== null) {
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem('supervisor_name', trimmed);
      updateSupervisorIdentityUI();
      showToast(`👤 Identité superviseur : ${trimmed}`);
    }
  }
};

// -------------------------------------------------------------
// ALERTE SONORE D'ARRIVÉE (SYNTHÈSE WEB AUDIO API)
// -------------------------------------------------------------
function playArrivalSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Note 1 (Mi / E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (Sol# / G#5 - 830.61Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.debug("Lecture audio non disponible:", e);
  }
}

// -------------------------------------------------------------
// AUTORISATION DES NOTIFICATIONS NAVIGATEUR
// -------------------------------------------------------------
window.requestSupervisorNotifications = async function() {
  if (!("Notification" in window)) {
    alert("Les notifications de bureau ne sont pas supportées par ce navigateur.");
    return;
  }
  const perm = await Notification.requestPermission();
  const icon = document.getElementById('notif-bell-icon');
  if (perm === 'granted') {
    if (icon) icon.textContent = '🔔 Alertes (ON)';
    showToast("✅ Notifications d'arrivée en salle activées !");
    playArrivalSound();
  } else {
    if (icon) icon.textContent = '🔕 Alertes (Bloquées)';
    showToast("⚠️ Notifications refusées dans les paramètres du navigateur.");
  }
};

// -------------------------------------------------------------
// DÉTECTION EN DIRECT DES ARRIVÉES EN SALLE PAR LES HÔTESSES
// -------------------------------------------------------------
function checkNewArrivals(guests) {
  const currentArrived = (guests || []).filter(g => Number(g.is_arrived) === 1);

  if (!isInitialArrivalLoaded) {
    currentArrived.forEach(g => knownArrivedGuestIds.add(g.id));
    isInitialArrivalLoaded = true;
    return;
  }

  const freshArrivals = [];
  currentArrived.forEach(g => {
    if (!knownArrivedGuestIds.has(g.id)) {
      freshArrivals.push(g);
      knownArrivedGuestIds.add(g.id);
      newlyArrivedGuestIds.add(g.id);
    }
  });

  if (freshArrivals.length > 0) {
    // Alerte Sonore
    playArrivalSound();

    // Vibreur mobile
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);

    // Bannière d'alerte visuelle à l'écran
    const banner = document.getElementById('live-arrival-banner');
    const bannerText = document.getElementById('live-arrival-banner-text');
    if (banner && bannerText) {
      const names = freshArrivals.map(g => `${g.name} (${g.table_number ? 'Table ' + g.table_number : 'En salle'})`).join(', ');
      bannerText.textContent = `${names} vient d'entrer en salle !`;
      banner.style.display = 'flex';
    }

    // Notification OS native si autorisée
    if (window.Notification && Notification.permission === 'granted') {
      freshArrivals.forEach(g => {
        new Notification("🟢 Invité en salle !", {
          body: `${g.name} (${g.table_number ? 'Table ' + g.table_number : 'En salle'}) vient d'être validé(e) par l'accueil !`,
          icon: "/icon.svg"
        });
      });
    }

    showToast(`🟢 ${freshArrivals.length} invité(s) viennent d'entrer en salle !`, 5000);
  }
}

// -------------------------------------------------------------
// 1. CHARGEMENT DE LA NOTE ÉPINGLÉE ADMIN
// -------------------------------------------------------------
async function loadPinnedNote() {
  try {
    const res = await fetch('/api/shared/pinned-note');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.success && data.note && data.note.is_active && data.note.content) {
      if (pinnedTextEl) pinnedTextEl.textContent = data.note.content;
      if (pinnedAuthorEl) pinnedAuthorEl.textContent = `Émise par : ${data.note.author || 'Régie Générale'}`;
      if (pinnedBannerEl) pinnedBannerEl.style.display = 'flex';
    } else {
      if (pinnedBannerEl) pinnedBannerEl.style.display = 'none';
    }
  } catch (err) {
    console.debug('Vérification note épinglée silencieuse:', err);
  }
}

function isCoupleGuest(g) {
  if (!g) return false;
  const t = String(g.ticket_type || '').toLowerCase().trim();
  if (t === 'couple') return true;
  if (t === 'seul') return false;
  if (g.couple_name && String(g.couple_name).trim().length > 0) return true;
  if (g.partner_name && String(g.partner_name).trim().length > 0) return true;
  return false;
}

function countPersons(list) {
  return (list || []).reduce((acc, g) => acc + (isCoupleGuest(g) ? 2 : 1), 0);
}

// -------------------------------------------------------------
// 2. CHARGEMENT DES INVITÉS & STATS
// -------------------------------------------------------------
async function loadSupervisorGuests(showSpinner = false) {
  if (showSpinner && guestsListEl) {
    guestsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <p>Chargement des invités en direct...</p>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/supervisor/guests');
    if (!res.ok) throw new Error('Erreur réseau superviseur');
    const data = await res.json();

    allGuests = data.guests || [];

    // Détection temps réel des arrivées
    checkNewArrivals(allGuests);

    const arrivedList = allGuests.filter(g => Number(g.is_arrived) === 1);
    const sansBilletList = allGuests.filter(g => g.registration_source === 'sans_billet');
    const evangelizedList = allGuests.filter(g => Number(g.is_evangelized) === 1);
    const pendingList = allGuests.filter(g => Number(g.is_evangelized) !== 1);

    const stats = {
      total: countPersons(allGuests),
      total_tickets: allGuests.length,
      arrived: countPersons(arrivedList),
      arrived_tickets: arrivedList.length,
      sans_billet: countPersons(sansBilletList),
      sans_billet_tickets: sansBilletList.length,
      evangelized: countPersons(evangelizedList),
      pending: countPersons(pendingList)
    };

    updateStatsDisplay(stats);
    renderGuests();
  } catch (err) {
    console.error('Erreur chargement invités:', err);
    if (showSpinner && guestsListEl) {
      guestsListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <p>Impossible de charger la liste. Veuillez actualiser.</p>
        </div>
      `;
    }
  }
}

// -------------------------------------------------------------
// 3. MISE À JOUR DES COMPTEURS & KPIS
// -------------------------------------------------------------
function updateStatsDisplay(stats) {
  const kpiSansBillet = document.getElementById('kpi-sans-billet');
  const kpiArrived = document.getElementById('kpi-arrived');
  const kpiEvangelized = document.getElementById('kpi-evangelized');
  const kpiPending = document.getElementById('kpi-pending');
  const kpiTotal = document.getElementById('kpi-total');

  if (kpiSansBillet) kpiSansBillet.textContent = stats.sans_billet ?? 0;
  if (kpiArrived) kpiArrived.textContent = stats.arrived ?? 0;
  if (kpiEvangelized) kpiEvangelized.textContent = stats.evangelized ?? 0;
  if (kpiPending) kpiPending.textContent = stats.pending ?? 0;
  if (kpiTotal) kpiTotal.textContent = stats.total ?? 0;

  const countTabAll = document.getElementById('count-tab-all');
  const countTabArrived = document.getElementById('count-tab-arrived');
  const countTabNoBillet = document.getElementById('count-tab-nobillet');
  const countTabPending = document.getElementById('count-tab-pending');
  const countTabEvangelized = document.getElementById('count-tab-evangelized');

  if (countTabAll) countTabAll.textContent = stats.total ?? 0;
  if (countTabArrived) countTabArrived.textContent = stats.arrived ?? 0;
  if (countTabNoBillet) countTabNoBillet.textContent = stats.sans_billet ?? 0;
  if (countTabPending) countTabPending.textContent = stats.pending ?? 0;
  if (countTabEvangelized) countTabEvangelized.textContent = stats.evangelized ?? 0;
}

// -------------------------------------------------------------
// 4. FILTRAGE ET RENDU DE LA LISTE
// -------------------------------------------------------------
function getFilteredGuests() {
  const q = searchQuery.toLowerCase().trim();

  return allGuests.filter(guest => {
    const isSansBillet = guest.registration_source === 'sans_billet';
    const isEvang = Number(guest.is_evangelized) === 1;
    const isArrived = Number(guest.is_arrived) === 1;

    // 1. Filtre par onglet
    if (activeFilter === 'arrived' && !isArrived) return false;
    if (activeFilter === 'nobillet' && !isSansBillet) return false;
    if (activeFilter === 'evangelized' && !isEvang) return false;
    if (activeFilter === 'pending' && isEvang) return false;

    // 2. Recherche textuelle
    if (q) {
      const name = (guest.name || '').toLowerCase();
      const phone = (guest.phone || '').toLowerCase();
      const table = `table ${guest.table_number || ''}`.toLowerCase();
      const partner = (guest.partner_name || '').toLowerCase();
      const church = (guest.church_name || '').toLowerCase();
      const sup = (guest.evangelized_by || guest.supervisor_name || '').toLowerCase();

      return name.includes(q) || phone.includes(q) || table.includes(q) || partner.includes(q) || church.includes(q) || sup.includes(q);
    }

    return true;
  });
}

function renderGuests() {
  if (!guestsListEl) return;
  const filtered = getFilteredGuests();

  if (filtered.length === 0) {
    guestsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>Aucun invité ne correspond aux critères sélectionnés.</p>
      </div>
    `;
    return;
  }

  guestsListEl.innerHTML = filtered.map(g => {
    const isSansBillet = g.registration_source === 'sans_billet';
    const isEvang = Number(g.is_evangelized) === 1;
    const isArrived = Number(g.is_arrived) === 1;
    const isJustArrived = newlyArrivedGuestIds.has(g.id);

    const gender = (g.gender || 'M').toUpperCase();
    const genderLabel = gender === 'F' ? 'Femme' : 'Homme';
    const genderPillClass = gender === 'F' ? 'gender-f' : 'gender-m';
    const genderIcon = gender === 'F' ? '👩' : '👨';

    const formulaLabel = (g.ticket_type === 'couple' || g.couple_name) ? '👥 En Couple' : '👤 Seul';
    const tableName = g.table_number ? `Table ${g.table_number}` : 'Table Régie';
    const arrivalTime = g.arrived_at ? new Date(g.arrived_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : (isArrived ? 'Présent' : 'Non émargé');

    // Badge En Salle officiel
    const arrivedBadge = isArrived
      ? `<span class="badge-tag-arrived" title="L'invité a été validé à l'accueil">🟢 DÉJÀ EN SALLE</span>`
      : `<span class="badge-tag-waiting" title="Pas encore validé à l'accueil">⏳ En attente accueil</span>`;

    // Signature du superviseur si évangélisé
    const supervisorSigner = g.evangelized_by || g.supervisor_name || '';

    return `
      <div class="guest-card ${isSansBillet ? 'is-sans-billet' : ''} ${isEvang ? 'is-evangelized' : ''} ${isArrived ? 'is-arrived' : ''} ${isJustArrived ? 'card-just-arrived' : ''}" data-id="${g.id}">
        <div>
          <div class="guest-card-header">
            <div>
              <h3 class="guest-name">${escapeHtml(g.name)}</h3>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                ${arrivedBadge}
                ${isSansBillet ? '<span class="badge-tag-nobillet">🏷️ SANS BILLET</span>' : ''}
                ${isEvang ? '<span class="badge-evangelized">✝️ Évangélisé(e)</span>' : ''}
              </div>
            </div>
          </div>

          <div class="guest-meta-rows" style="margin-top: 10px;">
            <div class="guest-meta-pill-row">
              <span class="meta-pill ${genderPillClass}">${genderIcon} ${genderLabel}</span>
              <span class="meta-pill">${formulaLabel}</span>
              <span class="meta-pill table">🏷️ ${tableName}</span>
            </div>

            <div style="margin-top: 4px; display: flex; justify-content: space-between; font-size: 0.74rem;">
              <span>🕒 Émargement : <strong>${arrivalTime}</strong></span>
              ${g.phone && g.phone !== '0' ? `<span>📞 ${escapeHtml(g.phone)}</span>` : ''}
            </div>

            ${g.partner_name ? `<div style="font-size: 0.74rem; color: #cbd5e1;">Conjoint(e) : <em>${escapeHtml(g.partner_name)}</em></div>` : ''}
            ${g.spiritual_decision ? `<div style="font-size: 0.74rem; color: #34d399; font-weight: 600;">✨ Suivi : ${escapeHtml(g.spiritual_decision)}</div>` : ''}
            
            ${supervisorSigner ? `
              <div style="margin-top: 6px; padding: 4px 8px; background: rgba(56, 189, 248, 0.12); border-left: 3px solid #38bdf8; border-radius: 4px; font-size: 0.74rem; color: #bae6fd;">
                ✍️ Fiche signée par : <strong style="color: #ffffff;">${escapeHtml(supervisorSigner)}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="card-actions">
          ${isEvang 
            ? `<button class="btn-action-evangelize btn-completed" onclick="window.openEvangelizationForm('${g.id}')">
                <span>👁️</span> Voir / Modifier la Fiche
               </button>`
            : `<button class="btn-action-evangelize btn-pulse" onclick="window.openEvangelizationForm('${g.id}')">
                <span>✝️</span> Remplir Fiche d'Évangélisation
               </button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// -------------------------------------------------------------
// 5. GESTION DU FORMULAIRE D'ÉVANGÉLISATION AVEC SIGNATURE OBLIGATOIRE
// -------------------------------------------------------------
window.openEvangelizationForm = async function(guestId) {
  currentGuestId = guestId;
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  // Réinitialisation du formulaire
  if (formEvang) formEvang.reset();

  const sheetGuestId = document.getElementById('sheet-guest-id');
  const sheetFullName = document.getElementById('sheet-full-name');
  const sheetPhone = document.getElementById('sheet-phone');
  const sheetResidence = document.getElementById('sheet-residence');
  const sheetProfession = document.getElementById('sheet-profession');
  const sheetSupervisorName = document.getElementById('sheet-supervisor-name');

  if (sheetGuestId) sheetGuestId.value = guest.id;
  if (sheetFullName) sheetFullName.value = guest.name || '';
  if (sheetPhone) sheetPhone.value = (guest.phone && guest.phone !== '0') ? guest.phone : '';
  if (sheetResidence) sheetResidence.value = guest.residence_location || '';
  if (sheetProfession) sheetProfession.value = guest.profession || '';

  // Préremplir la signature avec le nom mémorisé du superviseur ou l'auteur précédent
  const defaultSupervisor = guest.evangelized_by || guest.supervisor_name || getSupervisorName();
  if (sheetSupervisorName) {
    sheetSupervisorName.value = defaultSupervisor;
  }

  // Chargement de l'enregistrement existant si présent
  try {
    const res = await fetch(`/api/supervisor/evangelization/${guestId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.record) {
        const r = data.record;
        if (sheetFullName) sheetFullName.value = r.full_name || guest.name;
        if (sheetResidence) sheetResidence.value = r.residence_location || '';
        if (sheetPhone) sheetPhone.value = r.phone || '';
        if (sheetProfession) sheetProfession.value = r.profession || '';
        if (sheetSupervisorName && r.supervisor_name) sheetSupervisorName.value = r.supervisor_name;

        // Église
        const attendsRadio = document.querySelectorAll('input[name="attends_church_radio"]');
        if (attendsRadio) {
          attendsRadio.forEach(radio => {
            if (Number(r.attends_church) === 1 && radio.value === 'oui') radio.checked = true;
            if (Number(r.attends_church) === 0 && radio.value === 'non') radio.checked = true;
          });
        }
        const churchNameInput = document.getElementById('sheet-church-name');
        const churchNoInput = document.getElementById('sheet-church-no-reason');
        if (churchNameInput) churchNameInput.value = r.church_name || '';
        if (churchNoInput) churchNoInput.value = r.church_no_reason || '';

        // Baptême
        const baptizedRadio = document.querySelectorAll('input[name="is_baptized_radio"]');
        if (baptizedRadio) {
          baptizedRadio.forEach(radio => {
            if (Number(r.is_baptized) === 1 && radio.value === 'oui') radio.checked = true;
            if (Number(r.is_baptized) === 0 && radio.value === 'non') radio.checked = true;
          });
        }
        const baptismDateInput = document.getElementById('sheet-baptism-date');
        const baptismNoInput = document.getElementById('sheet-baptism-no-reason');
        if (baptismDateInput) baptismDateInput.value = r.baptism_date || '';
        if (baptismNoInput) baptismNoInput.value = r.baptism_no_reason || '';

        // Dernière église & suivi
        const lastChurchInput = document.getElementById('sheet-last-church');
        const decisionSelect = document.getElementById('sheet-spiritual-decision');
        const notesText = document.getElementById('sheet-notes');

        if (lastChurchInput) lastChurchInput.value = r.last_church_attended || '';
        if (decisionSelect && r.spiritual_decision) decisionSelect.value = r.spiritual_decision;
        if (notesText) notesText.value = r.notes || '';
      }
    }
  } catch (err) {
    console.debug('Fiche vierge:', err);
  }

  // Ouverture du modal
  if (modalEvang) {
    modalEvang.classList.add('active');
  }
};

function closeEvangelizationModal() {
  if (modalEvang) {
    modalEvang.classList.remove('active');
  }
  currentGuestId = null;
}

if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeEvangelizationModal);
if (btnCancelSheet) btnCancelSheet.addEventListener('click', closeEvangelizationModal);

// Soumission du formulaire
if (formEvang) {
  formEvang.addEventListener('submit', async (e) => {
    e.preventDefault();

    const guestId = document.getElementById('sheet-guest-id')?.value;
    const fullName = document.getElementById('sheet-full-name')?.value?.trim();
    const residenceLocation = document.getElementById('sheet-residence')?.value?.trim();
    const phone = document.getElementById('sheet-phone')?.value?.trim();
    const profession = document.getElementById('sheet-profession')?.value?.trim();
    const lastChurch = document.getElementById('sheet-last-church')?.value?.trim();
    const decision = document.getElementById('sheet-spiritual-decision')?.value;
    const notes = document.getElementById('sheet-notes')?.value?.trim();
    const supervisorName = document.getElementById('sheet-supervisor-name')?.value?.trim();

    // 1. Validation de la signature obligatoire du superviseur
    if (!supervisorName) {
      alert("⚠️ Signature obligatoire : Veuillez indiquer votre Nom et Prénom de superviseur pour signer et valider cette fiche.");
      const supInput = document.getElementById('sheet-supervisor-name');
      if (supInput) {
        supInput.focus();
        supInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Sauvegarder dans le localStorage pour les prochaines fiches
    localStorage.setItem('supervisor_name', supervisorName);
    updateSupervisorIdentityUI();

    // Radio église
    const churchRadioVal = document.querySelector('input[name="attends_church_radio"]:checked')?.value;
    const attendsChurch = churchRadioVal === 'oui' ? 1 : 0;
    const churchName = document.getElementById('sheet-church-name')?.value?.trim();
    const churchNoReason = document.getElementById('sheet-church-no-reason')?.value?.trim();

    // Radio baptême
    const baptismRadioVal = document.querySelector('input[name="is_baptized_radio"]:checked')?.value;
    const isBaptized = baptismRadioVal === 'oui' ? 1 : 0;
    const baptismDate = document.getElementById('sheet-baptism-date')?.value?.trim();
    const baptismNoReason = document.getElementById('sheet-baptism-no-reason')?.value?.trim();

    if (!guestId || !fullName) {
      alert('Veuillez renseigner le nom complet de l\'invité.');
      return;
    }

    if (btnSubmitSheet) {
      btnSubmitSheet.disabled = true;
      btnSubmitSheet.innerHTML = '<span>⏳</span> Transmission à l\'Admin...';
    }

    try {
      const payload = {
        guest_id: guestId,
        full_name: fullName,
        residence_location: residenceLocation,
        attends_church: attendsChurch,
        church_name: churchName,
        church_no_reason: churchNoReason,
        is_baptized: isBaptized,
        baptism_date: baptismDate,
        baptism_no_reason: baptismNoReason,
        last_church_attended: lastChurch,
        phone: phone,
        profession: profession,
        spiritual_decision: decision,
        notes: notes,
        supervisor_name: supervisorName
      };

      const res = await fetch('/api/supervisor/evangelization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'enregistrement');
      }

      showToast(`✅ Fiche signée par ${supervisorName} et transmise à l'Admin pour ${fullName} !`);
      closeEvangelizationModal();

      // Mise à jour locale immédiate
      const targetGuest = allGuests.find(g => g.id === guestId);
      if (targetGuest) {
        targetGuest.is_evangelized = 1;
        targetGuest.evangelized_by = supervisorName;
        targetGuest.supervisor_name = supervisorName;
        targetGuest.spiritual_decision = decision;
        targetGuest.church_name = churchName;
      }
      renderGuests();

      // Rechargement en arrière-plan
      loadSupervisorGuests(false);

    } catch (err) {
      console.error('Erreur enregistrement évangélisation:', err);
      alert(`Erreur : ${err.message}`);
    } finally {
      if (btnSubmitSheet) {
        btnSubmitSheet.disabled = false;
        btnSubmitSheet.innerHTML = '<span>💾</span> Enregistrer & Transmettre à l\'Admin';
      }
    }
  });
}

// -------------------------------------------------------------
// 6. ÉVÉNEMENTS RECHERCHE ET ONGLETS
// -------------------------------------------------------------
if (searchInputEl) {
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderGuests();
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter || 'all';
    renderGuests();
  });
});

kpiCards.forEach(card => {
  card.addEventListener('click', () => {
    const filter = card.dataset.filter;
    if (!filter) return;
    activeFilter = filter;
    filterBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderGuests();
  });
});

if (btnRefresh) {
  btnRefresh.addEventListener('click', () => {
    loadSupervisorGuests(true);
    loadPinnedNote();
    showToast('🔄 Données actualisées en direct');
  });
}

// -------------------------------------------------------------
// 7. INITIALISATION ET BOUCLE TEMPS RÉEL (4s)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateSupervisorIdentityUI();
  loadPinnedNote();
  loadSupervisorGuests(true);

  // Boucle de rafraîchissement temps réel rapide (4 secondes)
  pollTimer = setInterval(() => {
    loadPinnedNote();
    loadSupervisorGuests(false);
  }, 4000);
});
