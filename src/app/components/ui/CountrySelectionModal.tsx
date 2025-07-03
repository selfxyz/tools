import { useState } from 'react';
import { countryCodes } from '@selfxyz/core';

const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

interface CountrySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountries: string[];
  onCountryToggle: (countryCode: string) => void;
  onSave: () => void;
  onClearAll: () => void;
  selectionError: string | null;
}

export default function CountrySelectionModal({
  isOpen,
  onClose,
  selectedCountries,
  onCountryToggle,
  onSave,
  onClearAll,
  selectionError
}: CountrySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-black">Select Countries to Exclude</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {selectionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{selectionError}</p>
            </div>
          )}
          
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(countryCodes)
              .filter(([, countryName]) =>
                countryName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(([code, countryName]) => (
                <label 
                  key={code} 
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(code)}
                    onChange={() => onCountryToggle(code)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900 flex-1">{countryName}</span>
                  <span className="text-xs text-gray-500 font-mono">{code}</span>
                </label>
              ))}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCountries.length} of {MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH} countries selected
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClearAll}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 