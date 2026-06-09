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
import { courseService } from '@/services/course.service';
import { departmentService } from '@/services/department.service';
import { CourseType, type Course } from '@/types/course.type';
import { Plus, Upload, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const COURSE_TYPE_BADGE: Record<CourseType, string> = {
  [CourseType.LECTURE]:  'badge-blue',
  [CourseType.LAB]:      'badge-green',
  [CourseType.TUTORIAL]: 'badge-yellow',
};

function CourseFormModal({ open, onClose, existing, onSave }: {
  open: boolean; onClose: () => void;
  existing?: Course; onSave: () => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('3');
  const [type, setType] = useState<CourseType>(CourseType.LECTURE);
  const [branchId, setBranchId] = useState('');
  const [semester, setSemester] = useState('1');
  const [loading, setLoading] = useState(false);

  // Flatten branches from all departments
  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentService.list({ limit: 100 }),
  });

  const allBranches: { id: string; name: string; deptCode: string }[] = [];
  (deptData?.data || []).forEach((d: any) => {
    (d.branches || []).forEach((b: any) => allBranches.push({ id: b.id, name: b.name, deptCode: d.code }));
  });

  useEffect(() => {
    setCode(existing?.code || '');
    setName(existing?.name || '');
    setCredits(existing?.credits?.toString() || '3');
    setType(existing?.type || CourseType.LECTURE);
    setBranchId(existing?.branchId || '');
    setSemester(existing?.semester?.toString() || '1');
  }, [existing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (existing) {
        await courseService.update(existing.id, { code, name, credits: parseFloat(credits), type, semester: parseInt(semester) });
        toast('success', 'Course updated');
      } else {
        await courseService.create({ code, name, credits: parseFloat(credits), type, branchId, semester: parseInt(semester) });
        toast('success', 'Course created');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isZero = parseFloat(credits) === 0;

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Course' : 'New Course'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Course Code</label>
            <input className="input" placeholder="e.g. CS601" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label className="field-label">Credits</label>
            <input className="input" type="number" step="0.5" min={0} value={credits}
              onChange={e => setCredits(e.target.value)} required />
          </div>
        </div>

        {isZero && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef3d5', border: '1px solid #fde5a0', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#9a6800', fontWeight: 600 }}>
            <AlertTriangle size={13} /> Zero-credit subject — will be flagged
          </div>
        )}

        <div>
          <label className="field-label">Course Name</label>
          <input className="input" placeholder="e.g. Compiler Design" value={name}
            onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <label className="field-label">Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.values(CourseType).map(t => (
              <button key={t} type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {!existing && (
            <div style={{ gridColumn: '1/-1' }}>
              <label className="field-label">Branch</label>
              <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)} required>
                <option value="">Select branch…</option>
                {allBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.deptCode} — {b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Semester</label>
            <select className="input" value={semester} onChange={e => setSemester(e.target.value)} required>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create Course'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function CoursesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Course | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', debouncedSearch, page, branchFilter, semesterFilter],
    queryFn: () => courseService.list({
      page, limit: 15, search: debouncedSearch,
      branchId: branchFilter || undefined,
      semester: semesterFilter ? parseInt(semesterFilter) : undefined,
    }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentService.list({ limit: 100 }),
  });

  const allBranches: { id: string; name: string; deptCode: string }[] = [];
  (deptData?.data || []).forEach((d: any) => {
    (d.branches || []).forEach((b: any) => allBranches.push({ id: b.id, name: b.name, deptCode: d.code }));
  });

  const courses: Course[] = data?.data || [];
  const pagination = data?.pagination;

  // Scope indicator
  const selectedBranch = allBranches.find(b => b.id === branchFilter);
  const scopeLabel = [
    selectedBranch ? `${selectedBranch.deptCode} — ${selectedBranch.name}` : null,
    semesterFilter ? `Semester ${semesterFilter}` : null,
  ].filter(Boolean).join(', ');

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await courseService.delete(deleteTarget.id, true);
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast('success', `"${deleteTarget.code}" deleted`);
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
        title="Courses"
        subtitle={scopeLabel ? `Viewing: ${scopeLabel}` : 'All courses across branches and semesters'}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload size={14} /> Import CSV</button>
            <button className="btn-primary" onClick={() => { setEditTarget(undefined); setFormOpen(true); }}><Plus size={14} /> New Course</button>
          </>
        }
      />

      {/* Scope filters */}
      <div className="fade-up fade-up-delay-1" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search code or name…" />
        <select className="input" style={{ width: 180 }} value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}>
          <option value="">All Branches</option>
          {allBranches.map(b => <option key={b.id} value={b.id}>{b.deptCode} — {b.name}</option>)}
        </select>
        <select className="input" style={{ width: 150 }} value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}>
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        {(branchFilter || semesterFilter) && (
          <button className="btn-ghost" onClick={() => { setBranchFilter(''); setSemesterFilter(''); }} style={{ fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      <div className="table-wrap fade-up fade-up-delay-2">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Credits</th>
              <th>Semester</th>
              <th>Branch</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading…</td></tr>}
            {!isLoading && courses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No courses found</td></tr>}
            {courses.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{c.code}</span>
                    {c.isZeroCredit && <span className="badge badge-yellow" style={{ fontSize: 10 }}>0 cr</span>}
                  </div>
                </td>
                <td style={{ maxWidth: 220 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </td>
                <td><span className={`badge ${COURSE_TYPE_BADGE[c.type]}`}>{c.type}</span></td>
                <td style={{ fontWeight: 600 }}>{c.credits}</td>
                <td>
                  <span style={{ background: '#f0f4fa', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    Sem {c.semester}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {c.branch?.department?.code} — {c.branch?.name}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => { setEditTarget(c); setFormOpen(true); }}><Pencil size={13} /></button>
                    <button
                      className="btn-ghost" style={{ padding: '5px 8px', color: 'var(--error)' }}
                      onClick={() => setDeleteTarget(c)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdecee')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    ><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && <Pagination {...pagination} onPage={setPage} />}
      </div>

      <CourseFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        existing={editTarget}
        onSave={() => qc.invalidateQueries({ queryKey: ['courses'] })}
      />

      <ConfirmDelete
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete} loading={deleting}
        description={<>Delete course <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong>? It will be removed from the timetable.</>}
      />

      <ImportModal
        open={importOpen} onClose={() => setImportOpen(false)}
        onImport={async (file) => { const r = await courseService.import(file); qc.invalidateQueries({ queryKey: ['courses'] }); return r as any; }}
        title="Import Courses"
        templateHint="course_code, course_name, credits, type (LECTURE|LAB|TUTORIAL), department_code, branch_name, semester"
      />
    </PageShell>
  );
}