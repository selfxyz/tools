'use client';

import { useEffect, useState } from 'react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const emojis = ['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🏆', '👏', '🥳', '🔥'];

export default function CelebrationAnimation({ isVisible, onComplete }: CelebrationAnimationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsAnimating(false);
      setIsFadingOut(false);
      setParticles([]);
      return;
    }

    setIsAnimating(true);

    // Create initial particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 50,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 15 - 5,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        size: Math.random() * 20 + 20,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }
    setParticles(newParticles);

    // Animation loop
    const animationId = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.3, // gravity
          rotation: particle.rotation + particle.rotationSpeed
        })).filter(particle => particle.y < window.innerHeight + 100)
      );
    }, 16);

    // Start fade out after 3 seconds
    const fadeOutTimeout = setTimeout(() => {
      setIsFadingOut(true);
    }, 3000);

    // Clean up after 4 seconds
    const completeTimeout = setTimeout(() => {
      clearInterval(animationId);
      setParticles([]);
      setIsAnimating(false);
      onComplete();
    }, 4000);

    return () => {
      clearInterval(animationId);
      clearTimeout(fadeOutTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isVisible, onComplete]);

  if (!isVisible && !isAnimating) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] pointer-events-none transition-all duration-1000 ${
        isFadingOut ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background flash */}
      <div className={`absolute inset-0 bg-gradient-to-r from-yellow-200/20 via-pink-200/20 to-purple-200/20 animate-pulse transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`} />
      
      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className={`absolute select-none transition-opacity duration-1000 ${
            isFadingOut ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            left: particle.x,
            top: particle.y,
            fontSize: particle.size,
            transform: `rotate(${particle.rotation}deg)`,
            filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))'
          }}
        >
          {particle.emoji}
        </div>
      ))}

      {/* Firework bursts from corners */}
      <div className={`absolute top-10 left-10 animate-ping transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="text-6xl">🎆</div>
      </div>
      <div className={`absolute top-10 right-10 animate-ping transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`} style={{ animationDelay: '0.5s' }}>
        <div className="text-6xl">🎆</div>
      </div>
      <div className={`absolute bottom-20 left-1/4 animate-ping transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`} style={{ animationDelay: '1s' }}>
        <div className="text-6xl">🎆</div>
      </div>
      <div className={`absolute bottom-20 right-1/4 animate-ping transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`} style={{ animationDelay: '1.5s' }}>
        <div className="text-6xl">🎆</div>
      </div>

      {/* Central celebration message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`text-center animate-bounce transition-all duration-1000 ease-out ${
          isFadingOut ? 'opacity-0 -translate-y-16 scale-125' : 'opacity-100 translate-y-0 scale-100'
        }`}>
          <div className="text-8xl mb-4">🎉</div>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-pulse">
            Congratulations!
          </div>
          <div className="text-xl text-gray-700 mt-2">
            Tutorial completed successfully!
          </div>
        </div>
      </div>
    </div>
  );
} 