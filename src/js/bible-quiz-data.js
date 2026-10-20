/**
 * COMPAGNON DE CÉRÉMONIE - Banque de Questions Bibliques
 * Extraite intégralement du projet holographic-ring V1.4
 * 10 Blocs thématiques × 20 questions = 200 questions bibliques uniques
 * Toutes les options sont mélangées dynamiquement pour alterner équitablement A, B, C, D
 */

// ============================================================
// BLOC 1 : CRÉATION & PATRIARCHES
// ============================================================
const EASY_BLOCK_1 = [
  { question: "Qui a créé le monde selon la Bible?", options: ["Dieu", "Moïse", "Abraham", "Jésus"], correct: 0, reference: "Genèse 1:1" },
  { question: "Combien de jours Dieu a-t-il utilisés pour créer le monde?", options: ["6", "7", "5", "3"], correct: 0, reference: "Genèse 1" },
  { question: "Quel est le premier livre de la Bible?", options: ["Genèse", "Exode", "Matthieu", "Apocalypse"], correct: 0 },
  { question: "Qui a construit l'arche?", options: ["Noé", "Abraham", "Moïse", "David"], correct: 0, reference: "Genèse 6" },
  { question: "Combien d'apôtres Jésus avait-il?", options: ["12", "7", "10", "5"], correct: 0, reference: "Matthieu 10:1" },
  { question: "Dans quelle ville Jésus est-il né?", options: ["Bethléem", "Nazareth", "Jérusalem", "Capharnaüm"], correct: 0, reference: "Luc 2:4" },
  { question: "Quel est le dernier livre de la Bible?", options: ["Apocalypse", "Malachie", "Jude", "Jean"], correct: 0 },
  { question: "Qui a été avalé par un grand poisson?", options: ["Jonas", "Pierre", "Paul", "Ézéchiel"], correct: 0, reference: "Jonas 1:17" },
  { question: "De quel arbre Adam et Ève ne devaient pas manger?", options: ["De la connaissance du bien et du mal", "De vie", "De l'olivier", "Du figuier"], correct: 0, reference: "Genèse 2:17" },
  { question: "Combien de livres contient la Bible protestante?", options: ["66", "39", "27", "73"], correct: 0 },
  { question: "Qui a baptisé Jésus?", options: ["Jean-Baptiste", "Pierre", "André", "Élie"], correct: 0, reference: "Matthieu 3:13" },
  { question: "Comment s'appelait la mère de Jésus?", options: ["Marie", "Marthe", "Élisabeth", "Salomé"], correct: 0, reference: "Luc 1:27" },
  { question: "Quelle mer Moïse a-t-il traversée à pied sec?", options: ["La mer Rouge", "La mer Morte", "La Méditerranée", "Le lac de Tibériade"], correct: 0, reference: "Exode 14" },
  { question: "Combien de commandements Dieu a-t-il donnés à Moïse?", options: ["10", "7", "12", "5"], correct: 0, reference: "Exode 20" },
  { question: "Avec quoi David a-t-il vaincu Goliath?", options: ["Une fronde et une pierre", "Une épée", "Une lance", "Ses mains"], correct: 0, reference: "1 Samuel 17:50" },
  { question: "Dans quel jardin Jésus a-t-il prié avant son arrestation?", options: ["Gethsémani", "Éden", "Siloé", "Béthanie"], correct: 0, reference: "Matthieu 26:36" },
  { question: "Combien de jours Jésus a-t-il jeûné dans le désert?", options: ["40 jours", "7 jours", "3 jours", "30 jours"], correct: 0, reference: "Matthieu 4:2" },
  { question: "Quel est le verset le plus court de la Bible?", options: ["Jésus pleura", "Priez sans cesse", "Réjouissez-vous", "Dieu est amour"], correct: 0, reference: "Jean 11:35" },
  { question: "Qui a trahi Jésus pour 30 pièces d'argent?", options: ["Judas Iscariote", "Pierre", "Thomas", "Jean"], correct: 0, reference: "Matthieu 26:15" },
  { question: "Quel est le fleuve dans lequel Jésus a été baptisé?", options: ["Le Jourdain", "Le Nil", "L'Euphrate", "Le Tigre"], correct: 0, reference: "Matthieu 3:13" },
];

// ============================================================
// BLOC 2 : EXODE & ROIS D'ISRAËL
// ============================================================
const EASY_BLOCK_2 = [
  { question: "Qui était le père adoptif de Jésus sur terre?", options: ["Joseph", "Joachim", "Zacharie", "Simon"], correct: 0, reference: "Matthieu 1:16" },
  { question: "Combien d'heures l'obscurité a-t-elle régné sur la croix?", options: ["3 heures", "6 heures", "1 heure", "12 heures"], correct: 0, reference: "Marc 15:33" },
  { question: "Qui était le premier roi oint d'Israël?", options: ["Saül", "David", "Salomon", "Samuel"], correct: 0, reference: "1 Samuel 10:24" },
  { question: "Quel Psaume commence par 'L'Éternel est mon berger'?", options: ["Psaume 23", "Psaume 1", "Psaume 51", "Psaume 119"], correct: 0, reference: "Psaume 23:1" },
  { question: "Quelle reine est venue admirer la sagesse de Salomon?", options: ["La reine de Saba", "La reine d'Égypte", "La reine Candace", "Jézabel"], correct: 0, reference: "1 Rois 10" },
  { question: "Comment s'appelait le père d'Abraham?", options: ["Térah", "Noé", "Sem", "Lot"], correct: 0, reference: "Genèse 11:26" },
  { question: "Quel prophète a prédit la naissance de Jésus à Bethléem?", options: ["Michée", "Ésaïe", "Jérémie", "Daniel"], correct: 0, reference: "Michée 5:2" },
  { question: "Dans quel chapitre de la Bible trouve-t-on le poème de la femme vertueuse?", options: ["Proverbes 31", "Psaume 1", "Cantique 2", "Ecclésiaste 3"], correct: 0, reference: "Proverbes 31" },
  { question: "Combien de jours et nuits il a plu lors du déluge?", options: ["40", "7", "20", "100"], correct: 0, reference: "Genèse 7:12" },
  { question: "Qui a tenté Ève dans le jardin d'Éden?", options: ["Le serpent (Satan)", "Un ange déchu", "Un lion", "Caïn"], correct: 0, reference: "Genèse 3:1" },
  { question: "Quel miracle Jésus a-t-il accompli aux noces de Cana?", options: ["Transformer l'eau en vin", "Marcher sur l'eau", "Ressusciter Lazare", "Guérir l'aveugle"], correct: 0, reference: "Jean 2:1-11" },
  { question: "Comment s'appelait le fils promis d'Abraham et Sarah?", options: ["Isaac", "Ismaël", "Jacob", "Ésaü"], correct: 0, reference: "Genèse 21:3" },
  { question: "Qui a vendu Joseph comme esclave à des marchands?", options: ["Ses frères", "Son père", "Potiphar", "Pharaon"], correct: 0, reference: "Genèse 37:28" },
  { question: "Quel était le métier de Pierre avant de suivre Jésus?", options: ["Pêcheur", "Charpentier", "Berger", "Collecteur d'impôts"], correct: 0, reference: "Matthieu 4:18" },
  { question: "Que s'est-il manifesté sur les apôtres à la Pentecôte?", options: ["Des langues de feu", "Une colombe", "Une nuée lumineuse", "Une pluie d'or"], correct: 0, reference: "Actes 2:3" },
  { question: "Qui a composé la majorité des Psaumes?", options: ["David", "Salomon", "Asaph", "Moïse"], correct: 0, reference: "Titres des Psaumes" },
  { question: "Quel apôtre a osé marcher sur les eaux vers Jésus?", options: ["Pierre", "Jean", "Paul", "Thomas"], correct: 0, reference: "Matthieu 14:29" },
  { question: "Quelle langue quotidienne Jésus parlait-il principalement?", options: ["L'araméen", "Le latin", "Le grec ancien", "L'égyptien"], correct: 0 },
  { question: "Qui était le sacrificateur et beau-père de Moïse?", options: ["Jéthro", "Aaron", "Amram", "Éléazar"], correct: 0, reference: "Exode 3:1" },
  { question: "Quel aliment miraculeux nourrissait les Hébreux au désert?", options: ["La manne", "Le pain au miel", "Les figues", "Le raisin"], correct: 0, reference: "Exode 16:31" },
];

