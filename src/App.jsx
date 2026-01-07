import React, { useState, useEffect, useRef } from 'react';
import { database } from './firebase';
import { ref, push, onValue, limitToLast, query, remove, update } from "firebase/database";
import DiceBox from '@3d-dice/dice-box'; 

// --- IMPORTACIÓN DE FUENTE PERSONALIZADA ---
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manufacturing+Consent&display=swap');
  .font-consent { font-family: 'Manufacturing Consent', sans-serif !important; text-transform: none !important; }
`;

// --- GESTOR DE SONIDOS ---
const playSound = (type) => {
  const sounds = {
    click: '/sounds/click.mp3',
    success: '/sounds/success.mp3',
    fail: '/sounds/fail.mp3',
    ruin: '/sounds/glitch.mp3',
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.5;
  audio.play().catch(e => {});
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
    if (highestValue === 6) { resultText = 'LOGRAS LO QUE QUIERES. DESCRIBE CÓMO O PÍDESELO AL GUARDIÁN.'; resultColor = 'text-[#d4af37] font-bold'; icon = '✨'; soundType = 'success'; }
    else if (highestValue >= 4) { resultText = 'LOGRAS LO QUE QUIERES, PERO CON ALGUNA COMPLICACIÓN. EL GUARDIÁN LA DETERMINA Y TÚ DESCRIBES CÓMO LO CONSIGUES.'; resultColor = 'text-[#f9e29c]'; icon = '⚠️'; soundType = 'fail'; }
    else { resultText = 'FRACASAS Y TODO VA A PEOR. EL GUARDIÁN DESCRIBE CÓMO.'; resultColor = 'text-gray-400'; icon = '💀'; soundType = 'fail'; }
  } 
  else if (rollType === 'hunt') {
    if (highestValue === 6) { 
        resultText = 'GANAS 1 CONTADOR DE EXPLORACIÓN'; 
        resultColor = 'text-[#d4af37] font-bold'; 
        icon = '💎'; 
        soundType = 'success'; 
    }
    else if (highestValue >= 4) { 
        resultText = 'GANAS 1 CONTADOR, PERO ENCUENTRAS ALGO TERRIBLE'; 
        resultColor = 'text-[#f9e29c]'; 
        icon = '⚠️'; 
        soundType = 'fail'; 
    }
    else if (highestValue >= 2) { 
        resultText = 'ENCUENTRAS ALGO TERRIBLE'; 
        resultColor = 'text-gray-400'; 
        icon = '💀'; 
        soundType = 'fail'; 
    }
    else { 
        resultText = 'PIERDES TODOS TUS CONTADORES Y ENCUENTRAS ALGO TERRIBLE'; 
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
    resultText = `DAÑO TOTAL: ${damage}`;
    
    if (ruinHits > 0) {
        // Caso: El monstruo golpea tu punto débil
        resultText += ` | ¡PUNTO DÉBIL GOLPEADO! (+${ruinHits} RUINA)`;
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
    resultText = `DAÑO TOTAL: ${attackTotal}`;
    if (attackTotal >= 10) { resultColor = 'text-red-500 font-bold text-lg animate-pulse'; icon = '⚔️'; soundType = 'ruin'; }
    else if (attackTotal >= 8) { resultColor = 'text-[#d4af37] font-bold'; icon = '🗡️'; soundType = 'success'; }
    else { resultColor = 'text-gray-400'; icon = '🛡️'; soundType = 'fail'; }
  }
  else if (rollType === 'help') {
      const val = dice[0].value;
      resultText = `DADO DE AYUDA: ${val}`;
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

// --- COMPONENTE FICHA PERSONAL ---
const CharacterSheet = ({ roomName, playerName, role = 'player', embedded = false }) => {
  const [stats, setStats] = useState({ ruin: 1, ruinInitial: 1, gold: 0, debt: 0, tokens: 0, goldReserve: 0, occupation: '', background: '', drive: '', skills: '', rituals: '', backpack: '', armor: '', weapons: '', foundGear: '', conditions: '', imageUrl: '', realPlayerName: '', notes: '' });
  const [isExpanded, setIsExpanded] = useState(embedded); // Si está incrustada, empieza expandida
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, `rooms/${roomName}/characters/${playerName}`), s => s.val() && setStats(s.val()));
    return () => unsubscribe();
  }, [roomName, playerName]);

  const handleChange = (f, v) => { 
      const newStats = {...stats, [f]: v};
      setStats(newStats); 
      update(ref(database, `rooms/${roomName}/characters/${playerName}`), newStats); 
  };

  // --- RENDERIZADO PARA GUARDIÁN (CON AVATAR Y DATOS) ---
  if (role === 'guardian') {
    return (
      <>
      <style>{fontStyles}</style>
      <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} imageUrl={stats.imageUrl} title={playerName} />
      <div className="w-full border border-[#d4af37] mb-6 shadow-lg transition-all bg-[#1a1a1a]/90 backdrop-blur-sm relative z-10">
         <div onClick={() => {setIsExpanded(!isExpanded); playSound('click');}} className="p-3 bg-black/80 flex items-center justify-between cursor-pointer border-b border-gray-800">
            <div className="flex items-center gap-3">
              {!isExpanded && stats.imageUrl && <img src={stats.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]" />}
              <span className="text-[#d4af37] font-consent text-xl tracking-widest">Guardián</span>
            </div>
            <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
         </div>
         {isExpanded && (
           <div className="p-4 animate-in slide-in-from-top-2">
             
             {/* Bloque de Avatar y Nombre Real (Igual que ficha de jugador) */}
             <div className="flex flex-col items-center mb-6">
                <div className="w-full flex justify-end mb-2">
                   <div className="flex flex-col items-end">
                     <label className="text-[9px] text-gray-600 uppercase tracking-tighter">Jugador/a</label>
                     <input type="text" value={stats.realPlayerName || ''} onChange={e=>handleChange('realPlayerName', e.target.value)} className="bg-transparent text-gray-500 text-[10px] text-right outline-none border-b border-gray-900 focus:border-gray-700 w-24" placeholder="Nombre..."/>
                   </div>
                </div>
                <div onClick={() => stats.imageUrl && setIsModalOpen(true)} className={`w-24 h-24 rounded-full border-2 border-[#d4af37] bg-black overflow-hidden ${stats.imageUrl ? 'cursor-zoom-in hover:border-white transition-colors' : ''}`}>
                   {stats.imageUrl ? <img src={stats.imageUrl} className="w-full h-full object-cover" alt="Avatar"/> : <div className="w-full h-full flex items-center justify-center text-[#d4af37] opacity-20 text-4xl">?</div>}
                </div>
             </div>

             <label className="text-[#d4af37] uppercase block mb-1">Notas de la partida</label>
             <textarea value={stats.notes || ''} onChange={e=>handleChange('notes',e.target.value)} className="w-full bg-black text-gray-400 border border-gray-800 p-2 outline-none min-h-[10rem]"/>
             
             {/* Campo URL Imagen */}
             <div className="mt-4">
                <label className="text-gray-600 uppercase block mb-1 text-xs">URL Imagen (Retrato)</label>
                <input type="text" value={stats.imageUrl||''} onChange={e=>handleChange('imageUrl',e.target.value)} className="w-full bg-black text-gray-600 text-[10px] border border-gray-800 p-2 outline-none"/>
             </div>
           </div>
         )}
      </div>
      </>
    );
  }

  // --- RENDERIZADO NORMAL (JUGADOR) ---
  return (
    <>
    <style>{fontStyles}</style>
    <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} imageUrl={stats.imageUrl} title={playerName} />
    <div className={`w-full border border-[#d4af37] ${embedded ? 'border-t-0' : 'mb-6 shadow-lg'} transition-all bg-[#1a1a1a]/90 backdrop-blur-sm relative z-10`}>
      {/* Si es incrustada (vista por el Guardián en la lista), no mostramos la cabecera "TU FICHA" porque ya tiene la del acordeón */}
      {!embedded && (
        <div onClick={() => {setIsExpanded(!isExpanded); playSound('click');}} className="p-3 bg-black/80 flex items-center justify-between cursor-pointer border-b border-gray-800">
            <div className="flex items-center gap-3">
            {!isExpanded && stats.imageUrl && <img src={stats.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#d4af37]" />}
            <span className="text-[#d4af37] font-consent text-2xl tracking-widest">{playerName}</span>
            </div>
            <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
        </div>
      )}
      
      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col items-center mb-6">
             <div className="w-full flex justify-end mb-2">
                <div className="flex flex-col items-end">
                  <label className="text-[10px] text-gray-600 uppercase tracking-tighter">Jugador/a</label>
                  <input type="text" value={stats.realPlayerName || ''} onChange={e=>handleChange('realPlayerName', e.target.value)} className="bg-transparent text-gray-500 text-[10px] text-right outline-none border-b border-gray-900 focus:border-gray-700 w-24" placeholder="Nombre..."/>
                </div>
             </div>
             <div onClick={() => stats.imageUrl && setIsModalOpen(true)} className={`w-24 h-24 rounded-full border-2 border-[#d4af37] bg-black overflow-hidden ${stats.imageUrl ? 'cursor-zoom-in hover:border-white transition-colors' : ''}`}>
                {stats.imageUrl ? <img src={stats.imageUrl} className="w-full h-full object-cover" alt="Avatar"/> : <div className="w-full h-full flex items-center justify-center text-[#d4af37] opacity-20 text-4xl">?</div>}
             </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="col-span-2 border border-gray-700 p-1 bg-black">
                <label className="text-[11px] text-gray-500 uppercase block text-center mb-1">Ruina (Inicial / Actual)</label>
                <div className="flex items-center gap-1">
                    <input type="number" min="1" max="6" value={stats.ruinInitial || 1} onChange={e=>handleChange('ruinInitial',+e.target.value)} className="w-full bg-[#111] text-gray-400 text-center font-bold outline-none border-r border-gray-800"/>
                    <span className="text-gray-600">/</span>
                    <input type="number" min="1" max="6" value={stats.ruin} onChange={e=>handleChange('ruin',+e.target.value)} className={`w-full bg-[#111] text-center font-bold outline-none ${stats.ruin>=5 ? 'text-red-500 animate-pulse' : 'text-white'}`}/>
                </div>
            </div>
            <div className="border border-gray-700 p-1 bg-black"><label className="text-[11px] text-[#f9e29c] uppercase block text-center mb-1">Oro</label><input type="number" value={stats.gold} onChange={e=>handleChange('gold',+e.target.value)} className="w-full bg-transparent text-[#d4af37] text-center font-bold outline-none"/></div>
             <div className="border border-gray-700 p-1 bg-black"><label className="text-[11px] text-red-400 uppercase block text-center mb-1">Deuda</label><input type="number" value={stats.debt || 0} onChange={e=>handleChange('debt',+e.target.value)} className="w-full bg-transparent text-red-400 text-center font-bold outline-none"/></div>
          </div>
          <div className="mb-4 border border-[#d4af37]/50 p-2 bg-[#d4af37]/5 flex justify-between items-center">
                 <label className="text-sm text-[#d4af37] uppercase font-bold">Contadores Exploración</label>
                 <input type="number" value={stats.tokens || 0} onChange={e=>handleChange('tokens',+e.target.value)} className="w-16 bg-black border border-[#d4af37] text-[#d4af37] font-bold text-center p-1"/>
          </div>
          <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Ocupación</label>
                <input type="text" value={stats.occupation} onChange={e=>handleChange('occupation',e.target.value)} className="w-full bg-black text-white text-sm border border-gray-800 p-2 outline-none focus:border-[#d4af37]"/>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Trasfondo</label>
                <input type="text" value={stats.background} onChange={e=>handleChange('background',e.target.value)} className="w-full bg-black text-white text-sm border border-gray-800 p-2 outline-none focus:border-[#d4af37]"/>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Motivación</label>
                <input type="text" value={stats.drive} onChange={e=>handleChange('drive',e.target.value)} className="w-full bg-black text-white text-sm border border-gray-800 p-2 outline-none focus:border-[#d4af37]"/>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div><label className="text-gray-500 uppercase block mb-1">Habilidades (4)</label><textarea rows="4" value={stats.skills} onChange={e=>handleChange('skills',e.target.value)} className="w-full bg-black text-gray-300 border border-gray-700 p-1 resize-none leading-5 outline-none"/></div>
              <div><label className="text-gray-500 uppercase block mb-1">Rituales (3)</label><textarea rows="4" value={stats.rituals} onChange={e=>handleChange('rituals',e.target.value)} className="w-full bg-black text-gray-300 border border-gray-700 p-1 resize-none leading-5 outline-none"/></div>
          </div>
          <div className="space-y-3 text-xs">
             <div><label className="text-red-500 uppercase block mb-1 font-bold">Estados</label><textarea rows="6" value={stats.conditions} onChange={e=>handleChange('conditions',e.target.value)} placeholder="---" className="w-full bg-black text-gray-300 border border-gray-700 p-2 resize-none outline-none"/></div>
             <div><label className="text-gray-500 uppercase block mb-1">Mochila (6)</label><textarea rows="6" value={stats.backpack} onChange={e=>handleChange('backpack',e.target.value)} className="w-full bg-black text-gray-300 border border-gray-700 p-2 resize-none outline-none"/></div>
             <div className="grid grid-cols-2 gap-2">
                <div><label className="text-gray-500 uppercase block mb-1">Armas</label><textarea rows="5" value={stats.weapons} onChange={e=>handleChange('weapons',e.target.value)} className="w-full bg-black text-gray-300 border border-gray-700 p-1 resize-none outline-none"/></div>
                <div><label className="text-gray-500 uppercase block mb-1">Armadura</label><textarea rows="5" value={stats.armor} onChange={e=>handleChange('armor',e.target.value)} className="w-full bg-black text-gray-300 border border-gray-700 p-1 resize-none outline-none"/></div>
             </div>
             <div><label className="text-[#d4af37] uppercase block mb-1">Equipo Encontrado</label><textarea value={stats.foundGear} onChange={e=>handleChange('foundGear',e.target.value)} className="w-full bg-black text-[#f9e29c] border border-[#d4af37] p-2 outline-none min-h-[4rem]"/></div>
             
             <div className="mb-4 border border-[#d4af37]/50 p-2 bg-[#d4af37]/5 flex justify-between items-center">
                 <label className="text-sm text-[#d4af37] uppercase font-bold">Reserva de Oro</label>
                 <input type="number" value={stats.goldReserve || 0} onChange={e=>handleChange('goldReserve',+e.target.value)} className="w-16 bg-black border border-[#d4af37] text-[#d4af37] font-bold text-center p-1"/>
             </div>

             <div><label className="text-gray-600 uppercase block mb-1">URL Imagen (Retrato)</label><input type="text" value={stats.imageUrl||''} onChange={e=>handleChange('imageUrl',e.target.value)} className="w-full bg-black text-gray-600 text-[10px] border border-gray-800 p-2 outline-none"/></div>
             <div><label className="text-[#d4af37] uppercase block mb-1">Notas</label><textarea value={stats.notes || ''} onChange={e=>handleChange('notes',e.target.value)} className="w-full bg-black text-gray-400 border border-gray-800 p-2 outline-none min-h-[4rem]"/></div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// --- COMPONENTE VISTA GRUPO ---
const PartyView = ({ roomName, currentPlayerName, isGM }) => {
  const [party, setParty] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [modalImage, setModalImage] = useState({ open: false, url: '', name: '' });
  useEffect(() => { if(!roomName)return; return onValue(ref(database, `rooms/${roomName}/characters`), s => s.val() && setParty(s.val())); }, [roomName]);
  const toggle = (n) => { setExpandedCards(p => ({...p, [n]: !p[n]})); playSound('click'); };
  
  // Si soy el Guardián, quiero ver a TODOS los jugadores (excepto a mí mismo, que soy 'Guardián')
const players = Object.entries(party).filter(([n]) => n !== currentPlayerName && n !== 'Guardián');
  
  if(players.length===0) return null;
  return (
    <>
    <ImageModal isOpen={modalImage.open} onClose={() => setModalImage({ ...modalImage, open: false })} imageUrl={modalImage.url} title={modalImage.name} />
    <div className="w-full relative z-10">
      <h3 className="text-gray-500 text-xs uppercase tracking-[0.3em] text-center mb-6">Grupo</h3>
      <div className="space-y-3">
        {players.map(([n, s]) => (
          <div key={n} className="border border-gray-800 bg-[#0a0a0a]/90 backdrop-blur-sm">
             <div onClick={()=>toggle(n)} className="flex justify-between p-3 cursor-pointer hover:bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                   <div onClick={(e) => { if(s.imageUrl) { e.stopPropagation(); setModalImage({ open: true, url: s.imageUrl, name: n }); } }} className={`w-10 h-10 rounded-full bg-black border border-gray-700 overflow-hidden ${s.imageUrl ? 'cursor-zoom-in hover:border-[#d4af37]' : ''}`}>
                    {s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover" alt={n}/> : null}
                   </div>
                   <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[#d4af37] font-consent text-xl tracking-wide">{n}</span>
                        {s.realPlayerName && <span className="text-[10px] text-gray-600 italic">({s.realPlayerName})</span>}
                      </div>
                      <div className="flex gap-2 text-[10px] uppercase">
                           <span className={s.ruin>=5?'text-red-500 font-bold':'text-gray-500'}>Ruina: {s.ruin}</span>
                           <span className="text-[#f9e29c]">Oro: {s.gold}</span>
                           <span className="text-red-400 text-[9px]">Deuda: {s.debt||0}</span>
                           <span className="text-[#d4af37] text-[9px]">Contadores: {s.tokens||0}</span>
                      </div>
                   </div>
                </div>
                <span className="text-gray-600">{expandedCards[n] ? '▲' : '▼'}</span>
             </div>
             {expandedCards[n] && (
               <div className="bg-black/50 border-t border-gray-900 animate-in slide-in-from-top-1">
                  {isGM ? (
                    // VISTA COMPLETA PARA EL GUARDIÁN (usando el componente CharacterSheet incrustado)
                    <CharacterSheet roomName={roomName} playerName={n} embedded={true} />
                  ) : (
                    // VISTA RESUMEN PARA JUGADORES NORMALES
                    <div className="p-3 text-xs space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-gray-600 block text-[9px] uppercase">Ocupación</span><p className="text-gray-300">{s.occupation || '-'}</p></div>
                          <div><span className="text-gray-600 block text-[9px] uppercase">Trasfondo</span><p className="text-gray-300">{s.background || '-'}</p></div>
                      </div>
                      <div><span className="text-gray-600 block text-[9px] uppercase">Motivación</span><p className="text-gray-300">{s.drive || '-'}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-gray-600 block text-[9px] uppercase mb-1">Habilidades</span><pre className="text-gray-400 font-serif whitespace-pre-wrap border-t border-gray-800 pt-1">{s.skills || '-'}</pre></div>
                        <div><span className="text-gray-600 block text-[9px] uppercase mb-1">Rituales</span><pre className="text-gray-400 font-serif whitespace-pre-wrap border-t border-gray-800 pt-1">{s.rituals || '-'}</pre></div>
                      </div>
                      <div className="border border-red-900/30 p-2">
                        <span className="text-red-500 block text-[11px] uppercase mb-1 font-bold">Estados</span>
                        <p className={s.conditions?'text-red-400 font-bold':'text-green-500'}>{s.conditions||'---'}</p>
                      </div>
                      {s.goldReserve > 0 && (
                        <div className="text-[#d4af37] text-[10px] font-bold uppercase border-t border-gray-800 pt-1">Reserva de Oro: {s.goldReserve}</div>
                      )}
                      {s.notes && (<div><span className="text-gray-600 block text-[9px] uppercase mb-1">Notas</span><p className="text-gray-400 italic text-[10px] border-t border-gray-800 pt-1">{s.notes}</p></div>)}
                    </div>
                  )}
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

// --- MODAL DE REGLAS ---
const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#d4af37] max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-[0_0_30px_rgba(212,175,55,0.2)] relative">
        <div className="sticky top-0 bg-[#d4af37] text-black p-3 flex justify-between items-center font-bold uppercase tracking-widest z-10">Grimorio de Reglas <button onClick={onClose} className="text-xl px-2">×</button></div>
        <div className="p-6 space-y-6 text-gray-300 font-serif text-sm">
          <section><h3 className="text-[#d4af37] font-bold uppercase border-b border-gray-700 mb-2">Riesgo</h3><ul className="space-y-1"><li>6: Éxito total.</li><li>4-5: Éxito con coste.</li><li>1-3: Fallo.</li></ul></section>
          <section><h3 className="text-[#d4af37] font-bold uppercase border-b border-gray-700 mb-2">Combate</h3><p>Suma los 2 dados más altos.</p></section>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isGM, setIsGM] = useState(false); // Nuevo estado para Guardián
  const [existingCharacters, setExistingCharacters] = useState({});
  const [lightCount, setLightCount] = useState(1);
  const [darkCount, setDarkCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [rollType, setRollType] = useState('risk');
  const [showRules, setShowRules] = useState(false);
  
  const [diceBoxInstance, setDiceBoxInstance] = useState(null);
  const isInitialLoad = useRef(true);

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
    document.title = "Trophy (g)Old";
    const p = new URLSearchParams(window.location.search);
    const partidaURL = p.get('partida');
    if (partidaURL) {
      setRoomName(partidaURL);
      onValue(ref(database, `rooms/${partidaURL}/characters`), (snapshot) => {
        if (snapshot.exists()) { setExistingCharacters(snapshot.val()); } 
        else { setExistingCharacters({}); }
      });
    }
  }, []);

  useEffect(() => {
    if (!isJoined || !roomName) return;
    return onValue(query(ref(database, `rooms/${roomName}/rolls`), limitToLast(20)), s => {
      if(s.val()) setHistory(Object.values(s.val()).sort((a,b)=>b.id-a.id));
      else setHistory([]);
    });
  }, [isJoined, roomName]);

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

      // Solo si es NUEVA partida (no hay ?partida= en la URL)
      if (!new URLSearchParams(window.location.search).has('partida')) {
        const cleanName = slugify(roomName);
        const randomID = generateRandomID();
        finalRoomName = `${cleanName}-${randomID}`;
        setRoomName(finalRoomName);
      }

      setPlayerName(nameToJoin);
      setIsGM(asGuardian); // Establecer si es Guardián
      setIsJoined(true);
      playSound('click');
      window.history.pushState({}, '', `?partida=${finalRoomName}`);
    }
  };

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-serif relative overflow-hidden">
      <style>{fontStyles}</style>
      
      <header className="w-full bg-[#1a1a1a]/90 backdrop-blur border-b border-[#d4af37] text-center text-[#d4af37] text-sm py-2 font-bold relative z-20">
        <span className="font-consent text-2xl">Trophy (g)Old</span>
      </header>

      {!isJoined ? (
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
                
                {/* AQUÍ ESTÁ EL CAMBIO: AÑADIMOS EL FILTER PARA EXCLUIR AL GUARDIÁN */}
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
                
                {/* BOTÓN ENTRAR COMO GUARDIÁN */}
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
                    <h1 className="text-3xl font-consent text-[#d4af37]">{roomName}</h1>
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
                <div className="w-full space-y-8">
                    <div className="bg-[#1a1a1a]/90 p-5 border border-gray-800 shadow-xl">
                        <div className="grid grid-cols-4 gap-1 mb-6 bg-black p-1">
                            {['risk','hunt','combat','help'].map(t=>(<button key={t} onClick={()=>setRollType(t)} className={`py-2 text-[10px] uppercase font-bold transition-all ${rollType===t?(t==='combat'?'bg-red-900':'bg-[#d4af37] text-black'):'text-gray-500 hover:text-gray-300'}`}>{t==='risk'?'Riesgo':t==='hunt'?'Explor.':t==='combat'?'Combate':'Ayuda'}</button>))}
                        </div>
                        {rollType!=='help' && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* COLUMNA 1: DADOS CLAROS / PUNTO DÉBIL */}
                          <div>
                              <label className="block text-[11px] text-[#d4af37] mb-1 uppercase text-center">
                                  {rollType === 'combat' ? 'Punto Débil (Claro)' : 'Claros'}
                              </label>
                              <div className="flex items-center justify-between border border-[#d4af37] bg-black h-10">
                                  <button onClick={()=>updateDiceCount(setLightCount,lightCount,-1)} className="px-3 h-full text-[#d4af37] hover:bg-[#d4af37] hover:text-black">-</button>
                                  <span className="font-bold">{lightCount}</span>
                                  <button onClick={()=>updateDiceCount(setLightCount,lightCount,1)} className="px-3 h-full text-[#d4af37] hover:bg-[#d4af37] hover:text-black">+</button>
                              </div>
                          </div>
                          
                          {/* COLUMNA 2: DADOS OSCUROS (Oculto en Exploración/Hunt) */}
                          {rollType!=='hunt' && (
                              <div>
                                  <label className="block text-[11px] text-gray-500 mb-1 uppercase text-center">Oscuros</label>
                                  <div className="flex items-center justify-between border border-gray-600 bg-black h-10">
                                      <button onClick={()=>updateDiceCount(setDarkCount,darkCount,-1)} className="px-3 h-full text-gray-500 hover:bg-gray-600 hover:text-white">-</button>
                                      <span className="font-bold">{darkCount}</span>
                                      <button onClick={()=>updateDiceCount(setDarkCount,darkCount,1)} className="px-3 h-full text-gray-500 hover:bg-gray-600 hover:text-white">+</button>
                                  </div>
                              </div>
                          )}
                        </div>
                      )}
                        <button onClick={handleRoll} className={`w-full font-consent text-3xl py-2 shadow-lg ${rollType==='combat'?'bg-red-900':'bg-[#d4af37] text-black'}`}>
                          {rollType === 'combat' ? '¡Atacar!' : rollType === 'hunt' ? 'Explorar' : rollType === 'help' ? 'Prestar ayuda' : 'Tirar dados'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {history.map((roll, index) => (
                        <div key={roll.id} className={`bg-[#1a1a1a]/95 p-4 border-l-4 shadow-lg animate-in slide-in-from-top-2 ${roll.rollType === 'combat' ? 'border-red-900' : 'border-[#d4af37]'}`}>
                            <div className="flex justify-between items-baseline mb-3 border-b border-black pb-2">
                                <span className="text-[#f9e29c] font-consent text-2xl">{roll.player} <span className="text-[10px] text-gray-500 font-serif ml-1 border border-gray-800 px-1 uppercase tracking-tighter">{roll.rollType === 'risk' ? 'Riesgo' : roll.rollType === 'hunt' ? 'Explor.' : roll.rollType === 'combat' ? 'Combate' : 'Ayuda'}</span> {roll.isPush && <span className="text-red-500 ml-1 font-serif text-xs">PUSH</span>}</span>
                                <span className="text-[10px] text-gray-600 font-mono">{roll.timestamp}</span>
                            </div>
                            <div className="mb-4">
                                <span className={`font-bold uppercase text-xs tracking-widest ${roll.analysis?.color}`}>{roll.analysis?.icon} {roll.analysis?.label}</span>
                                {roll.analysis?.isDarkHighest && <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-900/10 p-1 border border-red-900/50">⚠️ ¡DADO OSCURO DOMINA! (+1 RUINA)</div>}
                            </div>
                            <div className="flex gap-3 mb-2">
                                {roll.dice.map(d => (<div key={d.id} className={`w-10 h-10 flex items-center justify-center text-xl font-bold ${d.type==='light'?'bg-[#d4af37] text-black':'bg-black text-white border border-gray-700'}`}>{d.value}</div>))}
                            </div>
                            {index === 0 && roll.player === playerName && roll.rollType!=='help' && (<button onClick={()=>handlePush(roll)} className="mt-3 w-full border border-gray-700 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37] text-[10px] uppercase py-2">¿Tentar al destino? (+1 Oscuro)</button>)}
                        </div>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: TU FICHA Y GRUPO (JUNTOS) */}
                <div className="w-full flex flex-col space-y-2">
                    <CharacterSheet roomName={roomName} playerName={playerName} role={isGM ? 'guardian' : 'player'} />
                    <PartyView roomName={roomName} currentPlayerName={playerName} isGM={isGM} />
                </div>

            </div>
        </main>
      )}
      <footer className="w-full bg-[#1a1a1a] border-t border-gray-900 text-center text-gray-300 text-[10px] py-1 font-mono uppercase">v.0.4.8.5 · Viejo · viejorpg@gmail.com</footer>
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

export default App;