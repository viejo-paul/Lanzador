// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { database } from './firebase';
import { ref, update, onValue, push, limitToLast, query, remove } from "firebase/database";
import DiceBox from '@3d-dice/dice-box';  // Dados 3d
//import { Howl } from 'howler'; //Gestor de sonidos

// --- NUEVOS IMPORTS (La clave de la refactorización) ---
import LandingScreen from './screens/LandingScreen';
import LobbyScreen from './screens/LobbyScreen';
import Footer from './components/ui/Footer'; 
import CharacterSheet from './components/game/CharacterSheet'; // (Si ya lo hubiéramos separado, si no, ignora esta línea y mantén tu import si lo tenías o el componente abajo)
import PartyView from './components/game/PartyView'; // (Igual que arriba)
import RollHistory from './components/game/RollHistory'; //el historial aparte

// --- IMPORTACIÓN DE FUENTE PERSONALIZADA ---
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manufacturing+Consent&display=swap');
  .font-consent { font-family: 'Manufacturing Consent', sans-serif !important; text-transform: none !important; }
`;
// ---GESTOR DE DESCARGAS JSON ---
const downloadJSON = (data, fileName) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
// Definir los sonidos FUERA del componente para que se carguen solo una vez
const soundBank = {
    click: new Howl({ src: ['/sounds/click.mp3'], volume: 0.5 }),
    success: new Howl({ src: ['/sounds/success.mp3'], volume: 0.8 }),
    fail: new Howl({ src: ['/sounds/fail.mp3'], volume: 1.0 }),
    // ... otros sonidos
};
const playSound = (type) => {
    if (soundBank[type]) {
        soundBank[type].play();
    }
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
  let soundType = 'fail'; 

  if (rollType === 'risk') {
    if (highestValue === 6) { resultText = 'Logras lo que quieres. Describe cómo o pídeselo al Guardián'; resultColor = 'text-[#d4af37] font-bold'; icon = '✨'; soundType = 'success'; }
    else if (highestValue >= 4) { resultText = 'Logras lo que quieres, pero con alguna complicación. El Guardián la determina y tú describes cómo lo consigues.'; resultColor = 'text-[#f9e29c]'; icon = '⚠️'; soundType = 'fail'; }
    else { resultText = 'Fracasas y todo va a peor. El Guardián describe cómo.'; resultColor = 'text-gray-400'; icon = '💀'; soundType = 'fail'; }
  } 
  else if (rollType === 'hunt') {
    if (highestValue === 6) { 
        resultText = 'Ganas 1 Contador de Exploración.'; 
        resultColor = 'text-[#d4af37] font-bold'; 
        icon = '💎'; 
        soundType = 'success'; 
    }
    else if (highestValue >= 4) { 
        resultText = 'Ganas 1 Contador de Exploración, pero encuentras algo terrible.'; 
        resultColor = 'text-[#f9e29c]'; 
        icon = '⚠️'; 
        soundType = 'fail'; 
    }
    else if (highestValue >= 2) { 
        resultText = 'Encuentras algo terrible.'; 
        resultColor = 'text-gray-400'; 
        icon = '💀'; 
        soundType = 'fail'; 
    }
    else { 
        resultText = 'Pierdes todos tus Contadores y encuentras algo terrible.'; 
        resultColor = 'text-red-500 font-bold animate-pulse'; 
        icon = '🩸'; 
        soundType = 'ruin'; 
    }
  }
  else if (rollType === 'combat') {
    // 1. Separar dados oscuros (Ataque) y claros (Punto Débil)
    const darkDiceValues = dice.filter(d => d.type === 'dark').map(d => d.value).sort((a, b) => b - a);
    const lightDiceValues = dice.filter(d => d.type === 'light').map(d => d.value);

    // 2. Calcular Daño: Suma de los 2 dados oscuros más altos
    // Si no hay dados oscuros, el daño es 0.
    const damage = (darkDiceValues[0] || 0) + (darkDiceValues[1] || 0);

    // 3. Comprobar Ruina (Si un dado oscuro coincide con tu Punto Débil/Dado Claro)
    let ruinHits = 0;
    lightDiceValues.forEach(weakPoint => {
        const matches = darkDiceValues.filter(val => val === weakPoint).length;
        ruinHits += matches;
    });

    // 4. Generar Texto y Estilos
    resultText = `Daño total: ${damage}`;
    
    if (ruinHits > 0) {
        // Caso: El monstruo golpea tu punto débil
        resultText += ` | ¡Punto débil golpeado! (+${ruinHits} RUINA)`;
        resultColor = 'text-red-500 font-bold animate-pulse border-b-2 border-red-500'; 
        icon = '🩸'; 
        soundType = 'ruin';
    } else {
        // Caso: Ataque normal (sin recibir daño extra)
        if (damage >= 10) { 
            resultColor = 'text-[#d4af37] font-bold text-lg'; 
            icon = '⚔️'; 
            soundType = 'success'; 
        } else { 
            resultColor = 'text-gray-300 font-bold'; 
            icon = '🗡️'; 
            soundType = 'click'; 
        }
        
        // Mostrar cuál era el punto débil para referencia visual
        if (lightDiceValues.length > 0) {
            resultText += ` (P. Débil: ${lightDiceValues.join(', ')})`;
        }
    }
  }
  else if (rollType === 'combat') {
    const sortedValues = dice.map(d => d.value).sort((a, b) => b - a);
    const attackTotal = (sortedValues[0] || 0) + (sortedValues[1] || 0);
    resultText = `Daño total: ${attackTotal}`;
    if (attackTotal >= 10) { resultColor = 'text-red-500 font-bold text-lg animate-pulse'; icon = '⚔️'; soundType = 'ruin'; }
    else if (attackTotal >= 8) { resultColor = 'text-[#d4af37] font-bold'; icon = '🗡️'; soundType = 'success'; }
    else { resultColor = 'text-gray-400'; icon = '🛡️'; soundType = 'fail'; }
  }
  else if (rollType === 'help') {
      const val = dice[0].value;
      resultText = `Dado de ayuda: ${val}`;
      if (val === 6) { resultColor = 'text-[#d4af37] font-bold'; icon = '🤝'; soundType = 'success'; }
      else if (val >= 4) { resultColor = 'text-[#f9e29c]'; icon = '✋'; soundType = 'fail'; }
      else { resultColor = 'text-gray-500'; icon = '🥀'; soundType = 'fail'; }
  }
  if (isDarkHighest && highestValue > 0) { soundType = 'ruin'; }
  return { label: resultText, color: resultColor, isDarkHighest, icon, rollType, soundType };
}

// --- MODAL DE IMAGEN AMPLIADA ---
const ImageModal = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen || !imageUrl) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <img src={imageUrl} alt={title} className="max-w-[90vw] max-h-[80vh] border-2 border-[#d4af37] shadow-[0_0_50px_rgba(212,175,55,0.3)] object-contain"/>
        <h2 className="text-[#d4af37] font-consent text-6xl mt-4 tracking-widest">{title}</h2>
        <button onClick={onClose} className="mt-4 text-gray-400 hover:text-white uppercase text-xs tracking-widest border border-gray-700 px-4 py-2">Cerrar</button>
      </div>
    </div>
  );
};

// --- MODAL DE REGLAS INTERACTIVO ---
const RulesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('risk'); // 'risk', 'hunt', 'combat', 'help', 'contest'

  if (!isOpen) return null;

  const tabs = [
    { id: 'risk', label: 'Riesgo' },
    { id: 'hunt', label: 'Exploración' },
    { id: 'combat', label: 'Combate' },
    { id: 'help', label: 'Ayuda' },
    { id: 'contest', label: 'Enfrentada' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'hunt':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-[#d4af37] font-bold text-lg uppercase tracking-widest border-b border-[#d4af37]/30 pb-2">Tirada de Exploración</h4>
            <p>Cuando profundices en tu objetivo o hagas preguntas sobre el mundo, describe cómo exploras tu entorno. Luego, con un dado de seis caras, tira:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li><strong>1 dado blanco</strong> para hacer preguntas sobre el mundo.</li>
              <li><strong>1 dado blanco adicional</strong> si tienes una habilidad o pieza de equipo que facilitaría tu búsqueda.</li>
            </ul>
            <div className="bg-black/50 p-3 border border-gray-800">
              <p className="text-[#d4af37] text-xs uppercase mb-2 font-bold">Resultados (Dado más alto):</p>
              <ul className="space-y-2 text-sm">
                <li><strong className="text-red-500">1:</strong> Pierdes todos tus contadores de exploración y te encuentras con algo terrible.</li>
                <li><strong className="text-gray-300">2-3:</strong> Te encuentras con algo terrible.</li>
                <li><strong className="text-[#f9e29c]">4-5:</strong> Ganas 1 contador de exploración, pero te encuentras con algo terrible.</li>
                <li><strong className="text-[#d4af37]">6:</strong> Ganas 1 contador de exploración.</li>
              </ul>
            </div>
            <p className="text-xs italic text-gray-500">El que encuentres o no lo que buscas puede ser distinto a los resultados de tu tirada y depender de tus preguntas.</p>
          </div>
        );
      case 'combat':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
             <h4 className="text-[#d4af37] font-bold text-lg uppercase tracking-widest border-b border-[#d4af37]/30 pb-2">Tirada de Combate</h4>
             <p>Cuando te encuentres en combate, podrías colaborar con tus compañeros. Para empezar:</p>
             <ul className="list-disc pl-5 space-y-2 text-gray-400 text-sm">
               <li>Declara tu vulnerabilidad y tira <strong>un dado claro</strong>. Este es tu <strong>Punto Débil</strong>. (Cada jugador tira el suyo).</li>
               <li>Tira <strong>un dado oscuro</strong> por cada buscador que participe en el combate (pool común).</li>
             </ul>
             
             <div className="bg-red-900/10 p-3 border border-red-900/50">
                <p className="text-red-400 text-xs uppercase mb-1 font-bold">Mecánica de Ruina</p>
                <p className="text-sm">Si algún dado oscuro iguala tu <strong>Punto Débil</strong>, aumentas tu Ruina en 1 por cada coincidencia.</p>
             </div>

             <div className="bg-black/50 p-3 border border-gray-800">
               <p className="text-[#d4af37] text-xs uppercase mb-2 font-bold">Resolución</p>
               <p className="text-sm mb-2">Se suma los <strong>dos dados oscuros más altos</strong> contra la Resistencia del enemigo (2-12).</p>
               <ul className="space-y-1 text-sm text-gray-400">
                 <li><strong>Éxito:</strong> El enemigo es derrotado.</li>
                 <li><strong>Fallo:</strong> Se añade un dado oscuro extra y se vuelve a tirar (ronda 2).</li>
               </ul>
             </div>
             <p className="text-xs text-gray-500">Si te retiras, debes entregar tu Punto Débil a otro jugador, quien se vuelve vulnerable a ambos números.</p>
          </div>
        );
      case 'risk':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
             <h4 className="text-[#d4af37] font-bold text-lg uppercase tracking-widest border-b border-[#d4af37]/30 pb-2">Tirada de Riesgo</h4>
             <p>Al intentar una tarea arriesgada, declara qué esperas que suceda. Tu reserva de dados:</p>
             <ul className="list-disc pl-5 space-y-1 text-gray-400 text-sm">
               <li><strong>1 dado claro</strong> si tu Trasfondo, Ocupación o equipo ayudan.</li>
               <li><strong>1 dado claro</strong> por aceptar un Pacto con el Diablo.</li>
               <li><strong>1 dado oscuro</strong> si arriesgas cuerpo/mente o realizas un Ritual.</li>
             </ul>

             <div className="bg-black/50 p-3 border border-gray-800">
              <p className="text-[#d4af37] text-xs uppercase mb-2 font-bold">Resultados (Dado más alto):</p>
              <ul className="space-y-2 text-sm">
                <li><strong className="text-gray-400">1-3:</strong> Fracasas y la situación empeora.</li>
                <li><strong className="text-[#f9e29c]">4-5:</strong> Tienes éxito, pero hay una complicación (o pacto previo).</li>
                <li><strong className="text-[#d4af37]">6:</strong> Éxito total.</li>
              </ul>
            </div>

            <div className="bg-[#d4af37]/10 p-2 border border-[#d4af37]/30">
               <p className="text-[#d4af37] text-xs uppercase font-bold">Tentar al destino</p>
               <p className="text-xs">Si no estás satisfecho, añade 1 dado oscuro y repite. Si el dado más alto es oscuro y supera tu Ruina actual, marca +1 Ruina.</p>
            </div>
          </div>
        );
      case 'help':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
             <h4 className="text-[#d4af37] font-bold text-lg uppercase tracking-widest border-b border-[#d4af37]/30 pb-2">Tirada de Ayuda</h4>
             <p>Si otro cazador realiza una Tirada de Riesgo con dados oscuros, puedes ayudarle.</p>
             <ul className="list-disc pl-5 space-y-2 text-gray-400">
               <li>Explica cómo te expones al peligro y tira <strong>1 dado claro</strong>.</li>
               <li>El otro jugador puede usar tu resultado como si fuera suyo.</li>
             </ul>
             <div className="bg-red-900/10 p-3 border border-red-900/50 mt-4">
                <strong className="text-red-500 text-sm block mb-1">¡PELIGRO!</strong>
                <p className="text-sm">Si tu dado claro coincide con alguno de los dados oscuros de la tirada principal, tu Ruina aumenta en 1.</p>
             </div>
          </div>
        );
      case 'contest':
        return (
          <div className="space-y-4 animate-in fade-in duration-300">
             <h4 className="text-[#d4af37] font-bold text-lg uppercase tracking-widest border-b border-[#d4af37]/30 pb-2">Tirada Enfrentada</h4>
             <p>Cuando los cazadores compiten entre sí (PvP). Cada jugador reúne:</p>
             <ul className="list-disc pl-5 space-y-1 text-gray-400 text-sm">
               <li><strong>1 dado claro</strong> si tu Ocupación/Trasfondo da ventaja.</li>
               <li><strong>1 dado claro</strong> por cada punto de Ruina que tengas actualmente.</li>
               <li><strong>1 dado oscuro</strong> si es inherentemente peligroso.</li>
               <li>Tantos <strong>dados oscuros extra</strong> como quieras arriesgar.</li>
             </ul>
             <div className="bg-black/50 p-3 border border-gray-800 mt-2">
               <p className="text-[#d4af37] text-xs uppercase mb-1 font-bold">Resolución</p>
               <p className="text-sm">Cuenta los 6s. En empate, cuenta los 5s, etc.</p>
             </div>
             <p className="text-red-400 text-xs mt-2 font-bold">Cada dado oscuro que saque un 1 aumenta tu Ruina en 1.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#d4af37] max-w-2xl w-full h-[80vh] flex flex-col shadow-[0_0_40px_rgba(212,175,55,0.15)]">
        
        {/* CABECERA */}
        <div className="bg-[#d4af37] text-black p-4 flex justify-between items-center z-10 shrink-0">
          <h2 className="font-consent text-2xl tracking-widest ">Resumen de reglas</h2>
          <button onClick={onClose} className="text-2xl font-bold px-2 hover:bg-black/10 rounded transition-colors">×</button>
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex flex-wrap bg-black border-b border-gray-800 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-[10px] sm:text-xs uppercase font-bold tracking-wider transition-all
                ${activeTab === tab.id 
                  ? 'bg-[#1a1a1a] text-[#d4af37] border-b-2 border-[#d4af37]' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-grow overflow-y-auto p-6 text-gray-300 font-serif leading-relaxed">
          {renderContent()}
        </div>

      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  // --- ESTADOS GLOBALES (Solo lo esencial para dirigir el tráfico) ---
  const [roomName, setRoomName] = useState(null); // ¿En qué sala estamos?
  const [displayName, setDisplayName] = useState(''); // Nombre bonito de la sala
  const [playerName, setPlayerName] = useState('');   // ¿Quién soy?
  const [isGM, setIsGM] = useState(false);            // ¿Soy el jefe?
  const [hasJoined, setHasJoined] = useState(false);  // ¿He pasado el Lobby?
  const [existingCharacters, setExistingCharacters] = useState({});
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [rollType, setRollType] = useState('risk');
  const [showRules, setShowRules] = useState(false);
  // --- ESTADOS PARA LA LANDING PAGE (EL UMBRAL) ---
  const [landingTitle, setLandingTitle] = useState(''); // El título "bonito"
  const [isCreatorGM, setIsCreatorGM] = useState(true); // Por defecto eres DJ
  const [creatorName, setCreatorName] = useState(''); // Si no eres DJ
  const [recentGames, setRecentGames] = useState([]); // Historial local
  // Frases de ambientación aleatoria
  const taglines = [
      "El bosque te reclama", 
      "La deuda debe pagarse",
      "No volverás igual que te fuiste",
      "El tesoro es una trampa",
      "La ruina te espera"
  ];
  const [randomTagline] = useState(() => taglines[Math.floor(Math.random() * taglines.length)]);
  const [diceBoxInstance, setDiceBoxInstance] = useState(null);
  
  
  useEffect(() => {
    if (diceBoxInstance) return;
    let container = document.getElementById("dice-box-full");
    if (!container) {
        container = document.createElement("div");
        container.id = "dice-box-full";
        document.body.appendChild(container);
    }
    Object.assign(container.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '50', pointerEvents: 'none', display: 'block' });

    const box = new DiceBox({
      container: "#dice-box-full", 
      assetPath: '/assets/', 
      sounds: true,
      volume: 0.5,
      theme: 'default',
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 14,
      gravity: 5,
      mass: 1,
      friction: 0.6,
      restitution: 0.1, 
      linearDamping: 0.5,
      angularDamping: 0.5,
      spinForce: 6,
      throwForce: 3,
    });
    
    box.init().then(() => {
        setDiceBoxInstance(box);
        const canvas = container.querySelector('canvas');
        if (canvas) { canvas.style.pointerEvents = 'none'; canvas.style.backgroundColor = 'transparent'; }
    }).catch(console.error);

    const handleResize = () => { if (box && box.renderer) box.renderer.resize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  useEffect(() => {
    // Cargar historial
    const savedGames = JSON.parse(localStorage.getItem('trophy_recent_games') || '[]');
    setRecentGames(savedGames);

    document.title = "Trophy (g)Old";
    
    const p = new URLSearchParams(window.location.search);
    const partidaURL = p.get('partida');

    if (partidaURL) {
      setRoomName(partidaURL);

      // --- LÓGICA DE LA ANTESALA ---
      // Verificamos si ya tenemos credenciales guardadas de esta sesión
      const savedRole = localStorage.getItem(`trophy_role_${partidaURL}`);
      const savedName = localStorage.getItem(`trophy_name_${partidaURL}`);

      if (savedRole === 'gm') {
          // Si eres el GM Creador, entras directo (Pase VIP)
          setIsGM(true);
          setPlayerName("Guardián");
          setHasJoined(true); 
      } else if (savedName) {
          // Si ya tienes nombre guardado, lo pre-cargamos pero...
          // Opcional: ¿Quieres que entren directo o que confirmen?
          // Yo sugiero que confirmen en la Antesala para evitar confusiones.
          setPlayerName(savedName);
          // setHasJoined(true); <--- MANTÉN ESTO COMENTADO para obligar a pasar por el Lobby
      }
      
      // Recuperar título bonito
      onValue(ref(database, `rooms/${partidaURL}/title`), (snapshot) => {
        if (snapshot.exists()) setDisplayName(snapshot.val());
        else setDisplayName(partidaURL);
      });
      // --- BLOQUE A AÑADIR (FIN) ---
      onValue(ref(database, `rooms/${partidaURL}/characters`), (snapshot) => {
        if (snapshot.exists()) { setExistingCharacters(snapshot.val()); } 
        else { setExistingCharacters({}); }
      });
    }
  }, []);

  useEffect(() => {
    if (!hasJoined || !roomName) return;
    return onValue(query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20)), s => {
      if(s.val()) setHistory(Object.values(s.val()).sort((a,b)=>b.id-a.id));
      else setHistory([]);
    });
  }, [hasJoined, roomName]);

  useEffect(() => {
    if (history.length > 0) {
      if (isInitialLoad.current) { isInitialLoad.current = false; } 
      else {
        const latestRoll = history[0];
        setTimeout(() => {
            if (latestRoll.analysis.soundType) playSound(latestRoll.analysis.soundType);
            else playSound('click');
        }, 1500);
      }
    }
  }, [history]);

  // --- FUNCIONES AUXILIARES ---
  const slugify = (text) => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const generateRandomID = () => {
    return Math.random().toString(36).substring(2, 6);
  };
  // -----------------------------------

  const handleJoin = (selectedName, asGuardian = false) => {
    let nameToJoin = selectedName || playerName;
    
    if (asGuardian) {
      nameToJoin = 'Guardián';
    }

    if (roomName && nameToJoin) {
      let finalRoomName = roomName;

    // Solo si es NUEVA partida (estamos en la home)
    if (!window.location.search.includes('partida')) {
        // 1. Guardamos el título original "bonito"
        const originalTitle = roomName; 
        
        // 2. Generamos el slug básico y le añadimos el ID aleatorio
        // Ejemplo: "La Maldición" -> "la-maldicion-x9z1"
        const slug = roomName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const randomSuffix = Math.random().toString(36).substr(2, 4);
        
        finalRoomName = `${slug}-${randomSuffix}`;
        
        // 3. Guardamos en base usando la URL única como clave, pero guardando el título original dentro
        update(ref(database, `rooms/${finalRoomName}`), {
            title: originalTitle
        });
    }

      setPlayerName(nameToJoin);
      setIsGM(asGuardian); // Establecer si es Guardián
      setIsJoined(true);
      playSound('click');
      window.history.pushState({}, '', `?partida=${finalRoomName}`);
    }
  };

  const handleExit = () => { setIsJoined(false); setIsGM(false); window.history.pushState({}, '', window.location.pathname); };
  const handleClearHistory = () => { if (window.confirm("¿Purgar historial?")) remove(ref(database, `rooms/${roomName}/rolls`)); };
  const updateDiceCount = (setter, c, ch) => { const v = c+ch; if(v>=0 && v<=10) { setter(v); playSound('click'); } };

 const handleRoll = async () => {
    if (!diceBoxInstance) return;
    const diceToRoll = [];
    
    if (rollType === 'help') {
        diceToRoll.push({ sides: 6, qty: 1, themeColor: '#d4af37', foreground: '#000000' });
    } else {
        // CAMBIO AQUÍ: Ya no bloqueamos los dados claros en combate
        if (lightCount > 0) {
            diceToRoll.push({ sides: 6, qty: lightCount, themeColor: '#d4af37', foreground: '#000000' });
        }
        // Los dados oscuros se añaden siempre excepto en 'hunt' (exploración)
        if (rollType !== 'hunt' && darkCount > 0) {
            diceToRoll.push({ sides: 6, qty: darkCount, themeColor: '#1a1a1a', foreground: '#d4af37' });
        }
    }

    if (diceToRoll.length === 0) return;
    
    diceBoxInstance.clear();
    const result3D = await diceBoxInstance.roll(diceToRoll);
    const newDice = result3D.map(d => ({ type: d.themeColor === '#d4af37' ? 'light' : 'dark', value: d.value, id: Math.random() }));
    const analysis = analyzeResult(newDice, rollType);
    push(ref(database, `rooms/${roomName}/rolls`), { id: Date.now(), dice: newDice, analysis, player: playerName, rollType, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) });
  };

  const handlePush = async (originalRoll) => {
    if (!diceBoxInstance) return;
    diceBoxInstance.clear();
    const result3D = await diceBoxInstance.roll([{ sides: 6, qty: 1, themeColor: '#1a1a1a', foreground: '#d4af37' }]);
    const updatedDice = [...originalRoll.dice, { type: 'dark', value: result3D[0].value, id: Math.random() }];
    const analysis = analyzeResult(updatedDice, originalRoll.rollType); 
    push(ref(database, `rooms/${roomName}/rolls`), { id: Date.now(), dice: updatedDice, analysis, player: playerName, isPush: true, rollType: originalRoll.rollType, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) });
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('¡Enlace de partida copiado!');
  };

  // --- FUNCIÓN PARA CREAR NUEVA INCURSIÓN ---
  const handleCreateIncursion = () => {
      if (!landingTitle.trim()) return;

      // 1. Generar Slug Único (nombre-tecnico-a1b2)
      const slug = landingTitle.toLowerCase()
          .replace(/ñ/g, 'n')
          .replace(/[^a-z0-9]+/g, '-') // Reemplaza espacios y símbolos por guiones
          .replace(/^-+|-+$/g, '');   // Quita guiones al inicio/final
      
      const randomSuffix = Math.random().toString(36).substr(2, 4);
      const finalRoomId = `${slug}-${randomSuffix}`;

      // 2. Guardar en Historial Local
      const newHistory = [
          { title: landingTitle, id: finalRoomId, date: Date.now() },
          ...recentGames.filter(g => g.id !== finalRoomId)
      ].slice(0, 3); // Guardamos solo las últimas 3
      
      localStorage.setItem('trophy_recent_games', JSON.stringify(newHistory));

      // 3. Guardar preferencia de rol (para entrar directo como GM o Jugador)
      if (isCreatorGM) {
          localStorage.setItem(`trophy_role_${finalRoomId}`, 'gm');
      } else {
          localStorage.setItem(`trophy_name_${finalRoomId}`, creatorName);
      }

      // 4. Escribir en Firebase el título "Bonito" e ir a la partida
      update(ref(database, `rooms/${finalRoomId}`), {
          title: landingTitle,
          created: Date.now()
      }).then(() => {
          // Redirección
          window.location.href = `?partida=${finalRoomId}`;
      });
  };

  // 1. ¿NO HAY SALA? -> PANTALLA DE LANDING (EL UMBRAL)
  if (!roomName) {
    return <LandingScreen />;
  }

  // 2. ¿HAY SALA PERO NO HA ENTRADO? -> LOBBY (LA ANTESALA)
  if (roomName && !hasJoined) {
    return (
      <LobbyScreen 
        roomName={roomName}           // Le pasamos el ID de la sala para buscar la lista de jugadores
        displayName={displayName}     // Le pasamos el título bonito ("La Tumba del Rey")
        onJoin={(name, roleGM) => {   // Le decimos qué hacer cuando el usuario pulse el botón
            setPlayerName(name);      // 1. Guardar el nombre en App
            setIsGM(roleGM);          // 2. Guardar el rol en App
            setHasJoined(true);       // 3. ¡Abrir la puerta del juego!
        }}
      />
    );
  }


  // 3. ¿ESTÁ DENTRO? -> MESA DE JUEGO (LA INCURSIÓN) El return 
    return (
    <div className="w-full md:w-1/3 flex flex-col space-y-4">
    
    <div className="text-[#d4af37] font-mono text-xs uppercase tracking-widest border-b border-gray-800 pb-1 mb-2">
        Crónica de la Incursión
    </div>

    {/* Aquí usamos tu nuevo componente limpio */}
    <RollHistory 
        rolls={rolls} 
        currentPlayerName={playerName} 
        onPush={handlePush} 
    />        
    <style>{fontStyles}</style>
      
        <header className="w-full bg-[#1a1a1a]/90 backdrop-blur border-b border-[#d4af37] text-center text-[#d4af37] text-sm py-2 font-bold relative z-20">
        {/* Botón para salir/cambiar personaje */}
          <button 
        onClick={() => { if(window.confirm("¿Deseas abandonar la incursión?")) setHasJoined(false); }}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 text-gray-600 hover:text-[#d4af37] transition-colors group"
        >
        <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">Abandonar</span>
          </button>
        <span className="font-consent text-2xl">Trophy (g)Old</span>
        </header>

    { !hasJoined ? (
      <div className="flex-grow flex items-center justify-center p-4 relative z-10 overflow-y-auto">
          <div className="max-w-sm w-full space-y-6 my-8">
            <div className="bg-[#1a1a1a]/95 p-8 border border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.1)]">
              <h1 className="text-6xl font-consent text-[#d4af37] text-center mb-6">Trophy (g)Old</h1>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-[9px] text-gray-500 uppercase absolute -top-2 left-2 bg-[#1a1a1a] px-1">Partida</label>
                  <input 
                    type="text" 
                    placeholder="Título de la partida" 
                    value={roomName} 
                    onChange={e=>setRoomName(e.target.value)} 
                    disabled={new URLSearchParams(window.location.search).has('partida')}
                    className="w-full bg-black text-white p-3 text-center border border-gray-800 outline-none focus:border-[#d4af37] disabled:opacity-50"
                  />
                </div>

                <div className="relative">
                  <label className="text-[9px] text-gray-500 uppercase absolute -top-2 left-2 bg-[#1a1a1a] px-1">
                    {Object.keys(existingCharacters).length > 0 ? "Elige o crea un personaje" : "Tu personaje"}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Nombre del personaje" 
                    value={playerName} 
                    onChange={e=>setPlayerName(e.target.value)} 
                    className="w-full bg-black text-[#f9e29c] p-3 text-center border border-gray-800 outline-none focus:border-[#d4af37] font-bold"
                  />
                </div>
              </div>

              <button onClick={() => handleJoin()} className="w-full mt-6 bg-[#d4af37] text-black font-consent text-xl py-2 tracking-widest hover:bg-white transition-colors">
                {Object.keys(existingCharacters).length > 0 ? "Crear nuevo" : "Entrar"}
              </button>
            </div>

            {/* LISTA DE PERSONAJES EXISTENTES */}
            {Object.keys(existingCharacters).length > 0 && (
              <div className="space-y-3 animate-in fade-in duration-500">
                <p className="text-gray-600 text-[10px] uppercase tracking-widest text-center">Personajes en esta partida</p>
                
                {/* AQUÍ ESTÁ EL CAMBIO: AÑADIMOS EL FILTER PARA EXCLUIR AL Guardián */}
                {Object.entries(existingCharacters)
                  .filter(([name]) => name !== 'Guardián') 
                  .map(([name, data]) => (
                  
                  <button 
                    key={name}
                    onClick={() => handleJoin(name)}
                    className="w-full border border-gray-800 bg-[#0a0a0a]/90 backdrop-blur-sm p-3 flex items-center gap-3 hover:bg-[#1a1a1a] hover:border-[#d4af37] transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-black border border-gray-700 overflow-hidden shrink-0 group-hover:border-[#d4af37]">
                      {data.imageUrl ? <img src={data.imageUrl} className="w-full h-full object-cover" alt=""/> : <div className="w-full h-full flex items-center justify-center text-gray-800 text-xl">?</div>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#d4af37] font-consent text-2xl tracking-wide leading-none mb-1">{name}</span>
                      {data.realPlayerName && <span className="text-[10px] text-gray-600 italic leading-none">jugado por {data.realPlayerName}</span>}
                    </div>
                  </button>
                ))}
                
                {/* BOTÓN ENTRAR COMO Guardián */}
                <button 
                  onClick={() => handleJoin(null, true)}
                  className="w-full mt-4 bg-[#d4af37] text-black font-consent text-xl py-3 tracking-widest hover:bg-white transition-colors"
                >
                  Entrar como Guardián
                </button>
              </div>
            )}
          </div>
        </div>
        ) : (
        <main className="flex-grow flex flex-col items-center p-4 relative z-10">
            <div className="w-full max-w-5xl flex justify-between items-end mb-6 border-b border-[#1a1a1a] pb-2 px-2 bg-black/40">
                <div className="flex flex-col">
                  <p className="text-[10px] text-gray-500 uppercase">Partida</p>
                  <div className="flex items-center gap-2">
                      {/* Usamos displayName si existe, si no, roomName */}
                      <h1 className="text-3xl font-consent text-[#d4af37]">{displayName || roomName}</h1>
                      
                      <button onClick={copyRoomLink} className="text-[#d4af37] hover:text-white transition-colors" title="Copiar enlace">🔗</button>
                  </div>
                </div>
                <div className="flex gap-4 text-[9px] uppercase font-bold">
                    <button onClick={() => setShowRules(true)} className="text-[#d4af37] border border-[#d4af37] px-2 py-1 hover:bg-[#d4af37] hover:text-black transition-colors">[ Reglas ]</button>
                    <button onClick={() => diceBoxInstance?.clear()} className="text-gray-500 hover:text-[#d4af37]">[ Limpiar dados ]</button>
                    <button onClick={handleClearHistory} className="text-gray-500 hover:text-red-500">[ Borrar historial ]</button>
                    <button onClick={handleExit} className="text-gray-500 hover:text-white">[ Salir ]</button>
                </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* COLUMNA IZQUIERDA: DADOS E HISTORIAL */}
                <div className="text-[#d4af37] font-mono text-xs uppercase tracking-widest border-b border-gray-800 pb-1 mb-2">
                  Crónica de la Incursión
                </div>

                {/* Aquí está nuestro nuevo componente */}
                <RollHistory 
                  rolls={rolls} 
                  currentPlayerName={playerName} 
                  onPush={handlePush} 
                />

                {/* Botón de Reglas (Lo dejamos fuera del historial para que sea accesible) */}
                <button 
                  onClick={() => setShowRules(true)}
                  className="w-full bg-gray-900/50 border border-gray-800 text-gray-500 hover:text-[#d4af37] hover:border-[#d4af37] py-2 text-[10px] uppercase tracking-[0.2em] transition-all font-mono"
                >
                  Consultar Reglas
                </button>

                {/* COLUMNA DERECHA: TU FICHA Y GRUPO (JUNTOS) */}
                <div className="w-full flex flex-col space-y-2">
                    <CharacterSheet roomName={roomName} playerName={playerName} role={isGM ? 'guardian' : 'player'} />
                    <PartyView roomName={roomName} currentPlayerName={playerName} isGM={isGM} />
                </div>

            </div>
        </main>
      )}
      <Footer />
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

export default App;