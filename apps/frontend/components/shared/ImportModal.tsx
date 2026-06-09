'use client';
import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ImportResult {
  success: boolean;
  summary: { total: number; passed: number; failed: number; flagged?: number };
  passed: any[];
  failed: { row: number; data: any; reason: string }[];
  flagged?: { row: number; reason: string }[];
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult>;
  title: string;
  templateHint?: string;
}

export default function ImportModal({ open, onClose, onImport, title, templateHint }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = (f: File) => { setFile(f); setResult(null); };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await onImport(file);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth={560}>
      {!result ? (
        <>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            style={{
              border: `2px dashed ${dragging ? 'var(--brand-blue)' : 'var(--line-2)'}`,
              borderRadius: 16,
              background: dragging ? '#f0f8ff' : '#fafcff',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s',
              marginBottom: 16,
            }}
          >
            <input
              ref={fileRef} type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {file ? (
              <>
                <FileSpreadsheet size={28} style={{ color: 'var(--brand-blue)', marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </div>
              </>
            ) : (
              <>
                <Upload size={28} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                  Drop a CSV or Excel file here
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  or click to browse
                </div>
              </>
            )}
          </div>

          {templateHint && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              <strong>Expected columns:</strong> {templateHint}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
          </div>
        </>
      ) : (
        /* Result report */
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatChip icon={<CheckCircle size={13} />} label="Passed" value={result.summary.passed} color="green" />
            {result.summary.flagged !== undefined && (
              <StatChip icon={<AlertTriangle size={13} />} label="Flagged" value={result.summary.flagged} color="yellow" />
            )}
            <StatChip icon={<XCircle size={13} />} label="Failed" value={result.summary.failed} color="red" />
          </div>

          {result.failed.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Failed Rows
              </div>
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                border: '1px solid var(--line)', borderRadius: 12,
              }}>
                {result.failed.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'baseline', gap: 10,
                    padding: '9px 12px',
                    borderBottom: i < result.failed.length - 1 ? '1px solid var(--line)' : 'none',
                    fontSize: 13,
                  }}>
                    <span className="badge badge-red">Row {f.row}</span>
                    <span style={{ color: 'var(--ink-soft)', flex: 1 }}>{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={reset}>Import Another</button>
            <button className="btn-primary" onClick={handleClose}>Done</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' };
  return (
    <div className={`badge ${colorMap[color]}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
      {icon} {value} {label}
    </div>
  );
}