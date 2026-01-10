import React from 'react';
export const APP_VERSION = "v.0.7.7 · Revisión archivos";
const Footer = () => (
  <footer className="w-full bg-[#1a1a1a] border-t border-gray-900 text-center text-gray-600 text-[10px] py-1 font-mono uppercase mt-auto z-50">
    {APP_VERSION} · Viejo · viejorpg@gmail.com
  </footer>
);
export default Footer;