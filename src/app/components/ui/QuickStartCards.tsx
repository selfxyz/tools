import { QRCodeSVG } from 'qrcode.react';

export default function QuickStartCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 mb-12 sm:mb-16 max-w-5xl mx-auto px-2 sm:px-0">
      {/* App Install Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 sm:p-8 border-2 border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-xl group transform hover:scale-[1.02] cursor-pointer">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <span className="text-lg sm:text-xl">📱</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-black mb-2 sm:mb-3 group-hover:text-[#5BFFB6] transition-colors">Install Self App</h3>
          <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">Get started by installing the Self mobile app to create your digital identity</p>
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 mb-2 sm:mb-3 inline-block group-hover:bg-[#5BFFB6]/10 group-hover:border-[#5BFFB6]/30 transition-all duration-300">
            <QRCodeSVG
              value="https://redirect.self.xyz"
              size={120}
              level="M"
              className="sm:w-[140px] sm:h-[140px]"
            />
          </div>
          <p className="text-xs text-gray-500 font-medium group-hover:text-[#5BFFB6] transition-colors">Scan to download the app</p>
        </div>
      </div>

      {/* Mock Passport Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 sm:p-8 border-2 border-gray-100 hover:border-[#5BFFB6] transition-all hover:shadow-xl group transform hover:scale-[1.02] cursor-pointer">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-black rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 group-hover:bg-gray-800">
            <span className="text-lg sm:text-xl text-white">🆔</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-black mb-2 sm:mb-3 group-hover:text-[#5BFFB6] transition-colors">Need a Mock Passport?</h3>
          <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm">Don&apos;t have a biometric passport? Generate a mock one for testing</p>
          <a
            href="https://docs.self.xyz/use-self/using-mock-passports"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-lg hover:shadow-lg transition-all font-semibold text-xs sm:text-sm transform hover:scale-105 active:scale-95 hover:shadow-xl"
          >
            Learn How →
          </a>
        </div>
      </div>
    </div>
  );
} 