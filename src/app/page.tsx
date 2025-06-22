'use client';

import { useState, useEffect } from 'react';
import { hashEndpointWithScope } from '@selfxyz/core';

export default function Home() {
  const [address, setAddress] = useState('');
  const [scope, setScope] = useState('');
  const [addressError, setAddressError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [hashedEndpoint, setHashedEndpoint] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Ethereum address validation (0x followed by 40 hex characters)
  const validateEthereumAddress = (addr: string): boolean => {
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(addr);
  };

  // HTTPS URL validation
  const validateHttpsUrl = (url: string): boolean => {
    return url.startsWith('https://') && url.length > 8; // More than just "https://"
  };

  // Combined address validation (either Ethereum address or HTTPS URL)
  const validateAddress = (addr: string): boolean => {
    return validateEthereumAddress(addr) || validateHttpsUrl(addr);
  };

  // Scope validation (small caps ASCII, max 20 chars)
  const validateScope = (scopeValue: string): boolean => {
    const scopeRegex = /^[a-z0-9\s\-_.,!?]*$/;
    return scopeRegex.test(scopeValue) && scopeValue.length <= 20;
  };

  // Check if address is valid (not empty and passes validation)
  const isAddressValid = address && !addressError && validateAddress(address);

  // Check if scope is valid (not empty and passes validation)
  const isScopeValid = scope && !scopeError && validateScope(scope);

  // Check if both fields are valid
  const areBothValid = isAddressValid && isScopeValid;

  // Generate hash when both fields have values (regardless of validity)
  useEffect(() => {
    if (address && scope) {
      try {
        const hash = hashEndpointWithScope(address, scope);
        setHashedEndpoint(hash);
      } catch (error) {
        console.error('Error generating hash:', error);
        setHashedEndpoint('Error generating hash');
      }
    } else {
      setHashedEndpoint('');
    }
  }, [address, scope]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);

    if (value === '') {
      setAddressError('');
    } else if (!validateAddress(value)) {
      setAddressError('Please enter a valid Ethereum address (0x...) or HTTPS URL (https://...)');
    } else {
      setAddressError('');
    }
  };

  const handleScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow lowercase ASCII characters and limit to 20 chars
    if (validateScope(value) && value.length <= 20) {
      setScope(value);
      setScopeError('');
    } else if (value.length > 20) {
      setScopeError('Scope must be 20 characters or less');
    } else {
      setScopeError('Scope must contain only lowercase ASCII characters');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hashedEndpoint);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center text-black mb-8">
          Self.xyz scope generator
        </h1>

        <div className="space-y-4">
          {/* Address Input */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-black mb-2">
              Address or URL
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="0x1234... or https://example.com"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-colors ${addressError
                ? 'border-red-500 bg-red-50'
                : isAddressValid
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
                }`}
            />
            {addressError && (
              <p className="mt-1 text-sm text-red-600">{addressError}</p>
            )}
          </div>

          {/* Scope Input */}
          <div>
            <label htmlFor="scope" className="block text-sm font-medium text-black mb-2">
              Scope
            </label>
            <input
              id="scope"
              type="text"
              value={scope}
              onChange={handleScopeChange}
              placeholder="enter scope (max 20 chars)"
              maxLength={20}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-colors ${scopeError
                ? 'border-red-500 bg-red-50'
                : isScopeValid
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
                }`}
            />
            <div className="flex justify-between items-center mt-1">
              {scopeError && (
                <p className="text-sm text-red-600">{scopeError}</p>
              )}
              <p className="text-sm text-gray-600 ml-auto">
                {scope.length}/20 chars
              </p>
            </div>
          </div>
        </div>

        {/* Status Display */}
        <div className="mt-8 p-4 bg-gray-50 rounded-md border">
          <h3 className="text-lg font-medium text-black mb-2">Current Values:</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-black">Address/URL:</span>{' '}
              <span className={isAddressValid ? 'text-green-600' : 'text-gray-600'}>
                {address || 'Not set'}
              </span>
              {isAddressValid && (
                <span className="ml-2 text-green-600">✓ Valid</span>
              )}
            </p>
            <p>
              <span className="font-medium text-black">Scope:</span>{' '}
              <span className={isScopeValid ? 'text-green-600' : 'text-gray-600'}>
                {scope || 'Not set'}
              </span>
              {isScopeValid && (
                <span className="ml-2 text-green-600">✓ Valid</span>
              )}
            </p>
            {hashedEndpoint && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-black">Generated Hash:</p>
                  {areBothValid && (
                    <button
                      onClick={copyToClipboard}
                      className={`px-3 py-1 text-xs rounded transition-colors ${copySuccess
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
                        }`}
                    >
                      {copySuccess ? '✓ Copied!' : 'Copy'}
                    </button>
                  )}
                </div>

                {!areBothValid && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Warning: One or both fields are not valid. The hash below may not be accurate.
                    </p>
                  </div>
                )}

                <div className="bg-white p-3 rounded border">
                  <code className="text-sm text-black break-all font-mono">
                    {hashedEndpoint}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