// ============================================================
// BLOC 3 : PROPHÈTES & MIRACLES
// ============================================================
const EASY_BLOCK_3 = [
  { question: "Quel archange a annoncé la naissance du Messie à Marie?", options: ["Gabriel", "Michel", "Raphaël", "Uriel"], correct: 0, reference: "Luc 1:26" },
  { question: "Quel était le peuple du géant Goliath?", options: ["Philistins", "Égyptiens", "Amalécites", "Babyloniens"], correct: 0, reference: "1 Samuel 17" },
  { question: "Combien de livres contient le Nouveau Testament?", options: ["27", "39", "22", "30"], correct: 0 },
  { question: "Qui Jésus a-t-il ressuscité après 4 jours dans le tombeau?", options: ["Lazare", "Jaïrus", "Eutychus", "Tabitha"], correct: 0, reference: "Jean 11" },
  { question: "Combien de personnes Jésus a-t-il nourries avec 5 pains et 2 poissons?", options: ["5 000 hommes", "1 000 hommes", "500 hommes", "12 000 hommes"], correct: 0, reference: "Matthieu 14:21" },
  { question: "Dans quel lieu modeste Jésus nouveau-né a-t-il été couché?", options: ["Une crèche dans une étable", "Un berceau d'or", "Une tente", "Une auberge"], correct: 0, reference: "Luc 2:7" },
  { question: "Qui a dit 'L'Éternel est ma lumière et mon salut, de qui aurais-je peur'?", options: ["David", "Moïse", "Ésaïe", "Jérémie"], correct: 0, reference: "Psaume 27:1" },
  { question: "Qui a été réquisitionné pour aider Jésus à porter sa croix?", options: ["Simon de Cyrène", "Joseph d'Arimathée", "Nicodème", "Jean"], correct: 0, reference: "Marc 15:21" },
  { question: "Quel prophète a été nourri au torrent par des corbeaux?", options: ["Élie", "Élisée", "Jérémie", "Ésaïe"], correct: 0, reference: "1 Rois 17:6" },
  { question: "Quel animal sauvage Samson a-t-il déchiré à mains nues?", options: ["Un lionceau", "Un ours", "Un loup", "Un léopard"], correct: 0, reference: "Juges 14:6" },
  { question: "Qui fut le tout premier martyr chrétien lapidé pour sa foi?", options: ["Étienne", "Jacques", "Pierre", "Paul"], correct: 0, reference: "Actes 7:59" },
  { question: "Quelle fête juive commémore la libération de l'esclavage d'Égypte?", options: ["La Pâque", "La Pentecôte", "Les Tabernacles", "Le Pourim"], correct: 0, reference: "Exode 12" },
  { question: "De quelle tribu royale d'Israël Jésus est-il issu?", options: ["Juda", "Lévi", "Benjamin", "Dan"], correct: 0, reference: "Hébreux 7:14" },
  { question: "Quelle femme a vaincu le chef d'armée Sisera avec un piquet de tente?", options: ["Jaël", "Débora", "Baraq", "Abigaïl"], correct: 0, reference: "Juges 4:21" },
  { question: "Quel roi a bâti le glorieux premier Temple de Jérusalem?", options: ["Salomon", "David", "Saül", "Roboam"], correct: 0, reference: "1 Rois 6" },
  { question: "Dans quelle parabole célèbre un père embrasse son fils repenti?", options: ["Le fils prodigue", "Le bon samaritain", "Les talents", "Le semeur"], correct: 0, reference: "Luc 15:11" },
  { question: "Quel empereur de Babylone a déporté les Juifs et détruit Jérusalem?", options: ["Nebucadnetsar", "Cyrus", "Darius", "Sennachérib"], correct: 0, reference: "2 Rois 25" },
  { question: "Qui a vu dans un songe une échelle reliant la terre au ciel?", options: ["Jacob", "Abraham", "Isaac", "Joseph"], correct: 0, reference: "Genèse 28:12" },
  { question: "Quelle femme a caché les espions hébreux à Jéricho?", options: ["Rahab", "Ruth", "Esther", "Sarah"], correct: 0, reference: "Josué 2:4" },
  { question: "Sur quel arbre Zachée est-il monté pour apercevoir Jésus?", options: ["Un sycomore", "Un olivier", "Un figuier", "Un palmier"], correct: 0, reference: "Luc 19:4" },
];

// ============================================================
// BLOC 4 : APÔTRES & ENSEIGNEMENTS
// ============================================================
const EASY_BLOCK_4 = [
  { question: "Qui était la fidèle belle-mère de Ruth la Moabite?", options: ["Naomi", "Orpa", "Mara", "Hannah"], correct: 0, reference: "Ruth 1:22" },
  { question: "Qui était le frère de Marthe et Marie de Béthanie?", options: ["Lazare", "Simon", "Joseph", "André"], correct: 0, reference: "Jean 11:1" },
  { question: "Quel apôtre exerçait le métier de collecteur d'impôts (publicain)?", options: ["Matthieu", "Pierre", "Luc", "Jean"], correct: 0, reference: "Matthieu 9:9" },
  { question: "Quel gouverneur romain a condamné Jésus bien que le trouvant innocent?", options: ["Ponce Pilate", "César Auguste", "Hérode Antipas", "Félix"], correct: 0, reference: "Matthieu 27:2" },
  { question: "Quel apôtre a reçu et écrit les visions de l'Apocalypse?", options: ["Jean", "Pierre", "Paul", "Jacques"], correct: 0, reference: "Apocalypse 1:1" },
  { question: "Quelle reine cruelle a exigé la décapitation de Jean-Baptiste?", options: ["Hérodiade", "Salomé", "Athalie", "Jézabel"], correct: 0, reference: "Marc 6:24" },
  { question: "Quel prophète a été ravi au ciel dans un tourbillon et un char de feu?", options: ["Élie", "Énoch", "Élisée", "Moïse"], correct: 0, reference: "2 Rois 2:11" },
  { question: "Que demanda le jeune roi Salomon à Dieu au début de son règne?", options: ["Un cœur intelligent et sage", "La richesse", "La mort de ses ennemis", "Une longue vie"], correct: 0, reference: "1 Rois 3:9" },
  { question: "Sur quelle matière les dix commandements ont-ils été gravés?", options: ["Des tables de pierre", "Du bois de cèdre", "Des tablettes d'or", "De l'argile cuite"], correct: 0, reference: "Exode 31:18" },
  { question: "Qui est le principal auteur du livre des Proverbes?", options: ["Salomon", "David", "Moïse", "Samuel"], correct: 0, reference: "Proverbes 1:1" },
  { question: "Quel disciple a été tiré au sort pour remplacer Judas parmi les Douze?", options: ["Matthias", "Barnabas", "Silas", "Tite"], correct: 0, reference: "Actes 1:26" },
  { question: "Depuis quelle montagne Moïse a-t-il contemplé la Terre Promise avant de mourir?", options: ["Le Mont Nébo", "Le Mont Sinaï", "Le Mont Carmel", "Le Mont des Oliviers"], correct: 0, reference: "Deutéronome 34:1" },
  { question: "Quel était le nom hébreu de l'apôtre Paul avant sa conversion?", options: ["Saul de Tarse", "Silas", "Simon", "Samuel"], correct: 0, reference: "Actes 13:9" },
  { question: "Qui fut le vaillant successeur de Moïse pour conduire Israël en Canaan?", options: ["Josué", "Aaron", "Caleb", "Gédéon"], correct: 0, reference: "Josué 1:1" },
  { question: "Sur quelle route Saul a-t-il été aveuglé par la lumière du Christ ressuscité?", options: ["Sur le chemin de Damas", "À Jérusalem", "À Rome", "À Antioche"], correct: 0, reference: "Actes 9:3" },
  { question: "Combien de tribus formaient le peuple d'Israël?", options: ["12 tribus", "10 tribus", "7 tribus", "14 tribus"], correct: 0, reference: "Genèse 49" },
  { question: "Quel juge et prophète a oint David en secret à Bethléem?", options: ["Samuel", "Nathan", "Élie", "Élisée"], correct: 0, reference: "1 Samuel 16:13" },
  { question: "Quel archange a disputé le corps de Moïse contre le diable?", options: ["Michel", "Gabriel", "Raphaël", "Uriel"], correct: 0, reference: "Jude 1:9" },
  { question: "Quel roi régnait sur la Judée lors de la visite des mages à Bethléem?", options: ["Hérode le Grand", "César Auguste", "Tibère", "Ponce Pilate"], correct: 0, reference: "Matthieu 2:1" },
  { question: "Quelle est la plus longue des épîtres de Paul?", options: ["Romains", "1 Corinthiens", "Hébreux", "Galates"], correct: 0 },
];

