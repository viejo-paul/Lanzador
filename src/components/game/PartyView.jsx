import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, onValue } from "firebase/database";

const PartyView = ({ roomName, currentPlayerName }) => {
    const [party, setParty] = useState([]);

    useEffect(() => {
        const partyRef = ref(database, `rooms/${roomName}/party`);
        return onValue(partyRef, (snapshot) => {
            const data = snapshot.val();
            setParty(data ? Object.values(data) : []);
        });
    }, [roomName]);

    return (
        <div className="border border-gray-800 p-4 bg-black/20 mt-4">
            <h3 className="text-gray-600 font-mono text-[10px] uppercase tracking-widest mb-4">Compañeros</h3>
            <div className="space-y-2">
                {party.map((m, i) => m.name !== currentPlayerName && (
                    <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-400">{m.name}</span>
                        <span className="text-[#d4af37] font-mono">R:{m.ruin}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartyView;