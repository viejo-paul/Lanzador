import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove, update } from "firebase/database";

// --- LÓGICA DE REGLAS TROPHY GOLD (ACTUALIZADA) ---
function analyzeResult(dice, rollType) {
  if (dice.length === 0) return { label: 'Sin dados', color: 'text-gray-500' };

  const highestValue = Math.max(...dice.map(d => d.value));
  const highestDice = dice.filter(d => d.value === highestValue);
  const isDarkHighest = highestDice.some(d => d.type === 'dark');
  
  let resultText = '';
  let resultColor = '';
  let icon = '';

  // --- MODO RIESGO ---
  if (rollType === 'risk') {
    if (highestValue === 6) {
      resultText = '¡ÉXITO COMPLETE!'; 
      resultColor = 'text-[#d4af37] font-bold';
      icon = '✨';
    } else if (highestValue >= 4) {
      resultText = 'ÉXITO PARCIAL (CON COSTE)';
      resultColor = 'text-[#f9e29c]';
      icon = '⚠️';
    } else {
      resultText = 'FALLO (LA SITUACIÓN EMPEORA)';
      resultColor = 'text-gray-400';
      icon = '💀';
    }
  } 
  
  // --- MODO CAZA (Contar 6s) ---
  else if (rollType === 'hunt') {
    const tokens = dice.filter(d => d.value === 6).length;
    if (tokens > 0) {
      resultText = `${tokens} FICHA${tokens > 1 ? 'S' : ''} DE CAZA OBTENIDA${tokens > 1 ? 'S' : ''}`;
      resultColor = 'text-[#d4af37] font-bold border border-[#d4af37] px-2 py-1 bg-[#d4af37]/10';
      icon = '💎';
    } else {
      resultText = 'SIN FICHAS DE CAZA';
      resultColor = 'text-gray-500';
      icon = '🍂';
    }
  }

  // --- MODO COMBATE (Suma 2 altos) ---
  else if (rollType === 'combat') {
    const sortedValues = dice.map(d => d.value).sort((a, b) => b - a);
    const attackTotal = (sortedValues[0] || 0) + (sortedValues[1] || 0);
    resultText = `DAÑO TOTAL: ${attackTotal}`;
    
    if (attackTotal >= 10) {
        resultColor = 'text-red-500 font-bold text-lg animate-pulse';
        icon = '⚔️';
    } else if (attackTotal >= 8) {
        resultColor = 'text-[#d4af37] font-bold';
        icon = '🗡️';
    } else {
        resultColor = 'text-gray-400';
        icon = '🛡️';
    }
  }

  return { label: resultText, color: resultColor, isDarkHighest, icon, rollType };
}

