import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  updateDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  Gift, ArrowDown, CheckCircle, XCircle, Send, Loader2, Trophy, 
  Play, SkipForward, Users, Medal, Star, Crown, PartyPopper, Trash2, Clock, PieChart
} from 'lucide-react';

// --- 1. 全域配置 (部署至 GitHub 前請更換為您的 Firebase Config) ---
const firebaseConfig = {
  apiKey: "AIzaSyCuhIpxtvxVux4JhMKvF89JTvs7-MiKK6Q",
  authDomain: "spa-activity.firebaseapp.com",
  projectId: "spa-activity",
  storageBucket: "spa-activity.firebasestorage.app",
  messagingSenderId: "8554093402",
  appId: "1:8554093402:web:f21469855b0f24eda4f163",
  measurementId: "G-7NVTFPQGR0"
};

// 如果在模擬環境中，則嘗試抓取系統給予的配置
const finalConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
const app = initializeApp(finalConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'spring-quiz-2026';

const QUESTIONS = [
  { q: "今天是哪 2 間公司的春酒活動呢？", a: ["豐達 & 明定", "佳德 & 鳳梨酥", "達豐 & 明定", "長榮 & 陽明"], correct: 2 },
  { q: "請問達豐和明定的春酒活動，辦在農曆幾月幾號？", a: ["2 月 23 日", "正月 10 日", "2 月 26 日", "2 月 10 日"], correct: 1 },
  { q: "2026 年是天干地支中的什麼年？", a: ["甲辰 青龍年", "辛丑 金牛年", "癸巳 水蛇年", "丙午 火馬年"], correct: 3 },
  { q: "公司英文地址是下列何者？", a: ["9F-2 NO. 206, SEC2,\nNANJING EAST ROAD, TAIPEI", "9F-2 NO. 206, SEC2,\nNENJING EAST ROAD, TAIPEI"], correct: 0 },
  { q: "公司有幾個冷氣出風口？", a: ["3", "5", "7", "9"], correct: 3 },
  { q: "公司有 2 個掛衣架，請問上面有幾隻衣架？", a: ["3", "5", "7", "9"], correct: 1 },
  { q: "購買 Sherry 隱形眼鏡應以何為倍數做訂購？", a: ["5", "10", "20", "50"], correct: 0 },
  { q: "3 月輪到哪 2 位同事清理機器人 & 微波爐？", a: ["Patty & Alice", "Patty & Daisy", "昇雯 & Sherry", "Lory & Sherry"], correct: 1 },
  { q: "公司新購買的微波爐是什麼廠牌？", a: ["Panasonic", "SAMPO", "Whirpool", "TOSHIBA"], correct: 2 },
  { q: "下列何者「不是」疑似老鼠出沒跡象？", a: ["南瓜被咬一口", "被咬破的零食", "垃圾桶袋被翻出", "減少的咖啡濾掛包"], correct: 3 },
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

const PRIZES_POOL = ["8888元", "6666元", "3600元", "2000元", "1200元", "600元", "馬年金幣", "加碼獎", "驚喜禮包"];

// --- 2. 輔助與樣式組件 ---
const GlobalStyles = () => (
  <style>{`
    @keyframes borderShake {
      0% { transform: translate(0, 0); }
      25% { transform: translate(4px, 4px); }
      50% { transform: translate(-4px, -4px); }
      75% { transform: translate(4px, -4px); }
      100% { transform: translate(0, 0); }
    }
    .shake-border-active {
      border: 8px solid #ef4444;
      animation: borderShake 0.1s infinite;
      z-index: 50;
      pointer-events: none;
    }
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

const WordCloud = ({ players }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none pt-40 pb-40">
    <style>{`
      @keyframes floatUpDown {
        0%, 100% { transform: translateY(0px) rotate(var(--rot)); }
        50% { transform: translateY(-30px) rotate(var(--rot)); }
      }
      .word-item { animation: floatUpDown var(--dur) ease-in-out infinite; }
    `}</style>
    {players.slice(0, 9).map((p, i) => (
      <div 
        key={p.id || i}
        className="word-item absolute flex flex-col items-center justify-center text-center w-40"
        style={{
          top: `${(i * 15) % 45 + 30}%`,
          left: `${(i * 24) % 65 + 10}%`,
          '--rot': `${(i % 2 === 0 ? 3 : -3)}deg`,
          '--dur': `${4 + (i % 3)}s`,
          animationDelay: `${i * 0.3}s`
        }}
      >
        <span className="font-black text-yellow-100/60 drop-shadow-md leading-tight italic text-xl">{String(p.greeting || "")}</span>
        <span className="text-white/25 text-[10px] font-bold mt-1 tracking-widest">— {String(p.name)}</span>
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

const RedPacketModal = ({ prizeName, onClose }) => (
  <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
    <div className="relative w-full max-w-sm aspect-[3/4] bg-gradient-to-b from-red-600 to-red-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(239,68,68,0.5)] border-4 border-yellow-400 flex flex-col items-center justify-center text-center p-8 overflow-hidden">
      <div className="absolute top-0 w-full h-1/2 bg-red-500 rounded-b-[50%] -translate-y-1/2 shadow-xl border-b-4 border-yellow-500/20"></div>
      <div className="z-10 mt-12">
        <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white animate-bounce">
          <Gift className="w-12 h-12 text-red-700" />
        </div>
        <h2 className="text-4xl font-black text-yellow-300 mb-2 drop-shadow-md italic text-center">恭喜中獎！</h2>
        <p className="text-white text-lg font-bold mb-8 text-center">主辦方抽中了您</p>
        <div className="bg-yellow-400 text-red-900 px-8 py-5 rounded-2xl text-3xl font-black shadow-inner">{String(prizeName)}</div>
      </div>
      <button onClick={onClose} className="mt-12 text-white/60 text-sm underline font-bold active:text-white">關閉訊息</button>
    </div>
  </div>
);

// --- 3. 管理員端組件 ---
const AdminView = ({ players, gameState, sortedPlayers, elapsedSeconds, currentPhase }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);

  const startCountdown = async () => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
      isGameStarted: true, countdownStartTime: Date.now(), phaseStartTime: Date.now() + 5000, currentQuestionIndex: 0, viewMode: 'question'
    }, { merge: true });
  };

  const nextStep = async () => {
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx >= QUESTIONS.length) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { viewMode: 'final' }, { merge: true });
    } else {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
        currentQuestionIndex: nextIdx, phaseStartTime: Date.now(), viewMode: 'question' 
      }, { merge: true });
    }
  };

  const resetSystem = async () => {
    if (!window.confirm("這將清除所有參賽者並重置遊戲。確定嗎？")) return;
    const batch = writeBatch(db);
    players.forEach(p => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'players', p.id)));
    batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), { 
      currentQuestionIndex: 0, isGameStarted: false, viewMode: 'question', countdownStartTime: 0, phaseStartTime: 0 
    });
    await batch.commit();
    window.location.reload();
  };

  const drawPrize = async () => {
    if (!selectedWinner || isSpinning) return;
    setIsSpinning(true);
    setTimeout(async () => {
      const prize = PRIZES_POOL[Math.floor(Math.random() * PRIZES_POOL.length)];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', selectedWinner.id), { winningPrize: prize });
      setIsSpinning(false);
      setSelectedWinner(null);
    }, 3000);
  };

  const getStats = (qIdx) => {
    const stats = [0, 0, 0, 0];
    players.forEach(p => {
      const ans = p.answers?.[qIdx];
      if (ans !== undefined && ans !== null) {
        const val = Number(ans);
        if (val >= 0 && val < 4) stats[val]++;
      }
    });
    return stats;
  };

  const adminProgressText = useMemo(() => {
    if (currentPhase === 'question') return `作答中: ${Math.max(0, 10 - Math.floor(elapsedSeconds))} 秒`;
    if (currentPhase === 'buffer') return `緩衝等待: ${Math.max(0, 12 - Math.floor(elapsedSeconds))} 秒`;
    if (currentPhase === 'reveal') return `公布答案: ${Math.max(0, 15 - Math.floor(elapsedSeconds))} 秒`;
    if (currentPhase === 'rank') return "戰報顯示中";
    if (currentPhase === 'countdown_lobby') return "倒數準備中";
    return "尚未啟動";
  }, [currentPhase, elapsedSeconds]);

  return (
    <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto no-scrollbar pb-24 text-white">
      <div className="bg-white/10 rounded-3xl p-6 border-2 border-yellow-500/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-400 italic font-serif-tc">主控台</h2>
          <button onClick={resetSystem} className="text-red-400 text-xs font-bold border border-red-400/30 px-3 py-1 rounded-lg"><Trash2 className="w-3 h-3 inline mr-1"/>重置</button>
        </div>
        {!gameState.isGameStarted ? (
          <button onClick={startCountdown} className="w-full bg-green-600 p-5 rounded-2xl font-black text-xl shadow-lg">啟動大賽 (5s 倒數)</button>
        ) : (
          <>
            <div className="mb-4 bg-black/40 p-3 rounded-xl border border-white/10 flex justify-between items-center">
               <span className="text-xs font-bold text-white/50 uppercase tracking-widest"><Clock className="w-3 h-3 inline mr-1"/>目前狀態</span>
               <span className="text-yellow-400 font-black">{adminProgressText}</span>
            </div>
            <button onClick={nextStep} className="w-full bg-blue-600 p-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2"><SkipForward className="w-6 h-6" />下一題 / 結算</button>
          </>
        )}
      </div>

      <div className="bg-white/10 rounded-3xl p-6 border border-white/10">
         <h3 className="text-sm font-bold text-yellow-400 mb-4 uppercase italic">即時戰報</h3>
         <div className="space-y-2">
            {sortedPlayers.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                <span>{i+1}. {p.name}</span>
                <span className="text-yellow-400 font-bold">{p.score} pt / {p.totalTimeTaken?.toFixed(1)}s</span>
              </div>
            ))}
         </div>
      </div>

      <div className="bg-white/10 rounded-3xl p-6 border border-white/10 space-y-6">
        <h3 className="text-sm font-bold text-yellow-400 uppercase italic flex items-center gap-2"><PieChart className="w-4 h-4"/>各題答題比例</h3>
        {QUESTIONS.map((q, idx) => {
            const stats = getStats(idx);
            const total = stats.reduce((a,b) => a+b, 0);
            return (
                <div key={idx} className={`p-4 rounded-xl border ${gameState.currentQuestionIndex === idx ? 'bg-yellow-400/10 border-yellow-400' : 'bg-black/20 border-white/5 opacity-60'}`}>
                    <p className="text-white text-xs font-bold mb-2">Q{idx+1}: {q.q}</p>
                    <div className="space-y-2">
                        {q.a.map((ans, aIdx) => (
                            <div key={aIdx} className="space-y-1 text-[9px]">
                                <div className="flex justify-between text-white/70"><span>{String.fromCharCode(65+aIdx)}. {ans.replace(/\n/g, ' ')}</span><span>{stats[aIdx]}人</span></div>
                                <div className="h-1 bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-yellow-500" style={{ width: `${total > 0 ? (stats[aIdx]/total*100) : 0}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>

      <div className="bg-white/10 rounded-3xl p-6 border-2 border-yellow-500/30 text-center relative">
        <h2 className="text-xl font-bold text-yellow-400 mb-6 italic">抽獎轉盤</h2>
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className={`w-full h-full rounded-full border-4 border-yellow-500 transition-all duration-[3000ms] ${isSpinning ? 'rotate-[1080deg]' : 'rotate-0'}`} style={{ background: 'conic-gradient(#8b0000 0% 25%, #d4af37 25% 50%, #8b0000 50% 75%, #d4af37 75% 100%)' }}></div>
          <Crown className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-8 h-8" />
        </div>
        <p className="mb-4 font-bold text-white/80 h-6 text-sm">{selectedWinner ? `選中：${selectedWinner.name}` : "請選取成員"}</p>
        <button disabled={!selectedWinner || isSpinning} onClick={drawPrize} className="w-full py-4 bg-yellow-500 text-red-950 font-black rounded-2xl disabled:opacity-30">撥動開獎</button>
        <div className="grid grid-cols-3 gap-2 mt-4 max-h-40 overflow-y-auto no-scrollbar">
            {sortedPlayers.map(p => (
                <button key={p.id} onClick={() => setSelectedWinner(p)} className={`p-2 rounded-lg text-[10px] font-bold border truncate ${selectedWinner?.id === p.id ? 'bg-yellow-400 text-red-950 border-yellow-400' : 'bg-black/40 border-white/10'}`}>{p.name}</button>
            ))}
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
  const [gameState, setGameState] = useState({ currentQuestionIndex: 0, isGameStarted: false, phaseStartTime: 0, viewMode: 'question', countdownStartTime: 0 });
  const [tempSelectedOption, setTempSelectedOption] = useState(null); 
  const [selectedOption, setSelectedOption] = useState(null); 
  const [lastResultCorrect, setLastResultCorrect] = useState(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [canProceedFromSponsors, setCanProceedFromSponsors] = useState(false);

  const me = useMemo(() => players.find(p => p.id === user?.uid), [players, user]);

  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    if (adminPass === '1234') { setIsAdmin(true); setShowAdminLogin(false); setAdminPass(''); } else { alert('密碼錯誤！'); }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } 
        else { await signInAnonymously(auth); }
      } catch (err) { console.error("Auth error:", err); }
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
    });
    const unsubState = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameState'), (s) => {
      if (s.exists()) setGameState(s.data());
    });
    return () => { unsubPlayers(); unsubState(); };
  }, [user, gameStep]);

  const currentPhase = useMemo(() => {
    if (gameState.viewMode === 'final') return 'final';
    const now = Date.now();
    const countdownDiff = (now - gameState.countdownStartTime) / 1000;
    if (gameState.countdownStartTime > 0 && countdownDiff < 5) return 'countdown_lobby';
    if (gameState.isGameStarted) {
      const diff = (now - gameState.phaseStartTime) / 1000;
      if (diff < 10) return 'question';
      if (diff < 12) return 'buffer';
      if (diff < 15) return 'reveal';
      return 'rank';
    }
    return 'idle';
  }, [elapsedSeconds, gameState.isGameStarted, gameState.viewMode, gameState.countdownStartTime, gameState.phaseStartTime]);

  useEffect(() => {
    if (me && !isAdmin) {
      if (currentPhase === 'countdown_lobby' || (gameStep === 'sponsors' && sessionStorage.getItem('hasSeenSponsors_2026'))) setGameStep('greetings');
      if (gameState.isGameStarted && currentPhase !== 'countdown_lobby') setGameStep('quiz');
    }
  }, [currentPhase, gameState.isGameStarted, me, isAdmin]);

  useEffect(() => {
    if (gameState.isGameStarted && currentPhase === 'question') {
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

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => (b.score || 0) !== (a.score || 0) ? (b.score || 0) - (a.score || 0) : (a.totalTimeTaken || 0) - (b.totalTimeTaken || 0)), [players]);

  const handleRegister = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', user.uid), { 
      name: e.target.name.value, greeting: e.target.greeting.value.substring(0, 10), 
      score: 0, totalTimeTaken: 0, currentStreak: 0, answers: {}, winningPrize: null, timestamp: serverTimestamp() 
    }, { merge: true });
    setGameStep('sponsors');
  };

  const handleConfirmAnswer = async () => {
    if (tempSelectedOption === null || selectedOption !== null || currentPhase !== 'question') return;
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
      {me?.winningPrize && <RedPacketModal prizeName={me.winningPrize} onClose={async () => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', user.uid), { winningPrize: null })} />}

      <div className="sticky top-0 z-[60] bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-red-950 px-4 py-3 shadow-2xl flex items-center justify-between border-b-2 border-amber-700/50 font-black">
        <div className="flex items-center gap-2"><span className="animate-pulse text-xl font-bold">🐎</span><h1 className="text-sm tracking-tight uppercase font-black">2026 達豐&明定 春酒</h1></div>
        <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)} className="text-[10px] uppercase bg-red-900/10 px-2 py-1 rounded-md border border-red-900/20 active:bg-red-900/40">
          {isAdmin ? 'Exit' : 'Admin'}
        </button>
      </div>

      <main className="flex-grow flex flex-col relative px-4 pb-6 overflow-hidden">
        {isAdmin ? <AdminView players={players} gameState={gameState} sortedPlayers={sortedPlayers} elapsedSeconds={elapsedSeconds} currentPhase={currentPhase} /> : (
          <div className="flex-grow flex flex-col h-full relative">
            {gameStep === 'register' && (
              <div className="my-auto space-y-6 animate-in slide-in-from-bottom-8">
                <div className="text-center"><div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-600 shadow-2xl text-4xl">🐎</div><h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 drop-shadow-lg mb-2 italic">搶答賽簽到</h2></div>
                <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-yellow-400/30 shadow-2xl relative"><CornerDecorations /><form onSubmit={handleRegister} className="space-y-6"><div><label className="text-xs text-yellow-400 font-bold ml-2 mb-2 block tracking-widest uppercase">您的姓名</label><input name="name" required className="w-full px-6 py-4 rounded-2xl bg-white text-gray-900 border-2 border-yellow-400/30 outline-none text-xl font-bold" placeholder="請輸入姓名" /></div><div><label className="text-xs text-yellow-400 font-bold ml-2 mb-2 block tracking-widest uppercase">馬年賀詞 (限10字)</label><input name="greeting" required maxLength={10} className="w-full px-6 py-4 rounded-2xl bg-white text-gray-900 border-2 border-yellow-400/30 outline-none text-xl font-bold" placeholder="馬到成功" /></div><button type="submit" className="w-full py-5 bg-gradient-to-b from-yellow-300 to-amber-600 text-red-950 font-black rounded-2xl shadow-xl text-2xl active:translate-y-1 transition-all border-b-4 border-amber-800 italic uppercase">確認報名 ➔</button></form></div>
              </div>
            )}

            {gameStep === 'sponsors' && (
              <div className="flex flex-col h-full space-y-4 py-6 animate-in fade-in text-center"><h2 className="text-2xl font-black text-yellow-400 italic underline decoration-amber-500/50 font-serif-tc">鳴謝贊助單位</h2><div onScroll={(e) => { if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 50) setCanProceedFromSponsors(true); }} className="flex-grow space-y-3 overflow-y-auto no-scrollbar pb-6 px-1">{SPONSORS.map((s, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-3xl flex items-center gap-4 border-l-4 border-yellow-400 shadow-lg animate-in slide-in-from-right" style={{ animationDelay: `${i*100}ms` }}><div className="bg-gradient-to-br from-yellow-300 to-amber-600 p-3 rounded-2xl text-red-950"><Gift className="w-5 h-5" /></div><div className="text-left font-black text-lg leading-tight truncate">{s.name}<div className="text-xs text-yellow-300 font-bold mt-1 italic">{s.prize}</div></div></div>
              ))}</div><div className="h-20 shrink-0 flex items-center">{canProceedFromSponsors ? <button onClick={() => { sessionStorage.setItem('hasSeenSponsors_2026', 'true'); setGameStep('greetings'); }} className="w-full py-4 bg-gradient-to-b from-yellow-300 to-amber-600 text-red-950 font-black rounded-2xl shadow-xl text-xl animate-in zoom-in uppercase">前往新年祝賀牆 ➔</button> : <div className="w-full text-yellow-400 text-xs font-black animate-bounce flex items-center justify-center gap-2 uppercase"><ArrowDown className="w-4 h-4" /> 請滑動閱讀完畢</div>}</div></div>
            )}

            {gameStep === 'greetings' && (
              <div className="flex-grow flex flex-col h-full relative">
                <div className="absolute top-10 left-0 right-0 text-center z-20"><h2 className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] italic tracking-widest font-serif-tc">新年祝賀牆</h2><p className="text-yellow-200/60 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold">New Year Celebration Wall</p></div>
                <WordCloud players={players} />
                <div className="mt-auto mb-10 text-center space-y-6 z-20"><div className="bg-black/60 backdrop-blur-xl px-10 py-5 rounded-[2rem] border-2 border-yellow-500/40 inline-flex flex-col items-center gap-3 shadow-2xl"><div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div><span className="text-base font-black tracking-widest text-yellow-100 italic">等待主辦方啟動搶答遊戲</span></div><p className="text-[10px] text-white/40 font-bold tracking-widest">目前已集結 {players.length} 位選手</p></div></div>
                {currentPhase === 'countdown_lobby' && (
                   <div className="fixed inset-0 z-[100] bg-red-950/95 flex flex-col items-center justify-center animate-in fade-in duration-500 text-center font-serif-tc"><div className="text-yellow-400 text-[18rem] font-black animate-ping drop-shadow-2xl">{Math.max(1, 5 - Math.floor((Date.now() - gameState.countdownStartTime) / 1000))}</div><div className="text-5xl font-black text-white tracking-[0.5em] mt-10 italic uppercase drop-shadow-lg">全體預備！</div></div>
                )}
              </div>
            )}

            {gameStep === 'quiz' && (
              <div className="flex flex-col h-full pt-4">
                {(currentPhase === 'question' || currentPhase === 'buffer' || currentPhase === 'reveal') ? (
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <div className="text-yellow-400 font-black italic text-sm">第 {gameState.currentQuestionIndex + 1} 題</div>
                        <div className={`px-5 py-2 rounded-2xl font-mono text-lg font-black transition-all shadow-xl bg-black/60 border border-white/20 text-center`}>
                           <span className="text-[9px] opacity-60 block leading-none uppercase mb-1">倒數時間</span>
                           {currentPhase === 'reveal' || currentPhase === 'buffer' ? '0 秒' : `${Math.max(0, 10 - Math.floor(elapsedSeconds))} 秒`}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl min-h-[140px] flex items-center justify-center text-center relative text-red-950 border-b-8 border-amber-900/30 animate-in zoom-in"><CornerDecorations /><p className="text-xl font-black leading-tight italic">{String(currentQ.q)}</p></div>
                    
                    <div className="flex-grow flex flex-col justify-center space-y-3">
                      {currentQ.a.map((ans, i) => {
                        const isReveal = currentPhase === 'reveal';
                        const isBuffer = currentPhase === 'buffer';
                        const isCorrect = Array.isArray(currentQ.correct) ? currentQ.correct.includes(i) : i === currentQ.correct;
                        const isMyChoice = selectedOption === i;
                        
                        let style = "bg-white/5 border-white/10 text-white/80";
                        if (isReveal) {
                          if (isCorrect) style = "bg-green-600 border-green-300 ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)] z-10 text-white";
                          else if (isMyChoice) style = "bg-black/60 border-red-500 ring-2 ring-red-500/30 text-red-500 font-black"; 
                          else style = "opacity-10 scale-95 grayscale bg-black/40 border-transparent text-white/40"; 
                        } else if (isMyChoice) style = "bg-gradient-to-r from-yellow-400 to-amber-500 text-red-950 border-white ring-4 ring-yellow-400 shadow-xl scale-[1.02]";
                        else if (tempSelectedOption === i) style = "bg-white/20 border-yellow-400 scale-[1.02] text-white";

                        return (
                          <button key={i} disabled={selectedOption !== null || isReveal || isBuffer} onClick={() => setTempSelectedOption(i)} className={`p-5 border-2 rounded-2xl transition-all duration-300 text-left flex items-center gap-4 relative overflow-hidden font-bold ${style}`}>
                            <span className={`w-8 h-8 rounded-full bg-black/20 flex items-center justify-center shrink-0 text-xs font-mono ${isReveal && isMyChoice && !isCorrect ? 'text-red-500' : ''}`}>{String.fromCharCode(65 + i)}</span>
                            <div className="flex flex-col flex-grow">
                                <span className="text-lg whitespace-pre-line break-words leading-tight">{String(ans)}</span>
                                {isReveal && isCorrect && <span className="text-[10px] font-black animate-pulse flex items-center gap-1 text-green-200 mt-1"><CheckCircle className="w-3 h-3" /> 正確答案</span>}
                                {isReveal && isMyChoice && !isCorrect && <span className="text-[10px] font-black text-red-400 flex items-center gap-1 mt-1"><XCircle className="w-3 h-3" /> 您的選擇</span>}
                            </div>
                            {isReveal && isCorrect && <PartyPopper className="w-6 h-6 text-yellow-300 animate-bounce ml-2 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-20 flex items-center justify-center">
                      {currentPhase === 'reveal' ? (
                        <div className={`text-base font-black italic px-8 py-3 rounded-full border-2 animate-in zoom-in shadow-2xl ${lastResultCorrect ? 'bg-green-600 text-white border-green-300' : 'bg-red-900/60 text-red-200 border-red-500/30'}`}>{lastResultCorrect ? '🏆 鴻運當頭！' : '💀 下題加油'}</div>
                      ) : (
                        <>{tempSelectedOption !== null && selectedOption === null && currentPhase === 'question' && <button onClick={handleConfirmAnswer} className="w-full py-4 bg-gradient-to-b from-yellow-300 to-yellow-600 text-red-950 font-black rounded-2xl shadow-2xl text-xl border-b-4 border-amber-800 active:scale-95 flex items-center justify-center gap-3 animate-in slide-in-from-bottom uppercase font-serif-tc">確認送出 <Send className="w-6 h-6" /></button>}{selectedOption !== null && <div className="text-yellow-400 font-bold italic animate-pulse flex items-center gap-3 bg-black/30 px-8 py-3 rounded-full border border-yellow-500/20"><Loader2 className="w-6 h-6 animate-spin" /> 已鎖定答案...</div>}</>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full space-y-4 animate-in slide-in-from-right"><h2 className="text-center text-4xl font-black text-yellow-400 italic tracking-[0.2em] drop-shadow-lg font-serif-tc">即時戰報</h2><div className="bg-white/5 rounded-[3rem] p-6 border border-yellow-500/20 shadow-2xl flex-grow overflow-hidden flex flex-col"><p className="text-center text-[10px] text-white/40 mb-4 uppercase tracking-[0.3em] font-bold font-serif-tc">Top 5 即時排名</p><div className="space-y-3 overflow-y-auto no-scrollbar">{sortedPlayers.slice(0, 5).map((p, i) => (<div key={p.id} className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 animate-in slide-in-from-bottom" style={{ animationDelay: `${i*100}ms` }}><div className="flex items-center gap-3"><span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg ${i === 0 ? 'bg-yellow-400 text-red-950 scale-110' : 'bg-white/10 text-white/60'}`}>{i + 1}</span><span className={`font-bold text-lg ${i === 0 ? 'text-yellow-400 font-black italic' : ''}`}>{String(p.name)}</span></div><div className="text-right"><div className="text-2xl font-black text-yellow-400 leading-none italic">{p.score} <span className="text-[10px] opacity-50 not-italic">pt</span></div><div className="text-[9px] opacity-40 mt-1 font-mono">{p.totalTimeTaken?.toFixed(1)}s</div></div></div>))}</div></div><div className="h-16 flex flex-col items-center justify-center text-yellow-500/60 text-sm animate-pulse italic font-bold gap-1 uppercase tracking-widest font-serif-tc"><span>主持人準備下一題中...</span><div className="flex gap-1"><span className="w-1.5 h-1.5 bg-yellow-500/40 rounded-full animate-bounce" style={{animationDelay:'0s'}}></span><span className="w-1.5 h-1.5 bg-yellow-500/40 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span><span className="w-1.5 h-1.5 bg-yellow-500/40 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></span></div></div></div>
                )}
              </div>
            )}

            {gameStep === 'leaderboard' && (
              <div className="flex flex-col h-full space-y-6 pt-8 animate-in slide-in-from-bottom duration-1000"><div className="text-center"><h2 className="text-6xl font-black text-yellow-400 drop-shadow-2xl italic tracking-tighter font-serif-tc">榮耀榜</h2><p className="text-white/40 text-xs mt-2 font-bold uppercase tracking-[0.4em] font-sans">Final Leaderboard</p></div>{me && (<div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-950 p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(251,191,36,0.3)] relative overflow-hidden ring-4 ring-white/20"><div className="relative z-10 flex justify-between items-center"><div><p className="text-[10px] font-black opacity-70 uppercase tracking-widest">您的最終成績</p><p className="text-3xl font-black italic">{String(me.name)}</p></div><div className="text-right"><p className="text-5xl font-black">{sortedPlayers.findIndex(p => p.id === user.uid) + 1}</p><p className="text-[10px] font-bold uppercase tracking-tighter font-serif-tc">Ranking / {me.score} PT</p></div></div><Star className="absolute -bottom-6 -right-6 w-32 h-32 text-red-950/10 rotate-12" /></div>)}<div className="bg-white/5 rounded-[3rem] p-6 border border-yellow-400/20 flex-grow overflow-y-auto no-scrollbar shadow-inner"><div className="space-y-3">{sortedPlayers.map((p, i) => (<div key={p.id} className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${i < 3 ? 'bg-yellow-400/10 border-yellow-400/40 py-5' : 'bg-black/20 border-white/5'}`}><div className="flex items-center gap-4">{i === 0 ? <Crown className="text-yellow-400 w-8 h-8 drop-shadow-lg" /> : <span className="text-white/40 font-mono w-8 text-center text-sm font-bold">{i+1}</span>}<span className={`font-bold ${i < 3 ? 'text-yellow-400 text-xl italic font-black' : 'text-white/80'}`}>{String(p.name)}</span></div><div className="text-right"><div className="font-black text-xl italic">{p.score}</div><div className="text-[9px] opacity-30 font-mono">{p.totalTimeTaken?.toFixed(1)}s</div></div></div>))}</div></div><div className="text-center py-4 bg-yellow-400/10 rounded-2xl border border-yellow-400/20 shadow-xl"><p className="text-yellow-400 text-sm font-black animate-pulse uppercase tracking-[0.2em] font-serif-tc">🎉 恭喜得獎者！請依排名領取大獎 🎉</p></div></div>
            )}
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <form onSubmit={handleAdminLogin} className="bg-[#450a0a] border-2 border-yellow-400 p-8 rounded-[2.5rem] w-full max-w-xs shadow-2xl relative"><CornerDecorations /><h3 className="text-xl font-black text-yellow-400 mb-6 text-center italic font-serif-tc">主辦方身份驗證</h3><input type="password" autoFocus className="w-full p-4 rounded-xl bg-white text-black mb-6 outline-none font-bold text-center text-2xl tracking-widest shadow-inner" placeholder="••••" value={adminPass} onChange={e => setAdminPass(e.target.value)} /><div className="flex gap-3"><button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 bg-white/10 rounded-xl font-bold transition-colors active:bg-white/20">取消</button><button type="submit" className="flex-1 py-4 bg-yellow-500 text-red-950 rounded-xl font-black shadow-lg active:scale-95 transition-transform">驗證</button></div></form>
        </div>
      )}
    </div>
  );
}