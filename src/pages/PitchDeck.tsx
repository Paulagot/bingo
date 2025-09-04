import type React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export function PitchDeck() {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Check if user is already authorized (from localStorage)
  useEffect(() => {
    const isAuthorized = localStorage.getItem('pitchDeckAuthorized') === 'true';
    setAuthorized(isAuthorized);
  }, []);
  
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value);
    if (error) setError('');
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the PIN is correct (replace '12345' with your desired PIN)
    if (pin === '12345') {
      setAuthorized(true);
      localStorage.setItem('pitchDeckAuthorized', 'true');
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };
  
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 pb-10 pt-24">
        <div className="container mx-auto max-w-md">
          <div className="bg-muted overflow-hidden rounded-2xl shadow-xl">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-8">
              <h2 className="text-fg mb-6 text-center text-2xl font-bold">Enter PIN to Access Pitch Deck</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="password"
                    maxLength={5}
                    placeholder="Enter 5-digit PIN"
                    value={pin}
                    onChange={handlePinChange}
                    className="border-border w-full rounded-xl border-2 px-4 py-3 text-center text-xl tracking-widest outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                
                {error && (
                  <div className="rounded-lg bg-red-100 p-3 text-center text-red-800">
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={pin.length !== 5}
                  className="w-full transform rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 font-semibold
                         text-white transition hover:from-indigo-700 hover:to-purple-700
                         disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit
                </button>
                
                <div className="mt-4 text-center">
                  <Link 
                    to="/" 
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <Home className="mr-1 h-4 w-4" /> Back to Home
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render the pitch deck content when authorized
  return (
    <div className="bg-indigo-50">
      {/* Full height iframe taking into account the header */}
      <div className="pt-16" style={{ height: 'calc(100vh - 64px)' }}>
        <iframe 
          src="/pitch-deck.html" 
          style={{ 
            width: '100%',
            height: '80%',
            border: 'none'
          }}
          title="FundRaisely Pitch Deck"
        />
      </div>
    </div>
  );
}