import React, { useState } from 'react';

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface HeroSectionProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function HeroSection({ showToast }: HeroSectionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);

  const handleReadyToBuild = () => {
    // Prevent multiple rapid clicks
    if (isButtonAnimating) return;
    
    // Trigger sophisticated button animation
    setIsButtonAnimating(true);
    setTimeout(() => setIsButtonAnimating(false), 600);

    // Professional particle system
    const emojis = ['🚀', '⚡', '✨', '💎', '🌟'];
    const particleCount = 5; // More refined, fewer particles
    
    const newParticles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = 3 + Math.random() * 2;
      
      return {
        id: Date.now() + i,
        emoji: emojis[i % emojis.length],
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.4,
        delay: i * 80, // Staggered launch
      };
    });

    setParticles(newParticles);
    
    // Curated success messages
    const messages = [
      "Ready to innovate! Let's build the future 🚀",
      "Time to revolutionize identity verification ⚡",
      "Your development journey starts now ✨",
      "Building cutting-edge solutions 💎",
      "Creating the next breakthrough 🌟"
    ];
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
    showToast(selectedMessage, 'success');

    // Clean particle system
    setTimeout(() => {
      setParticles([]);
    }, 2500);
  };

  return (
    <div className="relative text-center mb-12 sm:mb-16 py-6 sm:py-8 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#5BFFB6]/5 via-transparent to-[#5BFFB6]/5 animate-pulse"></div>
      <div className="relative max-w-4xl mx-auto px-2">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-4 leading-tight transform hover:scale-105 transition-transform duration-300">
          Everything you need to build with <span className="text-black bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] bg-clip-text text-transparent">Self Protocol</span>
        </h2>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed px-4">
          Generate scopes, configure verification requirements, and test your integration with our comprehensive developer tools
        </p>
        <div className="relative">
          <button
            onClick={handleReadyToBuild}
            className={`inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-300 font-semibold shadow-lg transform hover:scale-105 active:scale-95 hover:shadow-xl cursor-pointer text-sm sm:text-base ${
              isButtonAnimating ? 'scale-105 shadow-2xl bg-gray-900' : ''
            }`}
            disabled={isButtonAnimating}
          >
            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#5BFFB6] rounded-full mr-2 sm:mr-3 transition-all duration-300 ${
              isButtonAnimating ? 'animate-ping bg-[#4AE6A0]' : 'animate-pulse'
            }`}></span>
            Ready to build
          </button>
          
          {/* Professional Particle System */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute pointer-events-none text-2xl z-20"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
                animation: `particleFloat 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                animationDelay: `${particle.delay}ms`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                '--particle-vx': `${particle.vx * 30}px`,
                '--particle-vy': `${particle.vy * 30}px`,
              } as React.CSSProperties & { [key: string]: string }}
            >
              {particle.emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 