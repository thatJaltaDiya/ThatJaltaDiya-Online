import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${maxWidth} bg-canvas rounded-2xl border-2 border-border shadow-pop-lg p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/10">
          {title && (
            <h3 id="modal-title" className="font-editorial text-xl font-bold text-primary">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-primary/70 hover:text-primary hover:bg-black/5 transition-colors ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
