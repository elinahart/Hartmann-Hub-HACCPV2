import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type KeyboardType = 'text' | 'numeric' | 'temperature' | 'date' | 'alphanumeric';

interface KeyboardOptions {
  type: KeyboardType;
  initialValue: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  maxLength?: number;
}

interface KeyboardContextType {
  openKeyboard: (options: KeyboardOptions, inputEl?: HTMLInputElement) => void;
  closeKeyboard: () => void;
  isOpen: boolean;
}

const KeyboardContext = createContext<KeyboardContextType | null>(null);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) throw new Error('useKeyboard must be used within KeyboardProvider');
  return context;
};

export const KeyboardProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<KeyboardOptions | null>(null);
  const [value, setValue] = useState('');
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  const openKeyboard = (opt: KeyboardOptions, inputEl?: HTMLInputElement) => {
    setOptions(opt);
    setValue(opt.initialValue || '');
    setIsOpen(true);
    
    if (activeInputRef.current && activeInputRef.current !== inputEl) {
      activeInputRef.current.classList.remove('ring-2', 'ring-primary', 'border-primary', 'bg-blue-50/50');
    }
    
    if (inputEl) {
      activeInputRef.current = inputEl;
      inputEl.classList.add('ring-2', 'ring-primary', 'border-primary', 'bg-blue-50/50');
      
      setTimeout(() => {
        const keyboardEl = document.getElementById('virtual-keyboard-ui');
        if (keyboardEl && inputEl) {
          const keyboardHeight = keyboardEl.getBoundingClientRect().height;
          const inputRect = inputEl.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          if (inputRect.bottom > viewportHeight - keyboardHeight) {
            inputEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 250);
    }
  };

  const closeKeyboard = () => {
    setIsOpen(false);
    setOptions(null);
    if (activeInputRef.current) {
      activeInputRef.current.classList.remove('ring-2', 'ring-primary', 'border-primary', 'bg-blue-50/50');
      activeInputRef.current = null;
    }
  };

  const handleKeyPress = (key: string) => {
    if (!options) return;
    
    let newValue = value;
    
    if (key === 'BACKSPACE') {
      newValue = value.slice(0, -1);
    } else if (key === 'ENTER') {
      options.onEnter?.();
      closeKeyboard();
      return;
    } else if (key === 'CLEAR') {
      newValue = '';
    } else {
      if (options.maxLength && value.length >= options.maxLength) return;
      
      let finalKey = key;
      if (finalKey === ',') finalKey = '.';
      
      if (finalKey === '-') {
        if (value.startsWith('-')) {
          newValue = value.slice(1);
        } else {
          newValue = '-' + value;
        }
      } else {
        newValue = value + finalKey;
      }
      
      // Auto-formatting for date
      if (options.type === 'date') {
        // Just a simple smart formatting, e.g., if user types 2 digits, add slash
        if (newValue.length === 2 && !newValue.includes('/')) {
            // maybe wait for next key, or add slash
            newValue = newValue + '/';
        }
      }
    }
    
    setValue(newValue);
    options.onChange(newValue);
  };

  // Synchronize value if external initialValue changes
  useEffect(() => {
    if (options && isOpen) {
      setValue(options.initialValue);
    }
  }, [options?.initialValue, isOpen]);

  // Global Focus Interceptor
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        const originalType = input.type;
        
        if (originalType !== 'file' && originalType !== 'checkbox' && originalType !== 'color' && originalType !== 'radio' && originalType !== 'submit' && originalType !== 'button' && !input.readOnly) {
          // Immediately blur to PREVENT the native keyboard
          e.preventDefault();
          input.blur();
          
          // Force input to text to prevent HTML5 validation issues with intermediate values like '-' or ','
          if (originalType === 'number') {
            input.type = 'text';
          }
          
          let kbType: KeyboardType = 'alphanumeric';
          if (input.dataset.keyboard) {
            kbType = input.dataset.keyboard as KeyboardType;
          } else if (input.name.toLowerCase().includes('temp') || input.step === '0.1' || input.placeholder.includes('°')) {
            kbType = 'temperature';
          } else if (input.name.toLowerCase().includes('date') || input.name.toLowerCase().includes('dlc') || input.placeholder.includes('/')) {
            kbType = 'date';
          } else if (input.name.toLowerCase().includes('lot')) {
            kbType = 'alphanumeric';
          } else if (originalType === 'number' || originalType === 'tel') {
            kbType = 'numeric';
          }
          
          openKeyboard({
            type: kbType,
            initialValue: input.value,
            onChange: (val) => {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
              nativeInputValueSetter?.call(input, val);
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);
            },
            onEnter: () => {
              closeKeyboard();
            }
          }, input);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'file';
      const isKeyboard = target.closest('#virtual-keyboard-ui');
      
      if (!isInput && !isKeyboard) {
        document.dispatchEvent(new CustomEvent('close-keyboard'));
      }
    };

    document.addEventListener('focusin', handleFocusIn, { capture: true });
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    
    const handleCloseEvent = () => closeKeyboard();
    document.addEventListener('close-keyboard', handleCloseEvent);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, { capture: true });
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('close-keyboard', handleCloseEvent);
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ openKeyboard, closeKeyboard, isOpen }}>
      {children}
      {isOpen && options && (
        <VirtualKeyboardUI 
          type={options.type} 
          onKeyPress={handleKeyPress} 
          onClose={() => {
            closeKeyboard();
          }} 
        />
      )}
    </KeyboardContext.Provider>
  );
};

