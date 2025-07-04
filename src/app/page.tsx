'use client';

import { useState } from 'react';

// Import our components
import NavigationHeader from './components/layout/NavigationHeader';
import HeroSection from './components/ui/HeroSection';
import HelpBanner from './components/ui/HelpBanner';
import QuickStartCards from './components/ui/QuickStartCards';
import ScopeGenerator from './components/sections/ScopeGenerator';
import VerificationConfigManager from './components/sections/VerificationConfigManager';
import NetworkSelector from './components/sections/NetworkSelector';
import ConfigReader from './components/sections/ConfigReader';
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

  // Network selection state
  const [selectedNetwork, setSelectedNetwork] = useState<'celo' | 'alfajores'>('alfajores');

  // Country selection state
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true });
    // Only auto-hide error and info messages, keep success messages visible
    if (type !== 'success') {
      setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 5000);
    }
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

        {/* Network & Server Status */}
        <NetworkSelector 
          selectedNetwork={selectedNetwork}
          onNetworkChange={setSelectedNetwork}
        />

        {/* Scope Generator Section */}
        <ScopeGenerator />

        {/* Verification Config Manager - Server-side transactions */}
        <VerificationConfigManager 
          showToast={showToast}
          selectedCountries={selectedCountries}
          setSelectedCountries={setSelectedCountries}
          setShowCountryModal={setShowCountryModal}
          selectedNetwork={selectedNetwork}
        />

        {/* Config Reader Section */}
        <ConfigReader selectedNetwork={selectedNetwork} />
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
              </div>
  );
} 