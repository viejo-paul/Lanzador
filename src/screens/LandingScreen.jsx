import React, { useState, useEffect } from 'react';
import { ref, update } from "firebase/database";
import { database } from '../firebase';
import Footer from '../components/ui/Footer';

const LandingScreen = () => {
  const [landingTitle, setLandingTitle] = useState('');
  const [isCreatorGM, setIsCreatorGM] = useState(true);
  const [creatorName, setCreatorName] = useState('');
  const [recentGames, setRecentGames] = useState([]);
  const [randomTagline] = useState("El bosque te reclama", 
      "La deuda debe pagarse",
      "No volverás igual que te fuiste",
      "El tesoro es una trampa",
      "La ruina te espera");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('trophy_recent_games') || '[]');
    setRecentGames(saved);
  }, []);

  const handleCreateIncursion = () => {
      if (!landingTitle.trim()) return;
      const slug = landingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const id = `${slug}-${Math.random().toString(36).substr(2, 4)}`;
      
      const newHistory = [{ title: landingTitle, id, date: Date.now() }, ...recentGames].slice(0, 3);
      localStorage.setItem('trophy_recent_games', JSON.stringify(newHistory));

      if (isCreatorGM) localStorage.setItem(`trophy_role_${id}`, 'gm');
      else localStorage.setItem(`trophy_name_${id}`, creatorName);

      update(ref(database, `rooms/${id}`), { title: landingTitle, created: Date.now() })
        .then(() => window.location.href = `?partida=${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#050505] text-[#d4af37] font-consent">
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-9xl mb-4 tracking-tighter">Trophy (g)Old</h1>
            <p className="font-mono text-xs uppercase tracking-widest mb-10">{randomTagline}</p>
            
            <input 
                type="text" 
                value={landingTitle}
                onChange={(e) => setLandingTitle(e.target.value)}
                placeholder="Nombre de la Incursión..."
                className="bg-transparent border-b border-[#333] text-center text-4xl text-[#d4af37] focus:border-[#d4af37] outline-none mb-8 w-full max-w-md"
            />
            
            <button onClick={handleCreateIncursion} className="border border-[#d4af37] px-8 py-3 uppercase tracking-widest hover:bg-[#d4af37] hover:text-black transition-colors">
                Comenzar
            </button>

            {recentGames.length > 0 && (
                <div className="mt-12 flex flex-col gap-2">
                    {recentGames.map(g => (
                        <a key={g.id} href={`?partida=${g.id}`} className="text-gray-500 hover:text-[#d4af37] text-xl">
                            {g.title}
                        </a>
                    ))}
                </div>
            )}
        </div>
        <Footer />
    </div>
  );
};
export default LandingScreen;