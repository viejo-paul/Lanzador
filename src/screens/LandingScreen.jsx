<<<<<<< HEAD
// src/screens/LandingScreen.jsx
import React, { useState, useEffect } from 'react';
import { ref, update } from "firebase/database";
import { database } from '../firebase'; // Asegúrate de que la ruta a firebase.js sea correcta
import Footer from '../components/ui/Footer';

const LandingScreen = () => {
  // Estados propios de esta pantalla
=======
import React, { useState, useEffect } from 'react';
import { ref, update } from "firebase/database";
import { database } from '../firebase';
import Footer from '../components/ui/Footer';

const LandingScreen = () => {
>>>>>>> 651af245cae729527b38958d5c001d40cbe7ceeb
  const [landingTitle, setLandingTitle] = useState('');
  const [isCreatorGM, setIsCreatorGM] = useState(true);
  const [creatorName, setCreatorName] = useState('');
  const [recentGames, setRecentGames] = useState([]);
<<<<<<< HEAD
  
  // Frases de ambientación
  const taglines = [
      "El bosque te reclama", "La deuda debe pagarse", "No volverás igual que te fuiste", "El tesoro es una trampa", "La ruina te espera"
  ];
  const [randomTagline] = useState(() => taglines[Math.floor(Math.random() * taglines.length)]);

  // Cargar historial al entrar
  useEffect(() => {
    const savedGames = JSON.parse(localStorage.getItem('trophy_recent_games') || '[]');
    setRecentGames(savedGames);
  }, []);

  // Función para CREAR la partida
  const handleCreateIncursion = () => {
      if (!landingTitle.trim()) return;

      const slug = landingTitle.toLowerCase()
          .replace(/ñ/g, 'n')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      
      const randomSuffix = Math.random().toString(36).substr(2, 4);
      const finalRoomId = `${slug}-${randomSuffix}`;

      // Guardar en historial local
      const newHistory = [
          { title: landingTitle, id: finalRoomId, date: Date.now() },
          ...recentGames.filter(g => g.id !== finalRoomId)
      ].slice(0, 3);
      
      localStorage.setItem('trophy_recent_games', JSON.stringify(newHistory));

      // Guardar rol de GM o jugador
      if (isCreatorGM) {
          localStorage.setItem(`trophy_role_${finalRoomId}`, 'gm');
      } else {
          localStorage.setItem(`trophy_name_${finalRoomId}`, creatorName);
      }

      // Guardar en Firebase y redirigir
      update(ref(database, `rooms/${finalRoomId}`), {
          title: landingTitle,
          created: Date.now()
      }).then(() => {
          window.location.href = `?partida=${finalRoomId}`;
      });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#050505] text-[#d4af37] font-consent selection:bg-[#d4af37] selection:text-black">
        
        {/* BLOQUE SUPERIOR: IDENTIDAD */}
        <div className="flex-grow flex flex-col items-center justify-center p-6">
            <div className="text-center mb-16 animate-fade-in-up">
                <h1 className="text-8xl md:text-9xl tracking-tighter mb-4 opacity-90">Trophy (g)OLD</h1>
                <p className="font-mono text-sm tracking-[0.5em] uppercase text-gray-500">{randomTagline}</p>
            </div>

            {/* BLOQUE CENTRAL: EL RITUAL */}
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fade-in-up delay-100">
                <div className="w-full group">
                    <input 
                        type="text" 
                        value={landingTitle}
                        onChange={(e) => setLandingTitle(e.target.value)}
                        placeholder="Nombre de la Incursión..."
                        className="w-full bg-transparent text-center text-4xl md:text-5xl border-b border-[#333] focus:border-[#d4af37] text-[#d4af37] placeholder-gray-800 outline-none pb-4 transition-all duration-500 font-consent"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateIncursion()}
                    />
                </div>

                <div className="flex flex-col items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 border border-[#d4af37] transition-all ${isCreatorGM ? 'bg-[#d4af37]' : 'bg-transparent'}`}></div>
                        <input 
                            type="checkbox" 
                            checked={isCreatorGM} 
                            onChange={(e) => setIsCreatorGM(e.target.checked)} 
                            className="hidden"
                        />
                        <span className="font-mono text-xs uppercase tracking-widest text-gray-400 group-hover:text-[#d4af37] transition-colors">
                            Entrar como Guardián
                        </span>
                    </label>

                    {!isCreatorGM && (
                        <input 
                            type="text"
                            value={creatorName}
                            onChange={(e) => setCreatorName(e.target.value)}
                            placeholder="Tu nombre..."
                            className="bg-transparent border-b border-gray-800 text-center text-[#d4af37] focus:border-[#d4af37] outline-none text-xl font-consent w-48"
                        />
                    )}
                </div>

                <button 
                    onClick={handleCreateIncursion}
                    className="mt-8 px-12 py-4 border border-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-all duration-500 text-xl tracking-widest uppercase font-mono group"
                >
                    Comenzar Incursión
                </button>
            </div>

            {/* BLOQUE INFERIOR: MEMORIA */}
            {recentGames.length > 0 && (
                <div className="mt-24 text-center animate-fade-in-up delay-200">
                    <h3 className="text-gray-700 font-mono text-[10px] uppercase tracking-widest mb-6">Incursiones recientes</h3>
                    <div className="flex flex-col gap-3">
                        {recentGames.map((game) => (
                            <a 
                                key={game.id} 
                                href={`?partida=${game.id}`}
                                className="text-gray-500 hover:text-[#d4af37] transition-colors font-consent text-2xl flex items-center justify-center gap-2 group"
                            >
                                <span>{game.title}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>

=======
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
>>>>>>> 651af245cae729527b38958d5c001d40cbe7ceeb
        <Footer />
    </div>
  );
};
<<<<<<< HEAD

=======
>>>>>>> 651af245cae729527b38958d5c001d40cbe7ceeb
export default LandingScreen;