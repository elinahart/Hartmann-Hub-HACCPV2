import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ManagerUIContextType {
  openModal: (content: ReactNode, className?: string) => void;
  closeModal: () => void;
}

const ManagerUIContext = createContext<ManagerUIContextType | undefined>(undefined);

export const ManagerUIProvider = ({ 
  children, 
  setForceCollapsedSidebar 
}: { 
  children: ReactNode, 
  setForceCollapsedSidebar: (v: boolean) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  const [className, setClassName] = useState<string>('max-w-[520px]');

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const openModal = (content: ReactNode, customClassName?: string) => {
    setModalContent(content);
    setClassName(customClassName || 'max-w-[520px]');
    setForceCollapsedSidebar(true);
    setIsOpen(true);
  };

  const closeModal = () => {
    setForceCollapsedSidebar(false);
    setIsOpen(false);
  };

  // Listen to escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <ManagerUIContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed top-0 left-0 w-full h-[100dvh] z-[1000] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ 
                duration: 0.32, 
                ease: [0.32, 0.72, 0, 1] // iOS-like springy ease
              }}
              className={`relative z-10 bg-white rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)] w-full ${className} max-h-[90dvh] md:max-h-[85vh] overflow-hidden flex flex-col will-change-transform`}
            >
              {modalContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ManagerUIContext.Provider>
  );
};

export const useManagerUI = () => {
  const ctx = useContext(ManagerUIContext);
  if (!ctx) throw new Error("useManagerUI must be used inside ManagerUIProvider");
  return ctx;
};