// ============================================================
// BLOC 5 : PSAUMES, SAGESSE & CONVERSION
// ============================================================
const EASY_BLOCK_5 = [
  { question: "Combien d'épîtres l'apôtre Jean a-t-il rédigées dans le NT?", options: ["3 épîtres", "1 seule", "2 épîtres", "5 épîtres"], correct: 0 },
  { question: "Qui était le père du roi Salomon?", options: ["David", "Saül", "Samuel", "Nathan"], correct: 0, reference: "2 Samuel 12:24" },
  { question: "Quel vieillard pieux a béni l'enfant Jésus au Temple de Jérusalem?", options: ["Siméon", "Zacharie", "Nicodème", "Gamaliel"], correct: 0, reference: "Luc 2:25" },
  { question: "Qui est l'auteur inspiré des Actes des Apôtres?", options: ["Luc", "Pierre", "Paul", "Jean"], correct: 0, reference: "Actes 1:1" },
  { question: "Quel prophète Dieu a-t-il envoyé épouser Gomer en symbole de fidélité?", options: ["Osée", "Amos", "Michée", "Joël"], correct: 0, reference: "Osée 1:2" },
  { question: "Quel mendiant aveugle a crié 'Fils de David, aie pitié de moi' à Jéricho?", options: ["Bartimée", "Zachée", "Lazare", "Simon"], correct: 0, reference: "Marc 10:46" },
  { question: "Qui est désigné dans les Écritures comme 'l'homme selon le cœur de Dieu'?", options: ["David", "Abraham", "Moïse", "Salomon"], correct: 0, reference: "1 Samuel 13:14" },
  { question: "Quel roi impie a vu des doigts tracer une sentence sur le mur de son festin?", options: ["Belschatsar", "Nebucadnetsar", "Darius", "Cyrus"], correct: 0, reference: "Daniel 5" },
  { question: "Quel homme a vécu le plus vieux selon la généalogie de la Genèse (969 ans)?", options: ["Mathusalem", "Énoch", "Noé", "Adam"], correct: 0, reference: "Genèse 5:27" },
  { question: "Quel roi de Perse a proclamé le décret autorisant la reconstruction du Temple?", options: ["Cyrus", "Darius", "Artaxerxès", "Assuérus"], correct: 0, reference: "Esdras 1:1" },
  { question: "Combien de pains Jésus a-t-il multipliés lors de la 2ème multiplication (4000 hommes)?", options: ["7 pains", "5 pains", "3 pains", "12 pains"], correct: 0, reference: "Marc 8:5" },
  { question: "Qui marchait avec Dieu et fut enlevé sans connaître la mort physique avant le déluge?", options: ["Énoch", "Abel", "Seth", "Lémec"], correct: 0, reference: "Genèse 5:24" },
  { question: "Quelle était la profession de l'évangéliste Luc?", options: ["Médecin", "Pêcheur", "Rabbin", "Fabricant de tentes"], correct: 0, reference: "Colossiens 4:14" },
  { question: "Sur quelle place célèbre d'Athènes Paul a-t-il parlé du 'Dieu inconnu'?", options: ["L'Aréopage", "Le Colisée", "L'Agora de Corinthe", "Le Capitole"], correct: 0, reference: "Actes 17:22" },
  { question: "Quel prophète de l'Ancien Testament a été surnommé le 'prophète pleureur'?", options: ["Jérémie", "Ésaïe", "Ézéchiel", "Daniel"], correct: 0 },
  { question: "Quel apôtre a été martyrisé par l'épée sur ordre d'Hérode Agrippa?", options: ["Jacques (frère de Jean)", "Pierre", "Paul", "André"], correct: 0, reference: "Actes 12:2" },
  { question: "Quel est le thème suprême et bouleversant du livre de Job?", options: ["La souveraineté de Dieu et la foi dans l'épreuve", "Les lois des sacrifices", "L'art de la guerre", "La généalogie des rois"], correct: 0 },
  { question: "Quelle marchande de pourpre fut la toute première convertie en Europe à Philippes?", options: ["Lydie", "Priscille", "Phoebe", "Dorcas"], correct: 0, reference: "Actes 16:14" },
  { question: "Quel est le livre poétique de la Bible célébrant l'amour de l'Époux et de l'Épouse?", options: ["Le Cantique des Cantiques", "Les Psaumes", "L'Ecclésiaste", "Les Lamentations"], correct: 0 },
  { question: "Quel grand prophète a vu la gloire de Dieu et des ossements desséchés revivre?", options: ["Ézéchiel", "Jérémie", "Daniel", "Zacharie"], correct: 0, reference: "Ézéchiel 37" },
];

