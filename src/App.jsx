import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  updateDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Gift, ArrowDown, CheckCircle, XCircle, Send, Loader2, Trophy, 
  Play, SkipForward, Users, Medal, Star, Crown, PartyPopper, Trash2, Clock, PieChart, RefreshCw, AlertTriangle, Eye
} from 'lucide-react';

// --- 1. 全域配置 ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyCuhIpxtvxVux4JhMKvF89JTvs7-MiKK6Q",
  authDomain: "spa-activity.firebaseapp.com",
  projectId: "spa-activity",
  storageBucket: "spa-activity.firebasestorage.app",
  messagingSenderId: "8554093402",
  appId: "1:8554093402:web:f21469855b0f24eda4f163",
  measurementId: "G-7NVTFPQGR0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'spring-quiz-2026';

const QUESTIONS = [
  { q: "今天是哪 2 間公司的春酒活動呢？", a: ["豐達 & 明定", "佳德 & 鳳梨酥", "達豐 & 明定", "長榮 & 陽明"], correct: 2 },
  { q: "請問達豐和明定的春酒活動，辦在農曆幾月幾號？", a: ["2 月 23 日", "1月 10 日", "2 月 26 日", "2 月 10 日"], correct: 1 },
  { q: "2026 年是天干地支中的什麼年？", a: ["甲辰 青龍年", "辛丑 金牛年", "癸巳 水蛇年", "丙午 火馬年"], correct: 3 },
  { q: "公司英文地址是下列何者？", a: ["9F-2 NO. 206, SEC2,\nNANJING EAST ROAD, TAIPEI", "9F-2 NO. 206, SEC2,\nNENJING EAST ROAD, TAIPEI"], correct: 0 },
  { q: "公司有幾個冷氣出風口？", a: ["3", "5", "7", "9"], correct: 3 },
  { q: "公司有 2 個掛衣架，請問上面有幾隻衣架？", a: ["3", "5", "7", "9"], correct: 1 },
  { q: "與 Sherry張 購買隱形眼鏡時, 是以何為倍數做訂購？", a: ["5", "10", "20", "50"], correct: 0 },
  { q: "3 月輪到哪 2 位同事清理掃地機器人 & 微波爐？", a: ["Patty & Alice", "Patty & Daisy", "昇雯 & Sherry", "Lory & Sherry"], correct: 1 },
  { q: "公司新購買的微波爐是什麼廠牌？", a: ["Panasonic", "SAMPO", "Whirpool", "TOSHIBA"], correct: 2 },
  { q: "下列何者「不是」疑似老鼠出沒跡象？", a: ["昇雯桌下的南瓜被咬一口", "Daisy桌上被咬破的零食", "Sherry垃圾桶裡零食袋被翻出", "飲水機旁減少的咖啡濾掛包"], correct: 3 },
  { q: "下列哪一間是離公司最遠的飲料店？", a: ["叮哥茶飲", "路易莎", "可不可", "麻古"], correct: 0 },
  { q: "哪一個是馬年吉祥話？", a: ["金馬報喜", "龍馬精神", "萬馬奔騰", "駿馬迎春"], correct: [0, 1, 2, 3] }
];

const SPONSORS = [
  { name: "茂碩通運股份有限公司", prize: "現金 5,000 元" },
  { name: "宇宙聯運企業有限公司", prize: "現金 3,000 元" },
  { name: "獅威航空貨運承攬", prize: "全聯禮券 2,000 元" },
  { name: "優捷國際運通有限公司", prize: "遠東百貨禮券 2,000 元" },
  { name: "萬海航運股份有限公司", prize: "氧顏森活 禮品" },
  { name: "長榮物流股份有限公司", prize: "長榮禮券 1,000 元" },
  { name: "台灣東方海外股份有限公司", prize: "SOGO禮券 3,000 元" },
  { name: "運達航運股份有限公司", prize: "郵政禮券 2,000 元" },
  { name: "詠全報關有限公司", prize: "現金 3,600 元" },
  { name: "曜陞物流有限公司", prize: "現金 1,600 元" },
  { name: "信全運通有限公司", prize: "全聯禮券 1,000 元" },
  { name: "辛歐貨運行", prize: "現金 2,000 元" }
];

const HORSE_PRIZES = {
  1: "馬上封神獎",
  2: "馬尼多多獎",
  3: "馬上有錢獎",
  "draw": ["馬上笑翻獎", "神馬都可以獎", "神馬攏賀獎", "龍馬平安獎"]
};

