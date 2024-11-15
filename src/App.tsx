import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
    </div>
  );
}