import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'neutral';
  children?: React.ReactNode;
  onCopy?: () => void;
}

export default function CopyButton({ 
  text, 
  className = '', 
  size = 'md',
  variant = 'neutral',
  children,
  onCopy 
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      
      // Reset after animation completes
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Size configurations
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // Variant configurations
  const variantClasses = {
    primary: copied 
      ? 'bg-green-500 text-white border-green-500' 
      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    secondary: copied 
      ? 'bg-green-500 text-white border-green-500' 
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
    success: copied 
      ? 'bg-green-600 text-white border-green-600' 
      : 'bg-green-500 text-white border-green-500 hover:bg-green-600',
    neutral: copied 
      ? 'bg-green-500 text-white border-green-500' 
      : 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700'
  };

  const baseClasses = `
    inline-flex items-center justify-center 
    border rounded-lg font-medium 
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
    transform active:scale-95
    copy-button
    ${copied ? 'animate-copy-success' : 'hover:scale-105'}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  return (
    <button
      onClick={handleCopy}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={baseClasses}
      title={copied ? 'Copied!' : 'Click to copy'}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
    >
      {/* Icon */}
      <span className={`mr-2 transition-transform duration-200 ${copied ? 'animate-bounce' : isHovering ? 'scale-110' : ''}`}>
        {copied ? '✓' : '📋'}
      </span>
      
      {/* Text content */}
      <span className="relative overflow-hidden">
        <span className={`transition-all duration-300 ${copied ? 'transform translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'}`}>
          {children || 'Copy'}
        </span>
        <span className={`absolute inset-0 flex items-center transition-all duration-300 ${copied ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-full opacity-0'}`}>
          Copied!
        </span>
      </span>
      
      {/* Ripple effect */}
      {copied && (
        <span className="absolute inset-0 rounded-lg bg-white opacity-30 animate-ripple pointer-events-none"></span>
      )}
    </button>
  );
} 