// --- 2. 輔助樣式 ---
const GlobalStyles = () => (
  <style>{`
    @keyframes borderShake { 0% { transform: translate(0,0); } 25% { transform: translate(4px,4px); } 50% { transform: translate(-4px,-4px); } 75% { transform: translate(4px,-4px); } 100% { transform: translate(0,0); } }
    .shake-border-active { 
      border: 4px solid #fbbf24; 
      box-shadow: inset 0 0 25px rgba(251, 191, 36, 0.4);
      animation: borderShake 0.1s infinite; 
      z-index: 50; 
      pointer-events: none; 
    }
    @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
    .animate-floating { animation: floating 4s ease-in-out infinite; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.3); border-radius: 10px; }
  `}</style>
);

const CornerDecorations = () => (
  <>
    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-yellow-400/50 pointer-events-none"></div>
    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-yellow-400/50 pointer-events-none"></div>
    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-yellow-400/50 pointer-events-none"></div>
    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-yellow-400/50 pointer-events-none"></div>
  </>
);

const WordCloud = ({ players, faint = false }) => (
  <div className={`absolute inset-0 overflow-hidden pointer-events-none animate-floating ${faint ? 'opacity-15' : ''}`}>
    {players.slice(0, 9).map((p, i) => (
      <div 
        key={p.id || i}
        className="word-item absolute flex flex-col items-center justify-center text-center w-52"
        style={{
          top: `${(i * 14) % 75 + 10}%`,
          left: `${(i * 28) % 65 + 5}%`,
          transform: `rotate(${(i % 2 === 0 ? 3 : -3)}deg)`,
        }}
      >
        <span className="font-black text-yellow-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] italic text-3xl tracking-tighter leading-tight">{String(p.greeting || "")}</span>
        {!faint && <span className="text-white/50 text-xs font-bold mt-2 tracking-[0.2em] uppercase">BY {String(p.name)}</span>}
      </div>
    ))}
  </div>
);

const ConfettiEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
    <style>{`
      @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      .confetti { position: absolute; width: 10px; height: 10px; animation: fall 3s linear forwards; }
    `}</style>
    {[...Array(50)].map((_, i) => (
      <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: ['#fbbf24', '#fcd34d', '#ffffff', '#ef4444'][i % 4], animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 2}s` }} />
    ))}
  </div>
);

// --- 3. 管理員端組件 ---
const AdminView = ({ players, gameState, sortedPlayers, elapsedSeconds, currentPhase }) => {
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const monitorText = useMemo(() => {
    if (currentPhase === 'countdown_lobby') {
      const remaining = Math.ceil(Math.abs(elapsedSeconds));
      return { label: '全體預備', time: remaining, color: 'text-green-400' };
    }
    if (currentPhase === 'question') {
      return { label: '成員作答中', time: Math.max(0, 10 - Math.floor(elapsedSeconds)), color: 'text-yellow-400' };
    }
    if (currentPhase === 'buffer') {
      return { label: '緩衝等待', time: Math.max(0, 12 - Math.floor(elapsedSeconds)), color: 'text-blue-400' };
    }
    if (currentPhase === 'reveal') {
      return { label: '公布答案', time: Math.max(0, 15 - Math.floor(elapsedSeconds)), color: 'text-orange-400' };
    }
    if (currentPhase === 'rank') return { label: '戰報顯示中', time: null, color: 'text-white' };
    if (currentPhase === 'final') return { label: '遊戲總結算', time: null, color: 'text-purple-400' };
    return { label: '等待啟動', time: null, color: 'text-slate-500' };
  }, [currentPhase, elapsedSeconds]);

  const startCountdown = async () => {
    if (!auth.currentUser) return;
    const now = Date.now();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
      isGameStarted: true, countdownStartTime: now, phaseStartTime: now + 5000, currentQuestionIndex: 0, viewMode: 'question'
    }, { merge: true });
  };

  const nextStep = async () => {
    if (!auth.currentUser) return;
    const nextIdx = (gameState.currentQuestionIndex || 0) + 1;
    if (nextIdx >= QUESTIONS.length) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { viewMode: 'final' }, { merge: true });
    } else {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
        currentQuestionIndex: nextIdx, phaseStartTime: Date.now(), viewMode: 'question',
        awardStatus: { stage: 'waiting' }
      }, { merge: true });
    }
  };

  const triggerAward = async (rank) => {
    if (!auth.currentUser) return;
    const winner = sortedPlayers[rank - 1];
    if (!winner) return alert("尚無此排名玩家"); 
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), {
      awardStatus: { stage: 'opened', rank, winner: winner.name, prize: HORSE_PRIZES[rank] }
    });
  };

  const drawWheel = async () => {
    if (!auth.currentUser || !selectedWinner || isSpinning) return;
    setIsSpinning(true);
    setTimeout(async () => {
      const prize = HORSE_PRIZES.draw[Math.floor(Math.random() * HORSE_PRIZES.draw.length)];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), {
        awardStatus: { stage: 'opened', rank: '抽獎', winner: selectedWinner.name, prize: prize }
      });
      setIsSpinning(false);
      setSelectedWinner(null);
    }, 2000);
  };

  const executeReset = async () => {
    if (!auth.currentUser) return;
    setShowResetConfirm(false);
    const batch = writeBatch(db);
    players.forEach(p => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id)));
    batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
      currentQuestionIndex: 0, isGameStarted: false, viewMode: 'question', countdownStartTime: 0, phaseStartTime: 0,
      awardStatus: { stage: 'waiting' }
    });
    await batch.commit();
    window.location.reload();
  };

  const getStats = (qIdx) => {
    const stats = [0, 0, 0, 0];
    players.forEach(p => {
      const ans = p.answers?.[qIdx];
      if (ans !== undefined && ans !== null) stats[Number(ans)]++;
    });
    return stats;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden text-white relative">
      {showResetConfirm && (
        <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 text-center animate-in fade-in">
          <div className="bg-[#450a0a] p-8 rounded-3xl border-2 border-red-500 shadow-2xl">
            <AlertTriangle className="mx-auto text-red-500 w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2 text-white">確定重置所有資料？</h3>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-slate-700 rounded-xl font-bold">取消</button>
              <button onClick={executeReset} className="flex-1 py-3 bg-red-600 rounded-xl font-black">確定重置</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-none bg-slate-800 border-b-2 border-yellow-500 shadow-2xl z-50 overflow-hidden">
        <div className="p-4 pb-2 flex justify-between items-center">
          <h2 className="text-xl font-bold text-yellow-500 italic flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-500" /> 2026 春酒主控台
          </h2>
          <button onClick={() => setShowResetConfirm(true)} className="text-red-400 text-xs font-bold border border-red-400/30 px-3 py-1 rounded-lg">重置</button>
        </div>
        <div className="px-4 pb-3">
          <div className="bg-black/50 p-3 rounded-2xl border border-white/10 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse bg-current ${monitorText.color}`} />
              <span className={`text-sm font-black uppercase tracking-widest ${monitorText.color}`}>
                {monitorText.label}
              </span>
            </div>
            {monitorText.time !== null && (
              <div className="flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="text-2xl font-black text-white">{monitorText.time}s</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          {!gameState.isGameStarted ? (
            <button onClick={startCountdown} className="w-full bg-green-600 p-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform">
              🚀 啟動 5 秒全體預備
            </button>
          ) : (
            <button onClick={nextStep} className="w-full bg-blue-600 p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
              <SkipForward className="w-6 h-6" /> 下一階段 / 結算
            </button>
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => triggerAward(1)} className="bg-yellow-600 p-2 rounded-xl text-[10px] leading-tight font-black border-b-4 border-yellow-800 active:translate-y-0.5">第一名<br/>馬上封神</button>
            <button onClick={() => triggerAward(2)} className="bg-gray-400 p-2 rounded-xl text-[10px] leading-tight font-black border-b-4 border-gray-600 text-black active:translate-y-0.5">第二名<br/>馬尼多多</button>
            <button onClick={() => triggerAward(3)} className="bg-orange-700 p-2 rounded-xl text-[10px] leading-tight font-black border-b-4 border-orange-900 active:translate-y-0.5">第三名<br/>馬上有錢</button>
            <button onClick={drawWheel} disabled={!selectedWinner || isSpinning} className="bg-purple-600 p-2 rounded-xl text-[10px] leading-tight font-black border-b-4 border-purple-800 disabled:opacity-30 active:translate-y-0.5">4~7名<br/>抽獎</button>
          </div>
        </div>
        <div className="px-4 pb-4 bg-slate-800">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 shadow-lg">
            <h3 className="text-xs font-bold text-yellow-400 mb-2 uppercase italic flex justify-between items-center">
              <span>🏆 即時戰報 (點選人名抽獎)</span>
              <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full text-white font-black animate-pulse">LIVE</span>
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {sortedPlayers.slice(0, 10).map((p, i) => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedWinner(p)} 
                  className={`flex-none min-w-[100px] p-2 rounded-xl border text-center transition-all cursor-pointer ${selectedWinner?.id === p.id ? 'bg-yellow-500/30 border-yellow-500 scale-105' : 'bg-black/40 border-white/5'}`}
                >
                  <div className="text-[10px] font-bold truncate">{i + 1}. {String(p.name)}</div>
                  <div className="text-yellow-400 text-[11px] font-black">{p.score} pt</div>
                </div>
              ))}
              {sortedPlayers.length === 0 && <div className="text-[10px] opacity-40 py-2">尚未有人報名...</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-32">
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-6">
          <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><PieChart size={16}/> 各題答題比例</h3>
          {QUESTIONS.map((q, idx) => {
            const stats = getStats(idx);
            const total = stats.reduce((a,b) => a+b, 0);
            const isCurrent = (gameState.currentQuestionIndex || 0) === idx;
            return (
              <div key={idx} className={`p-4 rounded-2xl border transition-all duration-500 ${isCurrent ? 'bg-yellow-400/10 border-yellow-400 ring-2 ring-yellow-400/20' : 'bg-black/20 border-white/5 opacity-60'}`}>
                <p className={`text-white font-black mb-4 leading-snug ${isCurrent ? 'text-lg' : 'text-base'}`}>Q{idx+1}: {q.q}</p>
                <div className="space-y-3">
                  {q.a.map((ans, ai) => (
                    <div key={ai} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-white/80 font-bold">
                        <span className="truncate w-[80%]">{String(String.fromCharCode(65+ai))}. {String(ans)}</span>
                        <span className="font-mono text-yellow-400">{stats[ai]}人</span>
                      </div>
                      <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out" style={{ width: `${total > 0 ? (stats[ai]/total*100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- 4. 主程式 App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [gameStep, setGameStep] = useState('register'); 
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({ 
    currentQuestionIndex: 0, isGameStarted: false, phaseStartTime: 0, viewMode: 'question', countdownStartTime: 0,
    awardStatus: { stage: 'waiting', rank: null, winner: null, prize: '' }
  });
  const [tempSelectedOption, setTempSelectedOption] = useState(null); 
  const [selectedOption, setSelectedOption] = useState(null); 
  const [lastResultCorrect, setLastResultCorrect] = useState(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [canProceedFromSponsors, setCanProceedFromSponsors] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), (s) => {
      const currentPlayers = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(currentPlayers);
      if (!currentPlayers.some(p => p.id === user.uid)) {
        setGameStep('register');
        sessionStorage.removeItem('hasSeenSponsors_2026');
      } else if (gameStep === 'register') {
        setGameStep('sponsors');
      }
    }, (err) => console.error(err));

    const unsubState = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), (s) => {
      if (s.exists()) setGameState(s.data());
    }, (err) => console.error(err));

    return () => { unsubPlayers(); unsubState(); };
  }, [user, gameStep]);

  const currentPhase = useMemo(() => {
    if (gameState.viewMode === 'final') return 'final';
    if (!gameState.isGameStarted) return 'idle';
    if (elapsedSeconds < 0) return 'countdown_lobby';
    if (elapsedSeconds < 10) return 'question';
    if (elapsedSeconds < 12) return 'buffer';
    if (elapsedSeconds < 15) return 'reveal';
    return 'rank';
  }, [elapsedSeconds, gameState.isGameStarted, gameState.viewMode]);

  useEffect(() => {
    if (me && !isAdmin) {
      if (currentPhase === 'countdown_lobby' || (gameStep === 'sponsors' && sessionStorage.getItem('hasSeenSponsors_2026'))) setGameStep('greetings');
      if (currentPhase !== 'idle' && currentPhase !== 'countdown_lobby' && currentPhase !== 'final') setStepIfGameStarted();
      if (gameState.viewMode === 'final') setGameStep('leaderboard');
    }
  }, [currentPhase, gameState.isGameStarted, gameState.viewMode, players, isAdmin]);

  const setStepIfGameStarted = () => {
     if (gameState.isGameStarted) setGameStep('quiz');
  };

  useEffect(() => {
    if (currentPhase === 'question') {
      setTempSelectedOption(null);
      setSelectedOption(null);
      setLastResultCorrect(null);
    }
  }, [gameState.currentQuestionIndex, currentPhase]);

  useEffect(() => {
    if (!gameState.phaseStartTime || !gameState.isGameStarted) return;
    const timer = setInterval(() => setElapsedSeconds((Date.now() - gameState.phaseStartTime) / 1000), 100);
    return () => clearInterval(timer);
  }, [gameState.phaseStartTime, gameState.isGameStarted]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => (b.score || 0) - (a.score || 0)), [players]);
  const me = useMemo(() => players.find(p => p.id === user?.uid), [players, user]);

  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    if (adminPass === '1234') { setIsAdmin(true); setShowAdminLogin(false); setAdminPass(''); } else { alert('密碼錯誤！'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', user.uid), { 
      name: e.target.name.value, greeting: e.target.greeting.value.substring(0, 10), 
      score: 0, totalTimeTaken: 0, currentStreak: 0, answers: {}, timestamp: serverTimestamp() 
    }, { merge: true });
    setGameStep('sponsors');
  };

  const handleConfirmAnswer = async () => {
    if (tempSelectedOption === null || selectedOption !== null || currentPhase !== 'question' || !user) return;
    setSelectedOption(tempSelectedOption);
    const idx = gameState.currentQuestionIndex;
    const isCorrect = Array.isArray(QUESTIONS[idx].correct) ? QUESTIONS[idx].correct.includes(tempSelectedOption) : tempSelectedOption === QUESTIONS[idx].correct;
    setLastResultCorrect(isCorrect);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'players', user.uid);
    const snap = await getDoc(ref);
    const d = snap.data() || {};
    let basePoint = isCorrect ? (idx >= QUESTIONS.length - 3 ? 100 : 66) : 0;
    let newStreak = isCorrect ? (d.currentStreak || 0) + 1 : 0;
    let streakBonus = (isCorrect && newStreak >= 3) ? 88 : 0;
    await updateDoc(ref, { 
      score: (d.score || 0) + basePoint + streakBonus, 
      totalTimeTaken: (d.totalTimeTaken || 0) + Math.min(10, Math.max(0, elapsedSeconds)), 
      currentStreak: newStreak, [`answers.${idx}`]: tempSelectedOption 
    });
  };

  const currentQ = QUESTIONS[gameState.currentQuestionIndex] || QUESTIONS[0];
  const isLast3Seconds = currentPhase === 'question' && elapsedSeconds >= 7;

  return (
    <div className={`flex flex-col h-screen max-w-lg mx-auto shadow-2xl relative overflow-hidden bg-[#450a0a] font-serif-tc text-white`}>
      <GlobalStyles />
      {isLast3Seconds && <div className="absolute inset-0 shake-border-active" />}

      {currentPhase === 'reveal' && lastResultCorrect && <ConfettiEffect />}
      
      {gameState.awardStatus?.stage === 'opened' && (
        <div className="fixed inset-0 z-[200] bg-red-950/98 flex items-center justify-center p-6 text-center animate-in zoom-in">
          <div className="bg-gradient-to-b from-red-600 to-red-800 p-10 rounded-[3rem] border-4 border-yellow-400 shadow-2xl w-full max-w-sm">
            <Trophy size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-yellow-300 text-xl font-bold mb-2 uppercase tracking-widest">
              {gameState.awardStatus.rank === '抽獎' ? '✨ 幸運中獎 ✨' : `🏆 第 ${String(gameState.awardStatus.rank)} 名 🏆`}
            </h2>
            <div className="text-5xl font-black mb-6 text-white">{String(gameState.awardStatus.winner)}</div>
            <div className="bg-yellow-400 text-red-950 text-2xl font-black py-4 rounded-2xl mb-8">{String(gameState.awardStatus.prize)}</div>
            {isAdmin && <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 'awardStatus.stage': 'waiting' })} className="text-white/50 underline font-bold">關閉開獎視窗</button>}
          </div>
        </div>
      )}

      <div className="sticky top-0 z-[60] bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-red-950 px-4 py-3 shadow-2xl flex items-center justify-between border-b-2 border-amber-700/50 font-black">
        <div className="flex items-center gap-2"><span className="animate-pulse text-xl font-bold">🐎</span><h1 className="text-sm tracking-tight uppercase font-black">2026 達豐&明定 春酒</h1></div>
        <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)} className="text-[10px] uppercase border border-red-900/20 px-2 py-1 rounded font-bold">
          {isAdmin ? 'Exit' : 'Admin'}
        </button>
      </div>

      <main className="flex-grow flex flex-col relative px-4 pb-6 overflow-hidden">
        {isAdmin ? <AdminView players={players} gameState={gameState} sortedPlayers={sortedPlayers} elapsedSeconds={elapsedSeconds} currentPhase={currentPhase} /> : (
          <div className="flex-grow flex flex-col h-full relative">
            {gameStep === 'register' && (
              <div className="my-auto space-y-6 animate-in slide-in-from-bottom-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-2xl text-4xl animate-floating">🐎</div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 drop-shadow-lg mb-2 italic">馬到成功 2026</h2>
                </div>
                <div className="p-8 rounded-[2.5rem] border border-yellow-400/30 relative">
                  <CornerDecorations />
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                      <label className="text-xs text-yellow-400 font-bold ml-2 mb-2 block tracking-widest uppercase">您的姓名</label>
                      <input name="name" required className="w-full px-6 py-4 rounded-2xl bg-white text-gray-900 border-2 border-yellow-400/30 outline-none text-xl font-bold shadow-inner" placeholder="請輸入姓名" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-400 font-bold ml-2 mb-2 block tracking-widest uppercase">馬年賀詞 (限10字)</label>
                      <input name="greeting" required maxLength={10} className="w-full px-6 py-4 rounded-2xl bg-white text-gray-900 border-2 border-yellow-400/30 outline-none text-xl font-bold shadow-inner" placeholder="馬到成功" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-gradient-to-b from-yellow-300 to-amber-600 text-red-950 font-black rounded-2xl shadow-xl text-2xl active:translate-y-1 transition-all border-b-4 border-amber-800 italic uppercase font-bold shadow-yellow-900/20">確認報名 ➔</button>
                  </form>
                </div>
              </div>
            )}

            {gameStep === 'sponsors' && (
              <div className="flex flex-col h-full space-y-4 py-6 animate-in fade-in text-center">
                <h2 className="text-2xl font-black text-yellow-400 italic underline decoration-amber-500/50 font-serif-tc">感謝贊助單位</h2>
                <div onScroll={(e) => { if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 50) setCanProceedFromSponsors(true); }} className="flex-grow space-y-3 overflow-y-auto no-scrollbar pb-6 px-1">
                  {SPONSORS.map((s, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-3xl flex items-center gap-4 border-l-4 border-yellow-400 shadow-lg animate-in slide-in-from-right" style={{ animationDelay: `${i*100}ms` }}>
                      <div className="bg-gradient-to-br from-yellow-300 to-amber-600 p-3 rounded-2xl text-red-950"><Gift className="w-5 h-5" /></div>
                      <div className="text-left font-black text-lg leading-tight truncate">{s.name}<div className="text-xs text-yellow-300 font-bold mt-1 italic">{s.prize}</div></div>
                    </div>
                  ))}
                </div>
                <div className="h-20 shrink-0 flex items-center">
                  {canProceedFromSponsors ? <button onClick={() => { sessionStorage.setItem('hasSeenSponsors_2026', 'true'); setGameStep('greetings'); }} className="w-full py-4 bg-gradient-to-b from-yellow-300 to-amber-600 text-red-950 font-black rounded-2xl shadow-xl text-xl animate-in zoom-in uppercase font-bold">前往新年祝賀牆 ➔</button> : <div className="w-full text-yellow-400 text-xs font-black animate-bounce flex items-center justify-center gap-2 uppercase"><ArrowDown className="w-4 h-4" /> 請滑動閱讀完畢</div>}
                </div>
              </div>
            )}

            {gameStep === 'greetings' && (
              <div className="flex flex-col h-full relative">
                <div className="absolute top-10 left-0 right-0 text-center z-20">
                  <h2 className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] italic tracking-widest font-serif-tc">新年祝賀牆</h2>
                </div>
                
                <div className="mt-20 mx-4 border border-white/10 rounded-[3rem] relative overflow-hidden bg-black/5 shadow-inner h-[70vh] mb-10">
                   <WordCloud players={players} />
                   
                   {currentPhase === 'countdown_lobby' && (
                      <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center text-center animate-in fade-in duration-500 backdrop-blur-[1px]">
                        <div className="text-yellow-400 text-8xl font-black animate-ping drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
                          {Math.max(1, Math.ceil(Math.abs(elapsedSeconds)))}
                        </div>
                        <div className="text-3xl font-black text-white tracking-[0.3em] uppercase drop-shadow-lg -mt-4 italic">全體預備！</div>
                      </div>
                   )}
                </div>

                <div className="mt-auto mb-4 px-4 z-20">
                  <div className="bg-red-950/70 backdrop-blur-md w-full py-2.5 rounded-full border border-yellow-500/10 flex items-center justify-center gap-2 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-sm font-black tracking-[0.3em] text-yellow-100 italic">等待活動開始</span>
                  </div>
                </div>
              </div>
            )}

            {gameStep === 'quiz' && (
              <div className="flex flex-col h-full pt-4 relative">
                <div className="absolute inset-0 -z-10 overflow-hidden">
                  <WordCloud players={players} faint={true} />
                </div>

                {(currentPhase === 'question' || currentPhase === 'buffer' || currentPhase === 'reveal') ? (
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <div className="text-yellow-400 font-black italic text-base">第 {gameState.currentQuestionIndex + 1} 題</div>
                        <div className={`px-4 py-2 rounded-2xl font-mono text-sm font-black bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-3 shadow-xl min-w-[130px] justify-center`}>
                           <span className="text-[10px] text-white/70 uppercase font-bold tracking-tight">倒數時間</span>
                           <span className="text-yellow-400 text-base whitespace-nowrap drop-shadow-sm">
                             {currentPhase === 'reveal' || currentPhase === 'buffer' ? '0' : Math.max(0, 10 - Math.floor(elapsedSeconds))} 秒
                           </span>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl min-h-[140px] flex items-center justify-center text-center relative text-red-950 border-b-8 border-amber-900/30 animate-in zoom-in"><CornerDecorations /><p className="text-xl font-black leading-tight italic">{String(currentQ.q)}</p></div>
                    
                    <div className="flex-grow flex flex-col justify-center space-y-3">
                      {currentQ.a.map((ans, i) => {
                        const isReveal = currentPhase === 'reveal';
                        const isBuffer = currentPhase === 'buffer';
                        const isCorrect = Array.isArray(currentQ.correct) ? currentQ.correct.includes(i) : i === currentQ.correct;
                        const isMyChoice = selectedOption === i;
                        let style = "bg-white/10 backdrop-blur-md border-white/10 text-white/90";
                        if (isReveal) {
                          if (isCorrect) style = "bg-green-600 border-green-300 ring-4 ring-green-400 shadow-xl text-white";
                          else if (isMyChoice) style = "bg-black/40 border-red-500 ring-2 ring-red-500/30 text-red-500 font-black"; 
                          else style = "opacity-10 scale-95 grayscale bg-black/40 border-transparent text-white/40"; 
                        } else if (isMyChoice) style = "bg-gradient-to-r from-yellow-400 to-amber-500 text-red-950 border-white ring-4 ring-yellow-400 shadow-xl scale-[1.02]";
                        else if (tempSelectedOption === i) style = "bg-white/30 border-yellow-400 scale-[1.02] text-white";
                        return (
                          <button key={i} disabled={selectedOption !== null || isReveal || isBuffer} onClick={() => setTempSelectedOption(i)} className={`p-5 border-2 rounded-2xl transition-all text-left flex items-center gap-4 relative overflow-hidden font-bold shadow-lg ${style}`}>
                            <span className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-mono`}>{String.fromCharCode(65 + i)}</span>
                            <div className="flex flex-col flex-grow">
                                <span className="text-lg whitespace-pre-line break-words leading-tight">{String(ans)}</span>
                                {isReveal && isCorrect && <span className="text-[10px] font-black flex items-center gap-1 text-green-200 mt-1 animate-pulse"><CheckCircle className="w-3 h-3" /> 正確答案</span>}
                                {isReveal && isMyChoice && !isCorrect && <span className="text-[10px] font-black text-red-400 flex items-center gap-1 mt-1"><XCircle className="w-3 h-3" /> 您的選擇</span>}
                            </div>
                            {isReveal && isCorrect && <PartyPopper className="w-6 h-6 text-yellow-300 animate-bounce ml-2 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="h-20 flex flex-col items-center justify-center space-y-2">
                      {currentPhase === 'buffer' && (
                        <div className="text-yellow-400 font-black italic animate-pulse flex items-center gap-3 bg-white/10 backdrop-blur-md px-8 py-3 rounded-full border border-yellow-500/20 shadow-2xl">
                          <RefreshCw className="w-6 h-6 animate-spin" /> 正在核對答案中...
                        </div>
                      )}
                      {currentPhase === 'reveal' && (
                        <div className={`text-base font-black italic px-8 py-3 rounded-full border-2 animate-in zoom-in shadow-xl ${lastResultCorrect ? 'bg-green-600 text-white border-green-300' : 'bg-red-900/60 text-red-200 border-red-500/30'}`}>{lastResultCorrect ? '🏆 鴻運當頭！' : '💀 下題加油'}</div>
                      )}
                      {currentPhase === 'question' && (
                        <>{tempSelectedOption !== null && selectedOption === null && <button onClick={handleConfirmAnswer} className="w-full py-4 bg-gradient-to-b from-yellow-300 to-yellow-600 text-red-950 font-black rounded-2xl shadow-2xl text-xl border-b-4 border-amber-800 flex items-center justify-center gap-3 active:scale-95 transition-transform font-bold">確認送出 <Send className="w-6 h-6" /></button>}{selectedOption !== null && <div className="text-yellow-400 font-bold italic animate-pulse flex items-center gap-3 bg-white/10 backdrop-blur-md px-8 py-3 rounded-full border border-yellow-500/20"><Loader2 className="w-6 h-6 animate-spin" /> 已鎖定答案...</div>}</>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full space-y-4 animate-in slide-in-from-right relative">
                    <h2 className="text-center text-4xl font-black text-yellow-400 italic font-serif-tc">即時戰報</h2>
                    <div className="bg-white/5 rounded-[3rem] p-6 border border-yellow-500/20 flex-grow overflow-hidden flex flex-col backdrop-blur-sm">
                      <div className="space-y-3 overflow-y-auto no-scrollbar">
                        {sortedPlayers.slice(0, 5).map((p, i) => (
                          <div key={p.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/10 shadow-lg">
                            <div className="flex items-center gap-3">
                              <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-400 text-red-950 scale-110' : 'bg-white/20 text-white/80'}`}>{i + 1}</span>
                              <span className={`font-bold text-lg ${i === 0 ? 'text-yellow-400 font-black italic' : ''}`}>{String(p.name)}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-yellow-400 leading-none italic">{p.score} <span className="text-[10px] opacity-50 not-italic">pt</span></div>
                              <div className="text-[9px] opacity-40 mt-1 font-mono">{p.totalTimeTaken?.toFixed(1)}s</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-12 flex items-center justify-center">
                       <div className="bg-black/20 px-6 py-1.5 rounded-full border border-white/5">
                         <span className="text-yellow-200/80 text-xs font-black italic animate-pulse tracking-widest">
                           第 {Math.min(QUESTIONS.length, (gameState.currentQuestionIndex || 0) + 2)} 題準備中，共 {QUESTIONS.length} 題
                         </span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameStep === 'leaderboard' && (
              <div className="flex flex-col h-full space-y-3 pt-6 animate-in slide-in-from-bottom duration-1000">
                <div className="text-center">
                  <h2 className="text-4xl font-black text-yellow-400 drop-shadow-xl italic tracking-tighter font-serif-tc uppercase">榮耀榜</h2>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] font-sans">Final Leaderboard</p>
                </div>
                {me && (
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-950 p-3 rounded-2xl shadow-lg relative overflow-hidden mx-2 border border-white/20">
                    <div className="relative z-10 flex justify-between items-center px-2">
                      <div>
                        <p className="text-[8px] font-black opacity-70 uppercase tracking-widest">您的最終成績</p>
                        <p className="text-2xl font-black italic truncate max-w-[150px]">{String(me.name)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-black leading-none">{sortedPlayers.findIndex(p => p.id === user.uid) + 1}</p>
                        <p className="text-[8px] font-bold uppercase tracking-tighter font-serif-tc">Ranking / {me.score} PT</p>
                      </div>
                    </div>
                    <Star className="absolute -bottom-3 -right-3 w-16 h-16 text-red-950/10 rotate-12" />
                  </div>
                )}
                <div className="bg-white/5 rounded-3xl p-3 border border-yellow-400/10 flex-grow overflow-y-auto no-scrollbar shadow-inner mx-2">
                  <div className="space-y-1.5">
                    {sortedPlayers.slice(0, 15).map((p, i) => (
                      <div key={p.id} className={`p-2.5 rounded-xl flex items-center justify-between border transition-all ${i < 3 ? 'bg-yellow-400/10 border-yellow-400/30' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center gap-3">
                          {i === 0 ? <Crown className="text-yellow-400 w-5 h-5 drop-shadow-md" /> : <span className="text-white/30 font-mono w-5 text-center text-xs font-bold">{i+1}</span>}
                          <span className={`font-bold truncate max-w-[120px] ${i < 3 ? 'text-yellow-400 text-sm font-black italic' : 'text-white/80 text-xs'}`}>{String(p.name)}</span>
                        </div>
                        <div className="text-right">
                          <div className={`font-black italic leading-none ${i < 3 ? 'text-lg text-white' : 'text-sm text-white/60'}`}>{p.score}</div>
                          <div className="text-[8px] opacity-30 font-mono">{p.totalTimeTaken?.toFixed(1)}s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pb-4 text-center">
                  <p className="text-[10px] text-yellow-500/50 font-bold uppercase italic tracking-widest">🎉 恭喜所有獲獎者！ 🎉</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <form onSubmit={handleAdminLogin} className="bg-[#450a0a] border-2 border-yellow-400 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl relative">
            <CornerDecorations /><h3 className="text-xl font-black text-yellow-400 mb-6 italic">身份驗證</h3>
            <input type="password" autoFocus className="w-full p-4 rounded-xl bg-white text-black mb-6 text-center text-2xl font-black shadow-inner outline-none" placeholder="••••" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
            <div className="flex gap-3"><button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 bg-white/10 rounded-xl font-bold">取消</button><button type="submit" className="flex-1 py-4 bg-yellow-500 text-red-950 rounded-xl font-black shadow-lg active:scale-95 transition-transform">驗證</button></div>
          </form>
        </div>
      )}
    </div>
  );
}