/* ============================================================
   JOURS DE RENCONTRE - LOGIQUE INTERACTIVE LANDING PAGE
   Studio de Billetterie 3D, Customisation Temps Réel & Interactions
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initTicketStudio();
  initFaqAccordion();
});

/* 1. Animation Navbar au Scroll */
function initNavbarScroll() {
  const navbar = document.querySelector('.site-navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* 2. Modèles de Billets de Prestige */
const TICKET_MODELS = {
  mariage: {
    id: 'mariage',
    name: 'Mariage Princier & Royal',
    tag: 'Mariage Princier & Royal',
    title: 'Célébration d’Union & Réception de Mariage',
    subtitle: 'Samedi 18 Juillet 2026 • 16h00 • Palais des Roses',
    cssClass: 'ticket-model-mariage',
    defaultGuest: 'Mme Grâce MBOUMBA',
    defaultRank: 'Invitée d’Honneur',
    defaultTable: 'Table d’Honneur N°1',
    securityCode: 'MRG-2026-ROYAL',
    brand: 'NOCES D’OR',
    accentColor: '#9C5824'
  },
  b2b: {
    id: 'b2b',
    name: 'Sommet B2B & Forum VIP',
    tag: 'VIP All-Access Delegate',
    title: 'Sommet Économique & Forum des Leaders',
    subtitle: 'Mardi 15 Septembre 2026 • 08h30 • Palais des Congrès',
    cssClass: 'ticket-model-b2b',
    defaultGuest: 'Dr Christian BOMA',
    defaultRank: 'Keynote Speaker & Délégué',
    defaultTable: 'Carré Plénière A • Rang VIP',
    securityCode: 'B2B-LEAD-884',
    brand: 'LEADERS SUMMIT',
    accentColor: '#00F0FF'
  },
  gospel: {
    id: 'gospel',
    name: 'Soirée Gospel & Célébration',
    tag: 'Soirée Gospel Sacrée',
    title: 'Grande Nuit de Louange, d’Adoration & Bénédiction',
    subtitle: 'Vendredi 28 Août 2026 • 18h00 • Esplanade de la Grâce',
    cssClass: 'ticket-model-gospel',
    defaultGuest: 'Pasteur David & Famille',
    defaultRank: 'Convive de Bénédiction',
    defaultTable: 'Carré Céleste • Rangée 3',
    securityCode: 'GOSPEL-PRAISE-77',
    brand: 'GLORY NIGHT',
    accentColor: '#FDE047'
  },
  jubile: {
    id: 'jubile',
    name: 'Anniversaire Jubilé Art Déco',
    tag: 'Soirée Privée Art Déco',
    title: 'Jubilé d’Or & Célébration d’Exception (50 Ans)',
    subtitle: 'Samedi 10 Octobre 2026 • 19h30 • Villa Saphir Impérial',
    cssClass: 'ticket-model-jubile',
    defaultGuest: 'M. & Mme Marc ELLA',
    defaultRank: 'Invité d’Honneur',
    defaultTable: 'Table Prestige Gatsby',
    securityCode: 'JUB-50-GOLD',
    brand: 'JUBILÉ ROYAL',
    accentColor: '#FEF08A'
  },
  charite: {
    id: 'charite',
    name: 'Gala de Charité & Mécénat',
    tag: 'Mécénat & Haute Bienfaisance',
    title: 'Gala de Charité & Nuit Philanthropique de l’Espoir',
    subtitle: 'Samedi 5 Décembre 2026 • 20h00 • Salon d’Honneur',
    cssClass: 'ticket-model-charite',
    defaultGuest: 'Mme Élisabeth KOUASSI',
    defaultRank: 'Mécène Bienfaitrice',
    defaultTable: 'Table Philanthropique N°2',
    securityCode: 'GALA-HOPE-99',
    brand: 'PHILANTHROPY',
    accentColor: '#FCD34D'
  },
  gala: {
    id: 'gala',
    name: 'Dîner de Gala Impérial',
    tag: 'Dîner de Gala Officiel',
    title: '2ème Édition du Prestigieux Dîner de Gala',
    subtitle: 'Samedi 24 Octobre 2026 • 15h00 • Salle Le Rocher des Âges',
    cssClass: 'ticket-model-gala',
    defaultGuest: 'Mme Viviane NGUEMA',
    defaultRank: 'Invitée de Marque',
    defaultTable: 'Table N°7 • Prestige',
    securityCode: 'GALA-2026-VIP-7',
    brand: 'JOURS DE RENCONTRE',
    accentColor: '#D4AF37'
  }
};

let currentModelKey = 'gala';

/* 3. Initialisation du Studio Interactif */
function initTicketStudio() {
  const nameInput = document.getElementById('studio-guest-name');
  const rankSelect = document.getElementById('studio-rank');
  const tableInput = document.getElementById('studio-table');
  const modelTabs = document.querySelectorAll('.model-tab-btn');
  const whatsappBtn = document.getElementById('studio-whatsapp-btn');
  const downloadBtn = document.getElementById('studio-download-btn');
  const ticketBox = document.getElementById('studio-ticket-render');
  const stage = document.querySelector('.studio-stage');

  if (!ticketBox) return;

  // Mise à jour de l'affichage
  function updateTicketDisplay() {
    const model = TICKET_MODELS[currentModelKey] || TICKET_MODELS.gala;
    const guestName = (nameInput && nameInput.value.trim()) || model.defaultGuest;
    const guestRank = (rankSelect && rankSelect.value) || model.defaultRank;
    const guestTable = (tableInput && tableInput.value.trim()) || model.defaultTable;

    // Reset classes
    ticketBox.className = 'live-ticket ' + model.cssClass;

    // Éléments internes
    const tagEl = ticketBox.querySelector('.ticket-top-tag');
    const brandEl = ticketBox.querySelector('.ticket-brand-mark');
    const titleEl = ticketBox.querySelector('.ticket-main-title');
    const subtitleEl = ticketBox.querySelector('.ticket-event-subtitle');
    const nameEl = ticketBox.querySelector('.ticket-guest-name');
    const rankEl = ticketBox.querySelector('.ticket-val-rank');
    const tableEl = ticketBox.querySelector('.ticket-val-table');
    const secEl = ticketBox.querySelector('.ticket-val-sec');

    if (tagEl) tagEl.textContent = model.tag;
    if (brandEl) brandEl.textContent = model.brand;
    if (titleEl) titleEl.textContent = model.title;
    if (subtitleEl) subtitleEl.textContent = model.subtitle;
    if (nameEl) nameEl.textContent = guestName;
    if (rankEl) rankEl.textContent = guestRank;
    if (tableEl) tableEl.textContent = guestTable;
    if (secEl) secEl.textContent = model.securityCode;
  }

  // Changement d'onglet modèle
  modelTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      modelTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const modelKey = btn.getAttribute('data-model');
      if (TICKET_MODELS[modelKey]) {
        currentModelKey = modelKey;
        const model = TICKET_MODELS[modelKey];
        if (nameInput && (!nameInput.value || nameInput.value === TICKET_MODELS.gala.defaultGuest)) {
          nameInput.value = model.defaultGuest;
        }
        if (tableInput) {
          tableInput.value = model.defaultTable;
        }
        updateTicketDisplay();
      }
    });
  });

  // Écouteurs de saisie temps réel
  if (nameInput) nameInput.addEventListener('input', updateTicketDisplay);
  if (rankSelect) rankSelect.addEventListener('change', updateTicketDisplay);
  if (tableInput) tableInput.addEventListener('input', updateTicketDisplay);

  // 3D Tilt au survol de la souris
  if (stage && ticketBox) {
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const rotY = (x / (rect.width / 2)) * 12;
      const rotX = -(y / (rect.height / 2)) * 12;

      ticketBox.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(1.02)`;
    });

    stage.addEventListener('mouseleave', () => {
      ticketBox.style.transform = `rotateY(0deg) rotateX(0deg) scale(1)`;
    });
  }

  // Clic WhatsApp Devis Express
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const model = TICKET_MODELS[currentModelKey] || TICKET_MODELS.gala;
      const guestName = (nameInput && nameInput.value.trim()) || model.defaultGuest;
      const text = 
        `Bonjour Jours de Rencontre !\n\n` +
        `Je suis très intéressé(e) par vos services de billetterie numérique d’exception et votre compagnon de cérémonie interactif.\n\n` +
        `✨ *Modèle de Billet choisi :* ${model.name}\n` +
        `🎟️ *Exemple d'invité :* ${guestName}\n` +
        `📍 *Projet d'événement :* (Mariage / Gala / Soirée / Sommet)\n\n` +
        `Pouvez-vous me présenter vos formules et établir un devis personnalisé ? Merci !`;

      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  // Téléchargement Spécimen Image
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadTicketCanvasSpecimen();
    });
  }

  // Premier rendu
  updateTicketDisplay();
}

