import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminBottomNav({ tabs, activeTab, onNavigate }) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Calculate groups
  const groups = useMemo(() => {
    if (tabs.length <= 4) {
      return [{ items: tabs, hasLeft: false, hasRight: false }];
    }
    
    const res = [];
    // Group 0: up to 4 items + Right Arrow
    res.push({
      items: tabs.slice(0, 4),
      hasLeft: false,
      hasRight: true
    });
    
    let remainingIndex = 4;
    while (remainingIndex < tabs.length) {
      const isLastGroup = tabs.length - remainingIndex <= 3;
      res.push({
        // Middle/Last groups: Left Arrow + up to 3 items
        items: tabs.slice(remainingIndex, remainingIndex + 3),
        hasLeft: true,
        hasRight: !isLastGroup
      });
      remainingIndex += 3;
    }
    
    return res;
  }, [tabs]);

  // Route sync: ONLY runs when activeTab or groups change, NOT when arrow is clicked
  useEffect(() => {
    const activeTabIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeTabIndex !== -1) {
      const targetGroupIndex = groups.findIndex(g => g.items.some(item => item.id === activeTab));
      if (targetGroupIndex !== -1) {
        setActiveGroupIndex((prev) => {
          if (prev !== targetGroupIndex) {
            setDirection(targetGroupIndex > prev ? 1 : -1);
            return targetGroupIndex;
          }
          return prev;
        });
      }
    }
  }, [activeTab, tabs, groups]);

  const handleNext = () => {
    setActiveGroupIndex((prev) => {
      const next = Math.min(prev + 1, groups.length - 1);
      if (next !== prev) setDirection(1);
      return next;
    });
  };

  const handlePrev = () => {
    setActiveGroupIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) setDirection(-1);
      return next;
    });
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const currentGroup = groups[activeGroupIndex] || groups[0];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] pb-safe z-50 bg-[#06070B] border-t border-white/10 overflow-hidden">
      <div className="relative w-full h-full max-w-[430px] mx-auto">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={activeGroupIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="absolute inset-0 grid grid-cols-5 h-full px-2 items-center"
          >
            {/* LEFT ARROW (Slot 1) */}
            {currentGroup.hasLeft && (
              <button
                onClick={handlePrev}
                className="flex flex-col items-center justify-center h-full gap-1 p-1 w-full text-slate-400 hover:text-white"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </div>
              </button>
            )}

            {/* MENUS (Slots 1-4 or 2-4) */}
            {currentGroup.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center justify-center h-full gap-1 p-1 w-full"
                >
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] truncate w-full text-center px-0.5 ${
                      isActive ? 'text-teal-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* RIGHT ARROW (Slot 5) */}
            {currentGroup.hasRight && (
              <button
                onClick={handleNext}
                className="col-start-5 flex flex-col items-center justify-center h-full gap-1 p-1 w-full text-slate-400 hover:text-white"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                  <ArrowRight className="w-5 h-5" />
                </div>
                {/* Dot indicator */}
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: groups.length }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        i === activeGroupIndex ? 'bg-teal-400' : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
