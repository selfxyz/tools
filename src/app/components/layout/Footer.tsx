import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Image src="/self_logo.svg" alt="Self Logo" width={32} height={32} className="h-8 w-8 mr-3" />
              <span className="text-xl font-bold">Self Protocol</span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6">
              Verify real users while preserving privacy. Build the future of identity verification.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com/selfxyz/self" target="_blank" rel="noopener noreferrer"
                 className="text-gray-400 hover:text-[#5BFFB6] transition-colors">
                <Image src="/github.png" alt="GitHub" width={20} height={20} className="h-5 w-5 rounded-full" />
              </a>
              <a href="https://t.me/selfbuilder" target="_blank" rel="noopener noreferrer"
                 className="text-gray-400 hover:text-[#5BFFB6] transition-colors">
                <Image src="/telegram.webp" alt="Telegram" width={20} height={20} className="h-5 w-5 rounded-full" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Developer Resources</h4>
            <div className="space-y-3">
              <a href="https://docs.self.xyz" target="_blank" rel="noopener noreferrer" 
                 className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                Documentation
              </a>
              <a href="https://docs.self.xyz/use-self/using-mock-passports" target="_blank" rel="noopener noreferrer"
                 className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                Mock Passports
              </a>
              <a href="https://github.com/selfxyz/self" target="_blank" rel="noopener noreferrer"
                 className="block text-gray-400 hover:text-[#5BFFB6] transition-colors">
                 GitHub Repository
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Self Labs
          </p>
        </div>
      </div>
    </footer>
  );
} 