// ============================================================
// BLOC 6 : RECONSTRUCTION & MINISTÈRE DE JÉSUS
// ============================================================
const EASY_BLOCK_6 = [
  { question: "Qui a nourri et caché 100 prophètes de l'Éternel dans des cavernes face à Jézabel?", options: ["Abdias", "Élie", "Élisée", "Daniel"], correct: 0, reference: "1 Rois 18:4" },
  { question: "Quel était le métier du prophète Amos avant son appel?", options: ["Berger et cultivateur de sycomores", "Prêtre", "Scribe", "Forgeron"], correct: 0, reference: "Amos 1:1" },
  { question: "Qui a dirigé la reconstruction des murailles de Jérusalem en seulement 52 jours?", options: ["Néhémie", "Esdras", "Zorobabel", "Josué"], correct: 0, reference: "Néhémie 6:15" },
  { question: "Combien de 'Petits Prophètes' compte l'Ancien Testament?", options: ["12", "10", "7", "16"], correct: 0 },
  { question: "En quoi était fait le vêtement d'ascète de Jean-Baptiste?", options: ["En poils de chameau", "En lin fin d'Égypte", "En pourpre", "En peau de chèvre"], correct: 0, reference: "Matthieu 3:4" },
  { question: "De quoi Jean-Baptiste se nourrissait-il dans le désert?", options: ["De sauterelles et de miel sauvage", "De pain et d'eau", "De galettes d'orge", "De fruits secs"], correct: 0, reference: "Matthieu 3:4" },
  { question: "Dans quel village de Galilée Jésus a-t-il grandi avec Joseph et Marie?", options: ["Nazareth", "Bethléem", "Capharnaüm", "Béthanie"], correct: 0, reference: "Luc 2:51" },
  { question: "Qui a été le tout dernier juge d'Israël avant l'instauration de la royauté?", options: ["Samuel", "Samson", "Éli", "Gédéon"], correct: 0, reference: "1 Samuel 7:15" },
  { question: "Quelle est la magnifique signification prophétique du nom 'Emmanuel'?", options: ["Dieu avec nous", "Dieu sauve", "Dieu est grand", "Dieu écoute"], correct: 0, reference: "Matthieu 1:23" },
  { question: "Quel général syrien a été guéri de sa lèpre sur la parole d'Élisée?", options: ["Naaman", "Ben-Hadad", "Hazaël", "Sennachérib"], correct: 0, reference: "2 Rois 5" },
  { question: "Combien de fois Naaman a-t-il dû se plonger dans le Jourdain pour être purifié?", options: ["7 fois", "3 fois", "1 fois", "10 fois"], correct: 0, reference: "2 Rois 5:10" },
  { question: "Quel est le plus long chapitre de toute la Bible, célébrant la Parole de Dieu?", options: ["Psaume 119 (176 versets)", "Psaume 23", "Ésaïe 53", "Matthieu 24"], correct: 0 },
  { question: "Quel prophète a reçu l'ordre d'avaler un rouleau rempli de lamentations?", options: ["Ézéchiel", "Jérémie", "Daniel", "Ésaïe"], correct: 0, reference: "Ézéchiel 3:1" },
  { question: "Qui est l'auteur inspiré du livre des Lamentations après la ruine de Sion?", options: ["Jérémie", "David", "Baruc", "Ézéchiel"], correct: 0 },
  { question: "Combien de vaillants combattants Dieu a-t-il choisis pour l'armée de Gédéon?", options: ["300 hommes", "3 000 hommes", "1 000 hommes", "10 000 hommes"], correct: 0, reference: "Juges 7:7" },
  { question: "Quel patriarche a donné la dîme de tout au mystérieux roi Melchisédek?", options: ["Abraham", "Isaac", "Jacob", "Noé"], correct: 0, reference: "Genèse 14:20" },
  { question: "Quel roi impie a découpé et brûlé le rouleau prophétique de Jérémie?", options: ["Jojakim", "Sédécias", "Jéchonias", "Achab"], correct: 0, reference: "Jérémie 36:23" },
  { question: "Combien de cantiques inspirés composent le livre des Psaumes?", options: ["150 Psaumes", "120 Psaumes", "100 Psaumes", "70 Psaumes"], correct: 0 },
  { question: "Quel est le livre prophétique le plus court de l'Ancien Testament (1 seul chapitre)?", options: ["Abdias", "Aggée", "Nahum", "Sophonie"], correct: 0 },
  { question: "Combien de villes de refuge Dieu avait-il ordonné d'établir en Israël?", options: ["6 villes", "3 villes", "7 villes", "12 villes"], correct: 0, reference: "Nombres 35:6" },
];

// ============================================================
// BLOC 7 : FOI HÉROÏQUE & ACTES DES APÔTRES
// ============================================================
const EASY_BLOCK_7 = [
  { question: "Quelle reine courageuse a prononcé cette parole de foi : 'Si je dois périr, je périrai'?", options: ["Esther", "Ruth", "Débora", "Abigaïl"], correct: 0, reference: "Esther 4:16" },
  { question: "Quel est le tout dernier mot qui scelle le livre de l'Apocalypse et la Bible?", options: ["Amen", "Grâce", "Jésus", "Éternité"], correct: 0, reference: "Apocalypse 22:21" },
  { question: "Combien de fois l'apôtre Paul a-t-il survécu à un naufrage en mer?", options: ["3 fois", "1 seule fois", "2 fois", "4 fois"], correct: 0, reference: "2 Corinthiens 11:25" },
  { question: "Quel jeune homme s'est endormi et est tombé du 3ème étage pendant une prédication de Paul?", options: ["Eutychus", "Tychique", "Trophime", "Philémon"], correct: 0, reference: "Actes 20:9" },
  { question: "Quelle église de l'Apocalypse le Seigneur a-t-il avertie pour sa tiédeur spirituelle?", options: ["Laodicée", "Sardes", "Éphèse", "Smyrne"], correct: 0, reference: "Apocalypse 3:16" },
  { question: "Combien d'années Jacob a-t-il servi chez Laban au total pour épouser Rachel?", options: ["14 ans", "7 ans", "21 ans", "10 ans"], correct: 0, reference: "Genèse 29:27" },
  { question: "À Joppé, quel apôtre a eu la vision d'une grande nappe descendue du ciel?", options: ["Pierre", "Paul", "Jean", "Barnabas"], correct: 0, reference: "Actes 10:11" },
  { question: "Quel roi de Juda a fait percer un tunnel célèbre pour alimenter Jérusalem en eau?", options: ["Ézéchias", "Salomon", "Josias", "Asa"], correct: 0, reference: "2 Rois 20:20" },
  { question: "Quel apôtre a vu les quatre cavaliers symboliques dans sa vision prophétique?", options: ["Jean", "Pierre", "Paul", "Jacques"], correct: 0, reference: "Apocalypse 6" },
  { question: "Quel roi déchu a consulté la nécromancienne d'En-Dor à la veille de sa mort?", options: ["Saül", "David", "Achab", "Roboam"], correct: 0, reference: "1 Samuel 28:7" },
  { question: "Combien de jours le champion Goliath a-t-il défié les armées d'Israël matin et soir?", options: ["40 jours", "7 jours", "30 jours", "12 jours"], correct: 0, reference: "1 Samuel 17:16" },
  { question: "Combien d'épouses et concubines le roi Salomon a-t-il eues au total?", options: ["700 épouses et 300 concubines", "100", "50", "300"], correct: 0, reference: "1 Rois 11:3" },
  { question: "Combien d'années les Israélites ont-ils erré dans le désert avant d'entrer en Canaan?", options: ["40 ans", "50 ans", "30 ans", "25 ans"], correct: 0, reference: "Nombres 14:33" },
  { question: "Quel usurpateur a régné seulement 7 jours à Tirtsa avant de brûler son palais?", options: ["Zimri", "Omri", "Éla", "Nadab"], correct: 0, reference: "1 Rois 16:15" },
  { question: "Combien de sources d'eau et de palmiers les Hébreux ont-ils trouvés dans l'oasis d'Élim?", options: ["12 sources et 70 palmiers", "7 sources et 12 palmiers", "40 sources", "3 sources"], correct: 0, reference: "Exode 15:27" },
  { question: "Quel juge gaucher a délivré Israël en éliminant Eglon, le gros roi de Moab?", options: ["Éhud", "Samson", "Gédéon", "Barak"], correct: 0, reference: "Juges 3:21" },
  { question: "Quel fut le premier miracle accompli par le prophète Élisée à Jéricho?", options: ["Assainir les eaux mortelles avec du sel", "Multiplier l'huile", "Guérir un lépreux", "Ressusciter un enfant"], correct: 0, reference: "2 Rois 2:21" },
  { question: "Quelle prophétesse a chanté avec un tambourin après le passage de la Mer Rouge?", options: ["Myriam (sœur de Moïse)", "Débora", "Anne", "Élisabeth"], correct: 0, reference: "Exode 15:20" },
  { question: "Comment nomme-t-on le commandement de Jésus d'aller faire de toutes les nations des disciples?", options: ["La Grande Commission", "Le Décalogue", "La Loi royale", "L'Alliance éternelle"], correct: 0, reference: "Matthieu 28:19" },
  { question: "Qui était Melchisédek dans l'Épître aux Hébreux et en Genèse 14?", options: ["Roi de Salem et sacrificateur du Très-Haut", "Un juge d'Israël", "Un roi d'Égypte", "Un général romain"], correct: 0, reference: "Hébreux 7:1" },
];

