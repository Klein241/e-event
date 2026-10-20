/**
 * COMPAGNON DE CÉRÉMONIE - Module Jeux Bibliques Hors-Ligne
 * Extraction complète du projet holographic-ring V1.4 :
 * 1. Quiz Biblique 200+ questions (Facile, Moyen, Thèmes)
 * 2. Qui Suis-Je ? (Devinettes de personnages avec indices progressifs)
 * 3. Chrono-Frise (Ordonner les événements bibliques par chronologie)
 * 4. Reconstituer le Verset (Memory & mémorisation de la Parole)
 * < 600 lignes
 */

import {
  getQuickBibleQuiz,
  getWhoAmICharacters,
  getAllBlockInfos,
  getBlockQuestions,
  WHO_AM_I_CHARACTERS,
  getRandomChronoEvents,
  getRandomMemoryVerse
} from './bible-quiz-data.js';
import { AppState } from './state.js';
import { Api } from './api.js';

// ============================================================
// ÉTAT LOCAL & GESTION DES POINTS RÉGULÉE
// ============================================================
function creditGamePoints(pointsWon, reason) {
  if (pointsWon <= 0) return;
  if (AppState.guest) {
    AppState.addPoints(pointsWon, reason);
    Api.addPoints({
      guest_id: AppState.guest.id,
      guest_name: AppState.guest.name,
      table_number: AppState.guest.table_number,
      points: pointsWon,
      reason
    }).catch(err => console.warn("[Points] Erreur sync :", err));

    window.showToast?.(`⭐ +${pointsWon} pts remportés pour votre Table (${AppState.guest.table_number}) !`, 'success');
  }
}

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval = null;
let timeLeft = 15;

// État "Qui Suis-Je ?"
let whoAmICharacters = [];
let whoAmICurrentIndex = 0;
let whoAmIClueIndex = 0;
let whoAmIScore = 0;

// État "Chrono-Frise"
let chronoItems = [];
let chronoScore = 0;
let chronoValidated = false;

// État "Reconstituer le Verset"
let currentVerse = null;
let verseOriginalWords = [];
let versePlacedWords = [];
let versePoolWords = []; // { id, word, used }
let verseScore = 0;

