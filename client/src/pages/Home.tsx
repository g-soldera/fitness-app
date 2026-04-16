import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  CheckCircle, Circle, Droplets, Dumbbell, LayoutDashboard, 
  Utensils, Activity, Timer, Play, Square, Volume2, 
  Coffee, Sun, Sunset, Moon, Info, ShoppingCart, Plus, Trash2, BookOpen, Snowflake, Zap, X, ChevronRight, CalendarDays,
  PauseCircle, PlayCircle, Flame
} from 'lucide-react';

// --- MÓDULO DE GERAÇÃO DE HIIT (DINÂMICO) ---
const generateHiitPlan = (level, equipment, durationMinutes) => {
  const plans = [];
  const addPhase = (type, duration, desc, color) => plans.push({ type, duration, desc, color });

  const metrics = {
    básico: {
      esteira: { high: "Vel: 6.0 a 6.5 | Inclinação: 2%", low: "Vel: 4.0 | Inclinação: 0%" },
      bike: { high: "Carga: Moderada/Pesada | RPM: 70+", low: "Carga: Leve | RPM: 50" },
      eliptico: { high: "Carga: Moderada | Ritmo: Acelerado", low: "Carga: Leve | Ritmo: Lento" },
      escada: { high: "Nível: 6 a 7 (Subida constante)", low: "Nível: 3 (Recuperação)" }
    },
    intermediário: {
      esteira: { high: "Vel: 10.0 a 12.0 | Inclinação: 0%", low: "Vel: 5.0 a 6.0 | Inclinação: 0%" },
      bike: { high: "Carga: Muito Pesada | RPM: 90+", low: "Carga: Leve | RPM: 60" },
      eliptico: { high: "Carga: Pesada | Ritmo: Máximo", low: "Carga: Leve | Ritmo: Lento" },
      escada: { high: "Nível: 10 a 12 (Subida intensa)", low: "Nível: 5 (Recuperação)" }
    }
  };

  const m = metrics[level] && metrics[level][equipment] ? metrics[level][equipment] : metrics['básico']['esteira'];

  const warmupSecs = 180; 
  const cooldownSecs = 120; 
  const totalSeconds = durationMinutes * 60;
  const coreSeconds = totalSeconds - warmupSecs - cooldownSecs;
  
  const cycleDuration = level === 'básico' ? (60 + 90) : (60 + 60); 
  const numCycles = Math.max(1, Math.floor(coreSeconds / cycleDuration));

  addPhase('AQUECIMENTO', warmupSecs, `Preparação articular. Ritmo leve e constante.`, '#64748b');

  for (let i = 1; i <= numCycles; i++) {
    addPhase('TIRO (HIGH)', 60, `Tiro ${i}/${numCycles}: ${m.high}`, '#ef4444');
    addPhase('DESCANSO (LOW)', level === 'básico' ? 90 : 60, `Recuperação: ${m.low}`, '#3b82f6');
  }

  addPhase('DESAQUECIMENTO', cooldownSecs, `Baixando a frequência cardíaca. Ritmo muito lento.`, '#10b981');
  
  return plans;
};

