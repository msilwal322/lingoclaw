export type Language = {
  code: string;
  name: string;
  flag: string;
  level: string;
  xp: number;
  totalXp: number;
  streak: number;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  type: "vocabulary" | "grammar" | "listening" | "speaking";
  difficulty: "beginner" | "intermediate" | "advanced";
  xpReward: number;
  duration: number;
  completed: boolean;
  locked: boolean;
};

export type Question = {
  id: string;
  type: "multiple-choice" | "fill-blank" | "translate" | "match";
  prompt: string;
  options?: string[];
  answer: string;
  explanation?: string;
  hint?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type Story = {
  id: string;
  title: string;
  language: string;
  flag: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  genre: string;
  excerpt: string;
  content: string;
  readTime: number;
  wordsCount: number;
  completed: boolean;
};

export type LeaderboardUser = {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  streak: number;
  country: string;
  isCurrentUser?: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
};

export const LANGUAGES: Language[] = [
  { code: "es", name: "Spanish", flag: "🇪🇸", level: "B1", xp: 3420, totalXp: 5000, streak: 12 },
  { code: "ja", name: "Japanese", flag: "🇯🇵", level: "A2", xp: 1240, totalXp: 2500, streak: 5 },
  { code: "fr", name: "French", flag: "🇫🇷", level: "A1", xp: 280, totalXp: 1000, streak: 2 },
  { code: "de", name: "German", flag: "🇩🇪", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "zh", name: "Mandarin", flag: "🇨🇳", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "ko", name: "Korean", flag: "🇰🇷", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "it", name: "Italian", flag: "🇮🇹", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "ru", name: "Russian", flag: "🇷🇺", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "ar", name: "Arabic", flag: "🇦🇪", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "hi", name: "Hindi", flag: "🇮🇳", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
  { code: "nl", name: "Dutch", flag: "🇳🇱", level: "A1", xp: 0, totalXp: 1000, streak: 0 },
];

export const LESSONS: Lesson[] = [
  {
    id: "l1",
    title: "Greetings & Introductions",
    description: "Learn to say hello and introduce yourself",
    type: "vocabulary",
    difficulty: "beginner",
    xpReward: 50,
    duration: 5,
    completed: true,
    locked: false,
  },
  {
    id: "l2",
    title: "Numbers & Counting",
    description: "Master numbers 1–100 and basic counting",
    type: "vocabulary",
    difficulty: "beginner",
    xpReward: 50,
    duration: 7,
    completed: true,
    locked: false,
  },
  {
    id: "l3",
    title: "Colors & Descriptions",
    description: "Describe objects with colors and adjectives",
    type: "vocabulary",
    difficulty: "beginner",
    xpReward: 60,
    duration: 8,
    completed: false,
    locked: false,
  },
  {
    id: "l4",
    title: "Present Tense Verbs",
    description: "Conjugate regular verbs in present tense",
    type: "grammar",
    difficulty: "beginner",
    xpReward: 80,
    duration: 10,
    completed: false,
    locked: false,
  },
  {
    id: "l5",
    title: "Family & Relationships",
    description: "Talk about your family members",
    type: "vocabulary",
    difficulty: "beginner",
    xpReward: 60,
    duration: 6,
    completed: false,
    locked: true,
  },
  {
    id: "l6",
    title: "At the Restaurant",
    description: "Order food and handle dining situations",
    type: "vocabulary",
    difficulty: "intermediate",
    xpReward: 90,
    duration: 12,
    completed: false,
    locked: true,
  },
  {
    id: "l7",
    title: "Travel Phrases",
    description: "Essential phrases for traveling",
    type: "vocabulary",
    difficulty: "intermediate",
    xpReward: 100,
    duration: 15,
    completed: false,
    locked: true,
  },
  {
    id: "l8",
    title: "Past Tense",
    description: "Talk about events that already happened",
    type: "grammar",
    difficulty: "intermediate",
    xpReward: 120,
    duration: 18,
    completed: false,
    locked: true,
  },
];

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    type: "multiple-choice",
    prompt: "What does '¿Cómo te llamas?' mean?",
    options: ["How are you?", "What is your name?", "Where are you from?", "How old are you?"],
    answer: "What is your name?",
    explanation: "'¿Cómo te llamas?' literally translates to 'What do you call yourself?' — used to ask someone's name.",
  },
  {
    id: "q2",
    type: "multiple-choice",
    prompt: "Which word means 'red' in Spanish?",
    options: ["Azul", "Verde", "Rojo", "Amarillo"],
    answer: "Rojo",
    explanation: "Rojo = Red, Azul = Blue, Verde = Green, Amarillo = Yellow",
  },
  {
    id: "q3",
    type: "translate",
    prompt: "Translate: 'The cat is on the table'",
    options: ["El gato está en la mesa", "El perro está debajo de la mesa", "El gato está encima del sofá", "La mesa está cerca del gato"],
    answer: "El gato está en la mesa",
    explanation: "Gato = cat, está = is, en = on, la mesa = the table",
  },
  {
    id: "q4",
    type: "multiple-choice",
    prompt: "How do you say 'Good morning' in Spanish?",
    options: ["Buenas noches", "Buenas tardes", "Buenos días", "Hola"],
    answer: "Buenos días",
    explanation: "Buenos días = Good morning, Buenas tardes = Good afternoon, Buenas noches = Good night",
  },
  {
    id: "q5",
    type: "multiple-choice",
    prompt: "What is the plural of 'el libro' (the book)?",
    options: ["los libros", "las libros", "el libros", "los libro"],
    answer: "los libros",
    explanation: "In Spanish, masculine nouns use 'los' for plural, and most words ending in a consonant add '-os'",
  },
  {
    id: "q6",
    type: "translate",
    prompt: "Translate: 'I want water, please'",
    options: ["Quiero agua, por favor", "Necesito comida, gracias", "Quiero café, por favor", "Dame agua"],
    answer: "Quiero agua, por favor",
    explanation: "Quiero = I want, agua = water, por favor = please",
  },
  {
    id: "q7",
    type: "multiple-choice",
    prompt: "Which verb form is correct: 'Yo ___ estudiante' (I am a student)?",
    options: ["estar", "es", "soy", "somos"],
    answer: "soy",
    explanation: "'Soy' is the first-person singular form of 'ser' (to be), used for permanent states like identity/profession.",
  },
];

