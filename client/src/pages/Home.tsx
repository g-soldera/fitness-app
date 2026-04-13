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
const generateHiitPlan = (level: any, equipment: any, durationMinutes: any) => {
  const plans: any[] = [];
  const addPhase = (type: any, duration: any, desc: any, color: any) => plans.push({ type, duration, desc, color });

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

  const m = (metrics[level as keyof typeof metrics] as any) && (metrics[level as keyof typeof metrics] as any)[equipment as keyof any] ? (metrics[level as keyof typeof metrics] as any)[equipment as keyof any] : metrics['básico']['esteira'];

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
const playTone = (type: any) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      const playNote = (freq: number, timeOffset: number, duration: number) => {
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
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  const [hiitConfig, setHiitConfig] = useState<any>({ isOpen: false, level: 'básico', equipment: 'esteira', duration: 20 });
  const [hiitActive, setHiitActive] = useState(false);
  const [hiitState, setHiitState] = useState<any>({
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
      diet: [],
      workouts: {}
    }
  };

  const currentProfile = profiles[currentUser as keyof typeof profiles];

  // Timer simples
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          playTone('change');
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, timeLeft]);

  // HIIT Timer
  useEffect(() => {
    if (!hiitActive || hiitState.isPaused) return;
    const interval = setInterval(() => {
      setHiitState((prev: any) => {
        let newTimeLeft = prev.timeLeftInPhase - 1;
        let newPhase = prev.currentPhase;
        let newElapsed = prev.elapsedTotal + 1;

        if (newTimeLeft <= 0) {
          if (newPhase < prev.plan.length - 1) {
            playTone('change');
            newPhase += 1;
            newTimeLeft = prev.plan[newPhase].duration;
          } else {
            playTone('restComplete');
            return { ...prev, isPaused: true, elapsedTotal: newElapsed };
          }
        }

        if (newTimeLeft <= 3 && newTimeLeft > 0) {
          playTone('countdown');
        }

        return {
          ...prev,
          timeLeftInPhase: newTimeLeft,
          currentPhase: newPhase,
          elapsedTotal: newElapsed
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hiitActive, hiitState.isPaused]);

  const startHiit = () => {
    const plan = generateHiitPlan(hiitConfig.level, hiitConfig.equipment, hiitConfig.duration);
    const totalTime = plan.reduce((sum, p) => sum + p.duration, 0);
    setHiitState({
      plan,
      currentPhase: 0,
      timeLeftInPhase: plan[0].duration,
      isPaused: false,
      totalTime,
      elapsedTotal: 0
    });
    setHiitActive(true);
    setHiitConfig({ ...hiitConfig, isOpen: false });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Macros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Macronutrientes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={currentProfile.macros}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6">
              {currentProfile.macros.map((entry: any, index: any) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Progresso até 27º</h3>
        <div className="text-4xl font-bold text-blue-600 mb-2">{daysTo27} dias</div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{ width: `${(1 - ratio) * 100}%` }}
          />
        </div>
      </div>

      {/* Água e Sono */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Hidratação</h3>
        <div className="text-3xl font-bold text-blue-500">{currentProfile.water}L</div>
        <div className="text-sm text-gray-600">Meta: 5L/dia</div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Sono</h3>
        <div className="text-3xl font-bold text-indigo-600">{currentProfile.sleep}</div>
        <div className="text-sm text-gray-600">Meta: 8h/dia</div>
      </div>
    </div>
  );

  const renderDiet = () => (
    <div className="space-y-4">
      {currentProfile.diet.map((meal: any) => (
        <div key={meal.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}>
            <div className="flex items-center gap-3">
              {meal.icon}
              <div>
                <div className="font-bold">{meal.name}</div>
                <div className="text-sm text-gray-600">{meal.time}</div>
              </div>
            </div>
            <ChevronRight className={`transition-transform ${selectedMeal === meal.id ? 'rotate-90' : ''}`} />
          </div>

          {selectedMeal === meal.id && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {meal.options.map((opt: any, idx: any) => (
                <div key={idx} className="bg-gray-50 p-3 rounded">
                  <div className="font-semibold text-sm">{opt.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{opt.desc}</div>
                  <div className="text-xs text-gray-700 mt-2">
                    {opt.macros.kcal}kcal | P:{opt.macros.prot} | C:{opt.macros.carb} | G:{opt.macros.fat}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderWorkouts = () => (
    <div className="space-y-4">
      {Object.entries(currentProfile.workouts).map(([key, workout]: any) => (
        <div key={key} className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">{workout.title}</h3>
          <div className="space-y-3">
            {workout.exercises.map((ex: any, idx: any) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-semibold">{ex.name}</div>
                  <div className="text-sm text-gray-600">{ex.reps}</div>
                </div>
                {ex.rest > 0 && <div className="text-sm font-bold text-red-600">{ex.rest}s descanso</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderHiit = () => (
    <div className="space-y-4">
      {!hiitActive ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Configurar HIIT</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Nível</label>
              <select
                value={hiitConfig.level}
                onChange={(e) => setHiitConfig({ ...hiitConfig, level: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="básico">Básico</option>
                <option value="intermediário">Intermediário</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Equipamento</label>
              <select
                value={hiitConfig.equipment}
                onChange={(e) => setHiitConfig({ ...hiitConfig, equipment: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="esteira">Esteira</option>
                <option value="bike">Bike</option>
                <option value="eliptico">Elíptico</option>
                <option value="escada">Escada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Duração (minutos)</label>
              <input
                type="number"
                value={hiitConfig.duration}
                onChange={(e) => setHiitConfig({ ...hiitConfig, duration: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
                min="5"
                max="60"
              />
            </div>
            <button
              onClick={startHiit}
              className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700"
            >
              Iniciar HIIT
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-lg shadow p-8 text-white">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">{formatTime(hiitState.timeLeftInPhase)}</div>
            <div className="text-2xl mb-4">{(hiitState.plan[hiitState.currentPhase] as any)?.type}</div>
            <div className="text-sm mb-6 opacity-90">{(hiitState.plan[hiitState.currentPhase] as any)?.desc}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setHiitState({ ...hiitState, isPaused: !hiitState.isPaused })}
                className="bg-white text-red-600 px-6 py-2 rounded font-bold hover:bg-gray-100"
              >
                {hiitState.isPaused ? 'Retomar' : 'Pausar'}
              </button>
              <button
                onClick={() => setHiitActive(false)}
                className="bg-white text-red-600 px-6 py-2 rounded font-bold hover:bg-gray-100"
              >
                Parar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimer = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">Timer Simples</h3>
      <div className="space-y-4">
        <input
          type="number"
          value={timeLeft}
          onChange={(e) => setTimeLeft(parseInt(e.target.value) || 0)}
          placeholder="Segundos"
          className="w-full border rounded px-3 py-2"
          disabled={timerActive}
        />
        <div className="text-4xl font-bold text-center text-blue-600">{formatTime(timeLeft)}</div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimerActive(!timerActive)}
            className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
          >
            {timerActive ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={() => { setTimerActive(false); setTimeLeft(0); }}
            className="flex-1 bg-gray-600 text-white py-2 rounded font-bold hover:bg-gray-700"
          >
            Resetar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Fitness App</h1>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="bg-blue-700 text-white rounded px-3 py-1"
          >
            <option value="ela">Ela</option>
            <option value="ele">Ele</option>
          </select>
        </div>
      </header>

      {/* Profile Info */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold">{currentProfile.name}</h2>
          <p className="text-gray-600">{currentProfile.stats}</p>
          <p className="text-sm text-gray-500">Meta calórica: {currentProfile.calories} kcal/dia</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-4 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'diet', label: 'Dieta', icon: <Utensils size={18} /> },
            { id: 'workouts', label: 'Treinos', icon: <Dumbbell size={18} /> },
            { id: 'hiit', label: 'HIIT', icon: <Flame size={18} /> },
            { id: 'timer', label: 'Timer', icon: <Timer size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-blue-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'diet' && renderDiet()}
        {activeTab === 'workouts' && renderWorkouts()}
        {activeTab === 'hiit' && renderHiit()}
        {activeTab === 'timer' && renderTimer()}
      </main>
    </div>
  );
};

export default App;
