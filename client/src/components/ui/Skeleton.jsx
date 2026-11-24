import React from 'react';

export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return (
    <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />
  );
}
