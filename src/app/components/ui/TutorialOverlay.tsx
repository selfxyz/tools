'use client';

import { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'network-selector',
    title: 'Step 1: Choose Your Network 🌐',
    description: 'Welcome to Self Protocol Tools! Choose your deployment network: Alfajores (testnet) for free testing and development, or Celo (mainnet) for production. The V2 Hub contracts are pre-deployed on both networks.',
    target: '[data-tutorial="network-selector"]',
    position: 'bottom'
  },
  {
    id: 'scope-generator',
    title: 'Step 2: Generate Verification Scope 🔍',
    description: 'Generate a unique identifier for your smart contract. Enter your contract address and the SCOPE from your frontend app settings - this will calculate the specific scope value your contract needs to use.',
    target: '[data-tutorial="scope-generator"]',
    position: 'top'
  },
  {
    id: 'verification-config',
    title: 'Step 3: Deploy Verification Config 🚀',
    description: 'Deploy your verification configuration to get a Config ID. This config defines age requirements, country restrictions, and OFAC checks. You\'ll use this Config ID in your smart contract\'s getConfigId() method.',
    target: '[data-tutorial="verification-config"]',
    position: 'top'
  },
  {
    id: 'config-reader',
    title: 'Step 4: Integrate with Smart Contracts 📖',
    description: 'Use the Config Reader to view deployed configurations and get integration details. Install @selfxyz/contracts, extend SelfVerificationRoot, and implement your business logic in customVerificationHook().',
    target: '[data-tutorial="config-reader"]',
    position: 'top'
  },
  {
    id: 'complete',
    title: 'Ready for Integration! 🎉',
    description: 'You now have all the tools to integrate Self Protocol! Next steps: npm install @selfxyz/contracts, create your contract extending SelfVerificationRoot, and set up your frontend SDK. Check our docs for complete examples at https://docs.self.xyz/contract-integration/basic-integration',
    position: 'center'
  }
];

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function TutorialOverlay({ isOpen, onClose, onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<Element | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  // Reset to first step when tutorial opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setModalPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (currentStepData.target) {
      const element = document.querySelector(currentStepData.target);
      setHighlightElement(element);
      
      if (element) {
        // Make the highlighted element interactive and add glow effect
        (element as HTMLElement).style.position = 'relative';
        (element as HTMLElement).style.zIndex = '45';
        (element as HTMLElement).style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)';
        (element as HTMLElement).style.borderRadius = '12px';
        (element as HTMLElement).style.transform = 'scale(1.02)';
        (element as HTMLElement).style.transition = 'all 0.3s ease-in-out';
        
        // Scroll to element with some delay to ensure proper positioning
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }, 200);
      }
    } else {
      setHighlightElement(null);
    }

    // Handle window resize to update highlight position
    const handleResize = () => {
      if (currentStepData.target) {
        const element = document.querySelector(currentStepData.target);
        setHighlightElement(element);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    
    // Cleanup function to reset element styles
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (currentStepData.target) {
        const element = document.querySelector(currentStepData.target) as HTMLElement;
        if (element) {
          element.style.position = '';
          element.style.zIndex = '';
          element.style.boxShadow = '';
          element.style.borderRadius = '';
          element.style.transform = '';
          element.style.transition = '';
        }
      }
    };
  }, [currentStep, isOpen, currentStepData.target]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // No boundary constraints - free dragging for better UX
        setModalPosition({
          x: newX,
          y: newY
        });
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Cleanup all element styles when tutorial closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all tutorial-highlighted elements
      tutorialSteps.forEach(step => {
        if (step.target) {
          const element = document.querySelector(step.target) as HTMLElement;
          if (element) {
            element.style.position = '';
            element.style.zIndex = '';
            element.style.boxShadow = '';
            element.style.borderRadius = '';
            element.style.transform = '';
            element.style.transition = '';
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;



  return (
    <>
      {/* Background overlay - simple gray overlay */}
      <div className={`fixed inset-0 z-40 bg-gray-900 bg-opacity-40 backdrop-blur-sm ${highlightElement ? 'bg-opacity-30' : 'bg-opacity-40'}`} />

      {/* Tutorial modal */}
      <div className="fixed inset-0 z-50 flex p-4 items-center justify-center">
        <div 
          data-tutorial-modal="true"
          className={`bg-white rounded-2xl max-w-lg w-full mx-auto transform transition-all duration-300 cursor-move ${
            isDragging ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] cursor-grabbing' : 'shadow-2xl cursor-grab'
          }`}
          style={{
            transform: `translate(${modalPosition.x}px, ${modalPosition.y}px) ${isDragging ? 'scale(1.02)' : 'scale(1)'}`,
            maxWidth: '32rem',
            transition: isDragging ? 'none' : 'all 0.3s ease'
          }}

        >
          {/* Header - draggable area */}
          <div 
            className={`p-6 pb-4 border-b border-gray-200 cursor-move select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1 select-none">
                  {currentStepData.title}
                </h2>
                <div className="flex items-center text-sm text-gray-500 select-none">
                  <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
                  <span className="mx-2">•</span>
                  <span>{Math.round(progress)}% complete</span>
                  <span className="mx-2">•</span>
                  <span className={`${isDragging ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isDragging ? 'Dragging...' : '🖱️ Drag to move'}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-gray-700 leading-relaxed text-base mb-6">
              {currentStepData.id === 'complete' ? (
                <div>
                  You now have all the tools to integrate Self Protocol! Next steps: npm install @selfxyz/contracts, create your contract extending SelfVerificationRoot, and set up your frontend SDK. Check our docs for complete examples at{' '}
                  <a 
                    href="https://docs.self.xyz/contract-integration/basic-integration"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline transition-colors"
                  >
                    https://docs.self.xyz/contract-integration/basic-integration
                  </a>
                </div>
              ) : (
                currentStepData.description
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              {/* Left side - Skip */}
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium cursor-pointer"
                onMouseDown={(e) => e.stopPropagation()}
              >
                Skip Tutorial
              </button>

              {/* Right side - Previous and Next */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium cursor-pointer"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Previous
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  {currentStep < tutorialSteps.length - 1 && (
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 