// Gerador de Sons
const playTone = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'countdown') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15); 
    } else if (type === 'change') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); 
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6); 
    } else if (type === 'restComplete') {
      // 3 Bipes rápidos para o fim do descanso da musculação
      const playNote = (freq, timeOffset, duration) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, audioCtx.currentTime + timeOffset);
        g.gain.setValueAtTime(0.5, audioCtx.currentTime + timeOffset);
        o.start(audioCtx.currentTime + timeOffset);
        o.stop(audioCtx.currentTime + timeOffset + duration);
      };
      playNote(880, 0, 0.15);
      playNote(880, 0.25, 0.15);
      playNote(1046, 0.5, 0.4); 
    }
  } catch (e) {
    console.log("Áudio bloqueado.");
  }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState('ela');
  const [selectedMeal, setSelectedMeal] = useState(null);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  const [hiitConfig, setHiitConfig] = useState({ isOpen: false, level: 'básico', equipment: 'esteira', duration: 20 });
  const [hiitActive, setHiitActive] = useState(false);
  const [hiitState, setHiitState] = useState({
    plan: [], currentPhase: 0, timeLeftInPhase: 0, isPaused: false, totalTime: 0, elapsedTotal: 0
  });

  const getDaysUntil27th = () => {
    const today = new Date();
    const currentDay = today.getDate();
    let targetDate = new Date(today.getFullYear(), today.getMonth(), 27);
    if (currentDay >= 27) targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 27);
    return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  const daysTo27 = getDaysUntil27th() || 30; 
  const ratio = daysTo27 / 30;

  const sharedMacros = [
    { name: 'Proteínas', value: 180, color: '#3b82f6' },
    { name: 'Carboidratos', value: 135, color: '#10b981' },
    { name: 'Gorduras', value: 60, color: '#f59e0b' },
  ];

  const profiles = {
    ela: {
      name: "Ela (Intermediário - Máquinas)",
      stats: "28 anos • 1.64m • 121.2kg",
      calories: 1600,
      hiitLevel: 'básico',
      macros: [
        { name: 'Proteínas', value: 160, color: '#3b82f6' }, 
        { name: 'Carboidratos', value: 120, color: '#10b981' }, 
        { name: 'Gorduras', value: 53, color: '#f59e0b' }, 
      ],
      water: 4.5,
      sleep: "8h",
      diet: [
        { 
          id: 'ela_1', icon: <Zap size={20} className="text-amber-500" />, time: "07:30", name: "Café da Manhã", 
          targetMacros: { kcal: 340, prot: "30g", carb: "22g", fat: "14g" },
          options: [
            { title: "Opção 1: Wrap Vapt-Vupt", desc: "1 Wrap Caseiro (Inteiro) + 100g Frango desfiado + 1 fatia de mussarela derretida.", macros: { kcal: 330, prot: "35g", carb: "22g", fat: "11g" } },
            { title: "Opção 2: Coxinha + Leite", desc: "1 Coxinha LC Gabruxa (Inteira - 100g) na Airfryer + 1 copo (200ml) de leite desnatado com café.", macros: { kcal: 310, prot: "31g", carb: "15g", fat: "12g" } },
            { title: "Opção 3: Pão com Ovo Clássico", desc: "2 fatias de pão de forma integral + 2 ovos inteiros mexidos.", macros: { kcal: 300, prot: "19g", carb: "24g", fat: "14g" } }
          ]
        },
        { 
          id: 'ela_2', icon: <Sun size={20} className="text-orange-500" />, time: "10:30", name: "Lanche Doce", 
          targetMacros: { kcal: 205, prot: "20g", carb: "20g", fat: "5g" },
          options: [
            { title: "Opção 1: Mousse Proteico", desc: "2 Potinhos (400g) de Mousse de Morango da Gabruxa + 1 colher sopa de Aveia.", macros: { kcal: 210, prot: "16g", carb: "25g", fat: "3g" } },
            { title: "Opção 2: Iogurte Turbinado", desc: "1 Pote de Iogurte Natural Desnatado + 15g de Whey Protein + 100g de Morangos.", macros: { kcal: 200, prot: "22g", carb: "18g", fat: "2g" } }
          ]
        },
        { 
          id: 'ela_3', icon: <Utensils size={20} className="text-blue-600" />, time: "13:30", name: "Almoço Real", 
          targetMacros: { kcal: 410, prot: "45g", carb: "35g", fat: "10g" },
          options: [
            { title: "Opção 1: Padrão Brasileiro", desc: "150g Peito de Frango (pesado cru) + 100g Arroz + 80g Feijão + Salada verde (fio de azeite).", macros: { kcal: 415, prot: "46g", carb: "36g", fat: "9g" } },
            { title: "Opção 2: Macarrão c/ Carne", desc: "100g de Macarrão cozido + 130g de Carne Moída Magra (Patinho) em molho de tomate caseiro.", macros: { kcal: 420, prot: "42g", carb: "32g", fat: "11g" } }
          ]
        },
        { 
          id: 'ela_4', icon: <Sunset size={20} className="text-purple-500" />, time: "16:30", name: "Lanche da Tarde", 
          targetMacros: { kcal: 300, prot: "28g", carb: "22g", fat: "11g" },
          options: [
            { title: "Opção 1: Toast de Atum", desc: "1 Sanduíche Toast de Atum (Inteiro: 2 fatias de pão + 1 porção do patê de atum + queijo).", macros: { kcal: 320, prot: "30g", carb: "22g", fat: "13g" } },
            { title: "Opção 2: Pastel de Forno", desc: "1 Pastel (Massa Pronta - 30g) recheado com 80g de frango desfiado e 1 col. requeijão light. Assado.", macros: { kcal: 265, prot: "24g", carb: "18g", fat: "9g" } },
            { title: "Opção 3: Ovos e Aveia", desc: "2 Ovos cozidos + 20g de Aveia em flocos (mingau com água e adoçante).", macros: { kcal: 230, prot: "17g", carb: "14g", fat: "11g" } }
          ]
        },
        { 
          id: 'ela_5', icon: <Moon size={20} className="text-indigo-600" />, time: "20:30", name: "Jantar Prático", 
          targetMacros: { kcal: 345, prot: "37g", carb: "21g", fat: "13g" },
          options: [
            { title: "Opção 1: 2 Wraps de Frango", desc: "2 Wraps Caseiros (Inteiros) + 120g Frango desfiado + Salada + 1 colher de requeijão light.", macros: { kcal: 350, prot: "38g", carb: "30g", fat: "9g" } },
            { title: "Opção 2: 3 Bites na Airfryer", desc: "3 Bites de Frango Moído (Tirados direto do congelador) + Salada verde.", macros: { kcal: 280, prot: "32g", carb: "8g", fat: "14g" } },
            { title: "Opção 3: Creme de Abóbora", desc: "Creme de Abóbora (150g) + 130g de Frango desfiado por cima + fio de azeite.", macros: { kcal: 290, prot: "35g", carb: "15g", fat: "8g" } }
          ]
        }
      ],
      workouts: {
        A: {
          title: "Inferiores (Foco Máquinas)",
          exercises: [
            { name: "Mobilidade Articular (Pernas)", reps: "5 min", rest: 0 },
            { name: "Agachamento Hack Machine ou Smith", reps: "4 x 12", rest: 105 },
            { name: "Leg Press 45°", reps: "4 x 12-15", rest: 105 },
            { name: "Cadeira Extensora (Pico de contração)", reps: "4 x 15", rest: 75 },
            { name: "Cadeira Flexora (Sentada)", reps: "4 x 12", rest: 75 },
            { name: "Cadeira Abdutora (Máquina)", reps: "3 x 20", rest: 75 },
            { name: "Panturrilha no Leg Press", reps: "4 x 20", rest: 75 },
          ]
        },
        B: {
          title: "Superiores e Core (Articulados)",
          exercises: [
            { name: "Aquecimento: Elíptico leve", reps: "5 min", rest: 0 },
            { name: "Puxada Alta (Máquina Articulada ou Polia)", reps: "4 x 12", rest: 105 },
            { name: "Remada Sentada (Máquina Articulada)", reps: "4 x 12", rest: 105 },
            { name: "Supino Sentado (Máquina Articulada)", reps: "4 x 12", rest: 105 },
            { name: "Elevação Lateral (Na Polia Baixa)", reps: "4 x 15", rest: 75 },
            { name: "Tríceps Pushdown (Polia alta)", reps: "3 x 15", rest: 75 },
            { name: "Abs Máquina ou Prancha", reps: "4 x 15 / 40s", rest: 75 },
          ]
        }
      }
    },
    ele: {
      name: "Ele (Avançado)",
      stats: "23 anos • 1.74m • 117kg • ~33% BF",
      calories: 1800, 
      hiitLevel: 'intermediário',
      macros: sharedMacros,
      water: 5.5,
      sleep: "7.5h",
      diet: [
        { 
          id: 'ele_1', icon: <Zap size={20} className="text-amber-500" />, time: "07:00", name: "Café da Manhã Forte", 
          targetMacros: { kcal: 420, prot: "40g", carb: "30g", fat: "16g" },
          options: [
            { title: "Opção 1: 2 Wraps Turbinados", desc: "2 Wraps Caseiros (Inteiros) + 130g Frango desfiado + 1 fatia mussarela.", macros: { kcal: 420, prot: "45g", carb: "30g", fat: "10g" } },
            { title: "Opção 2: 2 Coxinhas Matinais", desc: "2 Coxinhas Low Carb Gabruxa (Inteiras - 200g total) direto na Airfryer.", macros: { kcal: 440, prot: "48g", carb: "10g", fat: "22g" } },
            { title: "Opção 3: Ovos e Pão", desc: "3 ovos inteiros mexidos + 3 fatias de pão de forma + 1 colher de requeijão light.", macros: { kcal: 450, prot: "28g", carb: "38g", fat: "20g" } }
          ]
        },
        { 
          id: 'ele_2', icon: <Sun size={20} className="text-orange-500" />, time: "10:30", name: "Lanche Intermediário", 
          targetMacros: { kcal: 240, prot: "20g", carb: "25g", fat: "5g" },
          options: [
            { title: "Opção 1: Iogurte Proteico", desc: "2 Potes Iogurte Natural Desnatado + 30g Aveia em flocos.", macros: { kcal: 260, prot: "15g", carb: "35g", fat: "4g" } },
            { title: "Opção 2: Mousse + Claras", desc: "2 Potes (400g) de Mousse Gabruxa + 2 Claras de ovo cozidas.", macros: { kcal: 180, prot: "22g", carb: "22g", fat: "0g" } }
          ]
        },
        { 
          id: 'ele_3', icon: <Utensils size={20} className="text-blue-600" />, time: "13:30", name: "Almoço Real", 
          targetMacros: { kcal: 505, prot: "50g", carb: "40g", fat: "15g" },
          options: [
            { title: "Opção 1: Padrão Brasileiro", desc: "180g Peito de Frango/Patinho + 130g Arroz + 100g Feijão + Salada verde (1 col. azeite).", macros: { kcal: 510, prot: "55g", carb: "42g", fat: "14g" } },
            { title: "Opção 2: Macarrão c/ Carne", desc: "130g Macarrão cozido + 180g Carne Moída Magra (Patinho) com molho caseiro.", macros: { kcal: 520, prot: "52g", carb: "40g", fat: "15g" } }
          ]
        },
        { 
          id: 'ele_4', icon: <Sunset size={20} className="text-purple-500" />, time: "17:00", name: "Pré-Treino", 
          targetMacros: { kcal: 350, prot: "35g", carb: "30g", fat: "12g" },
          options: [
            { title: "Opção 1: Toast + Iogurte", desc: "1 Sanduíche Toast de Atum (Inteiro) + 1 Pote de Iogurte Natural.", macros: { kcal: 390, prot: "36g", carb: "30g", fat: "13g" } },
            { title: "Opção 2: Pastelzão", desc: "1 Pastel Assado (Massa Pronta) c/ 100g Frango desfiado e 1 fatia de queijo.", macros: { kcal: 290, prot: "32g", carb: "18g", fat: "10g" } },
            { title: "Opção 3: Pão com Ovo", desc: "2 fatias Pão Integral + 2 Ovos cozidos/mexidos.", macros: { kcal: 260, prot: "18g", carb: "24g", fat: "11g" } }
          ]
        },
        { 
          id: 'ele_5', icon: <Moon size={20} className="text-indigo-600" />, time: "21:00", name: "Jantar Pós-Treino", 
          targetMacros: { kcal: 385, prot: "40g", carb: "20g", fat: "15g" },
          options: [
            { title: "Opção 1: 6 Bites (Receita Toda)", desc: "6 Bites de Frango Gabruxa (Receita Inteira: 150g frango moído, req, queijo).", macros: { kcal: 410, prot: "48g", carb: "10g", fat: "20g" } },
            { title: "Opção 2: 2 Wraps de Frango", desc: "2 Wraps Caseiros (Inteiros) + 150g Frango desfiado + Salada.", macros: { kcal: 380, prot: "46g", carb: "30g", fat: "7g" } },
            { title: "Opção 3: Omelete", desc: "3 ovos inteiros + 50g frango desfiado + 1 tomate picado. Feito na frigideira antiaderente.", macros: { kcal: 300, prot: "33g", carb: "5g", fat: "16g" } }
          ]
        }
      ],
      workouts: {
        A: {
          title: "Push (Peito e Tríceps)",
          exercises: [
            { name: "Supino Reto (Barra ou Máquina)", reps: "4 x 8-10", rest: 105 },
            { name: "Supino Inclinado (Halteres)", reps: "4 x 10", rest: 105 },
            { name: "Cross Over (Polia de baixo p/ cima)", reps: "3 x 12 (Drop-set)", rest: 75 },
            { name: "Crucifixo Máquina (Peck Deck)", reps: "3 x 12", rest: 75 },
            { name: "Tríceps Testa (Barra W)", reps: "4 x 10", rest: 75 },
            { name: "Tríceps Corda na Polia", reps: "3 x 12", rest: 75 },
          ]
        },
        B: {
          title: "Pull (Costas e Bíceps)",
          exercises: [
            { name: "Levantamento Terra ou Rack Pull", reps: "4 x 6-8", rest: 105 },
            { name: "Puxada Alta (Pegada Aberta)", reps: "4 x 10", rest: 105 },
            { name: "Remada Curvada ou Cavalinho", reps: "4 x 8-10", rest: 105 },
            { name: "Remada Unilateral (Serrote)", reps: "3 x 10 cada", rest: 105 },
            { name: "Pulldown com Corda", reps: "3 x 12", rest: 75 },
            { name: "Rosca Direta (Barra)", reps: "4 x 10", rest: 75 },
            { name: "Rosca Martelo (Halteres)", reps: "3 x 12", rest: 75 },
          ]
        },
        C: {
          title: "Legs (Pernas Completas)",
          exercises: [
            { name: "Agachamento Livre", reps: "4 x 8-10", rest: 105 },
            { name: "Leg Press 45°", reps: "4 x 10-12", rest: 105 },
            { name: "Stiff ou RDL", reps: "4 x 10", rest: 105 },
            { name: "Cadeira Extensora", reps: "4 x 12 (Isometria)", rest: 75 },
            { name: "Cadeira Flexora", reps: "4 x 12", rest: 75 },
            { name: "Panturrilha em Pé", reps: "5 x 15-20", rest: 75 },
          ]
        },
        D: {
          title: "Shoulders & Core",
          exercises: [
            { name: "Desenvolvimento Militar (Halteres)", reps: "4 x 8-10", rest: 105 },
            { name: "Elevação Lateral (Halteres)", reps: "4 x 12-15", rest: 75 },
            { name: "Elevação Frontal ou Polia", reps: "3 x 12-15", rest: 75 },
            { name: "Crucifixo Invertido Máquina", reps: "4 x 15", rest: 75 },
            { name: "Encolhimento (Trapézio)", reps: "4 x 15", rest: 75 },
            { name: "Abs Declinado ou Máquina", reps: "4 x 15", rest: 75 },
            { name: "Prancha Abdominal", reps: "3 x Máx", rest: 75 },
          ]
        }
      }
    }
  };

  const currentProfile = profiles[currentUser] || profiles['ela'];
  
  // --- PROTEÇÃO DE ESTADO ---
  const [activeWorkout, setActiveWorkout] = useState('A');
  const safeActiveWorkout = currentProfile.workouts[activeWorkout] ? activeWorkout : 'A';
  const workoutData = currentProfile.workouts[safeActiveWorkout];

  const [waterDrank, setWaterDrank] = useState(0);
  const [checklistEla, setChecklistEla] = useState({});
  const [checklistEle, setChecklistEle] = useState({});

  useEffect(() => {
    setActiveWorkout('A');
    setWaterDrank(0);
    setSelectedMeal(null);
    setHiitActive(false); 
  }, [currentUser]);

  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const lastSavedDate = localStorage.getItem('irmaosFitChecklistDateBR_V10');

      if (lastSavedDate !== today) {
        setChecklistEla({});
        setChecklistEle({});
        localStorage.setItem('irmaosFitChecklistElaBR_V10', JSON.stringify({}));
        localStorage.setItem('irmaosFitChecklistEleBR_V10', JSON.stringify({}));
        localStorage.setItem('irmaosFitChecklistDateBR_V10', today);
      } else {
        const savedEla = localStorage.getItem('irmaosFitChecklistElaBR_V10');
        const savedEle = localStorage.getItem('irmaosFitChecklistEleBR_V10');
        if (savedEla) setChecklistEla(JSON.parse(savedEla));
        if (savedEle) setChecklistEle(JSON.parse(savedEle));
      }
    } catch(e) {
      console.log("Erro no LocalStorage do Checklist", e);
    }
  }, []); 

  const toggleCheck = (id) => {
    if (currentUser === 'ela') {
      const updated = { ...checklistEla, [id]: !checklistEla[id] };
      setChecklistEla(updated);
      localStorage.setItem('irmaosFitChecklistElaBR_V10', JSON.stringify(updated));
    } else {
      const updated = { ...checklistEle, [id]: !checklistEle[id] };
      setChecklistEle(updated);
      localStorage.setItem('irmaosFitChecklistEleBR_V10', JSON.stringify(updated));
    }
  };

  const currentChecklist = currentUser === 'ela' ? checklistEla : checklistEle;

  // --- LÓGICA DE HIIT ---
  const hiitTimerRef = useRef(null);

  const startHiitWorkout = () => {
    const { level, equipment, duration } = hiitConfig;
    const plan = generateHiitPlan(level, equipment, duration);
    const totalTime = plan.reduce((acc, phase) => acc + phase.duration, 0);
    
    setHiitState({
      plan,
      currentPhase: 0,
      timeLeftInPhase: plan[0].duration,
      isPaused: false,
      totalTime,
      elapsedTotal: 0,
      equipment
    });
    setHiitConfig({ ...hiitConfig, isOpen: false });
    setHiitActive(true);
  };

  const stopHiit = () => {
    clearInterval(hiitTimerRef.current);
    setHiitActive(false);
  };

  const pauseHiit = () => {
    setHiitState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  useEffect(() => {
    if (hiitActive && !hiitState.isPaused && hiitState.plan.length > 0) {
      hiitTimerRef.current = setInterval(() => {
        setHiitState(prev => {
          const { timeLeftInPhase, currentPhase, plan, elapsedTotal } = prev;
          
          if (timeLeftInPhase === 4 || timeLeftInPhase === 3 || timeLeftInPhase === 2) {
            playTone('countdown');
          }

          if (timeLeftInPhase <= 1) {
            playTone('change');
            const nextPhase = currentPhase + 1;
            
            if (nextPhase < plan.length) {
              return { 
                ...prev, 
                currentPhase: nextPhase, 
                timeLeftInPhase: plan[nextPhase].duration,
                elapsedTotal: elapsedTotal + 1
              };
            } else {
              clearInterval(hiitTimerRef.current);
              toggleCheck(`hiit_done`); 
              setHiitActive(false);
              return prev;
            }
          }

          return {
            ...prev,
            timeLeftInPhase: timeLeftInPhase - 1,
            elapsedTotal: elapsedTotal + 1
          };
        });
      }, 1000);
    } else {
      clearInterval(hiitTimerRef.current);
    }
    return () => clearInterval(hiitTimerRef.current);
  }, [hiitActive, hiitState.isPaused, hiitState.plan.length]);

  // --- LÓGICA DE COMPRAS ---
  const baseShoppingList = [
    { id: 1, name: "Peito de Frango (Filé/Desfiado)", baseQty: 16, unit: "kg", basePrice: 320, checked: false },
    { id: 2, name: "Ovos (Cartela 30 un)", baseQty: 5, unit: "un", basePrice: 90, checked: false },
    { id: 3, name: "Arroz Branco/Integral", baseQty: 5, unit: "kg", basePrice: 30, checked: false },
    { id: 4, name: "Feijão", baseQty: 3, unit: "kg", basePrice: 24, checked: false },
    { id: 5, name: "Farinha de Trigo (Wraps)", baseQty: 5, unit: "kg", basePrice: 25, checked: false },
    { id: 6, name: "Pão de Forma Integral", baseQty: 6, unit: "pacotes", basePrice: 54, checked: false },
    { id: 7, name: "Batata Inglesa", baseQty: 5, unit: "kg", basePrice: 30, checked: false },
    { id: 8, name: "Atum em lata (Sólido)", baseQty: 16, unit: "latas", basePrice: 96, checked: false },
    { id: 9, name: "Queijo Mussarela", baseQty: 2.5, unit: "kg", basePrice: 120, checked: false },
    { id: 10, name: "Requeijão Light", baseQty: 8, unit: "potes", basePrice: 56, checked: false },
    { id: 11, name: "Gelatina (Morango/Maracujá)", baseQty: 10, unit: "caixas", basePrice: 15, checked: false },
    { id: 12, name: "Iogurte Natural/Morango Zero", baseQty: 15, unit: "potes", basePrice: 45, checked: false },
    { id: 13, name: "Leite em Pó Desnatado", baseQty: 1, unit: "kg", basePrice: 35, checked: false },
    { id: 14, name: "Morango Congelado", baseQty: 2, unit: "kg", basePrice: 40, checked: false },
    { id: 15, name: "Farinha Panko", baseQty: 2, unit: "kg", basePrice: 40, checked: false },
    { id: 16, name: "Hortifruti (Legumes/Salada)", baseQty: 4, unit: "verba", basePrice: 120, checked: false },
  ];

  const [shoppingList, setShoppingList] = useState([]);

  useEffect(() => {
    try {
      const savedList = localStorage.getItem('irmaosFitShoppingList_Din_V10');
      if (savedList) {
        setShoppingList(JSON.parse(savedList));
      } else {
        const dynamicList = baseShoppingList.map(item => ({
          ...item,
          qty: (item.baseQty * ratio).toFixed(1).replace('.0', ''),
          price: (item.basePrice * ratio).toFixed(2),
        }));
        setShoppingList(dynamicList);
      }
    } catch(e) {
      setShoppingList(baseShoppingList);
    }
  }, []);

  useEffect(() => {
    if (shoppingList.length > 0) {
      localStorage.setItem('irmaosFitShoppingList_Din_V10', JSON.stringify(shoppingList));
    }
  }, [shoppingList]);

  const handleItemChange = (id, field, value) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const addNewItem = () => {
    const newItem = { id: Date.now(), name: "Novo Item", qty: "1", unit: "un", price: 0, checked: false };
    setShoppingList([newItem, ...shoppingList]);
  };

  const removeItem = (id) => setShoppingList(prev => prev.filter(item => item.id !== id));

  const totalMarketCost = shoppingList ? shoppingList.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0) : 0;
  const checkedCost = shoppingList ? shoppingList.filter(i => i.checked).reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0) : 0;

  // --- TIMER DESCANDO NORMAL ---
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      playTone('restComplete');
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timeLeft]);

  const startTimer = (seconds) => {
    clearInterval(timerRef.current);
    setTimeLeft(seconds);
    setTimerActive(true);
  };

  // --- RENDERIZADORES ---
  const renderHiitSetupModal = () => {
    if (!hiitConfig.isOpen) return null;
    const durations = [10, 15, 20, 30, 45, 60];
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-slate-50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
          <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="text-blue-500"/> Configurar HIIT</h3>
              <p className="text-xs text-slate-500 font-medium">Nível: <strong className="uppercase text-slate-700">{currentProfile.hiitLevel}</strong></p>
            </div>
            <button onClick={() => setHiitConfig({...hiitConfig, isOpen: false})} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">1. Escolha a Máquina</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'esteira', name: 'Esteira', icon: '🏃‍♂️' },
                  { id: 'bike', name: 'Bicicleta', icon: '🚴‍♂️' },
                  { id: 'eliptico', name: 'Elíptico', icon: '⛷️' },
                  { id: 'escada', name: 'Escada', icon: '🪜' }
                ].map(eq => (
                  <button 
                    key={eq.id} 
                    onClick={() => setHiitConfig({...hiitConfig, equipment: eq.id})}
                    className={`border-2 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${hiitConfig.equipment === eq.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                  >
                    <span className="text-2xl">{eq.icon}</span>
                    <span className={`font-bold text-xs ${hiitConfig.equipment === eq.id ? 'text-blue-700' : 'text-slate-600'}`}>{eq.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">2. Duração do Treino</h4>
              <div className="grid grid-cols-3 gap-2">
                {durations.map(d => (
                  <button
                    key={d}
                    onClick={() => setHiitConfig({...hiitConfig, duration: d})}
                    className={`relative p-3 rounded-xl border-2 font-bold transition-all ${hiitConfig.duration === d ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}
                  >
                    {d} <span className="text-[10px] font-normal">min</span>
                    {d === 20 && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Rec</span>}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={startHiitWorkout}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              <PlayCircle size={24} /> INICIAR HIIT
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHiitPlayer = () => {
    if (!hiitActive || !hiitState.plan || hiitState.plan.length === 0) return null; 
    const { plan, currentPhase, timeLeftInPhase, isPaused, totalTime, elapsedTotal } = hiitState;
    const phase = plan[currentPhase] || { color: '#000', type: 'CARREGANDO...', desc: 'Aguarde' };
    const progressPercent = (elapsedTotal / totalTime) * 100;
    
    return (
      <div className="fixed inset-0 z-[200] text-white flex flex-col pt-12 pb-8 px-6 transition-colors duration-500" style={{ backgroundColor: phase.color }}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-bold text-xl uppercase flex items-center gap-2 drop-shadow-md"><Flame size={24} /> HIIT em Ação</h2>
          <button onClick={stopHiit} className="bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-sm"><X size={24}/></button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/80 mb-2 drop-shadow-sm">Fase Atual</p>
          <h1 className="text-4xl md:text-5xl font-black mb-6 uppercase drop-shadow-md">{phase.type}</h1>
          
          <div className="text-8xl md:text-9xl font-mono font-black tabular-nums drop-shadow-2xl mb-8">
            {Math.floor(timeLeftInPhase / 60)}:{(timeLeftInPhase % 60).toString().padStart(2, '0')}
          </div>

          <div className="bg-black/25 p-6 rounded-3xl backdrop-blur-md w-full max-w-sm border border-white/10 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-3">Máquina: {hiitConfig.equipment}</p>
            <p className="text-lg md:text-xl font-bold leading-tight drop-shadow-sm">{phase.desc}</p>
          </div>
        </div>

        <div className="mt-auto pt-8 space-y-6 w-full max-w-sm mx-auto">
          {currentPhase < plan.length - 1 && (
             <div className="text-center text-sm font-bold text-white/80 drop-shadow-sm">
                Próximo: {plan[currentPhase + 1].type} ({plan[currentPhase + 1].duration}s)
             </div>
          )}

          <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/20 shadow-inner">
            <div className="h-full bg-white transition-all duration-1000 ease-linear" style={{ width: `${progressPercent}%` }}></div>
          </div>

          <div className="flex justify-center">
            <button onClick={pauseHiit} className="bg-white text-slate-900 rounded-full p-5 hover:scale-105 transition-transform shadow-2xl">
              {isPaused ? <PlayCircle size={40} /> : <PauseCircle size={40} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMealModal = () => {
    if (!selectedMeal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-slate-50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
          <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
            <div>
              <div className="flex items-center gap-2 text-slate-800 mb-1">
                {selectedMeal.icon}
                <h3 className="font-bold text-lg">{selectedMeal.name}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">Selecione uma das opções para esta refeição.</p>
            </div>
            <button onClick={() => setSelectedMeal(null)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition">
              <X size={20} />
            </button>
          </div>
          
          <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center shadow-inner">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Alvo:</span>
            <div className="flex gap-3 text-xs font-bold">
              <span>🔥 {selectedMeal.targetMacros.kcal}</span>
              <span className="text-blue-400">🥩 {selectedMeal.targetMacros.prot}</span>
              <span className="text-emerald-400">🍞 {selectedMeal.targetMacros.carb}</span>
              <span className="text-amber-400">🥑 {selectedMeal.targetMacros.fat}</span>
            </div>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">
            {selectedMeal.options.map((opt, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition cursor-pointer group">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition">{opt.title}</h4>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{opt.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">🔥 {opt.macros.kcal} kcal</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">🥩 {opt.macros.prot} P</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">🍞 {opt.macros.carb} C</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">🥑 {opt.macros.fat} G</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0">
            <button onClick={() => setSelectedMeal(null)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition">
              Entendido, fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Activity size={60} /></div>
          <h3 className="text-slate-500 text-sm font-medium mb-3 relative z-10">Meta Calórica</h3>
          <div className="flex items-end gap-1 relative z-10">
            <span className="text-3xl font-black text-slate-800">{currentProfile.calories}</span>
            <span className="text-slate-400 mb-1 text-sm">kcal</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">Déficit focado na dieta. Todo o treino = Queima extra.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-3">Hidratação / Sono</h3>
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-black text-cyan-600">{(waterDrank / 1000).toFixed(1)}<span className="text-sm text-slate-400 font-normal">/{currentProfile.water}L</span></span>
            <button onClick={() => setWaterDrank(prev => Math.min(prev + 250, currentProfile.water * 1000))} className="bg-cyan-50 text-cyan-700 px-2 py-1 rounded text-xs font-bold hover:bg-cyan-100">+250ml</button>
          </div>
          <div className="border-t border-slate-100 pt-2 mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Sono Mínimo</span>
            <span className="text-sm font-bold text-indigo-600">{currentProfile.sleep}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-slate-800 font-bold text-lg">Macronutrientes</h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">40%P / 30%C / 30%G</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {currentProfile.macros.map(m => (
            <div key={m.name} className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
              <span className="text-[9px] text-slate-500 font-bold uppercase">{m.name}</span>
              <div className="text-lg font-black" style={{ color: m.color }}>{m.value}g</div>
            </div>
          ))}
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentProfile.macros} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={70} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                {currentProfile.macros.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className={`p-4 text-white flex justify-between items-center ${currentUser === 'ele' ? 'bg-slate-800' : 'bg-emerald-500'}`}>
          <h3 className="font-bold text-lg flex items-center gap-2"><Utensils size={20} /> Dieta Interativa ({currentProfile.calories} kcal)</h3>
        </div>
        <div className="bg-amber-50 text-amber-800 text-xs font-medium p-3 flex justify-center border-b border-amber-100 cursor-pointer">
          👆 Toque em qualquer refeição para ver opções e macros.
        </div>
        <div className="divide-y divide-slate-50">
          {currentProfile.diet.map((meal) => (
            <div key={meal.id} onClick={() => setSelectedMeal(meal)} className="p-4 hover:bg-slate-50 transition cursor-pointer group">
              <div className="flex gap-4">
                <div className="bg-slate-100 p-3 rounded-xl h-fit group-hover:bg-white group-hover:shadow-sm transition">{meal.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition">{meal.name}</h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{meal.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3 line-clamp-2">{meal.options[0].desc}</p>
                  
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      🔥 {meal.targetMacros.kcal} kcal
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      🥩 {meal.targetMacros.prot} P
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-slate-300 group-hover:text-blue-500 transition">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWorkouts = () => (
    <div className="space-y-6 pb-32 animate-in fade-in">
      
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-3xl text-white shadow-xl flex justify-between items-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setHiitConfig({ ...hiitConfig, isOpen: true, level: currentProfile.hiitLevel })}>
        <div>
          <h2 className="text-2xl font-black mb-1 flex items-center gap-2 drop-shadow-md"><Flame size={28}/> PÓS-TREINO HIIT</h2>
          <p className="text-xs font-medium opacity-90">Substitui o cardio antigo. Timer e Som Integrados.</p>
        </div>
        <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm shadow-sm">
          <PlayCircle size={32} />
        </div>
      </div>

      {timeLeft > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-slate-700">
            <div className="flex items-center gap-3">
              <Timer size={20} className="text-blue-500 animate-pulse" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Descanso</p>
                <p className="text-2xl font-mono font-bold leading-none">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
              </div>
            </div>
            <button onClick={() => setTimerActive(false)} className="bg-slate-700 p-2 rounded-lg hover:bg-red-600"><Square size={20} fill="currentColor" /></button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100">
        <span className="text-xs font-bold flex items-center gap-2">
           <Activity size={16}/> O checklist zera todos os dias à meia-noite.
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Object.keys(currentProfile.workouts).map(key => (
          <button
            key={key}
            onClick={() => setActiveWorkout(key)}
            className={`px-6 py-2 rounded-full font-bold transition-all shrink-0 text-sm ${
              safeActiveWorkout === key ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            Treino {key}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{workoutData.title}</h2>
        <div className="space-y-3">
          {workoutData.exercises.map((ex, idx) => {
            const id = `${currentUser}-${safeActiveWorkout}-${idx}`;
            return (
              <div key={id} className={`flex flex-col p-4 rounded-xl border transition-all ${currentChecklist[id] ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent'}`}>
                <div className="flex items-center gap-3">
                  <div onClick={() => toggleCheck(id)} className="cursor-pointer">
                    {currentChecklist[id] ? <CheckCircle className="text-emerald-500" size={24} /> : <Circle className="text-slate-300" size={24} />}
                  </div>
                  <div className="flex-1 flex justify-between items-start">
                    <h4 className={`font-bold text-sm ${currentChecklist[id] ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{ex.name}</h4>
                    <span className="text-[10px] font-bold text-slate-500">{ex.reps}</span>
                  </div>
                </div>
                {ex.rest > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Volume2 size={12} /> {ex.rest}s</span>
                    <button onClick={() => startTimer(ex.rest)} className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 shadow-sm">
                      <Play size={10} fill="currentColor" /> INICIAR PAUSA
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10"><ShoppingCart size={100} /></div>
        <h2 className="text-xl font-bold mb-1 relative z-10">Mercado (Até o dia 27)</h2>
        <p className="text-emerald-100 text-xs relative z-10">Lista dinâmica calculada para os próximos <strong>{daysTo27} dias</strong>.</p>
        
        <div className="mt-4 bg-emerald-700/50 p-3 rounded-xl border border-emerald-500/30 backdrop-blur-sm flex justify-between items-center relative z-10">
          <div>
            <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Custo para {daysTo27} dias</p>
            <p className="text-2xl font-black">R$ {totalMarketCost.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">No Carrinho</p>
            <p className="text-lg font-bold text-emerald-100">R$ {checkedCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-500 uppercase">Lista Editável e Salva</span>
          <button onClick={addNewItem} className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition">
            <Plus size={14} /> Novo Item
          </button>
        </div>
        
        <div className="divide-y divide-slate-100">
          {shoppingList.map(item => (
            <div key={item.id} className={`p-3 flex gap-3 items-center transition-colors ${item.checked ? 'bg-slate-50/50' : ''}`}>
              <button onClick={() => handleItemChange(item.id, 'checked', !item.checked)} className="shrink-0">
                {item.checked ? <CheckCircle size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-300" />}
              </button>
              
              <div className="flex-1 grid grid-cols-12 gap-2">
                <input type="text" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} className={`col-span-12 sm:col-span-5 text-sm font-bold bg-transparent border-none p-0 focus:ring-0 ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`} />
                <div className="col-span-6 sm:col-span-4 flex items-center bg-slate-100 rounded-md px-2">
                  <input type="text" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} className="w-full bg-transparent border-none p-1 text-xs font-bold text-slate-600 focus:ring-0 text-center" />
                  <input type="text" value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full bg-transparent border-none p-1 text-[10px] text-slate-400 focus:ring-0 uppercase" />
                </div>
                <div className="col-span-6 sm:col-span-3 flex items-center bg-slate-100 rounded-md px-2">
                  <span className="text-[10px] text-slate-400 mr-1">R$</span>
                  <input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} className="w-full bg-transparent border-none p-1 text-xs font-bold text-slate-600 focus:ring-0 text-right" />
                </div>
              </div>

              <button onClick={() => removeItem(item.id)} className="shrink-0 p-1 text-red-300 hover:text-red-500 transition"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const basePrepData = [
    { id: 'wraps', icon: "🌯", title: "Wraps Caseiros", desc: "Café da manhã e jantar.", calcEla: "1 a 3 un/dia", calcEle: "2 a 4 un/dia", targetWeek: 28, targetMonthBase: 112, tip: "Faça em lotes grandes e congele." },
    { id: 'coxinha', icon: "🍗", title: "Coxinhas LC", desc: "Lanche rápido e expresso.", calcEla: "1 a 2 un/dia", calcEle: "2 un/dia", targetWeek: 16, targetMonthBase: 64, tip: "Uma receita rende 15un de 100g." },
    { id: 'toast', icon: "🥪", title: "Toast de Atum", desc: "Sanduíches e lanches.", calcEla: "1 un/dia", calcEle: "1 a 2 un/dia", targetWeek: 12, targetMonthBase: 48, tip: "Faça o patê para 3-4 dias e guarde." },
    { id: 'mousse', icon: "🍓", title: "Mousse Proteico", desc: "Potes de 200g.", calcEla: "1 pote/dia", calcEle: "2 potes/dia", targetWeek: 12, targetMonthBase: 48, tip: "Dura bem na geladeira." },
    { id: 'bites', icon: "🧆", title: "Bites de Frango", desc: "Jantar na Airfryer.", calcEla: "3 un/jantar", calcEle: "6 un/jantar", targetWeek: 18, targetMonthBase: 72, tip: "Faça e congele todos crus." }
  ];

  const renderPrepPlanning = () => (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10"><CalendarDays size={100} /></div>
        <h2 className="text-xl font-bold mb-1 relative z-10">Metas de Prep</h2>
        <p className="text-blue-100 text-xs relative z-10">O que cozinhar no domingo para os próximos {daysTo27} dias.</p>
      </div>
      <div className="space-y-4">
        {basePrepData.map((item) => {
          const dynamicPeriodTarget = Math.ceil(item.targetMonthBase * ratio);
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex items-start gap-3">
                <div className="text-3xl bg-slate-50 p-2 rounded-xl">{item.icon}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{item.title}</h4>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-50">
                <div className="p-3 text-center bg-blue-50/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Por Semana</p>
                  <p className="text-xl font-black text-blue-600">{item.targetWeek}</p>
                </div>
                <div className="p-3 text-center bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Até dia 27 ({daysTo27}d)</p>
                  <p className="text-xl font-black text-slate-800">{dynamicPeriodTarget}</p>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 border-t border-emerald-100 flex items-start gap-2">
                <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-800 font-medium">{item.tip}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderRecipes = () => (
    <div className="space-y-4 pb-24 animate-in fade-in">
      <div className="bg-amber-100 p-6 rounded-2xl text-amber-900 border border-amber-200 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><BookOpen size={24}/> Meal Prep Gabruxa 🧙‍♀️</h2>
        <p className="text-xs opacity-80">Rendimentos em unidades exatas e sem porções quebradas.</p>
      </div>

      {[
        { title: "O 1º Pão do Mundo (Wrap)", time: "Frigideira", desc: "240g trigo, sal, 2 col azeite, água morna.", yield: "Rende 8 discos baratos.", freeze: true },
        { title: "Coxinha Low Carb", time: "Airfryer", desc: "1kg frango desfiado + 200g requeijão. Empanar: 2 ovos + 50g panko.", yield: "Rende 15 Coxinhas de 100g.", freeze: true },
        { title: "Coxinha de Batata", time: "Airfryer", desc: "600g batata cozida + 400g frango desfiado. Empanar panko.", yield: "Rende 10 Coxinhas de 125g.", freeze: true },
        { title: "Mousse Morango 0%", time: "Geladeira", desc: "Gelatina, 20g leite pó, 200g iogurte 0, 100g morango congelado.", yield: "Rende 4 Potinhos de 200g.", freeze: false },
        { title: "Toast de Atum (Patê)", time: "Forno", desc: "240g atum, 90g requeijão, 120g mussarela.", yield: "Rende Patê para 3 Sanduíches Duplos.", freeze: false },
        { title: "Bites de Frango Moído", time: "Airfryer", desc: "150g frango moído, 2 col requeijão, manjericão, tomate, mussarela.", yield: "Rende 6 Bites grandes.", freeze: true }
      ].map((rec, i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
          {rec.freeze && <div className="absolute top-3 right-3 text-blue-200"><Snowflake size={40} /></div>}
          <div className="flex justify-between items-start mb-2 relative z-10">
            <h4 className="font-bold text-slate-800">{rec.title}</h4>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">{rec.time}</span>
          </div>
          <p className="text-xs text-slate-500 mb-3 relative z-10">{rec.desc}</p>
          <div className="bg-blue-50 text-blue-800 text-xs font-bold p-2 rounded-lg border border-blue-100 relative z-10">
            📊 {rec.yield}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white px-4 py-3 border-b border-slate-100 sticky top-0 z-40 shadow-sm flex flex-col gap-3">
        <div className="max-w-md mx-auto w-full flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">Irmãos Fit <Activity size={18} className="text-blue-500"/></h1>
            <p className="text-[10px] text-slate-500">Mês 2 • {currentProfile.stats}</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setCurrentUser('ela')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${currentUser === 'ela' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Ela</button>
            <button onClick={() => setCurrentUser('ele')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${currentUser === 'ele' ? 'bg-slate-800 shadow-sm text-white' : 'text-slate-400'}`}>Ele</button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'workouts' && renderWorkouts()}
        {activeTab === 'market' && renderMarket()}
        {activeTab === 'prep' && renderPrepPlanning()}
        {activeTab === 'recipes' && renderRecipes()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-2 px-2 flex justify-around items-center z-50 pb-safe">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dieta' },
          { id: 'workouts', icon: Dumbbell, label: 'Treino' },
          { id: 'market', icon: ShoppingCart, label: 'Mercado' },
          { id: 'prep', icon: CalendarDays, label: 'Prep' },
          { id: 'recipes', icon: BookOpen, label: 'Receitas' },
        ].map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-1 w-[20%] p-2 rounded-xl transition ${activeTab === btn.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <btn.icon size={20} />
            <span className="text-[8px] font-bold uppercase tracking-tight">{btn.label}</span>
          </button>
        ))}
      </nav>

      {renderMealModal()}
      {renderHiitSetupModal()}
      {renderHiitPlayer()}
    </div>
  );
};

export default App;
