import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px] cursor-pointer';

  const variants = {
    primary: 'bg-primary text-white border-2 border-border shadow-pop hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
    accent: 'bg-accent text-white border-2 border-border shadow-pop hover:bg-accent-hover hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
    secondary: 'bg-butter text-primary border-2 border-border shadow-pop hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
    sage: 'bg-sage text-primary border-2 border-border shadow-pop hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
    outline: 'bg-transparent text-primary border-2 border-border shadow-pop hover:bg-surface hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
    ghost: 'bg-transparent text-primary hover:bg-black/5 min-h-[36px]',
    danger: 'bg-red-500 text-white border-2 border-border shadow-pop hover:bg-red-600 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pop-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-hover',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 rounded-full',
    md: 'text-sm px-6 py-2.5 rounded-full',
    lg: 'text-base px-8 py-3.5 rounded-full',
    icon: 'p-2.5 rounded-full',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
