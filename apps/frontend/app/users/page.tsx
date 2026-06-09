"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/shared/Pageheader";
import { SearchBar, Pagination } from "@/components/shared/Searchpagination";
import Modal from "@/components/ui/Modal";
import ConfirmDelete from "@/components/shared/ConfirmDelete";
import { useToast } from "@/components/ui/Toast";
import { userService } from "@/services/user.service";
import { departmentService } from "@/services/department.service";
import { Role } from "@/types/auth.type";
import type {
  AppUser,
  UserPreviewRow,
  CommitDecision,
} from "@/types/user.type";
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const ROLE_BADGE: Record<Role, string> = {
  [Role.ADMIN]: "badge-red",
  [Role.HOD]: "badge-blue",
  [Role.DEAN]: "badge-blue",
  [Role.COORDINATOR]: "badge-green",
  [Role.PROFESSOR]: "badge-gray",
};

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserFormModal({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: AppUser;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.PROFESSOR);
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: deptData } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => departmentService.list({ limit: 100 }),
  });
  const departments = deptData?.data || [];

  useEffect(() => {
    setName(existing?.name || "");
    setEmail(existing?.email || "");
    setRole(existing?.role || Role.PROFESSOR);
    setDepartmentId(existing?.departmentId || "");
  }, [existing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (existing) {
        await userService.update(existing.id, {
          name,
          role,
          departmentId: departmentId || null,
        });
        toast("success", "User updated");
      } else {
        await userService.create({
          name,
          email,
          role,
          departmentId: departmentId || null,
        });
        toast("success", "User created — default password: SamayakUser@2026");
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast("error", err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit User" : "New User"}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <label className="field-label">Full Name</label>
          <input
            className="input"
            placeholder="e.g. Dr. Priya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        {!existing && (
          <div>
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="faculty@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="field-label">Role</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.values(Role).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `2px solid ${role === r ? "var(--brand-blue)" : "var(--line)"}`,
                  background: role === r ? "#eaf4ff" : "white",
                  color: role === r ? "var(--brand-deep)" : "var(--ink-soft)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Department</label>
          <select
            className="input"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">None (system-wide)</option>
            {(departments as any[]).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {!existing && (
          <p
            style={{
              fontSize: 12,
              color: "var(--muted)",
              background: "#f6f9fd",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            Default password:{" "}
            <code style={{ fontFamily: "monospace", fontWeight: 700 }}>
              SamayakUser@2026
            </code>
          </p>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving…" : existing ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Two-step Import Modal ────────────────────────────────────────────────────
function UserImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<UserPreviewRow[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<
    Record<string, "CREATE" | "MERGE" | "SKIP">
  >({});
  const [summary, setSummary] = useState<any>(null);

  const reset = () => {
    setStep("upload");
    setPreview([]);
    setErrors([]);
    setDecisions({});
    setSummary(null);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const res = await userService.previewImport(file);
      setPreview(res.preview);
      setErrors(res.errors);
      const initial: Record<string, "CREATE" | "MERGE" | "SKIP"> = {};
      res.preview.forEach((r) => {
        initial[r.email] = r.status === "NEW" ? "CREATE" : "MERGE";
      });
      setDecisions(initial);
      setStep("preview");
    } catch (err: any) {
      toast("error", err?.response?.data?.message || "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const commitList: CommitDecision[] = preview.map((r) => ({
        email: r.email,
        name: r.name,
        role: r.role,
        departmentId: r.departmentId || null, // Ensure explicit null
        action: decisions[r.email] || "SKIP",
      }));

      const res = await userService.commitImport(commitList);
      setSummary(res.summary);
      setStep("done");
      onDone(); // This will refresh the user list
    } catch (err: any) {
      toast("error", err?.response?.data?.message || "Commit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Users"
      maxWidth={600}
    >
      {step === "upload" && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--line-2)",
              borderRadius: 16,
              background: "#fafcff",
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <FileSpreadsheet
              size={32}
              style={{ color: "var(--muted)", marginBottom: 10 }}
            />
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Drop CSV / Excel here or click to browse
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              Columns: name, email, role, department_code
            </div>
          </div>
          {loading && (
            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Parsing…
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <span className="badge badge-green">
              <CheckCircle size={11} />{" "}
              {preview.filter((p) => decisions[p.email] === "CREATE").length}{" "}
              Create
            </span>
            <span className="badge badge-blue">
              {preview.filter((p) => decisions[p.email] === "MERGE").length}{" "}
              Merge
            </span>
            <span className="badge badge-gray">
              {preview.filter((p) => decisions[p.email] === "SKIP").length} Skip
            </span>
            {errors.length > 0 && (
              <span className="badge badge-red">
                <AlertTriangle size={11} /> {errors.length} Errors
              </span>
            )}
          </div>
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              border: "1px solid var(--line)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {preview.map((row, i) => (
              <div
                key={row.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom:
                    i < preview.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {row.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {row.email}
                  </div>
                </div>
                <span
                  className={`badge ${ROLE_BADGE[row.role]}`}
                  style={{ fontSize: 10 }}
                >
                  {row.role}
                </span>
                {row.status === "DUPLICATE" && (
                  <span className="badge badge-yellow" style={{ fontSize: 10 }}>
                    Exists
                  </span>
                )}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["CREATE", "MERGE", "SKIP"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setDecisions((d) => ({ ...d, [row.email]: a }))
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        background:
                          decisions[row.email] === a
                            ? a === "CREATE"
                              ? "#d5f5ec"
                              : a === "MERGE"
                                ? "#ddeeff"
                                : "#eef1f6"
                            : "#f4f6fb",
                        color:
                          decisions[row.email] === a
                            ? a === "CREATE"
                              ? "#1c7a5c"
                              : a === "MERGE"
                                ? "var(--brand-deep)"
                                : "var(--muted)"
                            : "var(--muted)",
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-secondary" onClick={reset}>
              Back
            </button>
            <button
              className="btn-primary"
              onClick={handleCommit}
              disabled={loading}
            >
              {loading ? "Committing…" : "Commit Import"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && summary && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <CheckCircle
            size={40}
            style={{ color: "var(--success)", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
            Import Complete
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span className="badge badge-green">{summary.created} Created</span>
            <span className="badge badge-blue">{summary.merged} Merged</span>
            <span className="badge badge-gray">{summary.skipped} Skipped</span>
          </div>
          <button className="btn-primary" onClick={handleClose}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "faculty">("users");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", debouncedSearch, page, roleFilter],
    queryFn: () =>
      userService.list({
        page,
        limit: 15,
        search: debouncedSearch,
        role: (roleFilter as Role) || undefined,
      }),
  });

  const { data: facultyData, isLoading: facultyLoading } = useQuery({
    queryKey: ["faculties", debouncedSearch, page],
    queryFn: () =>
      userService.listFaculties({
        page,
        limit: 15,
        search: debouncedSearch,
      }),
    enabled: activeTab === "faculty",
  });

  const users: AppUser[] = data?.data || [];
  const pagination = data?.pagination;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.delete(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("success", `${deleteTarget.name} soft-deleted — can be restored`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast("error", "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (u: AppUser) => {
    try {
      await userService.restore(u.id);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("success", `${u.name} restored`);
    } catch {
      toast("error", "Failed to restore");
    }
  };

  return (
    <PageShell>
      <style>{`.field-label{display:block;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}`}</style>

      <PageHeader
        title="Faculty & Users"
        subtitle="Manage system users and their roles"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={14} /> Import
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditTarget(undefined);
                setFormOpen(true);
              }}
            >
              <Plus size={14} /> New User
            </button>
          </>
        }
      />

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "var(--canvas-2)",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
        }}
      >
        {(["users", "faculty"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            style={{
              padding: "7px 18px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.15s",
              background: activeTab === tab ? "white" : "transparent",
              color: activeTab === tab ? "var(--brand-deep)" : "var(--muted)",
              boxShadow: activeTab === tab ? "var(--sh-sm)" : "none",
            }}
          >
            {tab === "users" ? "System Users" : "Faculty"}
          </button>
        ))}
      </div>

      <div
        className="fade-up fade-up-delay-1"
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
        />
        <select
          className="input"
          style={{ width: 160 }}
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          {Object.values(Role).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap fade-up fade-up-delay-2">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>{activeTab === "users" ? "Role" : "Assigned Slots"}</th>
              <th>Department</th>
              {activeTab === "users" && <th style={{ width: 110 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {activeTab === "users" ? (
              <>
                {/* existing users rows unchanged */}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--muted)",
                      }}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--muted)",
                      }}
                    >
                      No users found
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700 }}>{u.name}</td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {u.email}
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>
                      {u.department?.code || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 8px" }}
                          onClick={() => {
                            setEditTarget(u);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "5px 8px", color: "var(--error)" }}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <>
                {facultyLoading && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--muted)",
                      }}
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!facultyLoading && (facultyData?.data ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "var(--muted)",
                      }}
                    >
                      No faculty found
                    </td>
                  </tr>
                )}
                {(facultyData?.data ?? []).map((f: any) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700 }}>{f.name}</td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                      {f.email ?? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge badge-gray"
                        style={{ fontSize: 10 }}
                      >
                        {f._count?.slotAssignments ?? 0} slots
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>
                      {f.department?.code || "—"}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        {activeTab === "users"
          ? pagination &&
            pagination.totalPages > 1 && (
              <Pagination {...pagination} onPage={setPage} />
            )
          : facultyData?.pagination &&
            facultyData.pagination.totalPages > 1 && (
              <Pagination {...facultyData.pagination} onPage={setPage} />
            )}
      </div>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        existing={editTarget}
        onSave={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        confirmLabel="Soft Delete"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> will be soft-deleted and can
            be restored later. They will lose access immediately.
          </>
        }
      />

      <UserImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />
    </PageShell>
  );
}
