/**
 * COMPAGNON DE CÉRÉMONIE - Routes Écran Géant & Vidéoprojecteur Régie
 */

import { jsonResponse } from "../utils/response.js";
import { getMockEvent, getMockGameActive, getMockLeaderboard, getMockChat } from "../utils/mocks.js";

export async function handleProjectorRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  if (pathname === "/api/projector/feed" && method === "GET") {
    if (!db) {
      return jsonResponse({
        event: getMockEvent(),
        active_quiz: getMockGameActive().active_quiz,
        leaderboard: getMockLeaderboard(),
        pinned_messages: [getMockChat()[0]],
        total_prayers: 22,
        active_guests_count: 85,
      });
    }

    const event = await db.prepare("SELECT * FROM events WHERE is_active = 1 LIMIT 1").first();
    const activeQuiz = await db.prepare("SELECT * FROM quiz_questions WHERE status = 'active' LIMIT 1").first();
    const pinnedMessages = await db.prepare("SELECT * FROM chat_messages WHERE is_pinned = 1 ORDER BY created_at DESC LIMIT 3").all();
    const guestCount = await db.prepare("SELECT COUNT(*) as count FROM guests").first();
    const prayerCount = await db.prepare("SELECT SUM(prayer_count) as total FROM prayer_requests").first();

    const tableLeaderboard = await db.prepare(`
      SELECT table_number, SUM(points_awarded) as total_points
      FROM quiz_answers
      WHERE is_correct = 1
      GROUP BY table_number
      ORDER BY total_points DESC
      LIMIT 5
    `).all();

    return jsonResponse({
      event: event || getMockEvent(),
      active_quiz: activeQuiz || null,
      leaderboard: tableLeaderboard.results || [],
      pinned_messages: pinnedMessages.results || [],
      total_prayers: prayerCount ? (prayerCount.total || 0) : 0,
      active_guests_count: guestCount ? guestCount.count : 0,
    });
  }

  return null;
}
