'use client';

import { useState } from 'react';

// Import our components
import NavigationHeader from './components/layout/NavigationHeader';
import HeroSection from './components/ui/HeroSection';
import HelpBanner from './components/ui/HelpBanner';
import QuickStartCards from './components/ui/QuickStartCards';
import WalletNetworkSetup from './components/sections/WalletNetworkSetup';
import ScopeGenerator from './components/sections/ScopeGenerator';
import HubContractOperations from './components/sections/HubContractOperations';
import ToastNotification from './components/ui/ToastNotification';
import CountrySelectionModal from './components/ui/CountrySelectionModal';
import MobileTelegramButton from './components/ui/MobileTelegramButton';
import Footer from './components/layout/Footer';

// Constants
const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

// Country formatting function
function formatCountriesList(countries: string[]) {
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  for (const country of countries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }
  }

  const paddedCountries = countries.concat(
    Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill('')
  );
  const result = paddedCountries.flatMap((country) => {
    const chars = country
      .padEnd(3, '\0')
      .split('')
      .map((char) => char.charCodeAt(0));
    return chars;
  });
  return result;
}

export default function Home() {
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // Country selection state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Country selection handlers
  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryCode)) {
        setCountrySelectionError(null);
        return prev.filter(c => c !== countryCode);
      }
      
      if (prev.length >= MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
        setCountrySelectionError(`Maximum ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH} countries can be excluded`);
        return prev;
      }
      
      return [...prev, countryCode];
    });
  };

  const saveCountrySelection = () => {
    try {
      formatCountriesList(selectedCountries);
      setShowCountryModal(false);
      setCountrySelectionError(null);
      showToast(`Selected ${selectedCountries.length} countries for exclusion`, 'success');
    } catch (error) {
      setCountrySelectionError((error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <NavigationHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Hero Section */}
        <HeroSection showToast={showToast} />

        {/* Help Banner */}
        <HelpBanner />

        {/* Quick Start Cards */}
        <QuickStartCards />

        {/* Wallet & Network Setup Section */}
        <WalletNetworkSetup showToast={showToast} />

        {/* Scope Generator Section */}
        <ScopeGenerator />

        {/* Hub Contract Operations */}
        <HubContractOperations 
          showToast={showToast}
          selectedCountries={selectedCountries}
          setSelectedCountries={setSelectedCountries}
          setShowCountryModal={setShowCountryModal}
        />
      </div>
      
      {/* Toast Notification */}
      <ToastNotification 
        toast={toast} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />

      {/* Country Selection Modal */}
      <CountrySelectionModal 
        isOpen={showCountryModal} 
        onClose={() => setShowCountryModal(false)} 
        selectedCountries={selectedCountries}
        onCountryToggle={handleCountryToggle}
        onSave={saveCountrySelection}
        onClearAll={() => {
          setSelectedCountries([]);
          setCountrySelectionError(null);
        }}
        selectionError={countrySelectionError}
      />

      {/* Mobile Telegram Button */}
      <MobileTelegramButton />

      {/* Footer */}
      <Footer />
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes particleFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--particle-vx)), calc(-50% + var(--particle-vy))) scale(0.6);
          }
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-track {
          height: 8px;
          background: linear-gradient(to right, #e5e7eb 0%, #3b82f6 100%);
          border-radius: 4px;
        }

        .slider::-moz-range-track {
          height: 8px;
          background: linear-gradient(to right, #e5e7eb 0%, #3b82f6 100%);
          border-radius: 4px;
          border: none;
        }
      `}</style>
    </div>
  );
} 