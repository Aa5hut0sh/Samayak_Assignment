'use client';
import Modal from '@/components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: React.ReactNode;
  loading?: boolean;
  confirmLabel?: string;
}

export default function ConfirmDelete({
  open, onClose, onConfirm,
  title = 'Confirm Delete',
  description,
  loading = false,
  confirmLabel = 'Delete',
}: ConfirmDeleteProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={440}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#fdecee',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            background: 'var(--error)', color: 'white',
            fontWeight: 700, borderRadius: 'var(--r-pill)',
            padding: '10px 22px', fontSize: 14, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}