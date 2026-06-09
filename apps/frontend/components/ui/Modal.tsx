'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}

export default function Modal({ open, onClose, title, children, maxWidth = 520 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--line)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#f4f7fb', border: 'none', borderRadius: 8,
              width: 30, height: 30, display: 'grid', placeItems: 'center',
              cursor: 'pointer', color: 'var(--muted)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e9eef7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f4f7fb')}
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}