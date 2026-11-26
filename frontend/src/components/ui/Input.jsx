import React from 'react';

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary/50">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full px-4 py-2.5 min-h-[44px] bg-white text-primary text-sm font-medium rounded-xl border transition-all outline-none ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500 ring-1 ring-red-500/20'
              : 'border-border/30 focus:border-primary/40 focus:ring-1 focus:ring-primary/10'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 animate-in fade-in">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-primary/60">
          {helperText}
        </p>
      )}
    </div>
  );
}
