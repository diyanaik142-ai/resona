import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminBottomNav({ tabs, activeTab, onNavigate }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isNavigatingBackwards, setIsNavigatingBackwards] = useState(false);

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(tabs.length / ITEMS_PER_PAGE);

  // Sync activeTab with page if changed externally
  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeIndex !== -1) {
      const targetPage = Math.floor(activeIndex / ITEMS_PER_PAGE);
      if (targetPage !== currentPage) {
        setDirection(targetPage > currentPage ? 1 : -1);
        setCurrentPage(targetPage);
        
        if (targetPage === totalPages - 1) setIsNavigatingBackwards(true);
        else if (targetPage === 0) setIsNavigatingBackwards(false);
      }
    }
  }, [activeTab, tabs, currentPage]);

  const handleNext = () => {
    setDirection(1);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    if (nextPage === totalPages - 1) {
      setIsNavigatingBackwards(true);
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    if (prevPage === 0) {
      setIsNavigatingBackwards(false);
    }
  };

  const showLeftArrow = isNavigatingBackwards && currentPage > 0;
  const isLastPage = currentPage === totalPages - 1;

  const currentItems = tabs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

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

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] pb-safe z-50 bg-[#06070B] border-t border-white/10 overflow-hidden">
      <div className="grid grid-cols-5 h-full px-2 max-w-[430px] mx-auto items-center">
        <div className="col-span-4 relative h-full">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
              className="absolute inset-0 grid grid-cols-4 h-full"
            >
            {currentItems.map((item) => {
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow (5th Slot) */}
        <div className="col-start-5 h-full flex flex-col items-center justify-center relative z-10">
          <button
            onClick={showLeftArrow ? handlePrev : handleNext}
            className="flex flex-col items-center justify-center h-full gap-1 p-1 w-full text-slate-400 hover:text-white"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
              {showLeftArrow ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </div>
            {/* Optional dot indicator */}
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i === currentPage ? 'bg-teal-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