// ============================================================
// MODULE PRINCIPAL
// ============================================================
export const BibleGamesModule = {

  init() {
    this.renderSelectionScreen();
  },

  renderSelectionScreen() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    if (timerInterval) clearInterval(timerInterval);

    const blocks = getAllBlockInfos();
    container.innerHTML = `
      <div class="bible-games-hub">
        <div class="bible-games-header">
          <h3>📖 Jeux & Défis Bibliques</h3>
          <p style="font-size:0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
            4 modes de jeux interactifs extraits des Saintes Écritures
          </p>
        </div>

        <div class="bible-game-modes">
          <!-- ⚔️ Mode Duel Table vs Table mis en vedette -->
          <button class="bible-mode-btn btn-3d btn-3d-coral" style="grid-column: 1 / -1; padding: 0.9rem; border: 1.5px solid var(--coral-primary); background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(212, 175, 55, 0.25));" onclick="window.GamesModule.startDuelMode()">
            <span style="font-size: 1.05rem; font-weight: 800; color: #ff7a45; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span>⚔️</span><span>MODE DUEL : TABLE VS TABLE</span><span>🔥</span>
            </span>
            <span style="font-size: 0.76rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">
              Défiez les autres tables en 5 manches express ! Marquez +100 pts par manche pour votre Table !
            </span>
          </button>

          <button class="bible-mode-btn btn-3d btn-3d-gold" onclick="window.BibleGames.startQuiz('easy')">
            <span>⚡ Grand Quiz Biblique (10 Qs)</span>
          </button>
          <button class="bible-mode-btn btn-3d btn-3d-coral" onclick="window.BibleGames.startWhoAmI()">
            <span>🤔 Défi "Qui Suis-Je ?"</span>
          </button>
          <button class="bible-mode-btn btn-3d btn-3d-amber" onclick="window.BibleGames.startChrono()">
            <span>⏳ Chrono-Frise des Événements</span>
          </button>
          <button class="bible-mode-btn btn-3d btn-3d-porcelain" onclick="window.BibleGames.startVerseMemory()">
            <span>📜 Reconstituer le Verset</span>
          </button>
        </div>

        <div class="bible-blocks-grid">
          <p style="font-size:0.78rem; color: var(--text-dim); text-align:center; margin-bottom: 0.5rem; grid-column: 1 / -1;">
            Ou lancez un quiz par thème biblique :
          </p>
          ${blocks.map(b => `
            <button class="bible-block-btn" onclick="window.BibleGames.startQuizBlock(${b.block})">
              <span class="block-icon">${b.icon}</span>
              <span class="block-label">${b.theme}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ════════════════════════════════════════════════════════════
  // 1. MODE QUIZ BIBLIQUE
  // ════════════════════════════════════════════════════════════

  startQuiz(difficulty = 'easy', block = null) {
    currentQuestions = block
      ? getBlockQuestions(block, difficulty)
      : getQuickBibleQuiz(10, difficulty);
    currentQuestionIndex = 0;
    score = 0;
    this.renderQuestion();
  },

  startQuizBlock(block) {
    this.startQuiz('easy', block);
  },

  renderQuestion() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    if (currentQuestionIndex >= currentQuestions.length) {
      this.renderQuizResults();
      return;
    }

    const q = currentQuestions[currentQuestionIndex];
    timeLeft = 15;

    container.innerHTML = `
      <div class="bible-quiz-card">
        <div class="bible-quiz-topbar">
          <span class="bible-quiz-progress">Question ${currentQuestionIndex + 1}/${currentQuestions.length}</span>
          <span class="bible-quiz-score">⭐ ${score} pts</span>
          <span class="bible-quiz-timer" id="bible-timer">${timeLeft}s</span>
        </div>

        <div class="bible-timer-bar-wrap">
          <div class="bible-timer-bar" id="bible-timer-bar" style="width:100%"></div>
        </div>

        <div class="bible-question-text">${escapeHtml(q.question)}</div>

        <div class="bible-options-grid" id="bible-options-grid">
          ${q.options.map((opt, i) => `
            <button class="bible-option-btn" data-index="${i}" onclick="window.BibleGames.selectAnswer(${i})">
              <span class="bible-opt-letter">${['A','B','C','D'][i]}</span>
              <span>${escapeHtml(opt)}</span>
            </button>
          `).join('')}
        </div>

        ${q.reference ? `<div class="bible-reference">📖 Réf : ${escapeHtml(q.reference)}</div>` : ''}
        <div id="bible-feedback"></div>
      </div>
    `;

    this.startTimer(q);
  },

  startTimer(q) {
    if (timerInterval) clearInterval(timerInterval);
    const bar = document.getElementById('bible-timer-bar');
    const timerEl = document.getElementById('bible-timer');

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timerEl) timerEl.textContent = timeLeft + 's';
      if (bar) bar.style.width = `${(timeLeft / 15) * 100}%`;

      if (timeLeft <= 5 && bar) bar.style.background = 'var(--coral-primary, #ef4444)';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        this.showAnswerFeedback(q, -1);
      }
    }, 1000);
  },

  selectAnswer(selectedIndex) {
    if (timerInterval) clearInterval(timerInterval);
    const q = currentQuestions[currentQuestionIndex];

    document.querySelectorAll('.bible-option-btn').forEach(b => b.disabled = true);

    const isCorrect = selectedIndex === q.correct;
    let pointsWon = 0;
    if (isCorrect) {
      // Barème régulé : 100 points de base + 2 points par seconde restante (max 30 pts)
      const speedBonus = Math.max(0, timeLeft * 2);
      pointsWon = 100 + speedBonus;
      score += pointsWon;
      creditGamePoints(pointsWon, 'bible_quiz');
      document.querySelector(`[data-index="${selectedIndex}"]`)?.classList.add('correct');
    } else {
      document.querySelector(`[data-index="${selectedIndex}"]`)?.classList.add('wrong');
      document.querySelector(`[data-index="${q.correct}"]`)?.classList.add('correct');
    }

    this.showAnswerFeedback(q, selectedIndex, pointsWon);
  },

  showAnswerFeedback(q, selectedIndex, pointsWon = 0) {
    const feedback = document.getElementById('bible-feedback');
    const isCorrect = selectedIndex === q.correct;

    if (feedback) {
      feedback.innerHTML = `
        <div class="bible-feedback-box ${isCorrect ? 'correct' : (selectedIndex === -1 ? 'timeout' : 'wrong')}">
          ${isCorrect ? `🎉 Bravo ! +${pointsWon} pts (100 pts + ${Math.max(0, timeLeft * 2)} pts rapidité)` : (selectedIndex === -1 ? '⏰ Temps écoulé !' : '❌ Pas tout à fait !')}
          ${!isCorrect && selectedIndex !== -1 ? ` La bonne réponse était : <strong>${escapeHtml(q.options[q.correct])}</strong>` : ''}
        </div>
        <button class="btn-3d btn-3d-gold" style="margin-top:0.75rem; width:100%;" onclick="window.BibleGames.nextQuestion()">
          <span>${currentQuestionIndex + 1 >= currentQuestions.length ? '🏆 Voir mes résultats' : 'Question suivante →'}</span>
        </button>
      `;
    }
  },

  nextQuestion() {
    currentQuestionIndex++;
    this.renderQuestion();
  },

  renderQuizResults() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    const total = currentQuestions.length;
    const pct = Math.round((score / (total * 105)) * 100);
    const medal = pct >= 80 ? '🏆' : pct >= 50 ? '🥈' : '📖';

    container.innerHTML = `
      <div class="bible-quiz-results">
        <div style="font-size:3rem; margin-bottom:0.5rem;">${medal}</div>
        <h3>Quiz Terminé !</h3>
        <div class="bible-final-score">${score} points</div>
        <p style="color: var(--text-muted); font-size: 0.85rem;">${pct}% de réussite sur ${total} questions</p>
        <div style="display:flex; gap:0.75rem; margin-top:1.25rem; justify-content:center; flex-wrap:wrap;">
          <button class="btn-3d btn-3d-gold" onclick="window.BibleGames.startQuiz('easy')">
            <span>🔄 Rejouer</span>
          </button>
          <button class="btn-3d btn-3d-coral" onclick="window.BibleGames.startWhoAmI()">
            <span>🤔 Qui Suis-Je ?</span>
          </button>
          <button class="btn-icon" onclick="window.BibleGames.init()" style="width:auto; padding:0 1rem;">Menu</button>
        </div>
      </div>
    `;
  },

  // ════════════════════════════════════════════════════════════
  // 2. MODE QUI SUIS-JE ?
  // ════════════════════════════════════════════════════════════

  startWhoAmI() {
    whoAmICharacters = getWhoAmICharacters(6);
    whoAmICurrentIndex = 0;
    whoAmIClueIndex = 0;
    whoAmIScore = 0;
    this.renderWhoAmI();
  },

  renderWhoAmI() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    if (whoAmICurrentIndex >= whoAmICharacters.length) {
      this.renderWhoAmIResults();
      return;
    }

    const char = whoAmICharacters[whoAmICurrentIndex];
    const visibleClues = char.clues.slice(0, whoAmIClueIndex + 1);

    container.innerHTML = `
      <div class="whoami-card">
        <div class="whoami-topbar">
          <span>🤔 Énigme ${whoAmICurrentIndex + 1}/${whoAmICharacters.length}</span>
          <span style="color: var(--gold-primary);">⭐ ${whoAmIScore} pts</span>
        </div>

        <div class="whoami-question">Qui Suis-Je dans la Bible ?</div>

        <div class="whoami-clues">
          ${visibleClues.map((clue, i) => `
            <div class="whoami-clue ${i === whoAmIClueIndex ? 'new' : ''}">
              <span class="clue-num">${i + 1}</span>
              <span>${escapeHtml(clue)}</span>
            </div>
          `).join('')}
        </div>

        ${whoAmIClueIndex < char.clues.length - 1 ? `
          <button class="btn-icon" style="width:100%; margin-top:0.75rem; font-size:0.8rem;" onclick="window.BibleGames.showNextClue()">
            💡 Révéler un indice supplémentaire (-5 pts)
          </button>
        ` : ''}

        <div class="whoami-names-grid" id="whoami-choices">
          ${generateWhoAmIChoices(char).map(name => `
            <button class="whoami-choice-btn" onclick="window.BibleGames.answerWhoAmI('${escapeHtml(name)}', '${escapeHtml(char.name)}')">
              ${escapeHtml(name)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  showNextClue() {
    whoAmIClueIndex = Math.min(whoAmIClueIndex + 1, whoAmICharacters[whoAmICurrentIndex].clues.length - 1);
    this.renderWhoAmI();
  },

  answerWhoAmI(selected, correct) {
    const isCorrect = selected === correct;
    const pointsEarned = isCorrect ? Math.max(10, 30 - (whoAmIClueIndex * 10)) : 0;
    whoAmIScore += pointsEarned;

    if (isCorrect) {
      creditGamePoints(pointsEarned, 'whoami');
    }

    document.querySelectorAll('.whoami-choice-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.trim() === correct) btn.classList.add('correct');
      else if (btn.textContent.trim() === selected && !isCorrect) btn.classList.add('wrong');
    });

    const grid = document.getElementById('whoami-choices');
    if (grid) {
      const msg = document.createElement('div');
      msg.className = `bible-feedback-box ${isCorrect ? 'correct' : 'wrong'}`;
      msg.innerHTML = isCorrect ? `🎉 Bravo ! C'est bien <strong>${escapeHtml(correct)}</strong> ! +${pointsEarned} pts` : `❌ C'était <strong>${escapeHtml(correct)}</strong>`;
      grid.after(msg);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-3d btn-3d-coral';
      nextBtn.style.marginTop = '0.75rem';
      nextBtn.style.width = '100%';
      nextBtn.innerHTML = `<span>${whoAmICurrentIndex + 1 >= whoAmICharacters.length ? '🏆 Voir mes résultats' : 'Personnage suivant →'}</span>`;
      nextBtn.onclick = () => { whoAmICurrentIndex++; whoAmIClueIndex = 0; this.renderWhoAmI(); };
      msg.after(nextBtn);
    }
  },

  renderWhoAmIResults() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    const max = whoAmICharacters.length * 30;
    const pct = Math.round((whoAmIScore / max) * 100);

    container.innerHTML = `
      <div class="bible-quiz-results">
        <div style="font-size:3rem;">🤔</div>
        <h3>Défi "Qui Suis-Je ?" Terminé !</h3>
        <div class="bible-final-score">${whoAmIScore} / ${max} pts</div>
        <p style="color: var(--text-muted); font-size:0.85rem;">${pct}% de réussite</p>
        <div style="display:flex; gap:0.75rem; margin-top:1.25rem; flex-wrap:wrap; justify-content:center;">
          <button class="btn-3d btn-3d-coral" onclick="window.BibleGames.startWhoAmI()"><span>🔄 Rejouer</span></button>
          <button class="btn-3d btn-3d-amber" onclick="window.BibleGames.startChrono()"><span>⏳ Chrono-Frise</span></button>
          <button class="btn-icon" onclick="window.BibleGames.init()" style="width:auto; padding:0 1rem;">Menu</button>
        </div>
      </div>
    `;
  },

  // ════════════════════════════════════════════════════════════
  // 3. MODE CHRONO-FRISE (Ordonner les événements bibliques)
  // ════════════════════════════════════════════════════════════

  startChrono() {
    chronoItems = getRandomChronoEvents(5);
    chronoScore = 0;
    chronoValidated = false;
    this.renderChrono();
  },

  renderChrono() {
    const container = document.getElementById('bible-games-container');
    if (!container) return;

    container.innerHTML = `
      <div class="bible-quiz-card">
        <div class="whoami-topbar">
          <span>⏳ Défi Chronologique</span>
          <button class="btn-icon" style="font-size:0.75rem; width:auto; padding:2px 8px;" onclick="window.BibleGames.init()">Retour Menu</button>
        </div>

        <h4 style="font-size: 1.05rem; color: var(--gold-primary); text-align:center; margin-bottom: 0.35rem;">
          Placez ces 5 événements dans l'ordre chronologique
        </h4>
        <p style="font-size: 0.78rem; color: var(--text-muted); text-align:center; margin-bottom: 1rem;">
          Du plus ancien (en haut) au plus récent (en bas). Utilisez les flèches ⬆ ⬇.
        </p>

        <div class="chrono-list" id="chrono-items-container">
          ${chronoItems.map((item, idx) => `
            <div class="chrono-row ${chronoValidated ? (this.isItemInRightPosition(idx) ? 'correct' : 'wrong') : ''}">
              <div class="chrono-idx">${idx + 1}</div>
              <div class="chrono-content">
                <div class="chrono-title">${escapeHtml(item.event)}</div>
                ${chronoValidated ? `<div class="chrono-year">📅 ${escapeHtml(item.year)}</div>` : ''}
              </div>
              ${!chronoValidated ? `
                <div class="chrono-actions">
                  <button class="chrono-arrow-btn" ${idx === 0 ? 'disabled' : ''} onclick="window.BibleGames.moveChrono(${idx}, -1)">▲</button>
                  <button class="chrono-arrow-btn" ${idx === chronoItems.length - 1 ? 'disabled' : ''} onclick="window.BibleGames.moveChrono(${idx}, 1)">▼</button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 1.25rem;">
          ${!chronoValidated ? `
            <button class="btn-3d btn-3d-amber" style="width: 100%;" onclick="window.BibleGames.validateChrono()">
              <span>✅ Valider ma Chronologie</span>
            </button>
          ` : `
            <div class="bible-feedback-box ${chronoScore >= 40 ? 'correct' : 'wrong'}">
              ${chronoScore >= 40 ? '🎉 Impressionnant ! Excellente connaissance de l\'histoire sainte !' : '📖 Bel essai ! Observez les repères historiques révélés ci-dessus.'}
              <div style="font-size:1.1rem; font-weight:800; margin-top:0.25rem;">+${chronoScore} points</div>
            </div>
            <div style="display:flex; gap:0.75rem; margin-top:0.75rem;">
              <button class="btn-3d btn-3d-amber" style="flex:1;" onclick="window.BibleGames.startChrono()"><span>🔄 Nouveau Défi</span></button>
              <button class="btn-3d btn-3d-porcelain" style="flex:1;" onclick="window.BibleGames.startVerseMemory()"><span>📜 Reconstituer Verset</span></button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  moveChrono(fromIdx, direction) {
    if (chronoValidated) return;
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= chronoItems.length) return;

    const temp = chronoItems[fromIdx];
    chronoItems[fromIdx] = chronoItems[toIdx];
    chronoItems[toIdx] = temp;

    this.renderChrono();
  },

  isItemInRightPosition(idx) {
    // Vérifier si l'ordre est monotone croissant
    if (idx === 0) return true;
    return chronoItems[idx].order >= chronoItems[idx - 1].order;
  },

  validateChrono() {
    chronoValidated = true;
    let correctCount = 0;

    for (let i = 0; i < chronoItems.length - 1; i++) {
      if (chronoItems[i].order < chronoItems[i + 1].order) {
        correctCount++;
      }
    }

    // 4 transitions possibles entre 5 éléments (jusqu'à 50 points)
    chronoScore = Math.round((correctCount / 4) * 50);
    if (chronoScore > 0) {
      creditGamePoints(chronoScore, 'chrono');
    }
    this.renderChrono();
  },

  // ════════════════════════════════════════════════════════════
  // 4. MODE RECONSTITUER LE VERSET (Memory de la Parole)
  // ════════════════════════════════════════════════════════════

  startVerseMemory() {
    currentVerse = getRandomMemoryVerse();
    verseOriginalWords = currentVerse.text.split(/\s+/).filter(Boolean);
    versePlacedWords = [];
    currentVerse.awarded = false;

    // Créer la banque de mots mélangée
    versePoolWords = verseOriginalWords.map((w, idx) => ({
      id: `w_${idx}_${Math.random()}`,
      word: w,
      used: false
    })).sort(() => Math.random() - 0.5);

    verseScore = 0;
    this.renderVerseMemory();
  },

  renderVerseMemory() {
    const container = document.getElementById('bible-games-container');
    if (!container || !currentVerse) return;

    const isComplete = versePlacedWords.length === verseOriginalWords.length;
    const isCorrect = isComplete && versePlacedWords.map(w => w.word).join(' ') === verseOriginalWords.join(' ');

    if (isCorrect && !currentVerse.awarded) {
      currentVerse.awarded = true;
      creditGamePoints(50, 'verse_memory');
    }

    container.innerHTML = `
      <div class="bible-quiz-card">
        <div class="whoami-topbar">
          <span style="color: var(--gold-primary); font-weight:800;">📜 ${escapeHtml(currentVerse.reference)}</span>
          <span style="font-size:0.75rem; color: var(--text-dim);">${escapeHtml(currentVerse.theme)}</span>
        </div>

        <h4 style="font-size: 1rem; color: var(--text-main); text-align:center; margin-bottom: 0.25rem;">
          Reconstituez le verset biblique mot par mot
        </h4>
        <p style="font-size: 0.78rem; color: var(--text-muted); text-align:center; margin-bottom: 1rem;">
          Cliquez sur les mots ci-dessous dans le bon ordre pour reformer le texte saint.
        </p>

        <!-- Zone de texte assemblé -->
        <div class="verse-assembled-box" id="verse-assembly-zone">
          ${versePlacedWords.length === 0 ? `
            <span style="color: var(--text-dim); font-style:italic; font-size:0.85rem;">Touchez les mots ci-dessous pour commencer à composer le verset...</span>
          ` : versePlacedWords.map((item, idx) => `
            <button class="verse-word-chip placed" onclick="window.BibleGames.removeWordFromAssembly(${idx})">
              ${escapeHtml(item.word)}
            </button>
          `).join('')}
        </div>

        <!-- Feedback en cas de complétion -->
        ${isComplete ? `
          <div class="bible-feedback-box ${isCorrect ? 'correct' : 'wrong'}" style="margin: 0.85rem 0;">
            ${isCorrect ? `
              🎉 Magnifique ! Verset mémorisé avec succès ! +50 pts pour votre Table !
              <div style="font-size:0.85rem; margin-top:0.35rem; color: var(--text-main);">
                « ${escapeHtml(currentVerse.text)} »
              </div>
            ` : `
              ❌ Quelques mots ne sont pas à leur place. Réessayez !
            `}
          </div>
        ` : ''}

        <!-- Banque de mots cliquables -->
        <div class="verse-pool-grid">
          ${versePoolWords.map(item => `
            <button class="verse-word-chip pool ${item.used ? 'used' : ''}" ${item.used ? 'disabled' : ''} onclick="window.BibleGames.pickWord('${item.id}')">
              ${escapeHtml(item.word)}
            </button>
          `).join('')}
        </div>

        <div style="display:flex; gap:0.6rem; margin-top:1.25rem; flex-wrap:wrap;">
          <button class="btn-icon" style="flex:1; font-size:0.8rem;" onclick="window.BibleGames.resetVerseAssembly()">
            ↺ Réinitialiser
          </button>
          <button class="btn-3d btn-3d-gold" style="flex:2;" onclick="window.BibleGames.startVerseMemory()">
            <span>Verset suivant ➔</span>
          </button>
          <button class="btn-icon" style="width:auto; padding:0 1rem;" onclick="window.BibleGames.init()">Menu</button>
        </div>
      </div>
    `;
  },

  pickWord(id) {
    const item = versePoolWords.find(w => w.id === id);
    if (!item || item.used) return;

    item.used = true;
    versePlacedWords.push(item);
    this.renderVerseMemory();
  },

  removeWordFromAssembly(idx) {
    const item = versePlacedWords[idx];
    if (!item) return;

    item.used = false;
    versePlacedWords.splice(idx, 1);
    this.renderVerseMemory();
  },

  resetVerseAssembly() {
    versePlacedWords = [];
    versePoolWords.forEach(w => w.used = false);
    this.renderVerseMemory();
  }
};

// ============================================================
// FONCTIONS UTILITAIRES LOCALES
// ============================================================

function generateWhoAmIChoices(correctChar) {
  const pool = (WHO_AM_I_CHARACTERS || []).filter(c => c.id !== correctChar.id).map(c => c.name);
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [correctChar.name, ...distractors].sort(() => Math.random() - 0.5);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// Exposer sur window pour les clics inline
window.BibleGames = BibleGamesModule;
