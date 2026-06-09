'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/shared/Pageheader';
import { SearchBar, Pagination } from '@/components/shared/Searchpagination';
import Modal from '@/components/ui/Modal';
import ConfirmDelete from '@/components/shared/ConfirmDelete';
import ImportModal from '@/components/shared/ImportModal';
import { useToast } from '@/components/ui/Toast';
import { departmentService } from '@/services/department.service';
import type { Department, Branch } from '@/types/department.type';
import { Plus, Upload, Pencil, Trash2, ChevronDown, ChevronUp, GitBranch } from 'lucide-react';

// ─── Form Modal ──────────────────────────────────────────────────────────────
function DepartmentFormModal({
  open, onClose, existing, onSave,
}: {
  open: boolean; onClose: () => void;
  existing?: Department; onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(existing?.name || '');
  const [code, setCode] = useState(existing?.code || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(existing?.name || '');
    setCode(existing?.code || '');
  }, [existing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (existing) {
        await departmentService.update(existing.id, { name, code });
        toast('success', 'Department updated');
      } else {
        await departmentService.create({ name, code });
        toast('success', 'Department created');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Department' : 'New Department'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label">Department Name</label>
          <input className="input" placeholder="e.g. Computer Science & Engineering" value={name}
            onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Short Code</label>
          <input className="input" placeholder="e.g. CSE" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())} required maxLength={10} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>Unique identifier, max 10 chars.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Branch Row ───────────────────────────────────────────────────────────────
function BranchesPanel({ departmentId }: { departmentId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ['branches', departmentId],
    queryFn: () => departmentService.getBranches(departmentId),
  });

  const branches: Branch[] = data?.data || [];

  const addBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await departmentService.createBranch(departmentId, { name: newName.trim() });
      setNewName('');
      qc.invalidateQueries({ queryKey: ['branches', departmentId] });
      toast('success', 'Branch added');
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Failed to add branch');
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departmentService.deleteBranch(departmentId, deleteTarget.id, true);
      qc.invalidateQueries({ queryKey: ['branches', departmentId] });
      toast('success', 'Branch deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '12px 16px 16px', background: '#f6f9fd', borderTop: '1px solid var(--line)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
        Branches ({branches.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {branches.map(b => (
          <div key={b.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'white', border: '1px solid var(--line-2)',
            borderRadius: 10, padding: '5px 10px', fontSize: 13, fontWeight: 600,
          }}>
            <GitBranch size={12} style={{ color: 'var(--brand-blue)' }} />
            {b.name}
            <button
              onClick={() => setDeleteTarget(b)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 1, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
        {branches.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>No branches yet</span>
        )}
      </div>
      <form onSubmit={addBranch} style={{ display: 'flex', gap: 8 }}>
        <input
          className="input" style={{ flex: 1, fontSize: 13, padding: '7px 12px' }}
          placeholder="Branch name (e.g. CS, AIML)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={adding} style={{ padding: '7px 14px', fontSize: 13 }}>
          <Plus size={13} /> Add
        </button>
      </form>
      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        description={<>Delete branch <strong>{deleteTarget?.name}</strong>? This may affect sections and courses linked to it.</>}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['departments', debouncedSearch, page],
    queryFn: () => departmentService.list({ page, limit: 15, search: debouncedSearch }),
  });

  const departments: Department[] = data?.data || [];
  const pagination = data?.pagination;

  const handleEdit = (d: Department) => { setEditTarget(d); setFormOpen(true); };
  const handleNew = () => { setEditTarget(undefined); setFormOpen(true); };

  const handleDeleteClick = async (d: Department) => {
    try {
      const res = await departmentService.checkDependencies(d.id);
      setDeleteTarget(d);
      setDeleteWarning(res.data?.hasDependencies ? res.data : null);
    } catch {
      setDeleteTarget(d);
      setDeleteWarning(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departmentService.delete(deleteTarget.id, true);
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast('success', `"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      setDeleteWarning(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (file: File) => {
    const res = await departmentService.import(file);
    qc.invalidateQueries({ queryKey: ['departments'] });
    return res as any;
  };

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 800,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--muted)', marginBottom: 6,
  };

  return (
    <PageShell>
      <style>{`.field-label{display:block;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}`}</style>

      <PageHeader
        title="Departments"
        subtitle="Manage departments and their branches"
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Import CSV
            </button>
            <button className="btn-primary" onClick={handleNew}>
              <Plus size={14} /> New Department
            </button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="fade-up fade-up-delay-1" style={{ marginBottom: 16 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search departments…" />
      </div>

      {/* Table */}
      <div className="table-wrap fade-up fade-up-delay-2">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Code</th>
              <th>Branches</th>
              <th>Rooms</th>
              <th>Users</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</td></tr>
            )}
            {!isLoading && departments.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No departments found</td></tr>
            )}
            {departments.map(d => (
              <>
                <tr key={d.id}>
                  <td>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--ink)', padding: 0 }}
                      onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    >
                      {expandedId === d.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {d.name}
                    </button>
                  </td>
                  <td><span className="badge badge-blue">{d.code}</span></td>
                  <td>{d._count?.branches ?? '—'}</td>
                  <td>{d._count?.rooms ?? '—'}</td>
                  <td>{d._count?.users ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => handleEdit(d)}>
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '5px 8px', color: 'var(--error)' }}
                        onClick={() => handleDeleteClick(d)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fdecee')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === d.id && (
                  <tr key={`${d.id}-branches`}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <BranchesPanel departmentId={d.id} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <Pagination {...pagination} onPage={setPage} />
        )}
      </div>

      {/* Modals */}
      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        existing={editTarget}
        onSave={() => qc.invalidateQueries({ queryKey: ['departments'] })}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteWarning(null); }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Department"
        description={
          deleteWarning?.hasDependencies ? (
            <>
              <strong>{deleteTarget?.name}</strong> has dependent records:
              <ul style={{ margin: '8px 0 0 16px', fontSize: 13 }}>
                {deleteWarning.counts.branches > 0 && <li>{deleteWarning.counts.branches} branch(es)</li>}
                {deleteWarning.counts.rooms > 0 && <li>{deleteWarning.counts.rooms} room(s)</li>}
                {deleteWarning.counts.users > 0 && <li>{deleteWarning.counts.users} user(s)</li>}
              </ul>
              <p style={{ marginTop: 8 }}>These will remain but lose their department link. Continue?</p>
            </>
          ) : (
            <>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</>
          )
        }
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        title="Import Departments"
        templateHint="department_name, department_code, branch_name (optional)"
      />
    </PageShell>
  );
}