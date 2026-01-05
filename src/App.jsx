import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove, update } from "firebase/database";

// --- UTILIDAD: Analizar resultado de dados ---
function analyzeResult(dice) {
  if (dice.length === 0) return { label: 'Sin dados', color: 'text-gray-500' };
  const highestValue = Math.max(...dice.map(d => d.value));
  const highestDice = dice.filter(d => d.value === highestValue);
  const isDarkHighest = highestDice.some(d => d.type === 'dark');

  let resultText = '';
  let resultColor = '';

  if (highestValue === 6) {
    resultText = '¡ÉXITO!'; 
    resultColor = 'text-[#d4af37] font-bold';
  } else if (highestValue >= 4) {
    resultText = 'ÉXITO PARCIAL';
    resultColor = 'text-[#f9e29c]';
  } else {
    resultText = 'FALLO';
    resultColor = 'text-gray-400';
  }

  if (isDarkHighest) {
    resultText += ' + ¡POSIBLE RUINA!';
    resultColor = 'text-white border-b-2 border-red-900'; 
  }
  return { label: resultText, color: resultColor, isDarkHighest };
}

// --- COMPONENTE 1: FICHA DE PERSONAJE EDITABLE (Tuya) ---
const CharacterSheet = ({ roomName, playerName }) => {
  const [stats, setStats] = useState({ ruin: 1, gold: 0, conditions: '', inventory: '', imageUrl: '' });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const charRef = ref(database, `rooms/${roomName}/characters/${playerName}`);
    const unsubscribe = onValue(charRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStats(data);
    });
    return () => unsubscribe();
  }, [roomName, playerName]);

  const handleChange = (field, value) => {
    const newStats = { ...stats, [field]: value };
    setStats(newStats);
    update(ref(database, `rooms/${roomName}/characters/${playerName}`), newStats);
  };

  return (
    <div className="w-full max-w-md bg-[#1a1a1a] border border-[#d4af37] mb-6 shadow-lg transition-all">
      {/* Cabecera Clickeable */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-black flex items-center justify-between cursor-pointer border-b border-gray-800"
      >
        <div className="flex items-center gap-3">
          {/* Miniatura de avatar si está colapsado */}
          {!isExpanded && stats.imageUrl && (
            <img src={stats.imageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]" />
          )}
          <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest">TU FICHA ({playerName})</span>
        </div>
        <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Contenido Plegable */}
      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
          
          {/* AVATAR GRANDE */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full border-2 border-[#d4af37] bg-black overflow-hidden relative shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              {stats.imageUrl ? (
                <img src={stats.imageUrl} alt="Personaje" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#d4af37] text-4xl opacity-20 font-serif">?</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ruina actual</label>
              <input 
                type="number" min="1" max="6"
                value={stats.ruin}
                onChange={(e) => handleChange('ruin', parseInt(e.target.value))}
                className={`w-full bg-black font-bold text-2xl text-center border focus:border-red-500 outline-none p-2 ${stats.ruin >= 5 ? 'text-red-500 animate-pulse border-red-900' : 'text-gray-300 border-gray-700'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Oro</label>
              <input 
                type="number" min="0"
                value={stats.gold}
                onChange={(e) => handleChange('gold', parseInt(e.target.value))}
                className="w-full bg-black text-[#d4af37] font-bold text-2xl text-center border border-gray-700 focus:border-[#d4af37] outline-none p-2"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Condiciones</label>
              <textarea 
                value={stats.conditions}
                onChange={(e) => handleChange('conditions', e.target.value)}
                placeholder="Sin traumas..."
                className="w-full bg-black text-gray-300 text-sm border border-gray-700 p-2 outline-none focus:border-red-900 h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Equipo</label>
              <textarea 
                value={stats.inventory}
                onChange={(e) => handleChange('inventory', e.target.value)}
                placeholder="Equipo..."
                className="w-full bg-black text-gray-300 text-sm border border-gray-700 p-2 outline-none focus:border-[#d4af37] h-16 resize-none"
              />
            </div>
            {/* INPUT DE URL DE IMAGEN */}
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">URL Imagen (Retrato)</label>
              <input 
                type="text"
                value={stats.imageUrl || ''}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://imgur.com/..."
                className="w-full bg-black text-gray-500 text-xs border border-gray-800 p-2 outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE 2: VISTA DE GRUPO (Otros Jugadores) ---
const PartyView = ({ roomName, currentPlayerName }) => {
  const [party, setParty] = useState({});
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    if (!roomName) return;
    const unsubscribe = onValue(ref(database, `rooms/${roomName}/characters`), (snapshot) => {
      const data = snapshot.val();
      if (data) setParty(data);
    });
    return () => unsubscribe();
  }, [roomName]);

  const toggleCard = (name) => {
    setExpandedCards(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const players = Object.entries(party).filter(([name]) => name !== currentPlayerName);

  if (players.length === 0) return null;

  return (
    <div className="w-full max-w-md mt-8 border-t border-gray-900 pt-8">
      <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] text-center mb-6">El resto del grupo</h3>
      <div className="space-y-3">
        {players.map(([name, stats]) => (
          <div key={name} className="border border-gray-800 bg-[#0a0a0a] overflow-hidden group">
            {/* Cabecera (Siempre visible) */}
            <div 
              onClick={() => toggleCard(name)}
              className="flex justify-between items-center p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* AVATAR DE COMPAÑERO */}
                <div className="w-10 h-10 rounded-full bg-black border border-gray-700 overflow-hidden shrink-0">
                   {stats.imageUrl ? (
                     <img src={stats.imageUrl} alt={name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">?</div>
                   )}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#d4af37] font-bold text-sm uppercase">{name}</span>
                        <span className="text-gray-600 text-[10px]">{expandedCards[name] ? '▼' : '►'}</span>
                    </div>
                    {/* Preview de estado rápido */}
                    <p className={`text-[10px] uppercase ${stats.ruin >= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                        Ruina: {stats.ruin || 1}/6
                    </p>
                </div>
              </div>
            </div>

            {/* Detalles (Plegables) */}
            {expandedCards[name] && (
              <div className="p-3 bg-black border-t border-gray-900 grid grid-cols-2 gap-4 text-xs text-gray-400 animate-in slide-in-from-top-1">
                <div>
                  <span className="block text-[10px] text-gray-600 uppercase mb-1">Condiciones</span>
                  <p className={stats.conditions ? 'text-red-400' : 'text-green-500'}>
                    {stats.conditions || 'Sano'}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-600 uppercase mb-1">Equipo</span>
                  <p className="truncate italic">{stats.inventory || 'Vacío'}</p>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-600 uppercase mb-1">Oro</span>
                  <p className="text-[#f9e29c]">{stats.gold || 0}</p>
                </div>
              </div>
            )}
          </div>
        ))}
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaUrl = params.get('sala');
    if (salaUrl) setRoomName(salaUrl);
  }, []);

  useEffect(() => {
    if (!isJoined || !roomName) return;
    const rollsRef = query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20));
    const unsubscribe = onValue(rollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rollsList = Object.values(data).sort((a, b) => b.id - a.id);
        setHistory(rollsList);
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, [isJoined, roomName]);

  const handleJoin = () => {
    if (roomName.trim() && playerName.trim()) {
      setIsJoined(true);
      const newUrl = `${window.location.pathname}?partida=${roomName}`;
      window.history.pushState({}, '', newUrl);
    } else {
      alert("Por favor, escribe el nombre de la partida y de tu personaje.");
    }
  };

  const handleExit = () => {
    setIsJoined(false);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("¡Enlace copiado!");
  };

  const handleClear = () => {
    if (window.confirm("¿Deseas purgar el historial de la partida?")) {
      remove(ref(database, `rooms/${roomName}/rolls`));
    }
  };

  const updateDiceCount = (setter, current, change) => {
    const val = current + change;
    if (val >= 0 && val <= 10) setter(val);
  };

  const handleRoll = () => {
    const newDice = [];
    for (let i = 0; i < lightCount; i++) newDice.push({ type: 'light', value: Math.ceil(Math.random() * 6), id: Math.random() });
    for (let i = 0; i < darkCount; i++) newDice.push({ type: 'dark', value: Math.ceil(Math.random() * 6), id: Math.random() });
    
    if (newDice.length === 0) return;
    
    const analysis = analyzeResult(newDice);
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: newDice, analysis, player: playerName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handlePush = (originalRoll) => {
    const currentDice = [...originalRoll.dice];
    const newDarkDie = { type: 'dark', value: Math.ceil(Math.random() * 6), id: Math.random() };
    const updatedDice = [...currentDice, newDarkDie];
    const analysis = analyzeResult(updatedDice);
    
    push(ref(database, `rooms/${roomName}/rolls`), {
      id: Date.now(), dice: updatedDice, analysis, player: playerName, isPush: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  // --- VISTA LOGIN ---
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-serif text-white">
        <div className="bg-[#1a1a1a] p-8 max-w-sm w-full text-center border border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]">
          <h1 className="text-3xl font-bold mb-6 text-[#d4af37] uppercase tracking-[0.2em]">Trophy (g)Old)</h1>
          <div className="space-y-4">
            <input 
              type="text" placeholder="Partida" value={roomName} onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-black text-white p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none"
            />
            <input 
              type="text" placeholder="TU NOMBRE" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full bg-black text-[#f9e29c] p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none font-bold"
            />
          </div>
          <button onClick={handleJoin} className="w-full mt-8 bg-[#d4af37] hover:bg-[#f9e29c] text-black font-bold py-3 tracking-widest transition-all">
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA MESA ---
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center font-serif pb-20">
      <div className="w-full max-w-md flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2">
        <div onClick={handleCopyLink} className="cursor-pointer group">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Partida</p>
          <h1 className="text-xl font-bold text-[#d4af37] truncate max-w-[200px]">{roomName} 🔗</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={handleClear} className="text-[10px] text-gray-500 hover:text-red-500 uppercase">[ Limpiar ]</button>
            <button onClick={handleExit} className="text-[10px] text-gray-500 hover:text-white uppercase">[ Salir ]</button>
        </div>
      </div>

      {/* 1. TU FICHA (Plegable) */}
      <CharacterSheet roomName={roomName} playerName={playerName} />

      {/* 2. PANEL DE DADOS */}
      <div className="bg-[#1a1a1a] p-6 w-full max-w-md border border-gray-800 mb-8 shadow-lg relative">
        <div className="flex flex-col gap-5">
          {/* Dados Claros */}
          <div>
            <label className="block text-xs text-[#d4af37] mb-1 uppercase tracking-widest text-center">Dados claros</label>
            <div className="flex items-center justify-between border border-[#d4af37] bg-black h-14">
              <button onClick={() => updateDiceCount(setLightCount, lightCount, -1)} className="w-16 h-full text-[#d4af37] text-3xl font-bold hover:bg-[#d4af37] hover:text-black transition-all">-</button>
              <span className="text-[#d4af37] text-3xl font-bold">{lightCount}</span>
              <button onClick={() => updateDiceCount(setLightCount, lightCount, 1)} className="w-16 h-full text-[#d4af37] text-3xl font-bold hover:bg-[#d4af37] hover:text-black transition-all">+</button>
            </div>
          </div>
          {/* Dados Oscuros */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest text-center">Dados oscuros</label>
            <div className="flex items-center justify-between border border-gray-600 bg-black h-14">
              <button onClick={() => updateDiceCount(setDarkCount, darkCount, -1)} className="w-16 h-full text-gray-500 text-3xl font-bold hover:bg-gray-700 hover:text-white transition-all">-</button>
              <span className="text-gray-400 text-3xl font-bold">{darkCount}</span>
              <button onClick={() => updateDiceCount(setDarkCount, darkCount, 1)} className="w-16 h-full text-gray-500 text-3xl font-bold hover:bg-gray-700 hover:text-white transition-all">+</button>
            </div>
          </div>
        </div>
        <button onClick={handleRoll} className="w-full mt-8 bg-[#d4af37] hover:bg-[#f9e29c] active:translate-y-1 text-black font-bold py-4 text-xl uppercase tracking-[0.3em] shadow-lg transition-all">
          Tirar dados
        </button>
      </div>

      {/* 3. HISTORIAL */}
      <div className="w-full max-w-md space-y-4">
        {history.map((roll, index) => (
          <div key={roll.id} className="bg-[#1a1a1a] p-4 border-l-2 border-[#d4af37] shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-black">
              <span className="text-[#f9e29c] font-bold text-sm uppercase tracking-wider">
                {roll.player} {roll.isPush && <span className="text-[10px] text-red-500 ml-2">(TENTACIÓN)</span>}
              </span>
              <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
            </div>
            <div className="mb-3">
               <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>{roll.analysis.label}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {roll.dice.map((d) => (
                <div key={d.id} className={`w-11 h-11 flex items-center justify-center text-xl font-bold shadow-sm ${d.type === 'light' ? 'bg-[#d4af37] text-black border-t-2 border-[#f9e29c]' : 'bg-black text-white border border-gray-700'}`}>
                  {d.value}
                </div>
              ))}
            </div>
            {index === 0 && roll.player === playerName && (
                <button onClick={() => handlePush(roll)} className="mt-4 w-full border border-gray-700 text-gray-400 hover:border-[#d4af37] hover:text-[#d4af37] text-[10px] uppercase transition-all py-2 tracking-widest">
                    ¿Tentar al destino? (+1 Dado oscuro)
                </button>
            )}
          </div>
        ))}
      </div>

      {/* 4. VISTA DE GRUPO (Plegable) */}
      <PartyView roomName={roomName} currentPlayerName={playerName} />

    </div>
  );
}

export default App;