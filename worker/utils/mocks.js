/**
 * COMPAGNON DE CÉRÉMONIE - Données de secours (Mocks) pour dev local ou mode sans D1
 */

export function getMockEvent() {
  return {
    id: "default",
    name: "Célébration & Gala Royal",
    event_type: "gala",
    subtitle: "Amour, Excellence & Communion Fraternelle",
    venue: "Grand Salon des Étoiles",
    admin_pin: "7777"
  };
}

export function getMockGuest() {
  return {
    id: "guest-1",
    name: "Invité d'Honneur",
    table_number: "Table 1",
    avatar_emoji: "✨",
    role: "vip"
  };
}

export function getMockChat() {
  return [
    {
      id: "msg-1",
      guest_name: "MC Alex",
      table_number: "Régie",
      message: "Bienvenue à tous ! Flashez le QR code sur votre table et participez en direct ! 🥂",
      message_type: "announcement",
      is_pinned: 1,
      reactions_json: '{"applause":12,"heart":8}',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "msg-2",
      guest_name: "Dr. Emmanuel",
      table_number: "Table 3",
      message: "Félicitations aux hôtes, la soirée est magnifique ! ✨",
      message_type: "text",
      is_pinned: 0,
      reactions_json: '{"heart":5}',
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: "msg-3",
      guest_name: "Grâce N.",
      table_number: "Table 4",
      message: "La Table 4 est prête pour le grand Quiz ! Qui relève le défi ? 🔥",
      message_type: "text",
      is_pinned: 0,
      reactions_json: '{"fire":7}',
      created_at: new Date(Date.now() - 600000).toISOString()
    }
  ];
}

export function getMockGameActive() {
  return {
    active_quiz: {
      id: "quiz-1",
      question: "Où les organisateurs se sont-ils rencontrés pour la toute première fois ?",
      option_a: "À l'université",
      option_b: "Lors d'une conférence à Abidjan",
      option_c: "À la chorale de l'église",
      option_d: "Dans un aéroport",
      duration_seconds: 20,
      points: 100,
      status: "active"
    },
    active_poll: {
      id: "poll-1",
      question: "Quelle table mettra le plus d'ambiance ce soir ?",
      options: ["Table 1 - Les Mariés / Hôtes", "Table 2 & 3 - Amis d'Enfance", "Table 4 & 5 - Dynamique", "Table d'Honneur"],
      status: "active"
    }
  };
}

export function getMockLeaderboard() {
  return {
    tables: [
      { table_number: "Table 4", total_points: 380, participants: 6 },
      { table_number: "Table 1 - Royale", total_points: 340, participants: 4 },
      { table_number: "Table 3", total_points: 290, participants: 5 },
      { table_number: "Table 2", total_points: 180, participants: 3 }
    ],
    guests: [
      { guest_name: "Grâce N.", table_number: "Table 4", total_points: 195 },
      { guest_name: "Dr. Emmanuel", table_number: "Table 3", total_points: 185 },
      { guest_name: "Sarah M.", table_number: "Table 1", total_points: 170 }
    ]
  };
}

export function getMockNetworking() {
  return [
    {
      id: "net-1",
      guest_id: "guest-3",
      full_name: "Dr. Emmanuel Kouadio",
      profession: "Directeur Médical & Consultant",
      company: "HealthTech Africa",
      bio: "Passionné de santé publique, innovation et entrepreneuriat.",
      interests_tags: "Santé, Tech, Leadership, Investissement",
      looking_for: "Partenariats avec des développeurs et investisseurs",
      offering: "Conseil stratégique et mentorat",
      whatsapp: "+225 07 00 00 01",
      linkedin: "linkedin.com/in/ekouadio",
      table_number: "Table 3"
    },
    {
      id: "net-2",
      guest_id: "guest-4",
      full_name: "Grâce N'Guessan",
      profession: "Architecte d'Intérieur & Event Designer",
      company: "Grace Studio",
      bio: "Je transforme les espaces de fête et les intérieurs d'exception.",
      interests_tags: "Design, Événementiel, Art, Foi",
      looking_for: "Collaborations avec des agences et clients exigeants",
      offering: "Conception scénographique 3D",
      whatsapp: "+225 05 00 00 02",
      linkedin: "",
      table_number: "Table 4"
    }
  ];
}

export function getMockPrayers() {
  return [
    {
      id: "pray-1",
      author_name: "Sarah & Kevin",
      table_number: "Table 1 - Royale",
      is_anonymous: 0,
      category: "benediction",
      title: "Action de grâce pour cette union sacrée",
      content: "Que le Seigneur bénisse chaque foyer représenté ici et fasse déborder sa paix dans vos vies.",
      prayer_count: 14,
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "pray-2",
      author_name: "Frère Anonyme",
      table_number: "Table 6",
      is_anonymous: 1,
      category: "priere",
      title: "Succès pour le projet d'orphelinat",
      content: "Prions pour que les portes s'ouvrent pour le financement du centre d'accueil des enfants défavorisés.",
      prayer_count: 8,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];
}
