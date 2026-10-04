import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginTransition({ onComplete }) {
  const [stage, setStage] = useState('success');

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isMounted = true;

    const sequence = async () => {
      if (prefersReducedMotion) {
        // Fast path for reduced motion
        await new Promise(r => setTimeout(r, 400));
        if (isMounted) onComplete();
        return;
      }

      // Stage 1: Login success feedback wait (form fading out)
      await new Promise(r => setTimeout(r, 150));

      // Stage 2: Resona logo entrance
      if (isMounted) setStage('logo');
      await new Promise(r => setTimeout(r, 850));

      // Stage 3 & 4: Dashboard reveal
      if (isMounted) setStage('reveal');
      await new Promise(r => setTimeout(r, 450));

      if (isMounted) onComplete();
    };

    sequence();

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== 'reveal' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950"
        >
          {stage === 'logo' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1] // Custom smooth easing
              }}
              className="relative flex flex-col items-center"
            >
              {/* Sound wave equalizer effect */}
              <div className="absolute inset-0 -m-8 flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-40 h-40 rounded-full border border-teal-500/30"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0, 0.3, 0] }}
                  transition={{ duration: 1.2, delay: 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-40 h-40 rounded-full border border-purple-500/30"
                />
              </div>

              {/* Logo Glow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.8] }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 bg-teal-500/20 blur-[50px] rounded-full"
              />

              {/* Resona Logo SVG */}
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-2xl">
                <path d="M50 10L90 30V70L50 90L10 70V30L50 10Z" stroke="url(#paint0_linear)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M50 25L75 37.5V62.5L50 75L25 62.5V37.5L50 25Z" fill="url(#paint1_linear)" />
                <defs>
                  <linearGradient id="paint0_linear" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2DD4BF" />
                    <stop offset="1" stopColor="#A855F7" />
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="50" y1="25" x2="50" y2="75" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2DD4BF" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#A855F7" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 text-2xl font-bold tracking-[0.2em] text-white"
              >
                RESONA
              </motion.h1>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