/* 4. Génération & Téléchargement Spécimen HD */
function downloadTicketCanvasSpecimen() {
  const model = TICKET_MODELS[currentModelKey] || TICKET_MODELS.gala;
  const nameInput = document.getElementById('studio-guest-name');
  const tableInput = document.getElementById('studio-table');
  const guestName = (nameInput && nameInput.value.trim()) || model.defaultGuest;
  const guestTable = (tableInput && tableInput.value.trim()) || model.defaultTable;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fond dégradé luxueux
  let bgGradient;
  if (currentModelKey === 'mariage') {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#FFFDF8');
    bgGradient.addColorStop(1, '#E6D6C2');
  } else if (currentModelKey === 'b2b') {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#0A1128');
    bgGradient.addColorStop(1, '#070B19');
  } else if (currentModelKey === 'gospel') {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#3B0764');
    bgGradient.addColorStop(1, '#0D0218');
  } else if (currentModelKey === 'jubile') {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#06281E');
    bgGradient.addColorStop(1, '#041B14');
  } else if (currentModelKey === 'charite') {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#3A050F');
    bgGradient.addColorStop(1, '#240208');
  } else {
    bgGradient = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGradient.addColorStop(0, '#161922');
    bgGradient.addColorStop(1, '#090B10');
  }

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 1200, 700);

  // Bordure d'or
  ctx.lineWidth = 6;
  ctx.strokeStyle = model.accentColor || '#D4AF37';
  ctx.strokeRect(30, 30, 1140, 640);

  ctx.lineWidth = 1.5;
  ctx.strokeRect(42, 42, 1116, 616);

  // Textes
  const textColor = currentModelKey === 'mariage' ? '#2D231E' : '#FFFFFF';
  const goldColor = model.accentColor || '#D4AF37';

  // En-tête
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = goldColor;
  ctx.textAlign = 'left';
  ctx.fillText(model.tag.toUpperCase(), 70, 95);

  ctx.textAlign = 'right';
  ctx.font = 'bold 22px "Playfair Display", Georgia, serif';
  ctx.fillText(model.brand, 1130, 95);

  // Ligne de séparation
  ctx.beginPath();
  ctx.setLineDash([8, 8]);
  ctx.moveTo(70, 125);
  ctx.lineTo(1130, 125);
  ctx.strokeStyle = goldColor;
  ctx.stroke();
  ctx.setLineDash([]);

  // Titre événement
  ctx.textAlign = 'left';
  ctx.font = 'bold 36px "Playfair Display", Georgia, serif';
  ctx.fillStyle = textColor;
  ctx.fillText(model.title, 70, 185);

  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = currentModelKey === 'mariage' ? '#554236' : '#94A3B8';
  ctx.fillText(model.subtitle, 70, 225);

  // Invitation nominative
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = goldColor;
  ctx.fillText("INVITATION OFFICIELLE DÉLIVRÉE À L'HONNEUR DE :", 70, 310);

  // Nom calligraphié
  ctx.font = 'italic bold 56px "Great Vibes", "Playfair Display", Georgia, cursive';
  ctx.fillStyle = goldColor;
  ctx.fillText(guestName, 70, 390);

  // Métadonnées
  ctx.fillStyle = currentModelKey === 'mariage' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  ctx.fillRect(70, 440, 800, 110);
  ctx.strokeRect(70, 440, 800, 110);

  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = currentModelKey === 'mariage' ? '#665042' : '#94A3B8';
  ctx.fillText("TABLE ATTITRÉE", 100, 475);
  ctx.fillText("STATUT", 380, 475);
  ctx.fillText("CODE UNIQUE", 660, 475);

  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(guestTable, 100, 520);
  ctx.fillText(model.defaultRank, 380, 520);
  ctx.fillText(model.securityCode, 660, 520);

  // Pied de page
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = currentModelKey === 'mariage' ? '#665042' : '#64748B';
  ctx.fillText("Spécimen Numérique Haute Fidélité • Jours de Rencontre (joursderencontre.com)", 70, 620);

  // Téléchargement
  const link = document.createElement('a');
  link.download = `billet-${model.id}-specimen.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* 5. Accordéon FAQ */
function initFaqAccordion() {
  const cards = document.querySelectorAll('.faq-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      cards.forEach(c => c.classList.remove('open'));
      if (!isOpen) {
        card.classList.add('open');
      }
    });
  });
}
