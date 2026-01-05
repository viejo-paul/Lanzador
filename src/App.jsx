import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove } from "firebase/database";

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
    resultColor = 'text-white border-b border-white';
  }
  return { label: resultText, color: resultColor };
}

function App() {
  const [roomName, setRoomName] = useState(''); 
  const [playerName, setPlayerName] = useState(''); // Nuevo estado para el personaje
  const [isJoined, setIsJoined] = useState(false); 
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]); 

  // --- DETECTAR URL (Pre-rellena la sala pero NO entra solo) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaUrl = params.get('sala');
    
    if (salaUrl) {
      setRoomName(salaUrl);
      // Quitamos el setIsJoined(true) automático para obligar a poner nombre
    }
  }, []);

  useEffect(() => {
    if (!isJoined || !roomName) return;
    const rollsRef = query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20));
    const unsubscribe = onValue(rollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rollsList = Object.values(data);
        rollsList.sort((a, b) => b.id - a.id);
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
      const newUrl = `${window.location.pathname}?sala=${roomName}`;
      window.history.pushState({}, '', newUrl);
    } else {
      alert("Por favor, escribe el nombre de la sala y de tu personaje.");
    }
  };

  const handleExit = () => {
    setIsJoined(false);
    // No borramos el nombre de la sala ni del personaje para facilitar re-entrar
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert("¡Enlace copiado!");
  };

  const handleRoll = () => {
    const newDice = [];
    for (let i = 0; i < lightCount; i++) {
      newDice.push({ type: 'light', value: Math.ceil(Math.random() * 6), id: Math.random() });
    }
    for (let i = 0; i < darkCount; i++) {
      newDice.push({ type: 'dark', value: Math.ceil(Math.random() * 6), id: Math.random() });
    }
    if (newDice.length === 0) return;

    const analysis = analyzeResult(newDice);
    const newRollEntry = {
      id: Date.now(),
      dice: newDice,
      analysis: analysis,
      player: playerName, // ¡AQUÍ GUARDAMOS QUIÉN TIRÓ!
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Hora corta
    };

    const rollsRef = ref(database, `rooms/${roomName}/rolls`);
    push(rollsRef, newRollEntry);
  };

  const handleClear = () => {
    if (window.confirm("¿Deseas purgar el historial?")) {
      remove(ref(database, `rooms/${roomName}/rolls`));
    }
  };

  // --- VISTA DE LOGIN (AHORA PIDE PERSONAJE) ---
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-serif text-white">
        <div className="bg-[#1a1a1a] p-8 max-w-sm w-full text-center border border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]">
          <h1 className="text-3xl font-bold mb-6 text-[#d4af37] uppercase tracking-[0.2em]">Trophy Roller</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Nombre de Sala</label>
              <input 
                type="text" 
                placeholder="MESA DE JUEGO" 
                className="w-full bg-black text-white p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none placeholder-gray-700"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Tu Personaje</label>
              <input 
                type="text" 
                placeholder="NOMBRE DEL CAZATESOROS" 
                className="w-full bg-black text-[#f9e29c] p-3 text-center border border-gray-800 focus:border-[#d4af37] outline-none placeholder-gray-700 font-bold"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()} 
              />
            </div>
          </div>

          <button 
            onClick={handleJoin}
            className="w-full mt-8 bg-[#d4af37] hover:bg-[#f9e29c] active:translate-y-1 text-black font-bold py-3 transition-all tracking-widest cursor-pointer shadow-lg"
          >
            ENTRAR A LA OSCURIDAD
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA DE MESA ---
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center font-serif">
      <div className="w-full max-w-md flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2">
        <div className="cursor-pointer group" onClick={handleCopyLink} title="Click para copiar enlace">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest group-hover:text-[#d4af37]">Sala (Copiar Link)</p>
          <h1 className="text-xl font-bold text-[#d4af37] group-hover:underline truncate max-w-[200px]">{roomName} 🔗</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={handleClear} className="text-[10px] text-gray-500 hover:text-red-500 uppercase cursor-pointer">
              [ Limpiar ]
            </button>
            <button onClick={handleExit} className="text-[10px] text-gray-500 hover:text-white uppercase cursor-pointer">
              [ Salir ]
            </button>
        </div>
      </div>

      {/* PANEL DE TIRADA */}
      <div className="bg-[#1a1a1a] p-6 w-full max-w-md border border-gray-800 mb-8 shadow-lg shadow-black relative">
        {/* Etiqueta flotante con el nombre del personaje actual */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black px-4 py-1 border border-[#d4af37] text-[#d4af37] text-xs font-bold uppercase tracking-widest">
          {playerName}
        </div>

        <div className="flex gap-6 mb-6 mt-2">
          <div className="flex-1 text-center">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Claros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-[#f9e29c] p-2 text-center text-3xl font-bold border border-gray-800 focus:border-[#d4af37] outline-none"
              value={lightCount}
              onChange={(e) => setLightCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex-1 text-center">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Oscuros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-gray-400 p-2 text-center text-3xl font-bold border border-gray-800 focus:border-white outline-none"
              value={darkCount}
              onChange={(e) => setDarkCount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <button 
          onClick={handleRoll}
          className="w-full bg-[#d4af37] hover:bg-[#f9e29c] active:translate-y-1 text-black font-bold py-4 text-xl uppercase tracking-[0.3em] transition-all cursor-pointer"
        >
          Tirar Dados
        </button>
      </div>

      {/* HISTORIAL */}
      <div className="w-full max-w-md space-y-4 pb-10">
        {history.map((roll) => (
          <div key={roll.id} className="bg-[#1a1a1a] p-4 border-l-2 border-[#d4af37] shadow-md animate-in fade-in slide-in-from-top-2">
            
            {/* CABECERA DE LA TIRADA: NOMBRE Y HORA */}
            <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-black">
              <span className="text-[#f9e29c] font-bold text-sm uppercase tracking-wider">
                {roll.player || 'Anónimo'} {/* Fallback por si hay tiradas viejas */}
              </span>
              <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
            </div>

            {/* RESULTADO (ÉXITO/FALLO) */}
            <div className="mb-3">
               <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>
                {roll.analysis.label}
              </span>
            </div>

            {/* DADOS */}
            <div className="flex flex-wrap gap-3">
              {roll.dice.map((d) => (
                <div 
                  key={d.id}
                  className={`w-11 h-11 flex items-center justify-center text-xl font-bold shadow-sm ${
                    d.type === 'light' 
                    ? 'bg-[#d4af37] text-black border-t-2 border-[#f9e29c]' 
                    : 'bg-black text-white border border-gray-700 shadow-[inset_0_0_5px_rgba(255,255,255,0.1)]'
                  }`}
                >
                  {d.value}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;