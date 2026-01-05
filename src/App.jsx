import React, { useState, useEffect } from 'react';
// Importamos las funciones de Firebase necesarias (añadido 'remove')
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove } from "firebase/database";

// --- LÓGICA DE TROPHY (Colores adaptados a la nueva estética) ---
function analyzeResult(dice) {
  if (dice.length === 0) return { label: 'Sin dados', color: 'text-gray-500' };
  const highestValue = Math.max(...dice.map(d => d.value));
  const highestDice = dice.filter(d => d.value === highestValue);
  const isDarkHighest = highestDice.some(d => d.type === 'dark');

  let resultText = '';
  let resultColor = '';

  // Éxitos en Dorado, fallos en gris claro
  if (highestValue === 6) {
    resultText = '¡ÉXITO!'; 
    resultColor = 'text-[calc(var(--color-gold))] font-bold';
  } else if (highestValue >= 4) {
    resultText = 'ÉXITO PARCIAL';
    resultColor = 'text-[calc(var(--color-gold-light))]';
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
  const [isJoined, setIsJoined] = useState(false); 
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]); 

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
      timestamp: new Date().toLocaleTimeString()
    };

    const rollsRef = ref(database, `rooms/${roomName}/rolls`);
    push(rollsRef, newRollEntry);
  };

  // --- FUNCIÓN PARA LIMPIAR EL HISTORIAL ---
  const handleClear = () => {
    if (window.confirm("¿Deseas purgar el historial de esta sala?")) {
      const rollsRef = ref(database, `rooms/${roomName}/rolls`);
      remove(rollsRef);
    }
  };

  // --- PANTALLA DE INICIO (ORO Y NEGRO) ---
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-serif text-white">
        <div className="bg-[calc(var(--color-dark-gray))] p-8 rounded-none shadow-2xl max-w-sm w-full text-center border border-[calc(var(--color-gold))]">
          <h1 className="text-3xl font-bold mb-6 text-[calc(var(--color-gold))] uppercase tracking-[0.2em]">Trophy Roller</h1>
          <p className="mb-6 text-gray-400 text-sm italic">"El oro brilla más en la oscuridad extrema"</p>
          <input 
            type="text" 
            placeholder="NOMBRE DE LA SALA" 
            className="w-full bg-black text-white p-3 rounded-none mb-4 text-center text-lg outline-none border border-gray-800 focus:border-[calc(var(--color-gold))] transition-all"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.toUpperCase())}
          />
          <button 
            onClick={() => roomName && setIsJoined(true)}
            className="w-full bg-[calc(var(--color-gold))] hover:bg-[calc(var(--color-gold-light))] text-black font-bold py-3 rounded-none transition-colors tracking-widest"
          >
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  // --- MESA DE JUEGO (ORO Y NEGRO) ---
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center font-serif">
      
      <div className="w-full max-w-md flex justify-between items-end mb-6 border-b border-[calc(var(--color-dark-gray))] pb-2">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sala de Juego</p>
          <h1 className="text-xl font-bold text-[calc(var(--color-gold))] uppercase">{roomName}</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={handleClear} className="text-[10px] text-gray-500 hover:text-red-500 uppercase tracking-tighter transition-colors">
              [ Limpiar ]
            </button>
            <button onClick={() => setIsJoined(false)} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-tighter">
              [ Salir ]
            </button>
        </div>
      </div>

      <div className="bg-[calc(var(--color-dark-gray))] p-6 rounded-none shadow-xl w-full max-w-md border border-gray-800 mb-8">
        <div className="flex gap-6 mb-6">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest text-center">Claros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-[calc(var(--color-gold-light))] p-2 rounded-none text-center text-3xl font-bold border border-gray-800"
              value={lightCount}
              onChange={(e) => setLightCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest text-center">Oscuros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-gray-400 p-2 rounded-none text-center text-3xl font-bold border border-gray-800"
              value={darkCount}
              onChange={(e) => setDarkCount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <button 
          onClick={handleRoll}
          className="w-full bg-[calc(var(--color-gold))] hover:bg-[calc(var(--color-gold-light))] active:scale-[0.98] text-black font-bold py-4 rounded-none text-xl transition-all uppercase tracking-[0.3em]"
        >
          Tirar Dados
        </button>
      </div>

      <div className="w-full max-w-md space-y-4 pb-10">
        {history.map((roll) => (
          <div key={roll.id} className="bg-[calc(var(--color-dark-gray))] rounded-none p-4 border-l-2 border-[calc(var(--color-gold))]">
            <div className="flex justify-between items-center mb-3 border-b border-black pb-2">
              <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>
                {roll.analysis.label}
              </span>
              <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
            </div>
          <div className="flex flex-wrap gap-3">
            {roll.dice.map((d) => (
              <div 
                key={d.id}
                className={`
                  w-12 h-12 flex items-center justify-center text-2xl font-bold rounded-none
                  ${d.type === 'light' 
                    ? 'bg-[calc(var(--color-gold))] text-black border-t-2 border-[calc(var(--color-gold-light))]' 
                    : 'bg-black text-white border border-gray-700 shadow-[inset_0_0_5px_rgba(255,255,255,0.1)]'
                  }
                `}
              >
                {d.value}
              </div>
            ))}
          </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;