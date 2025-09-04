import  { useState } from 'react';

export function PitchDeckContent() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 12;
  
  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  // The pitch deck content is embedded as an HTML file
  return (
    <div className="flex h-screen flex-col">
      <div className="relative flex-grow">
        <iframe 
          src="/pitch-deck.html" 
          className="h-full w-full border-0" 
          title="FundRaisely Pitch Deck"
       />
      </div>
      
      <div className="flex justify-center space-x-4 p-4">
        <button 
         type="button"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <div className="flex items-center">
          <span className="text-fg/80">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
        <button 
         type="button"
          onClick={handleNext}
          disabled={currentSlide === totalSlides - 1}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}