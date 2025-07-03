import Image from 'next/image';

export default function MobileTelegramButton() {
  return (
    <div className="fixed bottom-6 right-6 z-40 sm:hidden">
      <a
        href="https://t.me/selfbuilder"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#5BFFB6] to-[#4AE6A0] text-black rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse hover:animate-none"
      >
        <Image src="/telegram.webp" alt="Join Telegram" width={24} height={24} className="h-6 w-6 rounded-full" />
      </a>
    </div>
  );
} 