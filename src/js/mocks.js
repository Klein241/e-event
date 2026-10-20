/**
 * COMPAGNON DE CÉRÉMONIE - Données de Démonstration (Réservées au mode DEMO)
 * Actif uniquement en environnement local de test ou avec ?demo=1
 */

export function getDemoEvent() {
  return {
    id: "demo",
    name: "Soirée de Célébration (Mode Démo)",
    event_type: "gala",
    subtitle: "Démonstration interactive locale",
    venue: "Salon Privé"
  };
}

export function getDemoChatMessages() {
  return [
    {
      id: "demo-msg-1",
      guest_name: "Régie Démo",
      table_number: "Régie",
      message: "Bienvenue dans le mode démo de l'application !",
      message_type: "announcement",
      is_pinned: 1,
      reactions_json: '{"applause":5,"heart":3}',
      created_at: new Date().toISOString()
    }
  ];
}

export function getDemoActiveGames() {
  return {
    active_quiz: {
      id: "demo-quiz-1",
      question: "Bienvenue sur le Quiz Démo : Prêt pour la soirée ?",
      option_a: "Oui, à 100% !",
      option_b: "Absolument !",
      option_c: "Totalement prêt",
      option_d: "C'est parti !",
      correct_option: "A",
      duration_seconds: 20,
      points: 100,
      status: "active"
    },
    active_poll: {
      id: "demo-poll-1",
      question: "Sondage test : Comment trouvez-vous l'ergonomie ?",
      options: ["Très fluide", "Captivante", "Moderne", "Intuitive"],
      status: "active"
    }
  };
}

export function getDemoLeaderboard() {
  return {
    tables: [
      { table_number: "Table Démo 1", total_points: 150, participants: 2 }
    ],
    guests: [
      { guest_name: "Invité Test", table_number: "Table Démo 1", total_points: 100 }
    ]
  };
}

export function getDemoNetworkingProfiles() {
  return [
    {
      id: "demo-net-1",
      guest_id: "demo-guest-1",
      full_name: "Profil Exemple (Démo)",
      profession: "Consultant / Partenaire",
      company: "Exemple Corp",
      bio: "Ceci est un profil d'exemple pour tester l'interface.",
      interests_tags: "Tech, Événementiel, Affaires",
      looking_for: "Échanges et collaborations",
      offering: "Conseil et expertise",
      whatsapp: "",
      table_number: "Table 1",
      avatar_emoji: "💼"
    }
  ];
}

export function getDemoPrayers() {
  return [
    {
      id: "demo-pray-1",
      author_name: "Témoignage Démo",
      table_number: "Table 1",
      is_anonymous: 0,
      category: "benediction",
      title: "Vœux de succès",
      content: "Que cette soirée soit couronnée de joie et de bénédictions.",
      prayer_count: 5,
      created_at: new Date().toISOString()
    }
  ];
}

export function getDemoProjectorFeed() {
  return {
    event: getDemoEvent(),
    active_quiz: getDemoActiveGames().active_quiz,
    leaderboard: getDemoLeaderboard().tables,
    pinned_messages: getDemoChatMessages(),
    total_prayers: 1,
    active_guests_count: 1
  };
}
