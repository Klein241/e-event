# 🥂 Compagnon de Cérémonie (PWA 100% Cloudflare)

> **L'application moderne, intuitive et interactive d'animation, chat en direct, jeux live, réseautage et mur de prières pour mariages, galas et cérémonies d'exception.**

---

## ✨ Fonctionnalités Clés

### 1. 💬 Chat en Direct & Réactions Express
* **Fil de discussion fluide** avec badge de table (`Table 1`, `Table Royale`, etc.).
* **Boutons de réactions émojis instantanées** (❤️, 👏, 🔥, 🙏).
* **Bannière d'annonces épinglées** par le Maître de Cérémonie / DJ pour rythmer les temps forts.

### 2. 🎮 Jeux en Ligne en Direct (Live Games)
* **Quiz Interactif chronométré** :
  * Décompte visuel de 20 à 25 secondes.
  * Choix multiple (A, B, C, D) avec attribution de points en temps réel selon la vitesse de réponse.
* **Sondages en Direct (Live Polls)** avec barres de pourcentage dynamiques.
* **Classement en direct par Table (Leaderboard)** : stimule la cohésion d'équipe et brise la glace entre voisins de table.

### 3. 🤝 Réseautage & Mise en Relation (Networking Hub)
* **Fiches profils des invités** : Métier/Fonction, Entreprise, Biographie courte, Tags d'intérêts (`#Tech`, `#Santé`, `#Design`, `#Foi`).
* **Section « Ce que je recherche » & « Ce que j'offre »** pour des synergies concrètes.
* **Moteur de recherche instantané** par mot-clé, métier ou compétence.
* **Boutons d'action directs** : *« 👋 Saluer »* (brise-glace) et lien direct **WhatsApp**.

### 4. 🙏 Demandes de Prière & Vœux / Bénédictions (Spiritual Wall)
* **Mur de prières et vœux spirituels** avec 3 catégories :
  * 🙏 *Requêtes de prière*
  * ✨ *Bénédictions pour les mariés / hôtes*
  * 🙌 *Actions de grâce & témoignages*
* **Bouton interactif « 🔥 Amen / Je prie »** avec compteur de soutien en temps réel.
* **Option d'anonymat** disponible lors du dépôt pour respecter l'intimité des requêtes.

### 5. 🖥️ Mode Grand Écran / Vidéoprojecteur (Projection Wall)
* Interface dédiée 16:9 haute résolution pour le vidéoprojecteur de la salle :
  * Affichage de la question de quiz en grand format.
  * Podium des 5 tables en tête.
  * QR Code de ralliement géant pour les invités.
  * Compteur en direct des invités connectés et des prières formulées.

### 6. 📱 PWA (Progressive Web App)
* **Zéro téléchargement requis** sur les stores : accès immédiat par flash de QR code sur la table.
* **Installation en 1-clic** sur l'écran d'accueil (`manifest.webmanifest` avec icônes de luxe or et obsidienne).
* **Support hors-ligne et résilience réseau** grâce au Service Worker (`sw.js`).
* **Onboarding express en 15 secondes** (Prénom + Numéro de Table + Avatar).

---

## ⚡ Architecture Technique (100% Cloudflare)

```
COMPAGNION DE CEREMONIE/
├── d1/
│   ├── schema.sql              # Schéma SQL Cloudflare D1 (SQLite serverless)
│   └── seed.sql                # Données initiales et démo prête à l'emploi
├── worker/
│   └── index.js                # API Cloudflare Worker (REST, CORS, D1, Assets)
├── public/
│   ├── manifest.webmanifest    # Manifeste PWA complet
│   ├── sw.js                   # Service Worker (Cache-first / Offline resilient)
│   ├── icon.svg                # Icône PWA haute résolution
│   └── favicon.svg             # Favicon navigateur
├── src/
│   ├── index.html              # Interface SPA moderne
│   ├── styles/                 # Design System Glassmorphism & Micro-animations
│   │   ├── main.css            # Thème or & obsidienne, typographie Outfit/Jakarta
│   │   ├── chat.css            # Styles du chat live
│   │   ├── games.css           # Quiz chronométré & sondages
│   │   ├── networking.css      # Fiches de réseautage
│   │   ├── prayer.css          # Mur de prières & bouton Amen
│   │   └── projector.css       # Mode vidéoprojecteur grand écran
│   └── js/
│       ├── state.js            # Gestion de l'état local & session invité
│       ├── api.js              # Client API avec mode résilience locale automatique
│       ├── app.js              # Navigation par onglets, routeur, PWA installer
│       ├── chat.js             # Logique du chat & réactions
│       ├── games.js            # Logique du Quiz live & podium de table
│       ├── networking.js       # Logique de mise en relation
│       ├── prayer.js           # Logique des prières & soutiens
│       └── projector.js        # Vue régie vidéoprojecteur
├── wrangler.toml               # Configuration Cloudflare Workers + D1 + Assets
├── package.json                # Scripts de build Vite & Cloudflare Wrangler
└── deploy-cloudflare.bat       # Déploiement Cloudflare 1-clic pour Windows
```

---

## 🚀 Guide de Démarrage Rapide

### 1. Développement Local
```bash
# Lancer le serveur de développement Vite
npm run dev
```
L'application s'ouvre sur `http://localhost:5173/`.

### 2. Tester le bundle de production
```bash
npm run build
npm run preview
```

### 3. Déployer sur Cloudflare (1-Clic)
Double-cliquez sur `deploy-cloudflare.bat` ou lancez :
```bash
npm run cf:deploy
```

Pour initialiser la base de données Cloudflare D1 en ligne :
```bash
npm run d1:create
npm run d1:init
npm run d1:seed
```
