// src/components/shared/DistroInstructionsModal.tsx
"use client";
import { useState, useEffect } from "react";
import { X, MapPin, Camera, Award, Share2, Trophy, CirclePlus } from "lucide-react";

const DistroInstructionsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const hasSeenInstructions = localStorage.getItem("geoDropsInstructionsSeen");
      if (!hasSeenInstructions) {
        // Small delay to ensure hydration is complete
        setTimeout(() => {
          setIsOpen(true);
        }, 100);
      }
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && dontShowAgain) {
      localStorage.setItem("geoDropsInstructionsSeen", "true");
    }
    setIsOpen(false);
  };

  // Don't render anything on server or if closed
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}  
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-20">
        <div 
          className="bg-white dark:bg-[#151E3A] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200 dark:border-[#2D385B]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white pr-8">
              Welcome to The Black Label!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You platform for white label distribution services.
            </p>
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <CirclePlus className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  1. Upload your songs.
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Ensure all of your song assets are ready, such as 1500x1500 artwork, titles, audio, lyrics and contributor credits. 
                  Then click on Add Music on the left to upload these releases using our upload wizard.
                </p>
                {/* <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Download its invite to your wallet to receive push notifications about the Drop.
                </p> */}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Camera className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  2. Our admin team will review your assets and if all in order, ingest them for distribution.
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We will contact you directly using your account's email address if there are any issues.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Award className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  3. Optionally use our promotional tools to promote your releases.
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  For example, create Drops for your release. Click on the Add Drop link on the left for more information.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Share2 className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  4. Share your profile and links page URLs.
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Share your profile and links page URLs on socials to get the most publicity for your releases.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            {/* <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Trophy className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  5. Earn points
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Drops, likes, comments and uploads earn points for additional rewards and prizes.
                </p>
              </div>
            </div> */}

            {/* Tips Section */}
            {/* <div className="bg-gray-50 dark:bg-[#0F1629] rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                💡 Pro Tips
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-clgeodrops mt-0.5">•</span>
                  <span>Enable location services for the best experience.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clgeodrops mt-0.5">•</span>
                  <span>Some Drops are limited edition - unlock them before they're gone!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clgeodrops mt-0.5">•</span>
                  <span>Check back regularly for new Drops.</span>
                </li>
              </ul>
            </div> */}

            {/* Don't show again checkbox */}
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-clgeodrops border-gray-300 rounded focus:ring-[#00C1CE]"
              />
              <label
                htmlFor="dontShowAgain"
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                Don't show this again
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-[#2D385B] flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg bg-gray-900 text-white hover:opacity-80 transition-opacity font-medium capitalize"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DistroInstructionsModal;