const VirtualKeyboardUI: React.FC<{ type: KeyboardType, onKeyPress: (key: string) => void, onClose: () => void }> = ({ type, onKeyPress, onClose }) => {
  const layouts = {
    numeric: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['CLEAR', '0', 'BACKSPACE'],
      ['ENTER']
    ],
    temperature: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['-', '0', ','],
      ['CLEAR', 'BACKSPACE', 'ENTER']
    ],
    date: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['/', '0', new Date().getFullYear().toString()],
      ['CLEAR', 'BACKSPACE', 'ENTER']
    ],
    alphanumeric: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
      ['W', 'X', 'C', 'V', 'B', 'N', '-', '_', '/'],
      ['CLEAR', 'BACKSPACE', 'SPACE', 'ENTER']
    ],
    text: [
      ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
      ['W', 'X', 'C', 'V', 'B', 'N', '.', ',', '!'],
      ['CLEAR', 'BACKSPACE', 'SPACE', 'ENTER']
    ]
  };

  const currentLayout = layouts[type] || layouts.alphanumeric;

  const handleKey = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    if (key === 'SPACE') onKeyPress(' ');
    else if (key === 'ENTER') onKeyPress('ENTER');
    else if (key === 'BACKSPACE') onKeyPress('BACKSPACE');
    else if (key === 'CLEAR') onKeyPress('CLEAR');
    else onKeyPress(key);
  };

  return (
    <div 
      id="virtual-keyboard-ui"
      className="fixed bottom-0 left-0 right-0 bg-slate-200/95 backdrop-blur-xl border-t border-slate-300 shadow-2xl z-[9999] p-2 pb-safe select-none overflow-hidden touch-none animate-in slide-in-from-bottom-full duration-200"
      onPointerDown={e => e.preventDefault()}
    >
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-300/50 mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clavier Intelligent</span>
        <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="p-2 px-4 bg-slate-300 rounded-full text-slate-700 hover:bg-slate-400 font-bold text-sm">Fermer</button>
      </div>
      
      <div className="flex flex-col gap-1.5 md:gap-2 max-w-4xl mx-auto">
        {currentLayout.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5 md:gap-2 w-full">
            {row.map(key => {
              let btnClass = "bg-white text-slate-800 font-bold rounded-xl shadow-sm border border-slate-300/50 flex items-center justify-center text-xl transition-transform active:bg-slate-300 active:scale-95 touch-none";
              let label = key;
              
              if (key === 'ENTER') {
                btnClass = "bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-sm text-lg md:text-xl px-4 md:px-8 active:scale-95 touch-none";
                label = 'Valider';
              } else if (key === 'BACKSPACE') {
                btnClass = "bg-slate-300 text-slate-800 font-bold rounded-xl shadow-sm text-lg md:text-xl px-2 md:px-4 active:scale-95 touch-none";
                label = '⌫';
              } else if (key === 'CLEAR') {
                btnClass = "bg-slate-300 text-slate-800 font-bold rounded-xl shadow-sm text-xs md:text-sm px-2 md:px-4 active:scale-95 touch-none";
                label = 'Effacer';
              } else if (key === 'SPACE') {
                 btnClass = "bg-white text-slate-800 shadow-sm border border-slate-300/50 rounded-xl px-8 md:px-12 active:scale-95 touch-none";
                 label = 'Espace';
              }

              return (
                <button
                  key={key}
                  className={`${btnClass} ${type === 'numeric' || type === 'temperature' || type === 'date' ? 'h-12 md:h-16 w-1/4 max-w-[100px]' : 'h-10 md:h-12 flex-1 max-w-[60px] md:max-w-[80px]'}`}
                  onPointerDown={(e) => handleKey(e, key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
