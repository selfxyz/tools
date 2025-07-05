import Image from 'next/image';

interface HelpBannerProps {
  onStartTutorial?: () => void;
}

export default function HelpBanner({ onStartTutorial }: HelpBannerProps) {
  return (
    <div className="max-w-5xl mx-auto mb-12 sm:mb-16 px-2 sm:px-0">
      <div className="bg-gradient-to-r from-[#5BFFB6]/10 via-blue-50 to-[#5BFFB6]/10 border border-[#5BFFB6]/30 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6 sm:gap-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#5BFFB6] to-[#4AE6A0] rounded-xl flex items-center justify-center animate-pulse shrink-0">
            <span className="text-xl sm:text-2xl">🚀</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Need Help Building?</h3>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              Join our active Telegram community for instant support, code examples, and direct access to the Self Protocol team!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {onStartTutorial && (
              <button
                onClick={onStartTutorial}
                className="flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all font-semibold text-sm sm:text-base transform hover:scale-105 active:scale-95"
              >
                <span className="mr-2">🎯</span>
                <span>Start Tutorial</span>
              </button>
            )}
            <a
              href="https://t.me/+d2TGsbkSDmgzODVi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base transform hover:scale-105 active:scale-95 hover:shadow-xl group"
            >
              <Image src="/telegram.webp" alt="Telegram" width={20} height={20} className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 rounded-full group-hover:animate-bounce" />
              <span>Join Community</span>
              <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 