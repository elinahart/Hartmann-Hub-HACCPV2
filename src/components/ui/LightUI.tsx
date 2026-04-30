import React from 'react';

export const Card = ({ children, className = '', ...props }: any) => (
  <div className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 border border-gray-50 ${className}`} {...props}>
    {children}
  </div>
);

export const Input = (props: any) => {
  const isDate = props.type === 'date' || props.type === 'time' || props.type === 'datetime-local';
  
  return (
    <div className="relative w-full flex flex-col justify-center">
      <input 
        className={`w-full h-[52px] bg-gray-50 border border-gray-200 rounded-full px-6 text-gray-800 font-bold focus:bg-white focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 transition-all appearance-none m-0 ${isDate ? 'pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-date-and-time-value]:text-left' : ''}`} 
        {...props} 
      />
      {isDate && (
        <div className="absolute right-4 pointer-events-none text-crousty-purple flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </div>
      )}
    </div>
  );
};

export const Label = ({ children, className = '' }: any) => (
  <label className={`block text-sm font-bold text-gray-500 mb-2 ml-2 ${className}`}>{children}</label>
);

export const Button = ({ children, className = '', variant = 'primary', ...props }: any) => {
  const baseStyle = "rounded-[26px] font-black transition-all active:scale-95 flex items-center justify-center gap-2";
  const defaultLayout = className.includes('w-') ? '' : 'w-full';
  const defaultPadding = className.includes('py-') || className.includes('h-') ? '' : 'py-4';
  
  if (variant === 'primary') {
    return (
      <button 
        style={{
          background: props.disabled ? "#F3F4F6" : "var(--color-primary)",
          color: props.disabled ? "#9CA3AF" : "white",
          boxShadow: props.disabled ? "none" : "0 8px 20px -6px rgba(255,42,157,0.5)",
          opacity: props.disabled ? 0.6 : 1,
          cursor: props.disabled ? "not-allowed" : "pointer"
        }}
        className={`${baseStyle} ${defaultLayout} ${defaultPadding} ${className}`} 
        {...props}
      >
        {children}
      </button>
    );
  }

  const variants = {
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-500 text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)] hover:bg-red-600 hover:-translate-y-0.5",
    outline: "border-2 border-dashed border-gray-300 text-gray-600 bg-gray-50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
  };
  
  return (
    <button className={`${baseStyle} ${defaultLayout} ${defaultPadding} ${variants[variant as keyof typeof variants] || ''} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Select = (props: any) => (
  <div className="relative w-full flex flex-col justify-center">
    <select className="w-full h-[52px] bg-gray-50 border border-gray-200 rounded-full px-6 pr-12 text-gray-800 font-bold focus:bg-white focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 transition-all appearance-none m-0" {...props} />
    <div className="absolute right-4 pointer-events-none text-crousty-purple flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  </div>
);
