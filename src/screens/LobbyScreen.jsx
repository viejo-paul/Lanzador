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
};

export default LobbyScreen;