// ============================================================
// BLOC 8 : PERSONNAGES, ALLIANCES & VÉRITÉS
// ============================================================
const EASY_BLOCK_8 = [
  { question: "Quel commerce honorable exerçait Lydie avant de soutenir Paul et Silas?", options: ["Marchande de pourpre", "Tisseuse de lin", "Potière", "Boulangère"], correct: 0, reference: "Actes 16:14" },
  { question: "Quel disciple surnommé 'fils de consolation' a vendu un champ pour l'Église naissante?", options: ["Barnabas", "Silas", "Timothée", "Tite"], correct: 0, reference: "Actes 4:36" },
  { question: "Combien d'épîtres sont attribuées à Paul dans le canon biblique usuel?", options: ["13 ou 14 épîtres", "7 épîtres", "10 épîtres", "20 épîtres"], correct: 0 },
  { question: "Quel livre de la Bible a la particularité de ne jamais mentionner explicitement le mot 'Dieu'?", options: ["Esther", "Ruth", "Jonas", "Amos"], correct: 0 },
  { question: "Dans quelle vallée le jeune David a-t-il relevé le défi du philistin Goliath?", options: ["La vallée d'Éla", "La vallée de Hinnom", "La vallée de Josaphat", "La vallée du Cédron"], correct: 0, reference: "1 Samuel 17:2" },
  { question: "Quel prophète a écrit : 'Mon peuple périt, parce qu'il lui manque la connaissance'?", options: ["Osée", "Amos", "Michée", "Joël"], correct: 0, reference: "Osée 4:6" },
  { question: "Quel surnom araméen Jésus a-t-il donné à Simon, signifiant 'Pierre' ou 'Roc'?", options: ["Céphas", "Barnabas", "Boanerges", "Didyme"], correct: 0, reference: "Jean 1:42" },
  { question: "Comment s'appelait l'épouse juive du gouverneur romain Félix?", options: ["Drusille", "Bérénice", "Hérodiade", "Salomé"], correct: 0, reference: "Actes 24:24" },
  { question: "Quel prophète a été jeté au fond d'une citerne fangeuse pour avoir annoncé la vérité?", options: ["Jérémie", "Ésaïe", "Ézéchiel", "Daniel"], correct: 0, reference: "Jérémie 38:6" },
  { question: "Quel prénom d'un patriarche hébreu signifie 'Rire' en souvenir du rire de sa mère?", options: ["Isaac", "Jacob", "Ésaü", "Joseph"], correct: 0, reference: "Genèse 21:3" },
  { question: "Quel nom prophétique Dieu a-t-il donné à Jacob après son combat au gué de Jabbok?", options: ["Israël (celui qui lutte avec Dieu)", "Juda", "Benjamin", "Éphraïm"], correct: 0, reference: "Genèse 32:28" },
  { question: "Avec qui Jacob a-t-il lutté jusqu'au lever de l'aurore au gué de Jabbok?", options: ["L'ange de l'Éternel", "Son frère Ésaü", "Laban", "Un brigand"], correct: 0, reference: "Genèse 32:24" },
  { question: "Quel âge Sarah avait-elle quand elle a enfanté Isaac selon la promesse divine?", options: ["90 ans", "75 ans", "100 ans", "60 ans"], correct: 0, reference: "Genèse 17:17" },
  { question: "Quel cousin vertueux d'Esther a déjoué le complot contre le roi de Perse?", options: ["Mardochée", "Daniel", "Néhémie", "Esdras"], correct: 0, reference: "Esther 2:7" },
  { question: "Quel prophète a proclamé au Jourdain : 'Voici l'Agneau de Dieu qui ôte le péché du monde'?", options: ["Jean-Baptiste", "Pierre", "Élie", "Ésaïe"], correct: 0, reference: "Jean 1:29" },
  { question: "Parmi les sept premiers hommes choisis comme diacres dans Actes 6, qui est nommé en premier?", options: ["Étienne", "Philippe", "Prochore", "Nicanor"], correct: 0, reference: "Actes 6:5" },
  { question: "Quel serviteur de Dieu a crié en voyant le ciel ouvert : 'Je vois les cieux ouverts et le Fils de l'homme debout à la droite de Dieu'?", options: ["Étienne", "Paul", "Jean", "Pierre"], correct: 0, reference: "Actes 7:56" },
  { question: "Quel livre de l'Ancien Testament relate l'épreuve et la fidélité inébranlable d'un patriarche éprouvé?", options: ["Job", "Ruth", "Ecclésiaste", "Habacuc"], correct: 0, reference: "Job 1:1" },
  { question: "Qui s'est écrié au milieu de ses souffrances : 'Je sais que mon Rédempteur est vivant'?", options: ["Job", "David", "Paul", "Jérémie"], correct: 0, reference: "Job 19:25" },
  { question: "Quel jeune homme battait du froment en cachette dans un pressoir quand l'Ange lui est apparu?", options: ["Gédéon", "David", "Samson", "Saül"], correct: 0, reference: "Juges 6:11" },
];

