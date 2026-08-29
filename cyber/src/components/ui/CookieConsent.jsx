import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('crimecast_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDecision = (decision) => {
    localStorage.setItem('crimecast_cookie_consent', decision);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 border-t border-orange-500/20 px-4 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-300">
        <div className="flex-1">
          <p>
            We use cookies to enhance your experience, analyze site traffic, and assist in our marketing efforts.
            <button 
              onClick={() => setShowDetails(!showDetails)} 
              className="ml-2 underline hover:text-white"
            >
              Learn more
            </button>
          </p>
          
          {showDetails && (
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg text-xs space-y-2">
              <p><strong>1. Essential Cookies:</strong> Required for basic site functionality and security.</p>
              <p><strong>2. Analytics Cookies:</strong> Help us understand how visitors interact with the website.</p>
              <p><strong>3. Marketing Cookies:</strong> Used to track visitors across websites to display relevant advertisements.</p>
              <div className="pt-2">
                For more details, please read our <a href="/privacy/" className="text-orange-400 hover:underline">Privacy Policy</a> and <a href="/cookies/" className="text-orange-400 hover:underline">Cookie Policy</a>.
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => handleDecision('rejected')} 
            className="border border-zinc-700 text-zinc-400 px-4 py-2 text-xs font-bold uppercase rounded-lg hover:bg-zinc-900"
          >
            Reject All
          </button>
          <button 
            onClick={() => handleDecision('accepted')} 
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-black px-4 py-2 text-xs font-black uppercase rounded-lg shadow-lg"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;