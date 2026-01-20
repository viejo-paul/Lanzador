import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, onValue, update } from "firebase/database";

const CharacterSheet = ({ roomName, playerName, role = 'player' }) => {
    const [stats, setStats] = useState({ 
        ruin: 1, 
        gold: false, 
        inventory: ['', '', ''] 
    });

    useEffect(() => {
        if (!roomName || !playerName || role === 'guardian') return;
        const charRef = ref(database, `rooms/${roomName}/party/${playerName}`);
        return onValue(charRef, (snapshot) => {
            if (snapshot.exists()) setStats(prev => ({ ...prev, ...snapshot.val() }));
        });
    }, [roomName, playerName, role]);

    const updateStat = (field, value) => {
        if (role === 'guardian') return;
        update(ref(database, `rooms/${roomName}/party/${playerName}`), { [field]: value });
    };

    return (
        <div className="border border-gray-800 p-6 bg-black/40 shadow-xl">
            <div className="text-[#d4af37] font-mono text-[10px] uppercase tracking-widest mb-4">Tu estado</div>
            <h2 className="text-3xl text-[#d4af37] font-consent mb-4">{playerName}</h2>
            
            <div className="flex justify-between items-center border-t border-gray-900 pt-4">
                <span className="text-gray-500 font-mono text-xs uppercase">Ruina</span>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                        <button
                            key={num}
                            onClick={() => updateStat('ruin', num)}
                            className={`w-7 h-7 border text-xs ${stats.ruin >= num ? 'bg-red-900/40 border-red-500 text-red-500' : 'border-gray-800 text-gray-700'}`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CharacterSheet;