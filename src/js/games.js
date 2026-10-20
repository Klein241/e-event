/**
 * COMPAGNON DE CÉRÉMONIE - Module Jeux & Quiz en Direct
 * 1. Arène de Duel Table vs Table Réelle & Synchronisée (D1 Serverless)
 *    - Sans Supabase et sans code d'accès (sélection instantanée par Table)
 *    - Face-à-face graphique en direct avec jauges de scores et de progression opposées
 *    - Synchronisation en direct entre les tables de la salle
 * 2. Quiz Live Animé par l'IA (M.C. Céleste IA)
 *    - Lancement en 1 clic sans PIN obligatoire
 *    - Répliques d'ambiance dynamiques & commentaires théologiques
 * 3. Classement des Tables (Leaderboard en direct)
 * Conçu selon les spécifications d'excellence.
 */

import { Api } from './api.js';
import { AppState } from './state.js';
import { getQuickBibleQuiz } from './bible-quiz-data.js';

export const GamesModule = {
  container: null,
  activeMode: 'live', // 'live' | 'duel'

  // Quiz Live IA
  timerInterval: null,
  remainingSeconds: 20,
  hasAnsweredCurrentQuiz: false,
  lastAnsweredQuizId: null,
  aiCommentary: "Que le meilleur gagne ! Faites briller votre table avec foi et rapidité !",

  // Duel Multijoueur Table vs Table
  duelActive: false,
  duelId: null,
  duelPollInterval: null,
  duelChallengerTable: '1',
  duelOpponentTable: '2',
  duelQuestions: [],
  duelCurrentIndex: 0,
  duelMyScore: 0,
  duelOpponentScore: 0,
  duelQuestionTimer: 15,
  duelQuestionInterval: null,
  duelHasAnsweredCurrent: false,

  init() {
    this.container = document.getElementById('games-tab');
    if (!this.container) return;

    this.refresh();
  },

  async refresh() {
    try {
      const [gamesData, leaderboardData, aiData] = await Promise.all([
        Api.getActiveGames(),
        Api.getLeaderboard(),
        Api.getAiMcCommentary()
      ]);

      if (gamesData.active_quiz && gamesData.active_quiz.id !== this.lastAnsweredQuizId) {
        this.hasAnsweredCurrentQuiz = false;
      }

      AppState.activeQuiz = gamesData.active_quiz;
      AppState.leaderboard = leaderboardData;
      if (aiData && aiData.commentary) {
        this.aiCommentary = aiData.commentary;
      }

      this.render();
    } catch (e) {
      console.warn("[Games] Erreur rafraîchissement live :", e);
    }
  },

  render() {
    if (!this.container) return;

    if (this.duelActive) {
      this.renderDuelArena();
    } else {
      this.renderLiveQuizSection();
    }

    this.renderLeaderboardSection();
  },

  // ════════════════════════════════════════════════════════════
  // 1. QUIZ LIVE ANIMÉ PAR L'IA (M.C. CÉLESTE IA)
  // ════════════════════════════════════════════════════════════

  openLiveQuiz() {
    this.duelActive = false;
    this.activeMode = 'live';
    if (this.duelPollInterval) clearInterval(this.duelPollInterval);
    if (this.duelQuestionInterval) clearInterval(this.duelQuestionInterval);

    this.refresh();
    const liveContainer = document.getElementById('live-games-container');
    if (liveContainer) liveContainer.style.display = 'block';
  },

  renderLiveQuizSection() {
    const quizCard = document.getElementById('quiz-card-container');
    if (!quizCard) return;

    const quiz = AppState.activeQuiz;

    // Pas de question live active : Hub d'accueil de l'Animateur IA
    if (!quiz) {
      quizCard.innerHTML = `
        <div class="live-waiting-hub">
          <div class="ai-mc-avatar-bubble">
            <div class="ai-mc-avatar">🤖</div>
            <div class="ai-mc-badge">M.C. CÉLESTE IA</div>
          </div>

          <div class="ai-mc-speech">
            « ${escapeHtml(this.aiCommentary)} »
          </div>

          <p style="font-size: 0.84rem; color: var(--text-muted); margin: 0.75rem auto 1.25rem; max-width: 420px; line-height: 1.4;">
            L'Animateur IA synchronise toutes les tables de la salle et le grand écran vidéoprojecteur en temps réel.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 380px; margin: 0 auto;">
            <button class="btn-3d btn-3d-gold" onclick="window.GamesModule.triggerAiNextQuestion()">
              <span>🚀 Animateur IA : Lancer la manche live !</span>
            </button>
            <button class="btn-3d btn-3d-coral" onclick="window.GamesModule.openDuelLobby()">
              <span>⚔️ Lancer un Duel de Tables (5 Manches)</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Question live active en cours pour toute la salle
    quizCard.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-timer-bar-container">
          <div class="quiz-timer-bar" id="quiz-timer-bar"></div>
        </div>

        <div class="ai-mc-live-header">
          <div class="ai-mc-live-pill">
            <span>🤖</span>
            <span>ANIMATEUR IA EN DIRECT</span>
          </div>
          <span class="quiz-points-badge">+${quiz.points || 100} PTS</span>
        </div>

        <div class="quiz-question-text">${escapeHtml(quiz.question)}</div>

        <div class="quiz-options-grid">
          <button class="quiz-option-btn ${this.hasAnsweredCurrentQuiz ? 'disabled' : ''}" data-option="A" onclick="window.selectQuizOption('A')">
            <span class="option-letter">A</span>
            <span>${escapeHtml(quiz.option_a)}</span>
          </button>
          <button class="quiz-option-btn ${this.hasAnsweredCurrentQuiz ? 'disabled' : ''}" data-option="B" onclick="window.selectQuizOption('B')">
            <span class="option-letter">B</span>
            <span>${escapeHtml(quiz.option_b)}</span>
          </button>
          ${quiz.option_c ? `
            <button class="quiz-option-btn ${this.hasAnsweredCurrentQuiz ? 'disabled' : ''}" data-option="C" onclick="window.selectQuizOption('C')">
              <span class="option-letter">C</span>
              <span>${escapeHtml(quiz.option_c)}</span>
            </button>
          ` : ''}
          ${quiz.option_d ? `
            <button class="quiz-option-btn ${this.hasAnsweredCurrentQuiz ? 'disabled' : ''}" data-option="D" onclick="window.selectQuizOption('D')">
              <span class="option-letter">D</span>
              <span>${escapeHtml(quiz.option_d)}</span>
            </button>
          ` : ''}
        </div>

        <div id="quiz-feedback-box"></div>

        <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <button class="btn-icon" style="font-size: 0.75rem; width: auto; padding: 4px 10px;" onclick="window.GamesModule.openDuelLobby()">
            ⚔️ Passer en Duel
          </button>
          <button class="btn-icon" style="font-size: 0.75rem; width: auto; padding: 4px 12px; color: var(--gold-primary);" onclick="window.GamesModule.triggerAiNextQuestion()">
            ⏭️ Animateur IA : Question suivante
          </button>
        </div>
      </div>
    `;

    if (!this.hasAnsweredCurrentQuiz) {
      this.startQuizTimer(quiz.duration_seconds || 20);
    }
  },

  startQuizTimer(duration) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.remainingSeconds = duration;
    const bar = document.getElementById('quiz-timer-bar');

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      if (bar) {
        const pct = Math.max(0, (this.remainingSeconds / duration) * 100);
        bar.style.width = `${pct}%`;
      }
      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        const btns = this.container?.querySelectorAll('.quiz-option-btn');
        btns?.forEach(b => b.disabled = true);
      }
    }, 1000);
  },

  async selectOption(optionLetter) {
    if (this.hasAnsweredCurrentQuiz) return;
    if (!AppState.guest) {
      window.openOnboarding?.();
      return;
    }

    const quiz = AppState.activeQuiz;
    if (!quiz) return;

    this.hasAnsweredCurrentQuiz = true;
    this.lastAnsweredQuizId = quiz.id;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const btns = this.container.querySelectorAll('.quiz-option-btn');
    btns.forEach(b => {
      b.disabled = true;
      if (b.dataset.option === optionLetter) b.classList.add('selected');
    });

    const responseTimeMs = (quiz.duration_seconds || 20 - Math.max(0, this.remainingSeconds)) * 1000;

    try {
      const result = await Api.submitQuizAnswer({
        question_id: quiz.id,
        guest_id: AppState.guest.id,
        guest_name: AppState.guest.name,
        table_number: AppState.guest.table_number,
        selected_option: optionLetter,
        response_time_ms: responseTimeMs
      });

      const feedbackBox = document.getElementById('quiz-feedback-box');
      if (feedbackBox) {
        if (result.is_correct) {
          const pts = result.points_awarded || 100;
          AppState.addPoints(pts, 'live_quiz');
          feedbackBox.innerHTML = `
            <div class="quiz-result-banner success">
              <span>🎉 <strong>Excellente réponse !</strong> +${pts} pts crédités pour la Table ${escapeHtml(AppState.guest.table_number)} !</span>
            </div>
          `;
          window.showToast?.(`🏆 +${pts} points pour votre table !`, 'success');
        } else {
          feedbackBox.innerHTML = `
            <div class="quiz-result-banner error">
              <span>❌ <strong>Pas tout à fait !</strong> La bonne réponse était la <strong>${result.correct_option || 'A'}</strong>.</span>
            </div>
          `;
        }
      }

      setTimeout(() => this.refresh(), 1500);
    } catch (err) {
      console.error("[Quiz Answer] Erreur :", err);
    }
  },

  async triggerAiNextQuestion() {
    const q = getQuickBibleQuiz(1)[0];
    const letters = ['A', 'B', 'C', 'D'];

    window.showToast?.("🤖 L'Animateur IA prépare la question pour toute la salle...", "info");

    try {
      const res = await Api.request('/games/ai-mc/launch', {
        method: 'POST',
        body: JSON.stringify({
          is_ai: true,
          question: q.question,
          option_a: q.options[0],
          option_b: q.options[1],
          option_c: q.options[2] || '',
          option_d: q.options[3] || '',
          correct_option: letters[q.correct],
          duration_seconds: 20,
          points: 100,
          explanation: this.aiCommentary
        })
      });

      if (res && res.success) {
        this.hasAnsweredCurrentQuiz = false;
        window.showToast?.("🚀 Question de l'Animateur IA lancée en direct !", "success");
        await this.refresh();
      }
    } catch (err) {
      console.warn("[AI MC] Erreur lancement IA :", err);
    }
  },

  // ════════════════════════════════════════════════════════════
  // 2. ARÈNE DE DUEL TABLE VS TABLE MULTIJOUEUR EN TEMPS RÉEL
  // ════════════════════════════════════════════════════════════

  async openDuelLobby() {
    this.duelActive = false;
    this.activeMode = 'duel';
    if (this.duelPollInterval) clearInterval(this.duelPollInterval);
    if (this.duelQuestionInterval) clearInterval(this.duelQuestionInterval);

    const quizCard = document.getElementById('quiz-card-container');
    if (!quizCard) return;

    this.ensureLiveContainerVisible();

    this.duelChallengerTable = AppState.guest ? String(AppState.guest.table_number || '1') : '1';
    let opp = '2';
    if (this.duelChallengerTable === '2') opp = '1';
    this.duelOpponentTable = opp;

    // Charger les défis ouverts dans la salle
    let activeDuels = [];
    try {
      const res = await Api.getActiveDuels();
      if (res && res.duels) activeDuels = res.duels;
    } catch (e) {
      console.warn("[Duel] Erreur récupération défis actifs :", e);
    }

    const availableTables = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Honneur']
      .filter(t => t !== this.duelChallengerTable);

    quizCard.innerHTML = `
      <div class="duel-setup-card">
        <div class="duel-badge-top">⚔️ ARÈNE DE DUEL TABLE VS TABLE</div>
        <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0.5rem 0 0.25rem;">
          Défiez une Table en Direct !
        </h3>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Combat biblique express en 5 questions chrono. Les points sont synchronisés et crédités en temps réel pour le classement du Gala !
        </p>

        <!-- Face-à-face graphique avant combat -->
        <div class="duel-clash-header">
          <div class="duel-fighter-side challenger">
            <div class="fighter-tag">VOTRE CAMP</div>
            <div class="fighter-name">Table ${escapeHtml(this.duelChallengerTable)}</div>
            <div class="fighter-emoji">👑</div>
          </div>

          <div class="duel-vs-circle">VS</div>

          <div class="duel-fighter-side opponent">
            <div class="fighter-tag">ADVERSAIRE</div>
            <div class="fighter-name" id="label-opponent-table">Table ${escapeHtml(this.duelOpponentTable)}</div>
            <div class="fighter-emoji">🎯</div>
          </div>
        </div>

        <!-- Défis ouverts en cours -->
        ${activeDuels.length > 0 ? `
          <div style="margin-bottom: 1rem; background: rgba(255,255,255,0.03); border: 1px dashed var(--gold-border); border-radius: var(--radius-md); padding: 0.75rem;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--gold-primary); text-transform: uppercase; margin-bottom: 0.4rem;">
              ⚡ Défis en cours dans la salle :
            </div>
            ${activeDuels.slice(0, 3).map(d => `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.35rem; font-size:0.8rem;">
                <span>Table ${escapeHtml(d.challenger_table)} vs Table ${escapeHtml(d.opponent_table)} (${d.challenger_score} - ${d.opponent_score} pts)</span>
                <button class="btn-icon" style="font-size:0.72rem; padding:2px 8px; width:auto;" onclick="window.GamesModule.joinExistingDuel('${d.id}')">
                  Rejoindre
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="margin: 1rem 0 0.75rem;">
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
            Sélectionnez la Table à défier :
          </label>
          <div class="duel-table-selector-grid">
            ${availableTables.map(t => `
              <button type="button" class="duel-table-btn ${t === this.duelOpponentTable ? 'selected' : ''}" onclick="window.GamesModule.setOpponentTable('${t}')">
                Table ${t}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 0.6rem; margin-top: 1.25rem;">
          <button class="btn-icon" style="width: auto; padding: 0 1rem;" onclick="window.GamesModule.openLiveQuiz()">
            Retour
          </button>
          <button class="btn-3d btn-3d-coral" style="flex: 1;" onclick="window.GamesModule.launchNewDuel()">
            <span>🔥 Lancer le Duel (5 Manches)</span>
          </button>
        </div>
      </div>
    `;
  },

  setOpponentTable(targetTable) {
    this.duelOpponentTable = targetTable;
    const lbl = document.getElementById('label-opponent-table');
    if (lbl) lbl.textContent = `Table ${targetTable}`;

    const btns = document.querySelectorAll('.duel-table-btn');
    btns.forEach(b => {
      if (b.textContent.includes(`Table ${targetTable}`)) b.classList.add('selected');
      else b.classList.remove('selected');
    });
  },

  async launchNewDuel() {
    window.showToast?.("⚔️ Création du Duel dans la salle...", "info");

    const questions = getQuickBibleQuiz(5);
    const challengerName = AppState.guest ? AppState.guest.name : "Invité";

    try {
      const res = await Api.createDuel({
        challenger_table: this.duelChallengerTable,
        challenger_name: challengerName,
        opponent_table: this.duelOpponentTable,
        questions
      });

      if (res && res.duel_id) {
        this.duelId = res.duel_id;
        this.duelQuestions = questions;
        this.duelCurrentIndex = 0;
        this.duelMyScore = 0;
        this.duelOpponentScore = 0;
        this.duelActive = true;

        this.startDuelLoop();
      }
    } catch (err) {
      console.warn("[Duel Create Error] :", err);
      // Fallback local fluide
      this.duelQuestions = questions;
      this.duelCurrentIndex = 0;
      this.duelMyScore = 0;
      this.duelOpponentScore = 0;
      this.duelActive = true;
      this.renderDuelArena();
    }
  },

  async joinExistingDuel(duelId) {
    try {
      const res = await Api.getDuelStatus(duelId);
      if (res && res.duel) {
        this.duelId = res.duel.id;
        this.duelChallengerTable = res.duel.challenger_table;
        this.duelOpponentTable = res.duel.opponent_table;
        this.duelQuestions = res.duel.questions;
        this.duelCurrentIndex = 0;
        this.duelMyScore = 0;
        this.duelOpponentScore = 0;
        this.duelActive = true;

        this.startDuelLoop();
      }
    } catch (err) {
      console.error("[Join Duel] Erreur :", err);
    }
  },

  startDuelLoop() {
    this.renderDuelArena();

    // Polling régulier de l'état du duel pour synchroniser les deux tables en direct
    if (this.duelPollInterval) clearInterval(this.duelPollInterval);
    this.duelPollInterval = setInterval(async () => {
      if (!this.duelActive || !this.duelId) return;

      try {
        const res = await Api.getDuelStatus(this.duelId);
        if (res && res.duel) {
          const d = res.duel;
          const isChallenger = (String(AppState.guest?.table_number || '1') === String(d.challenger_table));
          this.duelMyScore = isChallenger ? d.challenger_score : d.opponent_score;
          this.duelOpponentScore = isChallenger ? d.opponent_score : d.challenger_score;

          this.updateDuelHeaderScores();

          if (d.status === 'finished' && this.duelCurrentIndex >= this.duelQuestions.length) {
            clearInterval(this.duelPollInterval);
          }
        }
      } catch (e) {
        // Silencieux pour ne pas polluer l'interface
      }
    }, 1500);
  },

  renderDuelArena() {
    const quizCard = document.getElementById('quiz-card-container');
    if (!quizCard) return;

    if (this.duelCurrentIndex >= this.duelQuestions.length) {
      this.renderDuelFinished(quizCard);
      return;
    }

    const q = this.duelQuestions[this.duelCurrentIndex];
    const totalQ = this.duelQuestions.length;
    const currentQNum = this.duelCurrentIndex + 1;
    this.duelHasAnsweredCurrent = false;

    quizCard.innerHTML = `
      <div class="duel-arena-card">
        <!-- Arène Visuelle Face-à-Face en Direct -->
        <div class="duel-live-scoreboard">
          <div class="duel-team-box my-team">
            <div class="team-header">
              <span class="team-name">Table ${escapeHtml(this.duelChallengerTable)}</span>
              <span class="team-score" id="duel-live-my-score">${this.duelMyScore} pts</span>
            </div>
            <div class="duel-progress-track">
              <div class="duel-progress-fill my-fill" id="duel-fill-my" style="width: 0%;"></div>
            </div>
          </div>

          <div class="duel-round-pill">
            <span>⚔️</span>
            <span>${currentQNum}/${totalQ}</span>
            <span style="font-size:0.68rem; color:#ff7a45;" id="duel-question-timer">15s</span>
          </div>

          <div class="duel-team-box opp-team">
            <div class="team-header">
              <span class="team-name">Table ${escapeHtml(this.duelOpponentTable)}</span>
              <span class="team-score" id="duel-live-opp-score">${this.duelOpponentScore} pts</span>
            </div>
            <div class="duel-progress-track">
              <div class="duel-progress-fill opp-fill" id="duel-fill-opp" style="width: 0%;"></div>
            </div>
          </div>
        </div>

        <!-- Question du Duel -->
        <div class="quiz-question-text" style="margin-top: 1rem;">
          ${escapeHtml(q.question)}
        </div>

        <!-- Options A, B, C, D -->
        <div class="quiz-options-grid" id="duel-options-grid">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="window.GamesModule.answerDuelQuestion(${i})">
              <span class="option-letter">${['A','B','C','D'][i]}</span>
              <span>${escapeHtml(opt)}</span>
            </button>
          `).join('')}
        </div>

        <div id="duel-feedback-box"></div>
      </div>
    `;

    this.updateDuelHeaderScores();
    this.startDuelQuestionTimer();
  },

  startDuelQuestionTimer() {
    if (this.duelQuestionInterval) clearInterval(this.duelQuestionInterval);
    this.duelQuestionTimer = 15;
    const timerEl = document.getElementById('duel-question-timer');

    this.duelQuestionInterval = setInterval(() => {
      this.duelQuestionTimer--;
      if (timerEl) timerEl.textContent = `${this.duelQuestionTimer}s`;

      if (this.duelQuestionTimer <= 0) {
        clearInterval(this.duelQuestionInterval);
        if (!this.duelHasAnsweredCurrent) {
          this.answerDuelQuestion(-1); // Temps écoulé
        }
      }
    }, 1000);
  },

  updateDuelHeaderScores() {
    const totalMax = (this.duelQuestions.length || 5) * 100;
    const myScoreEl = document.getElementById('duel-live-my-score');
    const oppScoreEl = document.getElementById('duel-live-opp-score');
    const myFill = document.getElementById('duel-fill-my');
    const oppFill = document.getElementById('duel-fill-opp');

    if (myScoreEl) myScoreEl.textContent = `${this.duelMyScore} pts`;
    if (oppScoreEl) oppScoreEl.textContent = `${this.duelOpponentScore} pts`;

    if (myFill) {
      const pct = Math.min(100, (this.duelMyScore / totalMax) * 100);
      myFill.style.width = `${pct}%`;
    }
    if (oppFill) {
      const pct = Math.min(100, (this.duelOpponentScore / totalMax) * 100);
      oppFill.style.width = `${pct}%`;
    }
  },

  async answerDuelQuestion(selectedIdx) {
    if (this.duelHasAnsweredCurrent) return;
    this.duelHasAnsweredCurrent = true;
    if (this.duelQuestionInterval) clearInterval(this.duelQuestionInterval);

    const q = this.duelQuestions[this.duelCurrentIndex];
    const isCorrect = (selectedIdx === q.correct);
    const speedBonus = isCorrect ? Math.max(0, this.duelQuestionTimer * 5) : 0;
    const pointsWon = isCorrect ? (100 + speedBonus) : 0;

    this.duelMyScore += pointsWon;
    this.updateDuelHeaderScores();

    // Haptique vibration légère sur mobile
    try {
      if (navigator.vibrate) {
        navigator.vibrate(isCorrect ? [60, 40, 60] : [150]);
      }
    } catch(e) {}

    // Soumission au serveur en temps réel
    if (this.duelId) {
      Api.submitDuelAnswer(this.duelId, {
        table_number: this.duelChallengerTable,
        guest_name: AppState.guest ? AppState.guest.name : "Invité",
        question_index: this.duelCurrentIndex,
        is_correct: isCorrect,
        points: pointsWon,
        guest_id: AppState.guest?.id || 'anon'
      }).then(res => {
        if (res && res.opp_new_score !== undefined) {
          this.duelOpponentScore = res.opp_new_score;
          this.updateDuelHeaderScores();
        }
      }).catch(console.error);
    }

    const feedback = document.getElementById('duel-feedback-box');
    if (feedback) {
      feedback.innerHTML = `
        <div class="quiz-result-banner ${isCorrect ? 'success' : 'error'}" style="margin-top: 0.75rem;">
          ${isCorrect 
            ? `🎉 <strong>Bonne réponse !</strong> +${pointsWon} pts (${speedBonus > 0 ? `dont +${speedBonus} bonus vitesse !` : ''})` 
            : `❌ <strong>Erreur !</strong> Bonne réponse : <strong>${escapeHtml(q.options[q.correct])}</strong>`}
        </div>
        <button class="btn-3d btn-3d-coral" style="margin-top: 0.75rem; width: 100%;" onclick="window.GamesModule.nextDuelQuestion()">
          <span>${this.duelCurrentIndex + 1 >= this.duelQuestions.length ? '🏆 Proclamer le Vainqueur !' : 'Manche suivante ➔'}</span>
        </button>
      `;
    }

    const btns = document.querySelectorAll('#duel-options-grid .quiz-option-btn');
    btns.forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.correct) b.classList.add('correct');
      else if (idx === selectedIdx) b.classList.add('wrong');
    });
  },

  nextDuelQuestion() {
    this.duelCurrentIndex++;
    this.renderDuelArena();
  },

  renderDuelFinished(quizCard) {
    if (this.duelPollInterval) clearInterval(this.duelPollInterval);
    if (this.duelQuestionInterval) clearInterval(this.duelQuestionInterval);

    const isWin = this.duelMyScore > this.duelOpponentScore;
    const isDraw = this.duelMyScore === this.duelOpponentScore;

    quizCard.innerHTML = `
      <div class="bible-quiz-results" style="border: 2px solid ${isWin ? 'var(--gold-primary)' : 'var(--border-subtle)'};">
        <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">
          ${isWin ? '🏆' : isDraw ? '🤝' : '🥈'}
        </div>
        <h3 style="font-size: 1.35rem; font-weight: 800;">
          ${isWin ? `Victoire de la Table ${escapeHtml(this.duelChallengerTable)} !` : isDraw ? 'Match Nul Remarquable !' : `Victoire de la Table ${escapeHtml(this.duelOpponentTable)} !`}
        </h3>

        <div style="display: flex; justify-content: center; gap: 1.5rem; margin: 1rem 0;">
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Votre Table</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${this.duelMyScore} pts</div>
          </div>
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-dim); line-height: 2;">—</div>
          <div style="text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Table Adverse</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #ff7a45;">${this.duelOpponentScore} pts</div>
          </div>
        </div>

        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 380px; margin: 0 auto; line-height: 1.4;">
          ${this.duelMyScore} points ont été enregistrés pour votre table dans le grand classement général de la soirée !
        </p>

        <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn-3d btn-3d-coral" onclick="window.GamesModule.openDuelLobby()">
            <span>🔄 Nouveau Duel</span>
          </button>
          <button class="btn-icon" style="width: auto; padding: 0 1rem;" onclick="window.GamesModule.openLiveQuiz()">
            Quiz Live IA
          </button>
        </div>
      </div>
    `;

    this.refresh();
  },

  ensureLiveContainerVisible() {
    const bibleContainer = document.getElementById('bible-games-container');
    const liveContainer = document.getElementById('live-games-container');
    if (bibleContainer) bibleContainer.style.display = 'none';
    if (liveContainer) liveContainer.style.display = 'block';

    const btnBible = document.getElementById('btn-mode-bible-games');
    const btnDuel = document.getElementById('btn-mode-duel-games');
    const btnLive = document.getElementById('btn-mode-live-quiz');
    if (btnBible) { btnBible.classList.remove('active', 'btn-3d-gold'); btnBible.classList.add('btn-3d-porcelain'); }
    if (btnDuel) { btnDuel.classList.add('active', 'btn-3d-coral'); btnDuel.classList.remove('btn-3d-porcelain'); }
    if (btnLive) { btnLive.classList.remove('active', 'btn-3d-gold'); btnLive.classList.add('btn-3d-porcelain'); }
  },

  // ════════════════════════════════════════════════════════════
  // 3. CLASSEMENT DES TABLES (LEADERBOARD GÉNÉRAL)
  // ════════════════════════════════════════════════════════════

  renderLeaderboardSection() {
    const leaderboardEl = document.getElementById('leaderboard-container');
    if (!leaderboardEl) return;

    const tables = AppState.leaderboard.tables || [];

    leaderboardEl.innerHTML = `
      <div class="leaderboard-section">
        <div class="leaderboard-title">
          <span>🏆 Classement des Tables (Gala Live)</span>
          <button class="btn-icon" style="margin-left:auto; font-size:0.75rem; width:auto; padding:2px 8px;" onclick="window.GamesModule.refresh()">🔄 Actualiser</button>
        </div>
        <div class="table-rank-list">
          ${tables.length === 0 ? '<p style="color: var(--text-dim); font-size: 0.85rem; text-align:center; padding:1rem;">Aucun point pour le moment. Jouez en Duel ou au Quiz IA pour hisser votre table en tête !</p>' : ''}
          ${tables.map((t, idx) => `
            <div class="table-rank-item ${AppState.guest && String(AppState.guest.table_number) === String(t.table_number) ? 'my-table' : ''}">
              <div class="rank-left">
                <span class="rank-badge">${idx === 0 ? '👑' : idx + 1}</span>
                <span style="font-weight: 700;">Table ${escapeHtml(t.table_number)}</span>
                <span style="font-size: 0.75rem; color: var(--text-dim);">(${t.participants || 1} participant${t.participants > 1 ? 's' : ''})</span>
              </div>
              <span class="rank-points">${t.total_points || 0} PTS</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

window.GamesModule = GamesModule;
GamesModule.startDuelMode = () => GamesModule.openDuelLobby();
GamesModule.openDuelSetup = () => GamesModule.openDuelLobby();
window.selectQuizOption = (opt) => GamesModule.selectOption(opt);

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
