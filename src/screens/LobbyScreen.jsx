<<<<<<< HEAD
// src/screens/LobbyScreen.jsx
import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from "firebase/database";
import { Howl } from 'howler';
import Footer from '../components/ui/Footer';

// --- SUB-COMPONENTE: LISTA DE JUGADORES EN LA SALA ---
const LobbyPartyList = ({ roomName }) => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const partyRef = ref(database, `rooms/${roomName}/party`);
    return onValue(partyRef, (snapshot) => {
      const data = snapshot.val();
      setMembers(data ? Object.values(data) : []);
    });
  }, [roomName]);

  if (members.length === 0) return null;

  return (
    <div className="animate-fade-in mb-6">
      <p className="text-gray-600 font-mono text-[9px] uppercase tracking-[0.2em] mb-3">En el umbral se encuentran:</p>
      <div className="flex flex-wrap justify-center gap-3">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1 border border-gray-900 bg-[#050505]">
            <span className="text-[#d4af37] font-consent text-xl">{m.name}</span>
            {m.isGM && <span className="text-[10px] opacity-50">◈</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL: PANTALLA DE LOBBY ---
const LobbyScreen = ({ roomName, displayName, onJoin }) => {
  // Estado local del formulario
  const [localName, setLocalName] = useState('');
  const [localIsGM, setLocalIsGM] = useState(false);

  // Sonido local para el botón
  const playClick = () => {
    new Howl({ src: ['/sounds/click.mp3'], volume: 0.5 }).play();
  };

  const handleJoinClick = () => {
    if (!localName.trim()) return;
    
    // 1. Guardar en localStorage (Persistencia)
    localStorage.setItem(`trophy_name_${roomName}`, localName);
    if (localIsGM) localStorage.setItem(`trophy_role_${roomName}`, 'gm');
    else localStorage.removeItem(`trophy_role_${roomName}`);

    playClick();

    // 2. Avisar a App.jsx de que entramos
    onJoin(localName, localIsGM);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#050505] text-[#d4af37] font-consent relative animate-fade-in">
       {/* Fondo sutil */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#111] via-[#000] to-[#000] -z-10"></div>

       <div className="flex-grow flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-8 border-y border-[#333] py-10 bg-black/80 backdrop-blur-sm relative">
            
            {/* Título */}
            <div>
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2">Estás llegando a</p>
                <h1 className="text-5xl md:text-6xl text-[#d4af37] tracking-tighter leading-none mb-6">
                    {displayName || roomName}
                </h1>
            </div>

            {/* Lista de gente */}
            <LobbyPartyList roomName={roomName} />

            <div className="h-px w-16 bg-[#333] mx-auto"></div>

            {/* Formulario */}
            <div className="flex flex-col gap-6 px-8">
                <div className="space-y-2">
                    <label className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Tu identidad</label>
                    <input 
                        type="text" 
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        placeholder="Nombre..."
                        className="w-full bg-transparent border-b border-[#333] text-center text-3xl py-2 text-[#d4af37] focus:border-[#d4af37] outline-none transition-colors font-consent placeholder-gray-800"
                    />
                </div>

                <label className="flex items-center justify-center gap-3 cursor-pointer group select-none opacity-60 hover:opacity-100 transition-opacity">
                    <div className={`w-3 h-3 border border-[#d4af37] transition-all ${localIsGM ? 'bg-[#d4af37]' : 'bg-transparent'}`}></div>
                    <input 
                        type="checkbox" 
                        checked={localIsGM} 
                        onChange={(e) => {
                            setLocalIsGM(e.target.checked);
                            if(e.target.checked) setLocalName("Guardián");
                            else if(localName === "Guardián") setLocalName("");
                        }} 
                        className="hidden"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-[#d4af37]">
                        Soy el Guardián
                    </span>
                </label>

                <button 
                    onClick={handleJoinClick}
                    disabled={!localName.trim()}
                    className="w-full bg-[#d4af37] text-black font-mono uppercase tracking-widest py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Unirse a la incursión
                </button>
            </div>
          </div>
       </div>

       <Footer />
    </div>
  );
=======
import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, update } from "firebase/database";
import Footer from '../components/ui/Footer';

const LobbyScreen = ({ roomName, playerName, isGM, onJoin }) => {
    const [party, setParty] = useState([]);

    useEffect(() => {
        const partyRef = ref(database, `rooms/${roomName}/party`);
        return onValue(partyRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setParty(Object.values(data));
            } else {
                setParty([]);
            }
        });
    }, [roomName]);

    return (
        <div className="flex flex-col h-screen bg-black text-gray-300 font-sans selection:bg-[#d4af37] selection:text-black">
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-[#d4af37] font-mono text-xs uppercase tracking-[0.3em]">Incursión</h2>
                        <h1 className="text-4xl text-white font-serif tracking-tight border-b border-gray-800 pb-4">
                            {roomName}
                        </h1>
                    </div>

                    <div className="bg-gray-900/30 border border-gray-800 p-6 backdrop-blur-sm">
                        <h3 className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-6">
                            Miembros de la Expedición
                        </h3>
                        <div className="space-y-3">
                            {party.length === 0 ? (
                                <p className="text-gray-600 italic">Esperando almas...</p>
                            ) : (
                                party.map((member, index) => (
                                    <div key={index} className="flex justify-between items-center border-b border-gray-800/50 pb-2 last:border-0">
                                        <span className={member.name === playerName ? "text-[#d4af37] font-medium" : "text-gray-400"}>
                                            {member.name} {member.name === playerName && "(Tú)"}
                                        </span>
                                        <span className="text-xs font-mono text-gray-600 uppercase">
                                            {member.role === 'guardian' ? 'Guardián' : 'Buscatrofeos'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onJoin}
                        className="w-full bg-[#d4af37] text-black hover:bg-[#c5a028] font-bold py-4 px-8 tracking-widest uppercase transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    >
                        Adentrarse en el Bosque
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
>>>>>>> 651af245cae729527b38958d5c001d40cbe7ceeb
};

export default LobbyScreen;