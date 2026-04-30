import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger";
}

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const baseStyles = "px-4 py-3 font-bold uppercase tracking-wider rounded-md border-2 transition-colors duration-200";
    
    const variants = {
      primary: "border-crousty-pink text-crousty-pink hover:bg-crousty-pink hover:text-crousty-dark shadow-[0_0_10px_rgba(253,134,255,0.5)] hover:shadow-[0_0_20px_rgba(253,134,255,0.8)]",
      secondary: "border-crousty-purple text-crousty-purple hover:bg-crousty-purple hover:text-crousty-dark shadow-[0_0_10px_rgba(255,202,11,0.5)] hover:shadow-[0_0_20px_rgba(255,202,11,0.8)]",
      danger: "border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.8)]",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
NeonButton.displayName = "NeonButton";

export const NeonCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn(
        "bg-crousty-gray border border-crousty-pink/30 rounded-xl p-4 shadow-[0_0_15px_rgba(253,134,255,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const NeonInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-crousty-dark border border-crousty-purple/50 rounded-md px-3 py-2 text-crousty-purple placeholder:text-crousty-purple/30 focus:outline-none focus:border-crousty-pink focus:shadow-[0_0_10px_rgba(253,134,255,0.3)] transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
NeonInput.displayName = "NeonInput";

export const NeonSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full bg-crousty-dark border border-crousty-purple/50 rounded-md px-3 py-2 text-crousty-purple focus:outline-none focus:border-crousty-pink focus:shadow-[0_0_10px_rgba(253,134,255,0.3)] transition-all appearance-none",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NeonSelect.displayName = "NeonSelect";

export const NeonLabel = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => {
  return (
    <label 
      className={cn("block text-xs font-bold uppercase tracking-wider text-crousty-pink mb-1", className)}
      {...props}
    >
      {children}
    </label>
  );
};
