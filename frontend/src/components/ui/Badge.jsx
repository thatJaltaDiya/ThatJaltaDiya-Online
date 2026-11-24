import React from 'react';

export function Badge({
  children,
  variant = 'accent',
  tilt = false,
  className = '',
}) {
  const variants = {
    accent: 'bg-accent text-white border-border',
    butter: 'bg-butter text-primary border-border',
    sage: 'bg-sage text-primary border-border',
    lavender: 'bg-lavender text-primary border-border',
    dark: 'bg-primary text-white border-border',
    outline: 'bg-white text-primary border-border',
  };

  const tilts = tilt ? 'transform -rotate-2 hover:rotate-0 transition-transform' : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-[1.5px] shadow-pop-sm select-none ${
        variants[variant] || variants.accent
      } ${tilts} ${className}`}
    >
      {children}
    </span>
  );
}
