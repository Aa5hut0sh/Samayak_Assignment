'use client';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search…' }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', width: 260 }}>
      <Search
        size={14}
        style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--muted)', pointerEvents: 'none',
        }}
      />
      <input
        className="input"
        style={{ paddingLeft: 34, paddingRight: 12 }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPage }: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderTop: '1px solid var(--line)',
      background: '#fafcff',
    }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
        Showing {start}–{end} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="btn-secondary"
          style={{ padding: '6px 10px', borderRadius: 8 }}
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{
          display: 'grid', placeItems: 'center',
          padding: '0 12px', fontSize: 13, fontWeight: 700,
          color: 'var(--brand-deep)',
          background: '#eaf4ff', borderRadius: 8,
          border: '1px solid var(--line-2)',
        }}>
          {page} / {totalPages}
        </span>
        <button
          className="btn-secondary"
          style={{ padding: '6px 10px', borderRadius: 8 }}
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}