// --- COMPONENTE FICHA (Sin cambios, solo lo minimizo aquí para no ocupar espacio) ---
const CharacterSheet = ({ roomName, playerName }) => {
  const [stats, setStats] = useState({ ruin: 1, gold: 0, conditions: '', inventory: '', imageUrl: '' });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, `rooms/${roomName}/characters/${playerName}`), s => s.val() && setStats(s.val()));
    return () => unsubscribe();
  }, [roomName, playerName]);

  const handleChange = (f, v) => { setStats(p => ({...p, [f]: v})); update(ref(database, `rooms/${roomName}/characters/${playerName}`), {...stats, [f]: v}); };

  return (
    <div className="w-full max-w-md bg-[#1a1a1a] border border-[#d4af37] mb-6 shadow-lg transition-all">
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-3 bg-black flex items-center justify-between cursor-pointer border-b border-gray-800">
        <div className="flex items-center gap-3">
          {!isExpanded && stats.imageUrl && <img src={stats.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]" />}
          <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest">TU FICHA ({playerName})</span>
        </div>
        <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-2">
          <div className="flex justify-center mb-6">
             <div className="w-24 h-24 rounded-full border-2 border-[#d4af37] bg-black overflow-hidden">{stats.imageUrl ? <img src={stats.imageUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[#d4af37] opacity-20 text-4xl">?</div>}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Ruina</label><input type="number" value={stats.ruin} onChange={e=>handleChange('ruin',+e.target.value)} className={`w-full bg-black font-bold text-2xl text-center border p-2 ${stats.ruin>=5?'text-red-500 border-red-900 animate-pulse':'text-gray-300 border-gray-700'}`}/></div>
            <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Oro</label><input type="number" value={stats.gold} onChange={e=>handleChange('gold',+e.target.value)} className="w-full bg-black font-bold text-2xl text-center border border-gray-700 text-[#d4af37] p-2"/></div>
          </div>
          <div className="space-y-3">
             <textarea value={stats.conditions} onChange={e=>handleChange('conditions',e.target.value)} placeholder="Condiciones..." className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-2 h-16"/>
             <textarea value={stats.inventory} onChange={e=>handleChange('inventory',e.target.value)} placeholder="Inventario..." className="w-full bg-black text-gray-300 text-xs border border-gray-700 p-2 h-16"/>
             <input type="text" value={stats.imageUrl||''} onChange={e=>handleChange('imageUrl',e.target.value)} placeholder="URL Imagen" className="w-full bg-black text-gray-600 text-xs border border-gray-800 p-2"/>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE VISTA GRUPO (Minimizado) ---
const PartyView = ({ roomName, currentPlayerName }) => {
  const [party, setParty] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  useEffect(() => {
    if(!roomName)return;
    return onValue(ref(database, `rooms/${roomName}/characters`), s => s.val() && setParty(s.val()));
  }, [roomName]);
  const toggle = (n) => setExpandedCards(p => ({...p, [n]: !p[n]}));
  const players = Object.entries(party).filter(([n]) => n !== currentPlayerName);
  if(players.length===0) return null;
  return (
    <div className="w-full max-w-md mt-8 border-t border-gray-900 pt-8">
      <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] text-center mb-6">El Resto del Grupo</h3>
      <div className="space-y-3">
        {players.map(([n, s]) => (
          <div key={n} className="border border-gray-800 bg-[#0a0a0a]">
             <div onClick={()=>toggle(n)} className="flex justify-between p-3 cursor-pointer hover:bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-black border border-gray-700 overflow-hidden">{s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover"/> : null}</div>
                   <div><span className="text-[#d4af37] font-bold text-sm uppercase block">{n}</span><span className={`text-[10px] uppercase ${s.ruin>=5?'text-red-500':'text-gray-500'}`}>Ruina: {s.ruin}/6</span></div>
                </div>
             </div>
             {expandedCards[n] && <div className="p-3 bg-black border-t border-gray-900 text-xs text-gray-400 grid grid-cols-2 gap-4">
                <p className={s.conditions?'text-red-400':'text-green-500'}>{s.conditions||'Sano'}</p>
                <p className="text-[#f9e29c]">Oro: {s.gold}</p>
             </div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE: MODAL DE REGLAS (EL GRIMORIO) ---
const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#d4af37] max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-[0_0_30px_rgba(212,175,55,0.2)] relative">
        
        {/* Cabecera */}
        <div className="sticky top-0 bg-[#d4af37] text-black p-3 flex justify-between items-center font-bold uppercase tracking-widest z-10">
          <span>Grimorio de Reglas</span>
          <button onClick={onClose} className="text-xl hover:text-white px-2">×</button>
        </div>

        <div className="p-6 space-y-8 text-gray-300 font-serif text-sm">
          
          {/* SECCIÓN RIESGO */}
          <section>
            <h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">
              Tirada de Riesgo
            </h3>
            <p className="mb-2 italic text-xs">Para acciones arriesgadas o inciertas.</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-[#d4af37] font-bold">6:</span> 
                <span>Éxito. Tomas el control.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#f9e29c] font-bold">4-5:</span> 
                <span>Éxito con coste. El GM ofrece un compromiso.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-500 font-bold">1-3:</span> 
                <span>Fallo. La situación empeora.</span>
              </li>
            </ul>
            <div className="mt-3 bg-red-900/20 border border-red-900/50 p-2 text-xs">
              <strong className="text-red-500">RUINA:</strong> Si tu dado más alto es Oscuro, sube tu Ruina en 1 (independientemente del éxito).
            </div>
          </section>

          {/* SECCIÓN CAZA */}
          <section>
            <h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">
              Tirada de Caza
            </h3>
            <p className="mb-2 italic text-xs">Para buscar tesoros o el camino.</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-[#d4af37] font-bold">Cada 6:</span> 
                <span>Obtienes 1 Ficha (Token).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-500 font-bold">1-5:</span> 
                <span>Nada ocurre (pero puedes sufrir Ruina si usaste dados oscuros).</span>
              </li>
            </ul>
          </section>

          {/* SECCIÓN COMBATE */}
          <section>
            <h3 className="text-[#d4af37] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-3">
              Tirada de Combate
            </h3>
            <p className="mb-2 italic text-xs">Atacar monstruos. Suma los 2 dados más altos.</p>
            <div className="grid grid-cols-2 gap-4 text-center mt-2">
                <div className="border border-gray-700 p-2">
                    <div className="text-[#d4af37] font-bold text-lg">Total &ge; 10</div>
                    <div className="text-[10px] uppercase">Golpe Brutal</div>
                    <div className="text-xs text-gray-400 mt-1">El monstruo muere o cede.</div>
                </div>
                <div className="border border-gray-700 p-2">
                    <div className="text-[#f9e29c] font-bold text-lg">Total 7-9</div>
                    <div className="text-[10px] uppercase">Golpe Exitoso</div>
                    <div className="text-xs text-gray-400 mt-1">Haces daño, pero el monstruo contraataca.</div>
                </div>
            </div>
            <div className="mt-2 text-center border border-gray-700 p-2 opacity-70">
                 <div className="text-gray-400 font-bold">Total &le; 6</div>
                 <div className="text-[10px] uppercase">Fallo</div>
                 <div className="text-xs text-gray-500 mt-1">Sufres daño o ruina.</div>
            </div>
          </section>

        </div>
        
        <div className="p-4 border-t border-gray-800 bg-black text-center">
            <button onClick={onClose} className="text-[#d4af37] hover:underline text-xs uppercase tracking-widest">Cerrar Grimorio</button>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  // ... otros estados
  const [showRules, setShowRules] = useState(false); // <--- NUEVO
  // ...
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]);
  
  // NUEVO ESTADO: TIPO DE TIRADA
  const [rollType, setRollType] = useState('risk'); // 'risk', 'hunt', 'combat'

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('sala')) setRoomName(p.get('sala'));
  }, []);

  useEffect(() => {
    if (!isJoined || !roomName) return;
    const unsubscribe = onValue(query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20)), s => {
      if(s.val()) setHistory(Object.values(s.val()).sort((a,b)=>b.id-a.id));
      else setHistory([]);
    });
    return () => unsubscribe();
  }, [isJoined, roomName]);

  const handleJoin = () => { if(roomName && playerName) { setIsJoined(true); window.history.pushState({},'',`?sala=${roomName}`); } };
  const updateDiceCount = (setter, c, ch) => { const v = c+ch; if(v>=0 && v<=10) setter(v); };

  // --- TIRAR DADOS ---
  const handleRoll = () => {
    const newDice = [];
    for (let i=0; i<lightCount; i++) newDice.push({ type: 'light', value: Math.ceil(Math.random()*6), id: Math.random() });
    for (let i=0; i<darkCount; i++) newDice.push({ type: 'dark', value: Math.ceil(Math.random()*6), id: Math.random() });
    if (newDice.length === 0) return;

    // Aquí pasamos el tipo de tirada actual
    const analysis = analyzeResult(newDice, rollType);
    
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: newDice, analysis, player: playerName, rollType, // Guardamos qué tipo fue
      timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    });
  };

  const handlePush = (originalRoll) => {
    const currentDice = [...originalRoll.dice];
    const newDarkDie = { type: 'dark', value: Math.ceil(Math.random()*6), id: Math.random() };
    const updatedDice = [...currentDice, newDarkDie];
    // Al hacer push, mantenemos el tipo de tirada original
    const analysis = analyzeResult(updatedDice, originalRoll.rollType || 'risk'); 
    
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: updatedDice, analysis, player: playerName, isPush: true, rollType: originalRoll.rollType,
      timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    });
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-serif text-white">
        <div className="bg-[#1a1a1a] p-8 max-w-sm w-full text-center border border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]">
          <h1 className="text-3xl font-bold mb-6 text-[#d4af37] uppercase tracking-[0.2em]">Trophy Roller</h1>
          <div className="space-y-4">
            <input type="text" placeholder="MESA" value={roomName} onChange={e=>setRoomName(e.target.value)} className="w-full bg-black text-white p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none"/>
            <input type="text" placeholder="NOMBRE" value={playerName} onChange={e=>setPlayerName(e.target.value)} className="w-full bg-black text-[#f9e29c] p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none font-bold"/>
          </div>
          <button onClick={handleJoin} className="w-full mt-8 bg-[#d4af37] hover:bg-[#f9e29c] text-black font-bold py-3 tracking-widest">ENTRAR</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center font-serif pb-20">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2">
        <div onClick={()=>{navigator.clipboard.writeText(window.location.href);alert('Link Copiado')}} className="cursor-pointer group">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sala</p>
          <h1 className="text-xl font-bold text-[#d4af37] truncate max-w-[200px]">{roomName}</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={() => setShowRules(true)} className="text-[10px] text-[#d4af37] hover:text-white uppercase font-bold border border-[#d4af37] px-2 py-1 hover:bg-[#d4af37] hover:text-black transition-colors">
            [ ? Reglas ]</button>
            <button onClick={handleClear} ... >...</button>
            <button onClick={handleExit} ... >...</button>
            <button onClick={()=>window.confirm('¿Borrar historial?') && remove(ref(database, `rooms/${roomName}/rolls`))} className="text-[10px] text-gray-500 hover:text-red-500 uppercase">[ Limpiar ]</button>
            <button onClick={()=>{setIsJoined(false);window.history.pushState({},'',window.location.pathname)}} className="text-[10px] text-gray-500 hover:text-white uppercase">[ Salir ]</button>
        </div>
      </div>

      <CharacterSheet roomName={roomName} playerName={playerName} />

      {/* --- PANEL DE DADOS MEJORADO --- */}
      <div className="bg-[#1a1a1a] p-1 w-full max-w-md border border-gray-800 mb-8 shadow-lg relative">
        
        {/* PESTAÑAS DE TIPO DE TIRADA */}
        <div className="grid grid-cols-3 gap-1 bg-black p-1 mb-4">
            <button 
                onClick={() => setRollType('risk')} 
                className={`py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${rollType === 'risk' ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Riesgo
            </button>
            <button 
                onClick={() => setRollType('hunt')} 
                className={`py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${rollType === 'hunt' ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Caza
            </button>
            <button 
                onClick={() => setRollType('combat')} 
                className={`py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${rollType === 'combat' ? 'bg-red-900 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Combate
            </button>
        </div>

        <div className="px-5 pb-5">
            <div className="flex flex-col gap-5">
            {/* Dados Claros */}
            <div>
                <label className="block text-xs text-[#d4af37] mb-1 uppercase tracking-widest text-center">Dados Claros</label>
                <div className="flex items-center justify-between border border-[#d4af37] bg-black h-14">
                <button onClick={() => updateDiceCount(setLightCount, lightCount, -1)} className="w-16 h-full text-[#d4af37] text-3xl font-bold hover:bg-[#d4af37] hover:text-black transition-all">-</button>
                <span className="text-[#d4af37] text-3xl font-bold">{lightCount}</span>
                <button onClick={() => updateDiceCount(setLightCount, lightCount, 1)} className="w-16 h-full text-[#d4af37] text-3xl font-bold hover:bg-[#d4af37] hover:text-black transition-all">+</button>
                </div>
            </div>
            {/* Dados Oscuros */}
            <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest text-center">Dados Oscuros</label>
                <div className="flex items-center justify-between border border-gray-600 bg-black h-14">
                <button onClick={() => updateDiceCount(setDarkCount, darkCount, -1)} className="w-16 h-full text-gray-500 text-3xl font-bold hover:bg-gray-700 hover:text-white transition-all">-</button>
                <span className="text-gray-400 text-3xl font-bold">{darkCount}</span>
                <button onClick={() => updateDiceCount(setDarkCount, darkCount, 1)} className="w-16 h-full text-gray-500 text-3xl font-bold hover:bg-gray-700 hover:text-white transition-all">+</button>
                </div>
            </div>
            </div>

            <button onClick={handleRoll} className={`w-full mt-8 font-bold py-4 text-xl uppercase tracking-[0.3em] shadow-lg transition-all 
                ${rollType === 'combat' ? 'bg-red-900 hover:bg-red-700 text-white' : 'bg-[#d4af37] hover:bg-[#f9e29c] text-black active:translate-y-1'}`}>
            {rollType === 'combat' ? '¡ATACAR!' : rollType === 'hunt' ? 'BUSCAR' : 'TIRAR'}
            </button>
        </div>
      </div>

      {/* Historial */}
      <div className="w-full max-w-md space-y-4">
        {history.map((roll, index) => (
          <div key={roll.id} className={`bg-[#1a1a1a] p-4 border-l-4 shadow-md animate-in fade-in slide-in-from-top-2 
                ${roll.rollType === 'combat' ? 'border-red-900' : 'border-[#d4af37]'}`}>
            
            <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-black">
              <span className="text-[#f9e29c] font-bold text-sm uppercase tracking-wider">
                {roll.player} 
                <span className="text-[9px] text-gray-500 ml-2 border border-gray-800 px-1 rounded">
                    {roll.rollType === 'combat' ? 'COMBATE' : roll.rollType === 'hunt' ? 'CAZA' : 'RIESGO'}
                </span>
                {roll.isPush && <span className="text-[9px] text-red-500 ml-2 animate-pulse">(PUSH)</span>}
              </span>
              <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
            </div>

            <div className="mb-3 flex flex-col">
               <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>
                {roll.analysis.icon} {roll.analysis.label}
               </span>
               {roll.analysis.isDarkHighest && (
                 <span className="text-[10px] text-red-500 font-bold mt-1 bg-red-900/20 p-1 text-center border border-red-900/50">
                    ⚠️ ¡EL DADO OSCURO ES EL MÁS ALTO!
                 </span>
               )}
            </div>

            <div className="flex flex-wrap gap-3">
              {roll.dice.map((d) => (
                <div key={d.id} className={`w-11 h-11 flex items-center justify-center text-xl font-bold shadow-sm ${d.type === 'light' ? 'bg-[#d4af37] text-black border-t-2 border-[#f9e29c]' : 'bg-black text-white border border-gray-700'}`}>
                  {d.value}
                </div>
              ))}
            </div>

            {/* Solo permitir PUSH si es mi tirada, es la última y NO es una tirada de Caza exitosa (opcional, pero en Hunt no suele haber push si ya hay éxito) */}
            {index === 0 && roll.player === playerName && (
                <button onClick={() => handlePush(roll)} className="mt-4 w-full border border-gray-700 text-gray-400 hover:border-[#d4af37] hover:text-[#d4af37] text-[10px] uppercase transition-all py-2 tracking-widest">
                    ¿Tentar al destino? (+1 Dado Oscuro)
                </button>
            )}
          </div>
        ))}
      </div>

      <PartyView roomName={roomName} currentPlayerName={playerName} />
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div> // Cierre del div principal
    </div>
  );
}

export default App;