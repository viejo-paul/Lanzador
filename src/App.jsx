import React, { useState, useEffect } from 'react';
// Importamos las funciones de Firebase
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query } from "firebase/database";

// --- LÓGICA DE TROPHY (Igual que antes) ---
function analyzeResult(dice) {
  if (dice.length === 0) return { label: 'Sin dados', color: 'text-gray-500' };
  const highestValue = Math.max(...dice.map(d => d.value));
  const highestDice = dice.filter(d => d.value === highestValue);
  const isDarkHighest = highestDice.some(d => d.type === 'dark');

  let resultText = '';
  let resultColor = '';

  if (highestValue === 6) {
    resultText = '¡ÉXITO!'; 
    resultColor = 'text-green-400';
  } else if (highestValue >= 4) {
    resultText = 'ÉXITO PARCIAL';
    resultColor = 'text-yellow-400';
  } else {
    resultText = 'FALLO';
    resultColor = 'text-red-400';
  }

  if (isDarkHighest) {
    resultText += ' + ¡POSIBLE RUINA!';
    resultColor = 'text-purple-400';
  }
  return { label: resultText, color: resultColor };
}

function App() {
  // ESTADOS
  const [roomName, setRoomName] = useState(''); // Nombre de la sala
  const [isJoined, setIsJoined] = useState(false); // ¿Ya entramos?
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]); // Historial (ahora viene de la nube)

  // --- EFECTO: ESCUCHAR A FIREBASE ---
  useEffect(() => {
    // Si no estamos en una sala, no hacemos nada
    if (!isJoined || !roomName) return;

    // 1. Referencia a la base de datos: "rooms/NOMBRE_SALA/rolls"
    const rollsRef = query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20));

    // 2. Nos suscribimos (onValue). Cada vez que haya un cambio, Firebase ejecuta esto:
    const unsubscribe = onValue(rollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebase devuelve un objeto { clave: valor }, lo convertimos a lista
        const rollsList = Object.values(data);
        // Los ordenamos para que el más nuevo salga primero (por si acaso)
        rollsList.sort((a, b) => b.id - a.id);
        setHistory(rollsList);
      } else {
        setHistory([]); // Sala vacía
      }
    });

    // Limpieza: Dejar de escuchar si salimos de la sala
    return () => unsubscribe();
  }, [isJoined, roomName]);


  // --- FUNCIÓN: TIRAR DADOS (ENVIAR A LA NUBE) ---
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

    // MAGIA: En vez de setHistory, enviamos a Firebase (push)
    const rollsRef = ref(database, `rooms/${roomName}/rolls`);
    push(rollsRef, newRollEntry);
  };

  // --- INTERFAZ: PANTALLA DE INICIO (LOGIN) ---
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-white">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center border border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-yellow-500 uppercase tracking-widest">Trophy Roller</h1>
          <p className="mb-4 text-gray-400">Introduce el nombre de tu sala para unirte a la partida.</p>
          <input 
            type="text" 
            placeholder="Ej: MesaDeJuego" 
            className="w-full bg-gray-700 text-white p-3 rounded mb-4 text-center text-lg outline-none focus:ring-2 focus:ring-yellow-600"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button 
            onClick={() => roomName && setIsJoined(true)}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded transition-colors"
          >
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  // --- INTERFAZ: MESA DE JUEGO (Igual que antes, con cabecera de sala) ---
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 flex flex-col items-center font-sans">
      
      {/* Cabecera con nombre de sala y botón salir */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-yellow-600 uppercase tracking-widest">Sala: {roomName}</h1>
        <button 
          onClick={() => setIsJoined(false)} 
          className="text-xs text-gray-400 hover:text-white underline"
        >
          Salir
        </button>
      </div>

      {/* PANEL DE CONTROL */}
      <div className="bg-gray-800 p-4 rounded-xl shadow-xl w-full max-w-md border border-gray-700 z-10 sticky top-4 mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Dados Claros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-gray-700 text-white p-2 rounded text-center text-2xl font-bold"
              value={lightCount}
              onChange={(e) => setLightCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-1">Dados Oscuros</label>
            <input 
              type="number" min="0" max="10"
              className="w-full bg-gray-700 text-gray-300 p-2 rounded text-center text-2xl font-bold border border-gray-600"
              value={darkCount}
              onChange={(e) => setDarkCount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <button 
          onClick={handleRoll}
          className="w-full bg-yellow-600 hover:bg-yellow-500 active:scale-95 text-black font-bold py-3 rounded-lg text-xl transition-all shadow-[0_4px_0_rgb(161,102,11)] active:shadow-none translate-y-0 active:translate-y-1"
        >
          TIRAR
        </button>
      </div>

      {/* HISTORIAL */}
      <div className="w-full max-w-md space-y-4 pb-10">
        {history.length === 0 && (
          <p className="text-center text-gray-600 italic">Sala vacía. ¡Tira los dados!</p>
        )}

        {history.map((roll) => (
          <div key={roll.id} className="bg-gray-800 rounded-lg p-4 border-l-4 border-gray-600 animate-fade-in-down">
            <div className="flex justify-between items-start mb-3 border-b border-gray-700 pb-2">
              <span className={`font-bold uppercase text-sm ${roll.analysis.color}`}>
                {roll.analysis.label}
              </span>
              <span className="text-xs text-gray-500">{roll.timestamp}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {roll.dice.map((d) => (
                <div 
                  key={d.id}
                  className={`
                    w-10 h-10 flex items-center justify-center text-lg font-bold rounded shadow-sm
                    ${d.type === 'light' 
                      ? 'bg-gray-200 text-black' 
                      : 'bg-black text-gray-200 border border-gray-600'
                    }
                  `}
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