'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/shared/Pageheader';
import { SearchBar, Pagination } from '@/components/shared/Searchpagination';
import Modal from '@/components/ui/Modal';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import ImportModal from '@/components/shared/ImportModal';
import { useToast } from '@/components/ui/Toast';
import { roomService } from '@/services/room.service';
import { departmentService } from '@/services/department.service';
import { RoomType, type Room } from '@/types/room.type';
import { Plus, Upload, Pencil, Trash2 } from 'lucide-react';

const ROOM_TYPE_BADGE: Record<RoomType, string> = {
  [RoomType.CLASSROOM]: 'badge-blue',
  [RoomType.LAB]:       'badge-green',
  [RoomType.OTHER]:     'badge-gray',
};

function RoomFormModal({ open, onClose, existing, onSave }: {
  open: boolean; onClose: () => void;
  existing?: Room; onSave: () => void;
}) {
  const { toast } = useToast();
  const [number, setNumber] = useState(existing?.number || '');
  const [capacity, setCapacity] = useState<string>(existing?.capacity?.toString() || '');
  const [type, setType] = useState<RoomType>(existing?.type || RoomType.CLASSROOM);
  const [departmentId, setDepartmentId] = useState(existing?.departmentId || '');
  const [loading, setLoading] = useState(false);

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentService.list({ limit: 100 }),
  });

  useEffect(() => {
    setNumber(existing?.number || '');
    setCapacity(existing?.capacity?.toString() || '');
    setType(existing?.type || RoomType.CLASSROOM);
    setDepartmentId(existing?.departmentId || '');
  }, [existing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (existing) {
        await roomService.update(existing.id, { number, capacity: capacity ? parseInt(capacity) : undefined, type });
        toast('success', 'Room updated');
      } else {
        await roomService.create({ number, capacity: parseInt(capacity), type, departmentId });
        toast('success', 'Room created');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const departments = deptData?.data || [];

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Room' : 'New Room'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Room Number</label>
            <input className="input" placeholder="e.g. 219" value={number} onChange={e => setNumber(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Capacity</label>
            <input className="input" type="number" min={1} placeholder="e.g. 60" value={capacity} onChange={e => setCapacity(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="field-label">Room Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.values(RoomType).map(t => (
              <button
                key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `2px solid ${type === t ? 'var(--brand-blue)' : 'var(--line)'}`,
                  background: type === t ? '#eaf4ff' : 'white',
                  color: type === t ? 'var(--brand-deep)' : 'var(--ink-soft)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {!existing && (
          <div>
            <label className="field-label">Department</label>
            <select
              className="input"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              required
            >
              <option value="">Select department…</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create Room'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RoomsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', debouncedSearch, page, deptFilter],
    queryFn: () => roomService.list({ page, limit: 15, search: debouncedSearch, departmentId: deptFilter || undefined }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentService.list({ limit: 100 }),
  });

  const rooms: Room[] = data?.data || [];
  const pagination = data?.pagination;
  const departments = deptData?.data || [];

  const handleDeleteClick = async (r: Room) => setDeleteTarget(r);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roomService.delete(deleteTarget.id, true);
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast('success', `Room ${deleteTarget.number} deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <style>{`.field-label{display:block;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}`}</style>

      <PageHeader
        title="Rooms"
        subtitle="Lecture rooms and labs across departments"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={14} /> Import CSV</button>
            <button className="btn-primary" onClick={() => { setEditTarget(undefined); setFormOpen(true); }}><Plus size={14} /> New Room</button>
          </>
        }
      />

      <div className="fade-up fade-up-delay-1" style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search room number…" />
        <select
          className="input"
          style={{ width: 200 }}
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Departments</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>{d.code}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap fade-up fade-up-delay-2">
        <table>
          <thead>
            <tr>
              <th>Room No.</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Department</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</td></tr>
            )}
            {!isLoading && rooms.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No rooms found</td></tr>
            )}
            {rooms.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.number}</td>
                <td><span className={`badge ${ROOM_TYPE_BADGE[r.type]}`}>{r.type}</span></td>
                <td>
                  {r.capacity != null
                    ? <span style={{ fontWeight: 600 }}>{r.capacity} seats</span>
                    : <span className="badge badge-yellow">No capacity</span>
                  }
                </td>
                <td style={{ color: 'var(--ink-soft)' }}>
                  {r.department?.name} <span style={{ color: 'var(--muted)' }}>({r.department?.code})</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => { setEditTarget(r); setFormOpen(true); }}>
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn-ghost" style={{ padding: '5px 8px', color: 'var(--error)' }}
                      onClick={() => handleDeleteClick(r)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdecee')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && <Pagination {...pagination} onPage={setPage} />}
      </div>

      <RoomFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        existing={editTarget}
        onSave={() => qc.invalidateQueries({ queryKey: ['rooms'] })}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        description={<>Delete room <strong>{deleteTarget?.number}</strong>? It will be removed from all timetable slots.</>}
      />

      <ImportModal
        open={importOpen} onClose={() => setImportOpen(false)}
        onImport={async (file) => { const r = await roomService.import(file); qc.invalidateQueries({ queryKey: ['rooms'] }); return r as any; }}
        title="Import Rooms"
        templateHint="room_number, department_code, capacity (optional), type (CLASSROOM|LAB|OTHER)"
      />
    </PageShell>
  );
}