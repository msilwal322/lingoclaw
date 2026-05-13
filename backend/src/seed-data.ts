export type Role = 'user' | 'assistant';
export const seed = {
  profile:{name:'LingoClaw Learner',email:'learner@lingoclaw.app',avatar:'🐾',joinDate:new Date().toISOString(),dailyGoalXp:20,currentLanguage:'es',totalXp:48650,streak:12,longestStreak:21,completedLessons:['l1','l2'],completedStories:['s2'],lastActiveDate:new Date().toISOString().split('T')[0],todayXp:0},
  languages:[{code:'es',name:'Spanish',flag:'🇪🇸',level:'B1',xp:3420,totalXp:5000,streak:12},{code:'ja',name:'Japanese',flag:'🇯🇵',level:'A2',xp:1240,totalXp:2500,streak:5},{code:'fr',name:'French',flag:'🇫🇷',level:'A1',xp:280,totalXp:1000,streak:2},{code:'de',name:'German',flag:'🇩🇪',level:'A1',xp:0,totalXp:1000,streak:0}],
  lessons:[
    {id:'l1',title:'Greetings & Introductions',description:'Learn to say hello and introduce yourself',type:'vocabulary',difficulty:'beginner',xpReward:50,duration:5,completed:true,locked:false},
    {id:'l2',title:'Numbers & Counting',description:'Master numbers 1–100 and basic counting',type:'vocabulary',difficulty:'beginner',xpReward:50,duration:7,completed:true,locked:false},
    {id:'l3',title:'Colors & Descriptions',description:'Describe objects with colors and adjectives',type:'vocabulary',difficulty:'beginner',xpReward:60,duration:8,completed:false,locked:false},
    {id:'l4',title:'Present Tense Verbs',description:'Conjugate regular verbs in present tense',type:'grammar',difficulty:'beginner',xpReward:80,duration:10,completed:false,locked:false},
    {id:'l5',title:'Family & Relationships',description:'Talk about your family members',type:'vocabulary',difficulty:'beginner',xpReward:60,duration:6,completed:false,locked:true}
  ],
  questions:[
    {id:'q1',type:'multiple-choice',prompt:"What does '¿Cómo te llamas?' mean?",options:['How are you?','What is your name?','Where are you from?','How old are you?'],answer:'What is your name?',explanation:"'¿Cómo te llamas?' is used to ask someone's name."},
    {id:'q2',type:'multiple-choice',prompt:"Which word means 'red' in Spanish?",options:['Azul','Verde','Rojo','Amarillo'],answer:'Rojo',explanation:'Rojo = Red.'},
    {id:'q3',type:'translate',prompt:"Translate: 'The cat is on the table'",options:['El gato está en la mesa','El perro está debajo de la mesa','El gato está encima del sofá','La mesa está cerca del gato'],answer:'El gato está en la mesa',explanation:'Gato = cat, mesa = table.'}
  ],
  stories:[{id:'s1',title:'El Mercado Mágico',language:'Spanish',flag:'🇪🇸',level:'A2',genre:'Fantasy',excerpt:'En el corazón de la ciudad antigua, había un mercado que solo aparecía al amanecer...',content:'En el corazón de la ciudad antigua, había un mercado que solo aparecía al amanecer. María descubrió frutas de colores extraños, especias de tierras lejanas y un gato llamado Naranja.',readTime:4,wordsCount:640,completed:false},{id:'s2',title:'Le Café des Rêves',language:'French',flag:'🇫🇷',level:'A1',genre:'Slice of Life',excerpt:'Chaque matin, Sophie visitait le même petit café...',content:'Chaque matin, Sophie visitait le même petit café pour pratiquer le français avec ses voisins.',readTime:3,wordsCount:420,completed:true}],
  achievements:[{id:'a1',title:'First lesson',description:'Complete one backend-tracked lesson',icon:'✓',earned:true,earnedDate:new Date().toISOString()}],
  providers:[{id:'openai-compatible',name:'OpenAI compatible',kind:'llm',baseUrl:'http://localhost:11434/v1',apiKeyRef:'LINGOCLAW_OPENAI_KEY',status:'local',notes:'Works with Ollama, LM Studio, vLLM, or any OpenAI-shaped endpoint.',models:['qwen3:8b','llama3.2','gpt-4.1-mini']},{id:'anthropic',name:'Anthropic',kind:'llm',baseUrl:'https://api.anthropic.com/v1',apiKeyRef:'ANTHROPIC_API_KEY',status:'needs-key',notes:'Good fit for tutor chat.',models:['claude-sonnet-4-5','claude-haiku-4-5']}],
  roles:[{id:'tutor-chat',label:'Tutor chat',purpose:'Socratic corrections, grammar explanations, and adaptive conversation.',providerId:'anthropic',model:'claude-sonnet-4-5',temperature:0.7,enabled:true}],
  chatSessions:[] as any[], chatMessages:[] as any[]
};
