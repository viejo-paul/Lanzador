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

  const handleClear = () => {
    if (window.confirm("¿Deseas purgar el historial?")) {
      remove(ref(database, `rooms/${roomName}/rolls`));
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-serif text-white">
        <div className="bg-[#1a1a1a] p-8 max-w-sm w-full text-center border border-[#d4af37]">
          <h1 className="text-3xl font-bold mb-6 text-[#d4af37] uppercase tracking-[0.2em]">Trophy Roller</h1>
          <input 
            type="text" 
            placeholder="SALA" 
            className="w-full bg-black text-white p-3 mb-4 text-center border border-gray-800 focus:border-[#d4af37] outline-none"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.toUpperCase())}
          />
          <button 
            onClick={() => roomName && setIsJoined(true)}
            className="w-full bg-[#d4af37] hover:bg-[#f9e29c] text-black font-bold py-3 transition-colors tracking-widest"
          >
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center font-serif">
      <div className="w-full max-w-md flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sala</p>
          <h1 className="text-xl font-bold text-[#d4af37] uppercase">{roomName}</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={handleClear} className="text-[10px] text-gray-500 hover:text-red-500 uppercase">
              [ Limpiar ]
            </button>
            <button onClick={() => setIsJoined(false)} className="text-[10px] text-gray-500 hover:text-white uppercase">
              [ Salir ]
            </button>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 w-full max-w-md border border-gray-800 mb-8">
        <div className="flex gap-6 mb-6">
          <div className="flex-1 text-center">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Claros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-[#f9e29c] p-2 text-center text-3xl font-bold border border-gray-800"
              value={lightCount}
              onChange={(e) => setLightCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex-1 text-center">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Oscuros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-black text-gray-400 p-2 text-center text-3xl font-bold border border-gray-800"
              value={darkCount}
              onChange={(e) => setDarkCount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <button 
          onClick={handleRoll}
          className="w-full bg-[#d4af37] hover:bg-[#f9e29c] text-black font-bold py-4 text-xl uppercase tracking-[0.3em]"
        >
          Tirar Dados
        </button>
      </div>

      <div className="w-full max-w-md space-y-4 pb-10">
        {history.map((roll) => (
          <div key={roll.id} className="bg-[#1a1a1a] p-4 border-l-2 border-[#d4af37]">
            <div className="flex justify-between items-center mb-3 border-b border-black pb-2">
              <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis.color}`}>
                {roll.analysis.label}
              </span>
              <span className="text-[10px] text-gray-600">{roll.timestamp}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {roll.dice.map((d) => (
                <div 
                  key={d.id}
                  className={`w-11 h-11 flex items-center justify-center text-xl font-bold ${
                    d.type === 'light' 
                    ? 'bg-[#d4af37] text-black border-t-2 border-[#f9e29c]' 
                    : 'bg-black text-white border border-gray-800'
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