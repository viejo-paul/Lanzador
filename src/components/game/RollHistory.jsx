import React, { useEffect, useRef } from 'react';

const RollHistory = ({ rolls, currentPlayerName, onPush }) => {
    const historyEndRef = useRef(null);

    // Auto-scroll al fondo
    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [rolls]);

    return (
        <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {rolls.length === 0 ? (
                <div className="text-center text-gray-700 italic text-xs py-10">
                    El bosque guarda silencio...
                </div>
            ) : (
                rolls.map((roll) => (
                    <div key={roll.id} className="border-l-2 border-gray-800 pl-3 py-1">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                                {roll.playerName}
                            </span>
                            <span className="text-[10px] text-gray-600 font-mono">
                                {new Date(roll.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2 font-serif leading-relaxed">
                            {roll.action}
                        </div>

                        {/* Visualización de dados */}
                        {(roll.lightDice > 0 || roll.darkDice > 0) && (
                            <div className="bg-black/40 p-2 rounded border border-gray-800/50 mb-2">
                                <div className="flex gap-2 items-center text-xs text-gray-500 font-mono mb-1">
                                    <span>L: {roll.lightDice}</span>
                                    <span>O: {roll.darkDice}</span>
                                    <span className="ml-auto text-gray-400">
                                        Mayor: <span className="text-white">{roll.highest}</span>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {roll.results && roll.results.map((r, i) => (
                                        <span key={i} className={`
                                            w-5 h-5 flex items-center justify-center text-[10px] rounded border
                                            ${r.type === 'light' 
                                                ? 'border-gray-600 bg-gray-800 text-white' 
                                                : 'border-gray-800 bg-black text-gray-400'}
                                            ${r.value === 6 ? 'font-bold ring-1 ring-[#d4af37]' : ''}
                                        `}>
                                            {r.value}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botón de Push (Arriesgar) */}
                        {roll.canPush && roll.playerName === currentPlayerName && !roll.pushed && (
                            <button
                                onClick={() => onPush(roll.id, roll.lightDice, roll.darkDice)}
                                className="w-full mt-1 border border-red-900/50 text-red-500/70 hover:bg-red-900/20 hover:text-red-400 text-[10px] uppercase tracking-widest py-1 transition-colors"
                            >
                                Arriesgar (Push)
                            </button>
                        )}
                        {roll.pushed && (
                            <div className="text-[9px] text-red-700 font-mono uppercase tracking-widest mt-1">
                                — Arriesgado —
                            </div>
                        )}
                    </div>
                ))
            )}
            <div ref={historyEndRef} />
        </div>
    );
};

export default RollHistory;