// ============================================================
// BLOC 9 : SIGNE DE DIEU & COMBATS SPIRITUELS
// ============================================================
const EASY_BLOCK_9 = [
  { question: "Qui demanda un double signe miraculeux à Dieu avec une toison de laine arrosée de rosée?", options: ["Gédéon", "Samson", "David", "Élie"], correct: 0, reference: "Juges 6:37" },
  { question: "Par quelle épreuve à la source Dieu a-t-il sélectionné les 300 hommes de Gédéon?", options: ["Ceux qui lapèrent l'eau avec la main", "Ceux qui se mirent à genoux", "Les plus rapides à la course", "Les plus forts physiquement"], correct: 0, reference: "Juges 7:5" },
  { question: "De quelle femme Jésus a-t-il chassé sept démons avant qu'elle ne devienne un témoin fidèle?", options: ["Marie de Magdala (Marie-Madeleine)", "Marthe", "Salomé", "Jeanne"], correct: 0, reference: "Marc 16:9" },
  { question: "Qui fut la toute première personne à rencontrer Jésus ressuscité au matin de Pâques?", options: ["Marie-Madeleine", "Pierre", "Jean", "Thomas"], correct: 0, reference: "Jean 20:14" },
  { question: "Quelle fonction de confiance Néhémie exerçait-il auprès du roi Artaxerxès à Suse?", options: ["Échanson du roi", "Général d'armée", "Trésorier", "Scribe royal"], correct: 0, reference: "Néhémie 1:11" },
  { question: "Quel patriarche a accepté d'offrir son fils unique en sacrifice sur le mont Morija?", options: ["Abraham", "Noé", "Isaac", "Jacob"], correct: 0, reference: "Genèse 22:2" },
  { question: "Quelle jeune fille vertueuse a donné à boire aux chameaux du serviteur d'Abraham avant d'épouser Isaac?", options: ["Rébecca", "Rachel", "Léa", "Débora"], correct: 0, reference: "Genèse 24:19" },
  { question: "Selon 1 Corinthiens 13, quelle est la plus grande des vertus éternelles?", options: ["L'amour (la charité)", "La foi", "L'espérance", "La sagesse"], correct: 0, reference: "1 Corinthiens 13:13" },
  { question: "Qui déclara à sa belle-mère Naomi : 'Où tu iras j'irai, ton peuple sera mon peuple'?", options: ["Ruth", "Orpa", "Esther", "Abigaïl"], correct: 0, reference: "Ruth 1:16" },
  { question: "Dans quel pays de l'Orient le juste Job habitait-il?", options: ["Le pays d'Uts", "L'Égypte", "Babel", "Madian"], correct: 0, reference: "Job 1:1" },
  { question: "Quel est le tout premier commandement de la loi donnée au Sinaï?", options: ["Tu n'auras pas d'autres dieux devant ma face", "Tu ne tueras point", "Tu honoreras ton père et ta mère", "Tu ne voleras point"], correct: 0, reference: "Exode 20:3" },
  { question: "Dans la prison de Pharaon, de quels serviteurs royaux Joseph a-t-il expliqué les songes?", options: ["Le grand échanson et le grand panetier", "Le capitaine et le cuisinier", "Deux généraux", "Deux gardes"], correct: 0, reference: "Genèse 40" },
  { question: "Quel oiseau Noé a-t-il lâché en premier depuis l'arche pour voir si les eaux avaient diminué?", options: ["Un corbeau", "Une colombe", "Une hirondelle", "Un aigle"], correct: 0, reference: "Genèse 8:7" },
  { question: "Quel jumeau est né en tenant d'une main le talon de son frère Ésaü?", options: ["Jacob", "Joseph", "Benjamin", "Manassé"], correct: 0, reference: "Genèse 25:26" },
  { question: "Quel roi d'Israël a persécuté l'Église et fit emprisonner l'apôtre Pierre dans Actes 12?", options: ["Hérode Agrippa Ier", "Néron", "Hérode Antipas", "César Tibère"], correct: 0, reference: "Actes 12:1" },
  { question: "Dans quel évangile Jésus proclame-t-il : 'Je suis le chemin, la vérité, et la vie'?", options: ["Jean (chapitre 14)", "Matthieu", "Marc", "Luc"], correct: 0, reference: "Jean 14:6" },
  { question: "Quel verset universel résume l'Évangile : 'Car Dieu a tant aimé le monde...'?", options: ["Jean 3:16", "Romains 8:28", "Psaume 23:1", "Matthieu 28:19"], correct: 0, reference: "Jean 3:16" },
  { question: "Dans quelle épître Paul écrit-il : 'Je puis tout par celui qui me fortifie'?", options: ["Philippiens 4:13", "Galates 2:20", "Romains 8:31", "Colossiens 3:1"], correct: 0, reference: "Philippiens 4:13" },
  { question: "Quelle femme sage a apaisé la colère de David avec des vivres après l'affront de son mari Nabal?", options: ["Abigaïl", "Bath-Schéba", "Mikal", "Tamar"], correct: 0, reference: "1 Samuel 25" },
  { question: "Combien d'années le roi David a-t-il régné au total sur Israël et Juda?", options: ["40 ans", "33 ans", "7 ans", "50 ans"], correct: 0, reference: "2 Samuel 5:4" },
];

// ============================================================
// BLOC 10 : ACCOMPLISSEMENT, GRÂCE & ESPÉRANCE
// ============================================================
const EASY_BLOCK_10 = [
  { question: "À qui Jésus s'est-il adressé de nuit en disant : 'Il faut que vous naissiez de nouveau'?", options: ["Nicodème", "Joseph d'Arimathée", "Gamaliel", "Jaïrus"], correct: 0, reference: "Jean 3:3" },
  { question: "Près de quel puits Jésus a-t-il demandé de l'eau à une femme de Samarie?", options: ["Le puits de Jacob en Sichar", "Le puits de Beershéba", "La source de Siloé", "Le puits de Mian"], correct: 0, reference: "Jean 4:6" },
  { question: "Combien de corbeilles pleines de morceaux restait-il après la multiplication des 5 pains?", options: ["12 corbeilles pleines", "7 corbeilles", "3 corbeilles", "10 corbeilles"], correct: 0, reference: "Matthieu 14:20" },
  { question: "Quel apôtre a refusé de croire à la résurrection tant qu'il n'avait pas vu les marques des clous?", options: ["Thomas", "Philippe", "Barthélemy", "Jacques"], correct: 0, reference: "Jean 20:25" },
  { question: "Dans quelle ville les disciples de Jésus ont-ils été appelés 'chrétiens' pour la toute première fois?", options: ["À Antioche", "À Jérusalem", "À Rome", "À Éphèse"], correct: 0, reference: "Actes 11:26" },
  { question: "Quel jeune disciple Paul considérait-il comme son véritable enfant dans la foi?", options: ["Timothée", "Tite", "Luc", "Apollos"], correct: 0, reference: "1 Timothée 1:2" },
  { question: "Quel roi a tremblé quand Paul lui a parlé de justice, de tempérance et du jugement à venir?", options: ["Félix", "Festus", "Agrippa", "Pilate"], correct: 0, reference: "Actes 24:25" },
  { question: "Dans quel livre Paul déclare-t-il : 'Il n'y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ'?", options: ["Romains 8:1", "1 Corinthiens 15", "Galates 3", "Éphésiens 2"], correct: 0, reference: "Romains 8:1" },
  { question: "Quel fruit de l'Esprit est énuméré en premier dans Galates 5:22?", options: ["L'amour", "La joie", "La paix", "La patience"], correct: 0, reference: "Galates 5:22" },
  { question: "Quelle est la définition biblique de la foi selon Hébreux 11:1?", options: ["Une ferme assurance des choses qu'on espère", "Une croyance humaine", "Une philosophie de vie", "Une émotion passagère"], correct: 0, reference: "Hébreux 11:1" },
  { question: "Quel livre célèbre contient les visions des sept chandeliers d'or et des sept étoiles?", options: ["L'Apocalypse", "Daniel", "Ézéchiel", "Zacharie"], correct: 0, reference: "Apocalypse 1:12" },
  { question: "Comment s'appelle le fleuve de vie qui coule du trône de Dieu dans la nouvelle Jérusalem?", options: ["Le fleuve d'eau de la vie", "Le Jourdain céleste", "Le Gihon", "L'Euphrate"], correct: 0, reference: "Apocalypse 22:1" },
  { question: "Quel chant les rachetés chantent-ils dans l'Apocalypse devant le trône de Dieu?", options: ["Le cantique de Moïse et de l'Agneau", "Le cantique de David", "Le Psaume 150", "Le cantique des anges"], correct: 0, reference: "Apocalypse 15:3" },
  { question: "Combien de portes de perles la sainte cité céleste possède-t-elle?", options: ["12 portes de perles", "7 portes", "4 portes", "24 portes"], correct: 0, reference: "Apocalypse 21:21" },
  { question: "Quel titre glorieux Jésus prend-il dans l'Apocalypse pour exprimer son éternité?", options: ["L'Alpha et l'Oméga, le premier et le dernier", "Le Roi des terres", "Le Créateur des siècles", "L'Étoile du matin"], correct: 0, reference: "Apocalypse 22:13" },
  { question: "Qui est 'le bon berger' qui donne sa vie pour ses brebis selon Jean 10?", options: ["Jésus-Christ", "Moïse", "David", "Pierre"], correct: 0, reference: "Jean 10:11" },
  { question: "Quelle prière modèle Jésus a-t-il enseignée à ses disciples sur la montagne?", options: ["Le Notre Père", "Le Shema Israël", "Le Gloria", "Le Kaddish"], correct: 0, reference: "Matthieu 6:9" },
  { question: "Combien de béatitudes ouvrent le Sermon sur la montagne dans Matthieu 5?", options: ["8 (ou 9) béatitudes", "7", "10", "12"], correct: 0, reference: "Matthieu 5:3-11" },
  { question: "Quelle est la promesse suprême de Jésus avant son ascension dans Matthieu 28:20?", options: ["Je suis avec vous tous les jours jusqu'à la fin du monde", "Vous régnerez sur terre", "Vous aurez des richesses", "Le monde vous aimera"], correct: 0, reference: "Matthieu 28:20" },
  { question: "Quelle assurance merveilleuse Romains 8:38-39 donne-t-il à chaque croyant?", options: ["Rien ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ", "Nous ne souffrirons jamais", "Tous les hommes seront rois", "La mort est éternelle"], correct: 0, reference: "Romains 8:39" },
];

