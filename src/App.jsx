import React, { useState, useEffect, useRef } from 'react';
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove, update } from "firebase/database";
import DiceBox from '@3d-dice/dice-box'; // IMPORTANTE: Librería 3D

// --- GESTOR DE SONIDOS ---
const playSound = (type) => {
  const sounds = {
    click: '/sounds/click.mp3',
    success: '/sounds/success.mp3', // Sonido celestial/moneda
    fail: '/sounds/fail.mp3',     // Golpe seco/viento
    ruin: '/sounds/glitch.mp3',   // Ruido estático/terror
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.5;
  audio.play().catch(e => console.log("Esperando interacción para audio...", e));
};

// --- LÓGICA DE REGLAS TROPHY GOLD ---
function analyzeResult(dice, rollType) {
  if (dice.length === 0) return { label: 'Sin dados', color: 'text-gray-500' };

  const highestValue = Math.max(...dice.map(d => d.value));
  const highestDice = dice.filter(d => d.value === highestValue);
  const isDarkHighest = highestDice.some(d => d.type === 'dark');
  
  let resultText = '';
  let resultColor = '';
  let icon = '';
  let soundType = 'fail'; // Sonido por defecto

  // --- MODO RIESGO ---
  if (rollType === 'risk') {
    if (highestValue === 6) {
      resultText = '¡ÉXITO COMPLETE!'; 
      resultColor = 'text-[#d4af37] font-bold';
      icon = '✨';
      soundType = 'success';
    } else if (highestValue >= 4) {
      resultText = 'ÉXITO PARCIAL (CON COSTE)';
      resultColor = 'text-[#f9e29c]';
      icon = '⚠️';
      soundType = 'fail'; // Tensión
    } else {
      resultText = 'FALLO (LA SITUACIÓN EMPEORA)';
      resultColor = 'text-gray-400';
      icon = '💀';
      soundType = 'fail';
    }
  } 
  
  // --- MODO EXPLORACIÓN ---
  else if (rollType === 'hunt') {
    const tokens = dice.filter(d => d.value === 6).length;
    if (tokens > 0) {
      resultText = `${tokens} CONTADOR${tokens > 1 ? 'ES' : ''} DE EXPLORACIÓN`;
      resultColor = 'text-[#d4af37] font-bold border border-[#d4af37] px-2 py-1 bg-[#d4af37]/10';
      icon = '💎';
      soundType = 'success';
    } else {
      resultText = 'SIN CONTADORES';
      resultColor = 'text-gray-500';
      icon = '🍂';
      soundType = 'fail';
    }
  }

  // --- MODO COMBATE ---
  else if (rollType === 'combat') {
    const sortedValues = dice.map(d => d.value).sort((a, b) => b - a);
    const attackTotal = (sortedValues[0] || 0) + (sortedValues[1] || 0);
    resultText = `DAÑO TOTAL: ${attackTotal}`;
    
    if (attackTotal >= 10) {
        resultColor = 'text-red-500 font-bold text-lg animate-pulse';
        icon = '⚔️';
        soundType = 'ruin'; // Sonido agresivo
    } else if (attackTotal >= 8) {
        resultColor = 'text-[#d4af37] font-bold';
        icon = '🗡️';
        soundType = 'success';
    } else {
        resultColor = 'text-gray-400';
        icon = '🛡️';
        soundType = 'fail';
    }
  }

  // --- MODO AYUDAR ---
  else if (rollType === 'help') {
      const val = dice[0].value;
      resultText = `DADO DE AYUDA: ${val}`;
      if (val === 6) {
          resultColor = 'text-[#d4af37] font-bold';
          icon = '🤝';
          soundType = 'success';
      } else if (val >= 4) {
          resultColor = 'text-[#f9e29c]';
          icon = '✋';
          soundType = 'fail';
      } else {
          resultColor = 'text-gray-500';
          icon = '🥀';
          soundType = 'fail';
      }
  }

  // Override de sonido si hay Ruina (El glitch manda)
  if (isDarkHighest && highestValue > 0) {
      soundType = 'ruin'; 
  }

  return { label: resultText, color: resultColor, isDarkHighest, icon, rollType, soundType };
}

// --- COMPONENTE FICHA ---
const CharacterSheet = ({ roomName, playerName }) => {
  const [stats, setStats] = useState({ 
    ruin: 1, ruinInitial: 1, gold: 0, debt: 0, tokens: 0, 
    occupation: '', background: '', drive: '', skills: '', rituals: '', 
    backpack: '', armor: '', weapons: '', foundGear: '', conditions: '', imageUrl: '' 
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, `rooms/${roomName}/characters/${playerName}`), s => s.val() && setStats(s.val()));
    return () => unsubscribe();
  }, [roomName, playerName]);

  const handleChange = (f, v) => { 
      const newStats = {...stats, [f]: v};
      setStats(newStats); 
      update(ref(database, `rooms/${roomName}/characters/${playerName}`), newStats); 
  };

  return (
    <div className="w-full border border-[#d4af37] mb-6 shadow-lg transition-all bg-[#1a1a1a]/90 backdrop-blur-sm relative z-10">
      <div onClick={() => {setIsExpanded(!isExpanded); playSound('click');}} className="p-3 bg-black/80 flex items-center justify-between cursor-pointer border-b border-gray-800">
        <div className="flex items-center gap-3">
          {!isExpanded && stats.imageUrl && <img src={stats.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]" />}
          <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest">TU FICHA ({playerName})</span>
        </div>
        <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
      </div>
      
      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-2">
          <div className="flex justify-center mb-6">
             <div className="w-24 h-24 rounded-full border-2 border-[#d4af37] bg-black overflow-hidden">{stats.imageUrl ? <img src={stats.imageUrl} className="w-full h-full object-cover" alt="Avatar"/> : <div className="w-full h-full flex items-center justify-center text-[#d4af37] opacity-20 text-4xl">?</div>}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="col-span-2 border border-gray-700 p-1 bg-black">
                <label className="text-[9px] text-gray-500 uppercase block text-center mb-1">Ruina (Inicial / Actual)</label>
                <div className="flex items-center gap-1">
                    <input type="number" min="1" max="6" value={stats.ruinInitial || 1} onChange={e=>handleChange('ruinInitial',+e.target.value)} className="w-full bg-[#111] text-gray-400 text-center font-bold outline-none border-r border-gray-800"/>
                    <span className="text-gray-600">/</span>
                    <input type="number" min="1" max="6" value={stats.ruin} onChange={e=>handleChange('ruin',+e.target.value)} className={`w-full bg-[#111] text-center font-bold outline-none ${stats.ruin>=5 ? 'text-red-500 animate-pulse' : 'text-white'}`}/>
                </div>
            </div>
            <div className="border border-gray-700 p-1 bg-black">
                <label className="text-[9px] text-[#f9e29c] uppercase block text-center mb-1">Oro</label>
                <input type="number" value={stats.gold} onChange={e=>handleChange('gold',+e.target.value)} className="w-full bg-transparent text-[#d4af37] text-center font-bold outline-none"/>
            </div>
             <div className="border border-gray-700 p-1 bg-black">
                <label className="text-[9px] text-red-400 uppercase block text-center mb-1">Deuda</label>
                <input type="number" value={stats.debt || 0} onChange={e=>handleChange('debt',+e.target.value)} className="w-full bg-transparent text-red-400 text-center font-bold outline-none"/>
            </div>
          </div>
          <div className="mb-4 border border-[#d4af37]/50 p-2 bg-[#d4af37]/5">
             <div className="flex justify-between items-center">
                 <label className="text-xs text-[#d4af37] uppercase font-bold">Contadores Exploración</label>
                 <input type="number" value={stats.tokens || 0} onChange={e=>handleChange('tokens',+e.target.value)} className="w-16 bg-black border border-[#d4af37] text-[#d4af37] font-bold text-center p-1"/>
             </div>
          </div>
          <div className="space-y-2 mb-4">
              <input type="text" value={stats.occupation} onChange={e=>handleChange('occupation',e.target.value)} placeholder="Ocupación" className="w-full bg-black text-white text-sm border border-gray-800 p-2 placeholder-gray-600"/>
              <input type="text" value={stats.background} onChange={e=>handleChange('background',e.target.value)} placeholder="Trasfondo" className="w-full bg-black text-white text-sm border border-gray-800 p-2 placeholder-gray-600"/>
              <input type="text" value={stats.drive} onChange={e=>handleChange('drive',e.target.value)} placeholder="Motivación" className="w-full bg-black text-white text-sm border border-gray-800 p-2 placeholder-gray-600"/>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Habilidades (4)</label>
                  <textarea rows="4" value={stats.skills} onChange={e=>handleChange('skills',e.target.value)} className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-1 resize-none leading-5" placeholder={"1.\n2.\n3.\n4."}/>
              </div>
              <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Rituales (3)</label>
                  <textarea rows="4" value={stats.rituals} onChange={e=>handleChange('rituals',e.target.value)} className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-1 resize-none leading-5" placeholder={"1.\n2.\n3."}/>
              </div>
          </div>
          <div className="space-y-3">
             <div>
                 <label className="text-[10px] text-gray-500 uppercase block mb-1">Equipo en la Mochila (6)</label>
                 <textarea rows="6" value={stats.backpack} onChange={e=>handleChange('backpack',e.target.value)} placeholder={"1.\n2.\n..."} className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-2 resize-none"/>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Armas (5)</label>
                    <textarea rows="5" value={stats.weapons} onChange={e=>handleChange('weapons',e.target.value)} className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-1 resize-none"/>
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Armaduras (5)</label>
                    <textarea rows="5" value={stats.armor} onChange={e=>handleChange('armor',e.target.value)} className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-1 resize-none"/>
                </div>
             </div>
             <div>
                 <label className="text-[10px] text-[#d4af37] uppercase block mb-1">Equipo Encontrado</label>
                 <textarea rows="3" value={stats.foundGear} onChange={e=>handleChange('foundGear',e.target.value)} className="w-full bg-black text-[#f9e29c] text-xs border border-[#d4af37] p-2 resize-none"/>
             </div>
             <div>
                 <label className="text-[10px] text-red-500 uppercase block mb-1">Condiciones (Heridas)</label>
                 <textarea value={stats.conditions} onChange={e=>handleChange('conditions',e.target.value)} placeholder="Sin traumas..." className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-2 h-16"/>
             </div>
             <input type="text" value={stats.imageUrl||''} onChange={e=>handleChange('imageUrl',e.target.value)} placeholder="URL Imagen (Retrato)" className="w-full bg-black text-gray-600 text-xs border border-gray-800 p-2"/>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE VISTA GRUPO ---
const PartyView = ({ roomName, currentPlayerName }) => {
  const [party, setParty] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  useEffect(() => {
    if(!roomName)return;
    return onValue(ref(database, `rooms/${roomName}/characters`), s => s.val() && setParty(s.val()));
  }, [roomName]);
  
  const toggle = (n) => { setExpandedCards(p => ({...p, [n]: !p[n]})); playSound('click'); };
  const players = Object.entries(party).filter(([n]) => n !== currentPlayerName);
  
  if(players.length===0) return null;

  return (
    <div className="w-full mt-8 border-t border-gray-900 pt-8 relative z-10">
      <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] text-center mb-6">El Resto del Grupo</h3>
      <div className="space-y-3">
        {players.map(([n, s]) => (
          <div key={n} className="border border-gray-800 bg-[#0a0a0a]/90 backdrop-blur-sm">
             <div onClick={()=>toggle(n)} className="flex justify-between p-3 cursor-pointer hover:bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-black border border-gray-700 overflow-hidden">{s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover" alt={n}/> : null}</div>
                   <div>
                       <span className="text-[#d4af37] font-bold text-sm uppercase block">{n}</span>
                       <div className="flex gap-2 text-[9px] uppercase text-gray-500">
                           <span className={s.ruin>=5?'text-red-500 font-bold':''}>R: {s.ruin}/{s.ruinInitial||1}</span>
                           <span className="text-[#f9e29c]">O: {s.gold}</span>
                           <span className="text-red-400">D: {s.debt||0}</span>
                           <span className="text-[#d4af37]">C: {s.tokens||0}</span>
                       </div>
                   </div>
                </div>
                <span className="text-gray-600">{expandedCards[n] ? '▲' : '▼'}</span>
             </div>
             {expandedCards[n] && (
               <div className="p-3 bg-black/50 border-t border-gray-900 text-xs">
                  {/* ... Mismo contenido que arriba pero readonly ... */}
                  <div className="grid grid-cols-2 gap-4 mb-2">
                      <div><span className="text-gray-600 block text-[9px]">Ocupación</span><p className="text-gray-300">{s.occupation || '-'}</p></div>
                      <div><span className="text-gray-600 block text-[9px]">Motivación</span><p className="text-gray-300">{s.drive || '-'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                     <div className="border border-gray-800 p-2"><span className="text-gray-600 block text-[9px] uppercase mb-1">Habilidades</span><pre className="text-gray-400 font-serif whitespace-pre-wrap">{s.skills}</pre></div>
                     <div className="border border-gray-800 p-2"><span className="text-gray-600 block text-[9px] uppercase mb-1">Rituales</span><pre className="text-gray-400 font-serif whitespace-pre-wrap">{s.rituals}</pre></div>
                  </div>
                  <div className="mb-2 border border-gray-800 p-2"><span className="text-gray-600 block text-[9px] uppercase mb-1">Mochila</span><pre className="text-gray-400 font-serif whitespace-pre-wrap">{s.backpack}</pre></div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="border border-gray-800 p-2"><span className="text-gray-600 block text-[9px] uppercase mb-1">Armas</span><pre className="text-gray-400 font-serif whitespace-pre-wrap">{s.weapons}</pre></div>
                      <div className="border border-gray-800 p-2"><span className="text-gray-600 block text-[9px] uppercase mb-1">Armadura</span><pre className="text-gray-400 font-serif whitespace-pre-wrap">{s.armor}</pre></div>
                  </div>
                  {s.foundGear && (<div className="mb-2 border border-[#d4af37]/30 p-2"><span className="text-[#d4af37] block text-[9px] uppercase mb-1">Equipo Encontrado</span><pre className="text-[#f9e29c] font-serif whitespace-pre-wrap">{s.foundGear}</pre></div>)}
                  <div className="border border-red-900/30 p-2"><span className="text-red-500 block text-[9px] uppercase mb-1">Condiciones</span><p className={s.conditions?'text-red-400':'text-green-500'}>{s.conditions||'Sano'}</p></div>
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MODAL DE REGLAS ---
const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#d4af37] max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-[0_0_30px_rgba(212,175,55,0.2)] relative">
        <div className="sticky top-0 bg-[#d4af37] text-black p-3 flex justify-between items-center font-bold uppercase tracking-widest z-10">
          <span>Grimorio de Reglas</span>
          <button onClick={onClose} className="text-xl hover:text-white px-2">×</button>
        </div>
        <div className="p-6 space-y-8 text-gray-300 font-serif text-sm">
          {/* Contenido reglas igual que antes... */}
          <section><h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">Tirada de Riesgo</h3><ul className="space-y-2"><li className="flex gap-2"><span className="text-[#d4af37] font-bold">6:</span> <span>Éxito.</span></li><li className="flex gap-2"><span className="text-[#f9e29c] font-bold">4-5:</span> <span>Con coste.</span></li><li className="flex gap-2"><span className="text-gray-500 font-bold">1-3:</span> <span>Fallo.</span></li></ul><div className="mt-3 bg-red-900/20 border border-red-900/50 p-2 text-xs"><strong className="text-red-500">RUINA:</strong> Si dado Oscuro es alto, +1 Ruina.</div></section>
          <section><h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">Exploración</h3><ul className="space-y-2"><li className="flex gap-2"><span className="text-[#d4af37] font-bold">Cada 6:</span> <span>1 Contador.</span></li></ul></section>
          <section><h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">Combate</h3><p className="mb-2 italic text-xs">Suma 2 dados altos.</p><div className="grid grid-cols-2 gap-4 text-center mt-2"><div className="border border-gray-700 p-2"><div className="text-[#d4af37] font-bold text-lg">&ge; 10</div><div className="text-[10px] uppercase">Brutal</div></div><div className="border border-gray-700 p-2"><div className="text-[#f9e29c] font-bold text-lg">7-9</div><div className="text-[10px] uppercase">Exitoso</div></div></div></section>
          <section><h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">Ayudar</h3><p className="italic text-xs">1 dado claro.</p></section>
        </div>
        <div className="p-4 border-t border-gray-800 bg-black text-center"><button onClick={onClose} className="text-[#d4af37] hover:underline text-xs uppercase tracking-widest">Cerrar</button></div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [rollType, setRollType] = useState('risk');
  const [showRules, setShowRules] = useState(false);
  
  // REFERENCIA MOTOR 3D
  const [diceBoxInstance, setDiceBoxInstance] = useState(null);
  const isInitialLoad = useRef(true);

  // 1. INICIALIZAR DADOS 3D
  useEffect(() => {
    if (diceBoxInstance) return;
    const box = new DiceBox("#dice-box", {
      assetPath: '/assets/', // IMPORTANTE: carpeta public/assets/
      theme: 'default',
      scale: 6,
      gravity: 3,
      mass: 5,
      friction: 0.8
    });
    box.init().then(() => setDiceBoxInstance(box));
  }, []);

  // 2. CONFIGURACIÓN
  useEffect(() => {
    document.title = "Trophy (g)Old";
    const p = new URLSearchParams(window.location.search);
    if (p.get('sala')) setRoomName(p.get('sala'));
    if (p.get('partida')) setRoomName(p.get('partida'));
  }, []);

  useEffect(() => {
    if (!isJoined || !roomName) return;
    const unsubscribe = onValue(query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20)), s => {
      if(s.val()) setHistory(Object.values(s.val()).sort((a,b)=>b.id-a.id));
      else setHistory([]);
    });
    return () => unsubscribe();
  }, [isJoined, roomName]);

  // 3. EFECTO SONIDO AL RECIBIR DATOS
  useEffect(() => {
    if (history.length > 0) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      } else {
        const latestRoll = history[0];
        // Retrasamos el sonido del resultado para que coincida con el fin de la animación 3D
        setTimeout(() => {
            if (latestRoll.analysis.soundType) playSound(latestRoll.analysis.soundType);
            else playSound('click');
        }, 1500);
      }
    }
  }, [history]);

  const handleJoin = () => { if(roomName && playerName) { setIsJoined(true); playSound('click'); window.history.pushState({},'',`?partida=${roomName}`); } };
  const handleExit = () => { setIsJoined(false); window.history.pushState({}, '', window.location.pathname); };
  const handleClear = () => { if (window.confirm("¿Deseas purgar el historial?")) remove(ref(database, `rooms/${roomName}/rolls`)); };
  const updateDiceCount = (setter, c, ch) => { const v = c+ch; if(v>=0 && v<=10) { setter(v); playSound('click'); } };

  // --- TIRAR DADOS 3D ---
  const handleRoll = async () => {
    if (!diceBoxInstance) { alert("Cargando dados 3D..."); return; }
    
    // Preparar dados para 3D
    const diceToRoll = [];
    
    if (rollType === 'help') {
        diceToRoll.push({ sides: 6, qty: 1, themeColor: '#000000', theme: '#d4af37' });
    } else {
        if (rollType !== 'combat' && lightCount > 0) {
            diceToRoll.push({ sides: 6, qty: lightCount, themeColor: '#000000', theme: '#d4af37' });
        }
        if (rollType !== 'hunt' && darkCount > 0) {
            diceToRoll.push({ sides: 6, qty: darkCount, themeColor: '#d4af37', theme: '#1a1a1a' });
        }
    }

    if (diceToRoll.length === 0) return;

    // Limpiar y lanzar
    diceBoxInstance.clear();
    const result3D = await diceBoxInstance.roll(diceToRoll);

    // Mapear resultado 3D a nuestro formato
    const newDice = result3D.map(d => ({
        type: d.theme === '#d4af37' ? 'light' : 'dark',
        value: d.value,
        id: Math.random()
    }));

    const analysis = analyzeResult(newDice, rollType);
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: newDice, analysis, player: playerName, rollType,
      timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    });
  };

  const handlePush = async (originalRoll) => {
    if (!diceBoxInstance) return;
    diceBoxInstance.clear();
    
    // Lanzar 1 dado oscuro 3D
    const result3D = await diceBoxInstance.roll([{ sides: 6, qty: 1, themeColor: '#d4af37', theme: '#1a1a1a' }]);
    
    const newDarkDie = { type: 'dark', value: result3D[0].value, id: Math.random() };
    const updatedDice = [...originalRoll.dice, newDarkDie];
    const analysis = analyzeResult(updatedDice, originalRoll.rollType || 'risk'); 
    
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: updatedDice, analysis, player: playerName, isPush: true, rollType: originalRoll.rollType,
      timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    });
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-serif relative overflow-hidden">
      
      {/* 3D DICE CANVAS (FONDO, PERO VISIBLE) */}
      <div id="dice-box" className="fixed inset-0 w-full h-full z-0 pointer-events-none"></div>

      {/* HEADER */}
      <header className="w-full bg-[#1a1a1a]/90 backdrop-blur border-b border-[#d4af37] text-center text-[#d4af37] text-xs py-1 font-bold uppercase tracking-[0.2em] select-none relative z-20">
          Trophy (g)Old
      </header>

      {/* LOGIN */}
      {!isJoined ? (
        <div className="flex-grow flex items-center justify-center p-4 relative z-10">
          <div className="bg-[#1a1a1a]/95 backdrop-blur p-8 max-w-sm w-full text-center border border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <h1 className="text-3xl font-bold text-[#d4af37] uppercase tracking-[0.2em]">Trophy (g)Old</h1>
            <p className="text-[10px] text-gray-600 mb-6 italic tracking-widest">(by Viejo)</p>
            <div className="space-y-4">
              <input type="text" placeholder="NOMBRE DE PARTIDA" value={roomName} onChange={e=>setRoomName(e.target.value)} className="w-full bg-black text-white p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none"/>
              <input type="text" placeholder="TU NOMBRE" value={playerName} onChange={e=>setPlayerName(e.target.value)} className="w-full bg-black text-[#f9e29c] p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none font-bold"/>
            </div>
            <button onClick={handleJoin} className="w-full mt-8 bg-[#d4af37] hover:bg-[#f9e29c] text-black font-bold py-3 tracking-widest">ENTRAR</button>
          </div>
        </div>
      ) : (
        /* MESA DE JUEGO */
        <main className="flex-grow flex flex-col items-center p-4 relative z-10">
            {/* SUB-HEADER */}
            <div className="w-full max-w-5xl flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2 bg-black/40 backdrop-blur-sm rounded px-2">
                <div onClick={()=>{navigator.clipboard.writeText(window.location.href);alert('Link Copiado')}} className="cursor-pointer group">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Partida</p>
                <h1 className="text-xl font-bold text-[#d4af37] truncate max-w-[200px]">{roomName}</h1>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => {playSound('click'); setShowRules(true)}} className="text-[10px] text-[#d4af37] hover:text-white uppercase font-bold border border-[#d4af37] px-2 py-1 hover:bg-[#d4af37] hover:text-black transition-colors">[ ? Reglas ]</button>
                    <button onClick={handleClear} className="text-[10px] text-gray-500 hover:text-red-500 uppercase cursor-pointer">[ Limpiar ]</button>
                    <button onClick={handleExit} className="text-[10px] text-gray-500 hover:text-white uppercase cursor-pointer">[ Salir ]</button>
                </div>
            </div>

            {/* GRID LAYOUT (Desktop 2 cols / Mobile 1 col) */}
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* COLUMNA 1: FICHA + GRUPO (En Desktop va a la derecha, en Mobile va 1º) */}
                <div className="lg:col-start-2 lg:row-start-1 w-full">
                    <CharacterSheet roomName={roomName} playerName={playerName} />
                </div>

                {/* COLUMNA 2: DADOS + HISTORIAL (En Desktop va a la izq, en Mobile va 2º) */}
                <div className="lg:col-start-1 lg:row-start-1 w-full">
                    <div className="bg-[#1a1a1a]/90 backdrop-blur p-1 border border-gray-800 mb-8 shadow-lg relative">
                        <div className="grid grid-cols-4 gap-1 bg-black p-1 mb-4">
                            <button onClick={() => {setRollType('risk'); playSound('click')}} className={`py-2 text-[9px] uppercase tracking-widest font-bold transition-all ${rollType === 'risk' ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-gray-300'}`}>Riesgo</button>
                            <button onClick={() => {setRollType('hunt'); playSound('click')}} className={`py-2 text-[9px] uppercase tracking-widest font-bold transition-all ${rollType === 'hunt' ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-gray-300'}`}>Explor.</button>
                            <button onClick={() => {setRollType('combat'); playSound('click')}} className={`py-2 text-[9px] uppercase tracking-widest font-bold transition-all ${rollType === 'combat' ? 'bg-red-900 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Combate</button>
                            <button onClick={() => {setRollType('help'); playSound('click')}} className={`py-2 text-[9px] uppercase tracking-widest font-bold transition-all ${rollType === 'help' ? 'bg-[#f9e29c] text-black' : 'text-gray-500 hover:text-gray-300'}`}>Ayudar</button>
                        </div>
                        <div className="px-5 pb-3">
                            {rollType !== 'help' && (
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {(rollType === 'risk' || rollType === 'hunt') && (
                                        <div>
                                            <label className="block text-[10px] text-[#d4af37] mb-1 uppercase tracking-widest text-center">Claros</label>
                                            <div className="flex items-center justify-between border border-[#d4af37] bg-black h-10">
                                                <button onClick={() => updateDiceCount(setLightCount, lightCount, -1)} className="w-8 h-full text-[#d4af37] text-xl font-bold hover:bg-[#d4af37] hover:text-black">-</button>
                                                <span className="text-[#d4af37] text-xl font-bold">{lightCount}</span>
                                                <button onClick={() => updateDiceCount(setLightCount, lightCount, 1)} className="w-8 h-full text-[#d4af37] text-xl font-bold hover:bg-[#d4af37] hover:text-black">+</button>
                                            </div>
                                        </div>
                                    )}
                                    {(rollType === 'risk' || rollType === 'combat') && (
                                        <div className={rollType === 'combat' ? 'col-span-2' : ''}> 
                                            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-widest text-center">Oscuros</label>
                                            <div className="flex items-center justify-between border border-gray-600 bg-black h-10">
                                                <button onClick={() => updateDiceCount(setDarkCount, darkCount, -1)} className="w-8 h-full text-gray-500 text-xl font-bold hover:bg-gray-700 hover:text-white">-</button>
                                                <span className="text-gray-400 text-xl font-bold">{darkCount}</span>
                                                <button onClick={() => updateDiceCount(setDarkCount, darkCount, 1)} className="w-8 h-full text-gray-500 text-xl font-bold hover:bg-gray-700 hover:text-white">+</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {rollType === 'help' && <div className="text-center text-gray-500 text-xs italic mb-4">Lanzarás 1 dado claro para ayudar.</div>}
                            <button onClick={handleRoll} className={`w-full font-bold py-3 text-lg uppercase tracking-[0.2em] shadow-lg transition-all ${rollType === 'combat' ? 'bg-red-900 hover:bg-red-700 text-white' : rollType === 'help' ? 'bg-[#f9e29c] hover:bg-white text-black' : 'bg-[#d4af37] hover:bg-[#f9e29c] text-black active:translate-y-1'}`}>
                            {rollType === 'combat' ? '¡ATACAR!' : rollType === 'hunt' ? 'EXPLORAR' : rollType === 'help' ? 'PRESTAR AYUDA' : 'TIRAR'}
                            </button>
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        {history.map((roll, index) => (
                        <div key={roll.id} className={`bg-[#1a1a1a]/90 backdrop-blur-sm p-4 border-l-4 shadow-md animate-in fade-in slide-in-from-top-2 ${roll.rollType === 'combat' ? 'border-red-900' : 'border-[#d4af37]'}`}>
                            <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-black">
                            <span className="text-[#f9e29c] font-bold text-sm uppercase tracking-wider">
                                {roll.player} 
                                <span className="text-[9px] text-gray-500 ml-2 border border-gray-800 px-1 rounded">
                                    {roll.rollType === 'combat' ? 'COMBATE' : roll.rollType === 'hunt' ? 'EXPLORACIÓN' : roll.rollType === 'help' ? 'AYUDA' : 'RIESGO'}
                                </span>
                                {roll.isPush && <span className="text-[9px] text-red-500 ml-2 animate-pulse">(PUSH)</span>}
                            </span>
                            <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
                            </div>
                            <div className="mb-3 flex flex-col">
                            <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>{roll.analysis.icon} {roll.analysis.label}</span>
                            {roll.analysis.isDarkHighest && (<span className="text-[10px] text-red-500 font-bold mt-1 bg-red-900/20 p-1 text-center border border-red-900/50">⚠️ ¡EL DADO OSCURO ES EL MÁS ALTO!</span>)}
                            </div>
                            <div className="flex flex-wrap gap-3">
                            {roll.dice.map((d) => (
                                <div key={d.id} className={`w-11 h-11 flex items-center justify-center text-xl font-bold shadow-sm ${d.type === 'light' ? 'bg-[#d4af37] text-black border-t-2 border-[#f9e29c]' : 'bg-black text-white border border-gray-700'}`}>{d.value}</div>
                            ))}
                            </div>
                            {index === 0 && roll.player === playerName && roll.rollType !== 'help' && (
                                <button onClick={() => handlePush(roll)} className="mt-4 w-full border border-gray-700 text-gray-400 hover:border-[#d4af37] hover:text-[#d4af37] text-[10px] uppercase transition-all py-2 tracking-widest">¿Tentar al destino? (+1 Dado Oscuro)</button>
                            )}
                        </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-start-2 w-full">
                    <PartyView roomName={roomName} currentPlayerName={playerName} />
                </div>

            </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#1a1a1a] border-t border-gray-900 text-center text-gray-600 text-[10px] py-1 font-mono uppercase select-none relative z-20">
          by Viejo · viejorpg@gmail.com · v.1.0
      </footer>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

export default App;