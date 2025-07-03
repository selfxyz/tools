import Image from 'next/image';

export default function NavigationHeader() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-6">
          <div className="flex items-center min-w-0 flex-1">
            <Image src="/self_logo.svg" alt="Self Logo" width={32} height={32} className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-4 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-black truncate">
                <span className="sm:hidden">Self Tools</span>
                <span className="hidden sm:inline">Self Developer Tools</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">Privacy-preserving identity verification</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 shrink-0">
            <a
              href="https://docs.self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors font-medium text-xs sm:text-sm hidden sm:inline"
            >
              <span className="lg:hidden">Docs</span>
              <span className="hidden lg:inline">Documentation</span>
            </a>
            <a
              href="https://t.me/+d2TGsbkSDmgzODVi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg sm:rounded-xl hover:shadow-lg transition-all text-xs sm:text-sm font-semibold transform hover:scale-105 active:scale-95 hover:shadow-xl"
            >
              <Image src="/telegram.webp" alt="Telegram" width={14} height={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 rounded-full" />
              <span className="sm:inline">Telegram</span>
            </a>
            <a
              href="https://github.com/selfxyz/self"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 bg-black text-white rounded-lg sm:rounded-xl hover:bg-gray-800 transition-colors text-xs sm:text-sm font-semibold"
            >
              <Image src="/github.png" alt="GitHub" width={14} height={14} className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 rounded-full" />
              <span className="sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
} 