export const STORIES: Story[] = [
  {
    id: "s1",
    title: "El Mercado Mágico",
    language: "Spanish",
    flag: "🇪🇸",
    level: "A2",
    genre: "Fantasy",
    excerpt: "En el corazón de la ciudad antigua, había un mercado que solo aparecía al amanecer...",
    content: `En el corazón de la ciudad antigua, había un mercado que solo aparecía al amanecer. Los vendedores llegaban con sus carros llenos de frutas de colores extraños y especias de tierras lejanas.

María, una niña curiosa de diez años, descubrió el mercado una mañana cuando salió temprano a buscar a su gato. Los puestos brillaban con una luz dorada, y los aromas llenaban el aire frío de la madrugada.

—Buenos días, pequeña —dijo una anciana con una sonrisa amable—. ¿Buscas algo especial?

—Busco a mi gato —respondió María—. Se llama Naranja porque tiene el pelo del color de las zanahorias.

La anciana señaló hacia el fondo del mercado. Allí, entre montañas de especias rojas y amarillas, un gato anaranjado dormía tranquilamente.

—¡Naranja! —gritó María con alegría.

El gato abrió un ojo, bostezó, y se estiró perezosamente. María lo tomó en sus brazos y giró para agradecer a la anciana, pero el puesto había desaparecido.

Al regresar a casa, encontró en el bolsillo una semilla pequeña y brillante. La plantó en una maceta, y a la mañana siguiente, había crecido una flor de color naranja, tan brillante como su gato.`,
    readTime: 4,
    wordsCount: 210,
    completed: false,
  },
  {
    id: "s2",
    title: "La Ciudad de los Sueños",
    language: "Spanish",
    flag: "🇪🇸",
    level: "B1",
    genre: "Science Fiction",
    excerpt: "En el año 2150, los seres humanos podían compartir sus sueños con cualquier persona del mundo...",
    content: `En el año 2150, los seres humanos podían compartir sus sueños con cualquier persona del mundo gracias al dispositivo NeuroLink. Carlos trabajaba como Arquitecto de Sueños, diseñando experiencias para millones de personas.

Su última creación era una ciudad flotante sobre las nubes, donde la gravedad funcionaba al revés y los edificios crecían hacia abajo como estalactitas brillantes.

Una noche, mientras calibraba los parámetros de su ciudad, encontró algo inesperado: una puerta que no había diseñado él. Detrás de ella, había una mujer que construía jardines en el aire.

—¿Quién eres? —preguntó Carlos.

—Soy Elena, de Madrid —respondió ella—. Llevo años construyendo este jardín en mis sueños. No sabía que existías.

Los dos arquitectos comenzaron a trabajar juntos sin haberse conocido en la realidad. Construyeron puentes entre sus sueños, crearon islas de música y montañas de luz.

Cuando Carlos finalmente buscó a Elena en el mundo real, la encontró trabajando en la misma empresa, solo tres pisos más arriba.

La vida real, pensó, a veces necesita un desvío por los sueños.`,
    readTime: 5,
    wordsCount: 195,
    completed: true,
  },
  {
    id: "s3",
    title: "Sakura no Hana",
    language: "Japanese",
    flag: "🇯🇵",
    level: "A1",
    genre: "Nature",
    excerpt: "毎年春になると、公園の桜の木が満開になります...",
    content: `毎年春になると、公園の桜の木が満開になります。白とピンクの花びらが風に舞い、まるで雪のようです。

田中さんは毎朝、この公園を歩きます。今日は特別な日です。娘の誕生日だからです。

「桜、きれいね」と田中さんは言いました。

小さな女の子は目を丸くして、「ピンクの雪みたい！」と叫びました。

二人は木の下に座って、お弁当を食べました。おにぎり、卵焼き、それからいちごのケーキ。

花びらが一枚、ケーキの上に落ちました。女の子は笑って、「桜のプレゼントだ！」と言いました。

その日の写真は、家族のアルバムで一番好きな一枚になりました。`,
    readTime: 3,
    wordsCount: 120,
    completed: false,
  },
  {
    id: "s4",
    title: "Le Café du Coin",
    language: "French",
    flag: "🇫🇷",
    level: "A2",
    genre: "Slice of Life",
    excerpt: "Chaque matin, Pierre s'arrêtait au même café pour prendre son croissant et son café au lait...",
    content: `Chaque matin, Pierre s'arrêtait au même café pour prendre son croissant et son café au lait. C'était sa routine depuis vingt ans. Marie, la propriétaire, connaissait sa commande par cœur.

—Votre café, monsieur Pierre —disait-elle avec un sourire chaleureux.

Un matin d'octobre, une nouvelle cliente entra dans le café. Elle semblait perdue, tenant une carte de la ville dans ses mains.

—Excusez-moi, parlez-vous anglais ? —demanda-t-elle avec un accent américain.

Pierre, qui avait étudié l'anglais au lycée, se leva.

—Un peu, oui. Je peux vous aider ?

La jeune femme cherchait le musée d'Orsay. Pierre lui expliqua le chemin en mélangeant le français et l'anglais, avec beaucoup de gestes.

Elle rit de bon cœur. —Merci beaucoup ! Je m'appelle Sophie.

—Pierre. Enchantée.

Ce soir-là, Pierre rentra chez lui en pensant que parfois, une petite routine peut mener à une grande aventure.`,
    readTime: 4,
    wordsCount: 175,
    completed: false,
  },
];