// ============================================================
// CONSOLIDATION DES 10 BLOCS D'ORIGINE (200 QUESTIONS RÉELLES)
// ============================================================
export const ALL_EASY_BLOCKS = [
  EASY_BLOCK_1, EASY_BLOCK_2, EASY_BLOCK_3, EASY_BLOCK_4, EASY_BLOCK_5,
  EASY_BLOCK_6, EASY_BLOCK_7, EASY_BLOCK_8, EASY_BLOCK_9, EASY_BLOCK_10
];

// ============================================================
// THÈMES DES 10 BLOCS
// ============================================================
export const BLOCK_THEMES = [
  { theme: "Création & Patriarches", icon: "🌍" },
  { theme: "Exode & Rois d'Israël", icon: "👑" },
  { theme: "Prophètes & Miracles", icon: "⚡" },
  { theme: "Apôtres & Enseignements", icon: "📜" },
  { theme: "Psaumes & Sagesse", icon: "📖" },
  { theme: "Reconstruction & Évangiles", icon: "✝️" },
  { theme: "Foi Héroïque & Actes", icon: "🛡️" },
  { theme: "Personnages & Alliances", icon: "👤" },
  { theme: "Signes & Combats Spirituels", icon: "🔥" },
  { theme: "Grâce, Espérance & Apocalypse", icon: "✨" },
];

// ============================================================
// PERSONNAGES "QUI SUIS-JE ?" (16 Personnages bibliques)
// ============================================================
export const WHO_AM_I_CHARACTERS = [
  { id: "moses", name: "Moïse", clues: ["J'ai reçu la sainte loi de Dieu sur les hauteurs du mont Sinaï", "J'ai conduit le peuple hébreu hors de l'esclavage en Égypte", "J'ai levé mon bâton et la mer Rouge s'est fendue à pied sec"] },
  { id: "david", name: "David", clues: ["J'étais un simple jeune berger jouant de la harpe dans les champs", "J'ai terrassé le géant Goliath avec une simple fronde et une pierre", "Je suis devenu roi d'Israël et j'ai composé une multitude de Psaumes"] },
  { id: "paul", name: "Paul de Tarse", clues: ["Je persécutais avec zèle les chrétiens avant une vision céleste", "Une vive lumière m'a aveuglé et jeté à terre sur le chemin de Damas", "Je suis devenu l'apôtre des nations et l'auteur de la plupart des épîtres"] },
  { id: "peter", name: "Pierre (Simon)", clues: ["Jésus m'a donné un nouveau nom signifiant 'Roc' ou 'Pierre'", "J'ai osé marcher sur les eaux agitées de la mer de Galilée", "J'ai renié trois fois le Maître avant que le coq ne chante au matin"] },
  { id: "mary", name: "Marie", clues: ["L'archange Gabriel m'a saluée par des paroles de grâce extraordinaire", "Mon fils premier-né est venu au monde dans une modeste crèche à Bethléem", "Je suis la servante de l'Éternel et la mère terrestre du Sauveur"] },
  { id: "samson", name: "Samson", clues: ["Le secret de ma prodigieuse force physique résidait dans ma chevelure de naziréen", "J'ai été séduit et trahi par Dalila entre les mains des Philistins", "Dans ma mort finale, j'ai abattu les colonnes du temple païen de Dagon"] },
  { id: "elijah", name: "Élie", clues: ["Des corbeaux m'apportaient fidèlement du pain et de la viande au torrent de Kérith", "J'ai défié les 450 faux prophètes de Baal et le feu de Dieu est descendu du ciel", "Je suis monté vivant vers le ciel dans un char de feu et un tourbillon"] },
  { id: "ruth", name: "Ruth", clues: ["J'ai quitté mon pays païen de Moab par amour pour ma belle-mère Naomi", "J'ai prononcé : 'Où tu iras j'irai, et ton peuple sera mon peuple'", "J'ai épousé Boaz à Bethléem et suis devenue une ancêtre directe du Messie"] },
  { id: "jonah", name: "Jonas", clues: ["J'ai embarqué sur un navire pour fuir la mission que Dieu m'avait confiée", "J'ai passé trois jours et trois nuits dans le ventre d'un grand poisson marin", "J'ai finalement prêché la repentance dans la grande ville de Ninive"] },
  { id: "solomon", name: "Salomon", clues: ["J'ai demandé à l'Éternel un cœur sage et intelligent pour gouverner", "J'ai fait bâtir le splendide Temple de Jérusalem en bois de cèdre et en or", "La reine de Saba est venue de loin pour entendre mes énigmes et proverbes"] },
  { id: "esther", name: "Esther", clues: ["Mon cousin orphelin et tuteur s'appelait le pieux Mardochée", "Je suis devenue reine de l'immense empire de Perse auprès du roi Assuérus", "J'ai risqué ma vie pour déjouer le cruel complot d'Haman et sauver mon peuple"] },
  { id: "john_baptist", name: "Jean-Baptiste", clues: ["Je portais un rude vêtement de poils de chameau dans le désert de Judée", "Je me nourrissais de sauterelles et de miel sauvage récolté sur les rochers", "J'ai immergé Jésus dans le Jourdain et proclamé : 'Voici l'Agneau de Dieu'"] },
  { id: "stephen", name: "Étienne", clues: ["J'étais rempli de foi et du Saint-Esprit parmi les sept premiers diacres", "Avant de mourir sous les pierres, j'ai vu les cieux ouverts et Jésus debout", "J'ai prié pour mes bourreaux : 'Seigneur, ne leur impute pas ce péché'"] },
  { id: "sarah", name: "Sarah", clues: ["J'ai ri en secret sous la tente quand j'ai entendu que j'aurais un enfant", "J'ai donné naissance à mon fils Isaac à l'âge miraculeux de 90 ans", "Je suis la femme bien-aimée du patriarche Abraham"] },
  { id: "job", name: "Job", clues: ["J'étais l'homme le plus riche et le plus intègre des contrées d'Orient", "J'ai perdu mes enfants et tous mes biens en un seul jour sans maudire Dieu", "J'ai proclamé dans mon affliction : 'Je sais que mon Rédempteur est vivant'"] },
  { id: "zacchaeus", name: "Zachée", clues: ["J'étais chef des collecteurs d'impôts et très riche dans la ville de Jéricho", "Étant de petite taille, je suis monté sur un sycomore pour voir passer Jésus", "Jésus m'a appelé par mon nom et a logé dans ma maison ce jour-là"] }
];

// ============================================================
// CHRONO-EVENTS (21 Événements bibliques)
// ============================================================
export const CHRONO_EVENTS = [
  { id: "creation", event: "La Création du monde et d'Éden", year: "Au commencement", order: 1 },
  { id: "fall", event: "La chute de l'homme en Éden", year: "~4000 av. J.-C.", order: 2 },
  { id: "flood", event: "Le déluge et l'arche de Noé", year: "~2500 av. J.-C.", order: 3 },
  { id: "babel", event: "La confusion des langues à Babel", year: "~2200 av. J.-C.", order: 4 },
  { id: "abraham", event: "L'appel d'Abraham et l'alliance", year: "~2000 av. J.-C.", order: 5 },
  { id: "joseph", event: "Joseph vendu comme esclave en Égypte", year: "~1720 av. J.-C.", order: 6 },
  { id: "bush", event: "Moïse et le buisson ardent", year: "~1490 av. J.-C.", order: 7 },
  { id: "exodus", event: "L'Exode et la traversée de la Mer Rouge", year: "~1450 av. J.-C.", order: 8 },
  { id: "commandments", event: "Le don des Dix Commandements au Sinaï", year: "~1450 av. J.-C.", order: 9 },
  { id: "jericho", event: "La chute des murailles de Jéricho avec Josué", year: "~1400 av. J.-C.", order: 10 },
  { id: "gideon", event: "Gédéon et la victoire des 300 hommes", year: "~1160 av. J.-C.", order: 11 },
  { id: "david_goliath", event: "David terrasse le géant Goliath", year: "~1020 av. J.-C.", order: 12 },
  { id: "solomon_temple", event: "Salomon bâtit le Temple de Jérusalem", year: "~960 av. J.-C.", order: 13 },
  { id: "elijah_carmel", event: "Le feu du ciel sur le mont Carmel avec Élie", year: "~860 av. J.-C.", order: 14 },
  { id: "exile", event: "L'exil du peuple de Juda à Babylone", year: "~586 av. J.-C.", order: 15 },
  { id: "jesus_birth", event: "La naissance de Jésus à Bethléem", year: "~4 av. J.-C.", order: 16 },
  { id: "jesus_baptism", event: "Le baptême de Jésus dans le Jourdain", year: "~26 ap. J.-C.", order: 17 },
  { id: "crucifixion", event: "La mort et résurrection glorieuse de Jésus", year: "~30 ap. J.-C.", order: 18 },
  { id: "pentecost", event: "L'effusion du Saint-Esprit à la Pentecôte", year: "~30 ap. J.-C.", order: 19 },
  { id: "paul_conversion", event: "La conversion de Paul sur le chemin de Damas", year: "~34 ap. J.-C.", order: 20 },
  { id: "apocalypse", event: "La vision céleste de Jean sur l'île de Patmos", year: "~95 ap. J.-C.", order: 21 },
];

// ============================================================
// MEMORY DES VERSETS BIBLIQUES
// ============================================================
export const MEMORY_VERSES = [
  { reference: "Jean 3:16", text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique afin que quiconque croit en lui ne périsse point mais qu'il ait la vie éternelle.", theme: "Amour & Salut" },
  { reference: "Psaume 23:1", text: "L'Éternel est mon berger je ne manquerai de rien.", theme: "Protection & Confiance" },
  { reference: "Philippiens 4:13", text: "Je puis tout par celui qui me fortifie.", theme: "Force & Victoire" },
  { reference: "Jérémie 29:11", text: "Car je connais les projets que j'ai formés sur vous dit l'Éternel projets de paix et non de malheur.", theme: "Espérance & Avenir" },
  { reference: "Romains 8:28", text: "Toutes choses concourent au bien de ceux qui aiment Dieu.", theme: "Foi & Providence" },
  { reference: "Proverbes 3:5", text: "Confie-toi en l'Éternel de tout ton cœur et ne t'appuie pas sur ta sagesse.", theme: "Sagesse & Guidance" },
  { reference: "Ésaïe 40:31", text: "Ceux qui se confient en l'Éternel renouvellent leur force ils prennent le vol comme les aigles.", theme: "Renouvellement" },
  { reference: "Josué 1:9", text: "Fortifie-toi et prends courage ne t'effraie point car l'Éternel ton Dieu est avec toi.", theme: "Courage & Foi" }
];

// ============================================================
// FONCTIONS UTILITAIRES DE DISTRIBUTION ALÉATOIRE (A, B, C, D)
// ============================================================

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Prépare une question en mélangeant ses 4 options de manière aléatoire
 * pour que la bonne réponse soit équitablement répartie entre A, B, C et D.
 */
export function prepareQuestion(rawQuestion, id) {
  const correctText = rawQuestion.options[rawQuestion.correct];
  const shuffledOptions = shuffleArray([...rawQuestion.options]);
  const newCorrectIndex = shuffledOptions.indexOf(correctText);

  return {
    ...rawQuestion,
    id: id || `q_${Math.random()}`,
    options: shuffledOptions,
    correct: newCorrectIndex,
    correctText: correctText
  };
}

/**
 * Récupère les 20 questions d'un bloc en mélangeant leurs options
 */
export function getBlockQuestions(block = 1, difficulty = 'easy') {
  const blockIdx = Math.max(0, Math.min(9, block - 1));
  const blockData = ALL_EASY_BLOCKS[blockIdx];

  const prepared = blockData.map((q, i) => prepareQuestion(q, `${difficulty}_b${block}_q${i}`));
  return shuffleArray(prepared);
}

/**
 * Génère un Grand Quiz de 10 questions uniques piochées au hasard parmi les 200 questions
 */
export function getQuickBibleQuiz(count = 10, difficulty = 'easy') {
  // Aplatir l'ensemble des 200 questions réelles des 10 blocs
  const all200Questions = ALL_EASY_BLOCKS.flat();
  const shuffled200 = shuffleArray(all200Questions);

  return shuffled200.slice(0, count).map((q, i) => prepareQuestion(q, `quick_q${i}`));
}

export function getWhoAmICharacters(count = 5) {
  return shuffleArray([...WHO_AM_I_CHARACTERS]).slice(0, count);
}

export function getRandomChronoEvents(count = 5) {
  const subset = shuffleArray([...CHRONO_EVENTS]).slice(0, count);
  return shuffleArray([...subset]);
}

export function getRandomMemoryVerse() {
  const idx = Math.floor(Math.random() * MEMORY_VERSES.length);
  return MEMORY_VERSES[idx];
}

export function getBlockInfo(block) {
  const info = BLOCK_THEMES[Math.max(0, Math.min(9, block - 1))];
  return { block, ...info, totalQuestions: 20, label: `Bloc ${block}` };
}

export function getAllBlockInfos() {
  return Array.from({ length: 10 }, (_, i) => getBlockInfo(i + 1));
}
