import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from "firebase/database";
import Footer from '../components/ui/Footer';
import { Howl } from 'howler';

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
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {members.map((m, i) => (
        <span key={i} className="border border-[#333] px-2 py-1 text-[#d4af37]">{m.name}</span>
      ))}
    </div>
  );
};

const LobbyScreen = ({ roomName, displayName, onJoin }) => {
  const [name, setName] = useState('');
  const [isGM, setIsGM] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#050505] text-[#d4af37] font-consent">
       <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-5xl mb-6">{displayName || roomName}</h2>
          <LobbyPartyList roomName={roomName} />
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu Nombre..."
                className="bg-transparent border-b border-[#333] text-center text-2xl py-2 outline-none text-[#d4af37]"
              />
              <label className="flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-widest text-gray-500">
                  <input type="checkbox" checked={isGM} onChange={(e) => setIsGM(e.target.checked)} />
                  Soy el Guardián
              </label>
              <button 
                onClick={() => {
                    new Howl({ src: ['/sounds/click.mp3'] }).play();
                    onJoin(name, isGM);
                }}
                disabled={!name && !isGM}
                className="bg-[#d4af37] text-black py-3 uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50"
              >
                  Unirse
              </button>
          </div>
       </div>
       <Footer />
    </div>
  );
};
export default LobbyScreen;