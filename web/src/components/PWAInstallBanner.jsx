import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export default function PWAInstallBanner({ pwaInstallPrompt, triggerPwaInstall }) {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Check if user dismissed this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') return;

    // 3. Detect mobile device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android|webos|blackberry|iemobile|opera mini/i.test(userAgent) || window.innerWidth < 768;

    if (!isMobileDevice) return;

    // 4. Detect iOS specifically
    const isApple = /iphone|ipad|ipod/i.test(userAgent);
    setIsIOS(isApple);

    // 5. Show banner (for iOS or if Android installation trigger is ready)
    if (isApple || pwaInstallPrompt) {
      setShowBanner(true);
    }
  }, [pwaInstallPrompt]);

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    if (triggerPwaInstall) {
      await triggerPwaInstall();
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9999] animate-slide-up">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start space-x-3.5 relative">
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white rounded-full transition-all hover:bg-white/10"
        >
          <X size={15} />
        </button>

        {/* Smartphone Icon */}
        <div className="p-2.5 bg-brand-orange/20 text-brand-orange rounded-xl shrink-0">
          <Smartphone size={20} className="stroke-[2.5]" />
        </div>

        {/* Body Text & Actions */}
        <div className="flex-1 pr-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-brand-orange">
            Download App
          </h4>
          <p className="text-xs font-semibold text-slate-200 mt-1 leading-normal">
            Install Spoonfull POS on your home screen for full local capabilities and notifications.
          </p>

          {isIOS ? (
            /* iOS Instruction Guide */
            <div className="mt-3 bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50 flex items-center space-x-2 text-[10px] text-slate-300 font-bold leading-snug">
              <Share size={12} className="text-brand-orange shrink-0 animate-bounce-slow" />
              <span>Tap the <strong className="text-white">Share</strong> button in Safari, then select <strong className="text-white">"Add to Home Screen"</strong>.</span>
            </div>
          ) : (
            /* Android Install Trigger Button */
            <button
              onClick={handleInstallClick}
              className="mt-3 w-full py-2 px-3 bg-brand-orange hover:bg-opacity-95 active:scale-98 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              <Download size={14} />
              <span>Install Web App</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
