// src/components/shared/GeoDropsInstructionsModal.tsx
"use client";
import { useState, useEffect } from "react";
import { X, MapPin, Camera, Award, Share2, Trophy } from "lucide-react";

const GeoDropsInstructionsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const currentUsername = localStorage.getItem("username") ?? "";
  console.log(">>>>>>>>>> currentUsername", currentUsername);
  const [currentPoints, setCurrentPoints] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<string | null>(null);

  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/points/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          localStorage.setItem("currentpoints", data.totalPoints);
          setCurrentPoints(data.totalPoints);
          localStorage.setItem("claimedpoints", data.claimedPoints);
          setClaimedPoints(data.claimedPoints);
          localStorage.setItem("balancepoints", data.balancePoints);
          setBalancePoints(data.balancePoints);
        })
        .catch((err) => {
          console.error("Error fetching currentPoints:", err);
        });
    }
  }, [currentUsername]);

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20">
        <div 
          className="bg-white dark:bg-[#151E3A] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200 dark:border-[#2D385B]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white pr-8">
              Welcome to Geo-Drops!
            </h2>
            <h4 className="font-semibold">You have {currentPoints} points ({balancePoints} left)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Discover location-based rewards and event invites.
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
                <MapPin className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  1. Find Drops You Like
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Using Map or Home views discover new Drops.
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
                  2. Download the Drop's invite for details
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Visit on the allowed dates. You must be within its range to claim its rewards.
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
                  3. Attend the Drop to claim your rewards
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Follow the Drop's instructions to claim your rewards at the Drop's location, or click on My Tickets & Rewards on your Profile page.
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
                  4. Share your profile
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Share your profile URL with friends to show off your collected Drops!
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
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
            </div>

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
              className="px-6 py-2.5 rounded-full bg-clgeodrops text-white hover:opacity-80 transition-opacity font-medium geo-claim-button"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GeoDropsInstructionsModal;