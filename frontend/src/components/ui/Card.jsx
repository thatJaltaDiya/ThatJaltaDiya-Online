import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = true,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-card rounded-2xl border-2 border-border shadow-pop p-5 transition-all duration-200 ${
        hoverEffect ? 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-pop-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
