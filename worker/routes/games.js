/**
 * COMPAGNON DE CÉRÉMONIE - Routes Jeux Interactifs & Quiz en Direct
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockGameActive, getMockLeaderboard } from "../utils/mocks.js";

export async function handleGameRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Question active & Sondage actif
  if (pathname === "/api/games/active" && method === "GET") {
    if (!db) return jsonResponse(getMockGameActive());

    const question = await db.prepare(`
      SELECT id, question, option_a, option_b, option_c, option_d, duration_seconds, points, status, explanation 
      FROM quiz_questions 
      WHERE status = 'active' 
      ORDER BY created_at ASC 
      LIMIT 1
    `).first();

    const poll = await db.prepare(`
      SELECT id, question, options_json, status 
      FROM live_polls 
      WHERE status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `).first();

    return jsonResponse({
      active_quiz: question || null,
      active_poll: poll ? { ...poll, options: JSON.parse(poll.options_json) } : null,
    });
  }

  // 2. Répondre au Quiz
  if (pathname === "/api/games/quiz/answer" && method === "POST") {
    const data = await request.json();
    const id = `ans-${Date.now()}`;
    const questionId = data.question_id;
    const guestId = data.guest_id;
    const guestName = data.guest_name || "Invité";
    const tableNumber = data.table_number || "1";
    const selectedOption = (data.selected_option || "").toUpperCase();
    const responseTimeMs = data.response_time_ms || 3000;

    if (!questionId || !guestId || !selectedOption) {
      return errorResponse("question_id, guest_id et selected_option requis");
    }

    let isCorrect = 0;
    let pointsAwarded = 0;

    if (db) {
      const q = await db.prepare("SELECT correct_option, points, explanation FROM quiz_questions WHERE id = ?").bind(questionId).first();
      if (q) {
        isCorrect = (q.correct_option === selectedOption) ? 1 : 0;
        pointsAwarded = isCorrect ? Math.max(10, q.points - Math.floor(responseTimeMs / 500)) : 0;
      }

      await db.prepare(`
        INSERT INTO quiz_answers (id, question_id, guest_id, guest_name, table_number, selected_option, is_correct, response_time_ms, points_awarded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(question_id, guest_id) DO UPDATE SET 
          selected_option = excluded.selected_option,
          is_correct = excluded.is_correct,
          points_awarded = excluded.points_awarded
      `).bind(id, questionId, guestId, guestName, tableNumber, selectedOption, isCorrect, responseTimeMs, pointsAwarded).run();

      return jsonResponse({
        success: true,
        is_correct: isCorrect === 1,
        correct_option: q ? q.correct_option : null,
        explanation: q ? q.explanation : null,
        points_awarded: pointsAwarded,
      });
    }

    return jsonResponse({ success: true, is_correct: true, points_awarded: 90 });
  }

  // 3. Leaderboard individuel et par table
  if (pathname === "/api/games/quiz/leaderboard" && method === "GET") {
    if (!db) return jsonResponse(getMockLeaderboard());

    // Score par table
    const tableScores = await db.prepare(`
      SELECT table_number, SUM(points_awarded) as total_points, COUNT(DISTINCT guest_id) as participants
      FROM quiz_answers
      WHERE is_correct = 1
      GROUP BY table_number
      ORDER BY total_points DESC
      LIMIT 10
    `).all();

    // Top joueurs
    const topGuests = await db.prepare(`
      SELECT guest_name, table_number, SUM(points_awarded) as total_points
      FROM quiz_answers
      WHERE is_correct = 1
      GROUP BY guest_id
      ORDER BY total_points DESC
      LIMIT 10
    `).all();

    return jsonResponse({
      tables: tableScores.results || [],
      guests: topGuests.results || [],
    });
  }

  // 4. Voter à un sondage en direct
  if (pathname.startsWith("/api/games/polls/") && pathname.endsWith("/vote") && method === "POST") {
    const parts = pathname.split("/");
    const pollId = parts[4];
    const data = await request.json();
    const id = `vote-${Date.now()}`;
    const guestId = data.guest_id;
    const tableNumber = data.table_number || "1";
    const optionIndex = parseInt(data.option_index, 10);

    if (isNaN(optionIndex)) {
      return errorResponse("option_index invalide");
    }

    if (db) {
      await db.prepare(`
        INSERT INTO poll_votes (id, poll_id, guest_id, table_number, option_index)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(poll_id, guest_id) DO UPDATE SET option_index = excluded.option_index
      `).bind(id, pollId, guestId, tableNumber, optionIndex).run();

      const voteCounts = await db.prepare(`
        SELECT option_index, COUNT(*) as count 
        FROM poll_votes 
        WHERE poll_id = ? 
        GROUP BY option_index
      `).bind(pollId).all();

      return jsonResponse({ success: true, counts: voteCounts.results || [] });
    }

    return jsonResponse({ success: true, counts: [{ option_index: optionIndex, count: 1 }] });
  }

  // 5. Créditer des points (Jeux bibliques, Qui Suis-Je, Chrono, Verset...)
  if (pathname === "/api/games/points/add" && method === "POST") {
    const data = await request.json();
    const guestId = data.guest_id || "anon";
    const guestName = data.guest_name || "Invité";
    const tableNumber = data.table_number || "1";
    const points = parseInt(data.points, 10) || 0;
    const reason = data.reason || "game";
    const id = `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    if (db && points > 0) {
      await db.prepare(`
        INSERT INTO quiz_answers (id, question_id, guest_id, guest_name, table_number, selected_option, is_correct, response_time_ms, points_awarded)
        VALUES (?, ?, ?, ?, ?, 'CORRECT', 1, 0, ?)
      `).bind(id, `game_${reason}_${Date.now()}`, guestId, guestName, tableNumber, points).run();

      return jsonResponse({ success: true, points_added: points });
    }
    return jsonResponse({ success: true, points_added: points });
  }

  // 6. Lancement d'une question en direct (Pilotée par l'Animateur IA ou la Régie)
  if ((pathname === "/api/games/quiz/launch" || pathname === "/api/games/ai-mc/launch") && method === "POST") {
    const data = await request.json();
    const isAi = data.is_ai === true || pathname.includes("ai-mc");
    const pin = data.pin || "";

    if (!isAi && pin !== (env.ADMIN_PIN || "7777")) {
      return errorResponse("Code PIN Régie invalide (défaut : 7777)", 403);
    }

    const question = data.question;
    const optionA = data.option_a;
    const optionB = data.option_b;
    const optionC = data.option_c;
    const optionD = data.option_d;
    const correctOption = (data.correct_option || "A").toUpperCase();
    const explanation = data.explanation || (isAi ? "🤖 L'Animateur IA valide cette réponse biblique !" : "");
    const duration = parseInt(data.duration_seconds, 10) || 20;
    const points = parseInt(data.points, 10) || 100;
    const id = `live-${Date.now()}`;

    if (!question || !optionA || !optionB) {
      return errorResponse("Question et options A et B requises");
    }

    if (db) {
      // Clôturer les questions actives précédentes
      await db.prepare("UPDATE quiz_questions SET status = 'ended' WHERE status = 'active'").run();

      // Enregistrer et activer la nouvelle question
      await db.prepare(`
        INSERT INTO quiz_questions (id, event_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, duration_seconds, points, status)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(id, question, optionA, optionB, optionC || "", optionD || "", correctOption, explanation, duration, points).run();

      return jsonResponse({
        success: true,
        message: "Question propulsée en direct avec succès par l'Animateur IA !",
        question_id: id
      });
    }

    return jsonResponse({ success: true, question_id: id });
  }

  // 8. DUEL TABLE VS TABLE : Initialisation automatique de la table si nécessaire
  const ensureDuelsTable = async () => {
    if (!db) return;
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS duels (
        id TEXT PRIMARY KEY,
        challenger_table TEXT NOT NULL,
        challenger_name TEXT NOT NULL,
        opponent_table TEXT NOT NULL,
        opponent_name TEXT DEFAULT '',
        questions_json TEXT NOT NULL,
        challenger_score INTEGER DEFAULT 0,
        opponent_score INTEGER DEFAULT 0,
        challenger_current_q INTEGER DEFAULT 0,
        opponent_current_q INTEGER DEFAULT 0,
        challenger_done INTEGER DEFAULT 0,
        opponent_done INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        winner_table TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  };

  // 8a. DUEL : Créer ou lancer un défi entre deux tables
  if (pathname === "/api/games/duel/create" && method === "POST") {
    const data = await request.json();
    const challengerTable = String(data.challenger_table || "1");
    const challengerName = String(data.challenger_name || "Invité");
    const opponentTable = String(data.opponent_table || "2");
    const questions = data.questions || [];
    const duelId = `duel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    if (questions.length === 0) {
      return errorResponse("Questions requises pour le duel");
    }

    if (db) {
      await ensureDuelsTable();
      await db.prepare(`
        INSERT INTO duels (id, challenger_table, challenger_name, opponent_table, questions_json, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).bind(duelId, challengerTable, challengerName, opponentTable, JSON.stringify(questions)).run();

      return jsonResponse({
        success: true,
        duel_id: duelId,
        duel: {
          id: duelId,
          challenger_table: challengerTable,
          challenger_name: challengerName,
          opponent_table: opponentTable,
          questions,
          challenger_score: 0,
          opponent_score: 0,
          challenger_current_q: 0,
          opponent_current_q: 0,
          status: 'active'
        }
      });
    }

    return jsonResponse({ success: true, duel_id: duelId });
  }

  // 8b. DUEL : Lister les duels actifs / ouverts
  if (pathname === "/api/games/duels/active" && method === "GET") {
    if (!db) return jsonResponse({ duels: [] });
    await ensureDuelsTable();

    const activeDuels = await db.prepare(`
      SELECT id, challenger_table, challenger_name, opponent_table, opponent_name, 
             challenger_score, opponent_score, status, winner_table, created_at
      FROM duels
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return jsonResponse({ duels: activeDuels.results || [] });
  }

  // 8c. DUEL : État temps réel d'un duel
  if (pathname.startsWith("/api/games/duel/") && method === "GET") {
    const duelId = pathname.replace("/api/games/duel/", "").trim();
    if (!db) return jsonResponse({ duel: null });
    await ensureDuelsTable();

    const duel = await db.prepare(`SELECT * FROM duels WHERE id = ?`).bind(duelId).first();
    if (!duel) return errorResponse("Duel introuvable", 404);

    return jsonResponse({
      duel: {
        ...duel,
        questions: JSON.parse(duel.questions_json || "[]")
      }
    });
  }

  // 8d. DUEL : Répondre à une question du Duel
  if (pathname.startsWith("/api/games/duel/") && pathname.endsWith("/answer") && method === "POST") {
    const duelId = pathname.split("/")[4];
    const data = await request.json();
    const tableNumber = String(data.table_number || "1");
    const guestName = String(data.guest_name || "Joueur");
    const isCorrect = data.is_correct === true;
    const pointsWon = parseInt(data.points, 10) || (isCorrect ? 100 : 0);
    const qIndex = parseInt(data.question_index, 10) || 0;

    if (!db) return jsonResponse({ success: true, points_won: pointsWon });
    await ensureDuelsTable();

    const duel = await db.prepare(`SELECT * FROM duels WHERE id = ?`).bind(duelId).first();
    if (!duel) return errorResponse("Duel introuvable", 404);

    const isChallenger = (tableNumber === String(duel.challenger_table));
    let newChallengerScore = duel.challenger_score;
    let newOpponentScore = duel.opponent_score;
    let newChallengerQ = duel.challenger_current_q;
    let newOpponentQ = duel.opponent_current_q;
    let newChallengerDone = duel.challenger_done;
    let newOpponentDone = duel.opponent_done;

    const totalQuestions = JSON.parse(duel.questions_json || "[]").length || 5;

    if (isChallenger) {
      newChallengerScore += pointsWon;
      newChallengerQ = Math.max(newChallengerQ, qIndex + 1);
      if (newChallengerQ >= totalQuestions) newChallengerDone = 1;
    } else {
      newOpponentScore += pointsWon;
      newOpponentQ = Math.max(newOpponentQ, qIndex + 1);
      if (newOpponentQ >= totalQuestions) newOpponentDone = 1;
    }

    let status = duel.status;
    let winner = duel.winner_table;

    if (newChallengerDone && newOpponentDone) {
      status = 'finished';
      if (newChallengerScore > newOpponentScore) winner = duel.challenger_table;
      else if (newOpponentScore > newChallengerScore) winner = duel.opponent_table;
      else winner = 'draw';
    }

    await db.prepare(`
      UPDATE duels 
      SET challenger_score = ?, opponent_score = ?, 
          challenger_current_q = ?, opponent_current_q = ?,
          challenger_done = ?, opponent_done = ?,
          status = ?, winner_table = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      newChallengerScore, newOpponentScore,
      newChallengerQ, newOpponentQ,
      newChallengerDone, newOpponentDone,
      status, winner, duelId
    ).run();

    // Si des points ont été gagnés, créditer automatiquement au classement de la table
    if (pointsWon > 0) {
      const ptId = `pt-duel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await db.prepare(`
        INSERT INTO quiz_answers (id, question_id, guest_id, guest_name, table_number, selected_option, is_correct, response_time_ms, points_awarded)
        VALUES (?, ?, ?, ?, ?, 'CORRECT', 1, 0, ?)
      `).bind(ptId, `duel_${duelId}_q${qIndex}`, data.guest_id || 'guest', guestName, tableNumber, pointsWon).run();
    }

    return jsonResponse({
      success: true,
      duel_id: duelId,
      my_new_score: isChallenger ? newChallengerScore : newOpponentScore,
      opp_new_score: isChallenger ? newOpponentScore : newChallengerScore,
      status,
      winner
    });
  }

  // 9. ANIMATEUR IA : Commentaires d'ambiance en direct basés sur les scores
  if (pathname === "/api/games/ai-mc/commentary" && method === "GET") {
    let topTable = "Table 1";
    let runnerUp = "Table 2";
    let topScore = 0;

    if (db) {
      const topScores = await db.prepare(`
        SELECT table_number, SUM(points_awarded) as total_points
        FROM quiz_answers
        WHERE is_correct = 1
        GROUP BY table_number
        ORDER BY total_points DESC
        LIMIT 2
      `).all();

      if (topScores.results && topScores.results.length > 0) {
        topTable = `Table ${topScores.results[0].table_number}`;
        topScore = topScores.results[0].total_points;
        if (topScores.results[1]) {
          runnerUp = `Table ${topScores.results[1].table_number}`;
        }
      }
    }

    const aiRemarks = [
      `🔥 La ${topTable} mène la danse avec ${topScore} points ! Mais attention, la ${runnerUp} est en embuscade !`,
      `✨ L'Animateur IA salue la belle ferveur biblique ce soir ! Chaque point rapproche votre table du trophée.`,
      `👑 Quelle ambiance ! Silence aux tables, mobilisez vos connaissances des Écritures pour la prochaine manche !`,
      `⚡ Les écarts se resserrent ! Une bonne réponse peut tout faire basculer sur le podium.`
    ];

    const chosenRemark = aiRemarks[Math.floor(Math.random() * aiRemarks.length)];

    return jsonResponse({
      success: true,
      commentary: chosenRemark,
      leader: topTable,
      score: topScore
    });
  }

  return null;
}

