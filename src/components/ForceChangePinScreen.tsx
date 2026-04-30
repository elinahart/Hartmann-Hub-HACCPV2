import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

export const ForceChangePinScreen = () => {
  const { currentUser, updateUserPin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: new pin, 2: confirm
  const [error, setError] = useState('');

  const handleKeypad = (num: string) => {
    if (step === 1 && pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) setStep(2);
    } else if (step === 2 && confirmPin.length < 4) {
      const newConfirm = confirmPin + num;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 4) {
        if (pin === newConfirm) {
          updateUserPin(currentUser!.id, pin);
        } else {
          setError('Les codes ne correspondent pas');
          setPin('');
          setConfirmPin('');
          setStep(1);
        }
      }
    }
  };

  const handleDel = () => {
    if (step === 1) setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
  };

  const currentDots = step === 1 ? pin : confirmPin;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-6">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-xl font-black text-crousty-dark mb-2">Sécurité requise</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium px-4">
          {step === 1 
            ? "Pour votre sécurité, vous devez choisir un nouveau code PIN (4 chiffres)."
            : "Veuillez confirmer votre nouveau code PIN."}
        </p>

        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all ${currentDots.length > i ? 'bg-crousty-purple scale-110' : 'bg-gray-200'}`} 
            />
          ))}
        </div>

        {error && <p className="text-red-500 font-bold mb-4 animate-bounce text-sm">{error}</p>}

        <div className="grid grid-cols-3 gap-4 mb-4">
          {['1','2','3','4','5','6','7','8','9','','0'].map((key) => {
            if (key === '') return <div key="empty" />;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypad(key)}
                className="w-16 h-16 bg-gray-50 text-2xl font-bold rounded-2xl mx-auto flex items-center justify-center active:bg-gray-200 active:scale-95 transition-all"
              >
                {key}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleDel}
            className="w-16 h-16 bg-gray-50 text-xl font-bold rounded-2xl mx-auto flex items-center justify-center active:bg-gray-200 active:scale-95 transition-all text-gray-500"
          >
            DEL
          </button>
        </div>
      </motion.div>
    </div>
  );
};
