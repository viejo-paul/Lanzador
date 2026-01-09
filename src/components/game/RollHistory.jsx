import React from 'react';

const RollHistory = ({ rolls, currentPlayerName, onPush }) => {
  return (
    <div className="w-full bg-[#111] border border-gray-800 p-4 h-96 overflow-y-auto flex flex-col-reverse shadow-inner">
        {rolls.length === 0 && <div className="text-center text-gray-600 text-xs mt-10">SILENCIO...</div>}
        
        {rolls.map((roll) => (
            <div key={roll.id} className="mb-4 border-b border-gray-800 pb-2">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[#d4af37] font-bold uppercase">{roll.player}</span>
                    <span className="text-gray-600 text-[10px]">{new Date(roll.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-400 text-sm italic mb-2">{roll.action}</div>
                
                {/* Dados */}
                <div className="flex gap-2 mb-2">
                    {roll.dice.map(d => (
                        <div key={d.id} className={`w-6 h-6 flex items-center justify-center text-sm font-bold border ${d.type === 'light' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black text-white border-gray-600'}`}>
                            {d.value}
                        </div>
                    ))}
                </div>
                
                {/* Botón Push simplificado */}
                {roll.player === currentPlayerName && !['help','combat'].includes(roll.rollType) && (
                    <button onClick={() => onPush(roll)} className="w-full text-[10px] uppercase text-gray-500 hover:text-[#d4af37] border border-transparent hover:border-[#d4af37]">
                        Push?
                    </button>
                )}
            </div>
        ))}
    </div>
  );
};
export default RollHistory;