export const LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: "LinguaQueen", avatar: "👸", xp: 98450, streak: 365, country: "🇧🇷" },
  { rank: 2, name: "PolyglotKing", avatar: "🤴", xp: 87320, streak: 180, country: "🇩🇪" },
  { rank: 3, name: "WordWizard", avatar: "🧙", xp: 75100, streak: 142, country: "🇯🇵" },
  { rank: 4, name: "SakuraStar", avatar: "🌸", xp: 62800, streak: 89, country: "🇰🇷" },
  { rank: 5, name: "FluentFox", avatar: "🦊", xp: 58200, streak: 67, country: "🇫🇷" },
  { rank: 6, name: "TigerTongue", avatar: "🐯", xp: 51900, streak: 55, country: "🇪🇸" },
  { rank: 7, name: "You", avatar: "🐾", xp: 48650, streak: 12, country: "🇺🇸", isCurrentUser: true },
  { rank: 8, name: "DragonDict", avatar: "🐉", xp: 44300, streak: 44, country: "🇨🇳" },
  { rank: 9, name: "PhoenixPhrase", avatar: "🦅", xp: 41100, streak: 38, country: "🇮🇹" },
  { rank: 10, name: "NinjaNouns", avatar: "🥷", xp: 38700, streak: 29, country: "🇳🇱" },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", title: "First Steps", description: "Complete your first lesson", icon: "👣", earned: true, earnedDate: "2024-01-15" },
  { id: "a2", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", earned: true, earnedDate: "2024-01-22" },
  { id: "a3", title: "Vocabulary Vault", description: "Learn 100 words", icon: "📚", earned: true, earnedDate: "2024-02-01" },
  { id: "a4", title: "Perfect Score", description: "Get 100% on a lesson", icon: "💯", earned: true, earnedDate: "2024-02-10" },
  { id: "a5", title: "Polyglot", description: "Start learning 3 languages", icon: "🌍", earned: true, earnedDate: "2024-02-20" },
  { id: "a6", title: "Month Master", description: "Maintain a 30-day streak", icon: "🏆", earned: false },
  { id: "a7", title: "Story Teller", description: "Complete 5 stories", icon: "📖", earned: false },
  { id: "a8", title: "Chat Champion", description: "Send 100 messages to the AI tutor", icon: "💬", earned: false },
  { id: "a9", title: "Speed Reader", description: "Read a story in under 3 minutes", icon: "⚡", earned: false },
  { id: "a10", title: "Grammar Guru", description: "Complete all grammar lessons", icon: "✍️", earned: false },
  { id: "a11", title: "Conversation King", description: "Practice for 10 hours total", icon: "👑", earned: false },
  { id: "a12", title: "Legend", description: "Reach level C2 in any language", icon: "🌟", earned: false },
];

export const DAILY_GOALS = [
  { label: "10 XP", xp: 10, icon: "🌱" },
  { label: "20 XP", xp: 20, icon: "⚡" },
  { label: "50 XP", xp: 50, icon: "🔥" },
  { label: "100 XP", xp: 100, icon: "💎" },
];

export const CHAT_STARTERS = [
  "Let's practice a conversation in Spanish!",
  "Can you explain the difference between ser and estar?",
  "Help me practice ordering food at a restaurant.",
  "Teach me some common slang expressions.",
  "Let's do a roleplay where you're a shopkeeper.",
  "Quiz me on vocabulary I've learned this week.",
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "c0",
    role: "assistant",
    content: "¡Hola! I'm Claw, your AI language tutor 🐾 I'm here to help you practice Spanish through conversation. What would you like to work on today?",
    timestamp: new Date(Date.now() - 60000),
  },
];
