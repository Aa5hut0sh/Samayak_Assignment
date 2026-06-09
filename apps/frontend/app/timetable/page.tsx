"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/shared/Pageheader";
import { timetableService } from "@/services/timetable.service";
import { ImportStatus, type ImportJob } from "@/types/ingestion.type";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Database,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "idle" | "uploading" | "polling" | "done" | "failed";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<
  ImportStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    step: number;
    hint: string;
  }
> = {
  [ImportStatus.QUEUED]: {
    label: "Queued",
    color: "#9a6800",
    bg: "#fef3d5",
    border: "#fde5a0",
    icon: <Clock size={14} />,
    step: 1,
    hint: "Your PDF is in the queue and will be picked up shortly…",
  },
  [ImportStatus.PARSING]: {
    label: "Parsing PDF",
    color: "var(--brand-deep)",
    bg: "#ddeeff",
    border: "#b8d8f8",
    icon: (
      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
    ),
    step: 2,
    hint: "Extracting department, courses, rooms, slots, and faculty from the PDF…",
  },
  [ImportStatus.INTEGRATING]: {
    label: "Integrating",
    color: "#1c7a5c",
    bg: "#d5f5ec",
    border: "#b6ead9",
    icon: <Database size={14} />,
    step: 3,
    hint: "Matching extracted data against existing records and writing to the database…",
  },
  [ImportStatus.DONE]: {
    label: "Complete",
    color: "#1c7a5c",
    bg: "#d5f5ec",
    border: "#b6ead9",
    icon: <CheckCircle size={14} />,
    step: 4,
    hint: "Import finished. Dashboard analytics have been recalculated.",
  },
  [ImportStatus.FAILED]: {
    label: "Failed",
    color: "#b3303c",
    bg: "#fdecee",
    border: "#f9c8cc",
    icon: <XCircle size={14} />,
    step: 0,
    hint: "Something went wrong. See the error details below.",
  },
};

const STEPS = [
  { status: ImportStatus.QUEUED, label: "Queued" },
  { status: ImportStatus.PARSING, label: "Parsing" },
  { status: ImportStatus.INTEGRATING, label: "Integrating" },
  { status: ImportStatus.DONE, label: "Done" },
];

// ─── Progress stepper ─────────────────────────────────────────────────────────
function ProgressStepper({ status }: { status: ImportStatus }) {
  const currentStep = STATUS_META[status]?.step ?? 0;
  const failed = status === ImportStatus.FAILED;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        margin: "20px 0 8px",
      }}
    >
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done =
          !failed && (currentStep > stepNum || status === ImportStatus.DONE);
        const active =
          !failed && currentStep === stepNum && status !== ImportStatus.DONE;
        const isLast = i === STEPS.length - 1;

        return (
          <div
            key={s.status}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: isLast ? "none" : 1,
            }}
          >
            {/* Circle + label */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: failed
                    ? "#f4f7fb"
                    : done
                      ? "var(--gradient)"
                      : active
                        ? "var(--gradient)"
                        : "#f0f4fa",
                  display: "grid",
                  placeItems: "center",
                  color: (done || active) && !failed ? "white" : "var(--muted)",
                  fontWeight: 800,
                  fontSize: 12,
                  boxShadow: active
                    ? "0 0 0 4px rgba(61,161,255,0.18)"
                    : "none",
                  transition: "all 0.3s",
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <CheckCircle size={15} />
                ) : active ? (
                  <Loader2
                    size={15}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  stepNum
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color:
                    (done || active) && !failed
                      ? "var(--brand-deep)"
                      : "var(--muted)",
                }}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "15px 6px 0",
                  background: done ? "var(--gradient)" : "var(--line-2)",
                  transition: "background 0.4s",
                  borderRadius: 99,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const { toast } = useToast();
  // ── cleanup on unmount
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  // ── polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await timetableService.getStatus(jobId);
          const updated = res.data; // ✅ this is the actual ImportJob

          if (!updated) return;
          setJob(updated);

          if (updated.status === ImportStatus.DONE) {
            stopPolling();
            setStage("done");
            qc.invalidateQueries({ queryKey: ["analytics"] });
            toast("success", "Import complete! Dashboard updated.");
          } else if (updated.status === ImportStatus.FAILED) {
            stopPolling();
            setStage("failed");
            toast("error", "Ingestion failed. See error details below.");
          }
        } catch {
          stopPolling();
        }
      }, 1500);
    },
    [stopPolling, qc, toast],
  );

  // ── file handling
  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      toast("error", "Only PDF files are accepted");
      return;
    }
    setFile(f);
    setJob(null);
    setStage("idle");
  };

  // ── upload
  const handleUpload = async () => {
    if (!file) return;
    setStage("uploading");
    setJob(null);
    try {
      const res = await timetableService.uploadPdf(file);
      const jobId = res.data?.importJobId;
      if (!jobId) throw new Error("No job ID returned");

      // Seed optimistic queued state so stepper shows immediately
      setJob({
        id: jobId,
        filename: file.name,
        status: ImportStatus.QUEUED,
        bullJobId: null,
        departmentId: null,
        created: null,
        matched: null,
        failed: null,
        errorLog: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setStage("polling");
      startPolling(jobId);
    } catch (err: any) {
      setStage("idle");
      toast(
        "error",
        err?.response?.data?.message || "Upload failed. Check the server.",
      );
    }
  };

  // ── reset
  const handleReset = () => {
    stopPolling();
    setFile(null);
    setJob(null);
    setStage("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── derived
  const isLocked = stage === "uploading" || stage === "polling";
  const isDone = stage === "done";
  const isFailed = stage === "failed";
  const statusMeta = job ? STATUS_META[job.status] : null;

  return (
    <PageShell>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .drop-zone:hover { border-color: var(--brand-blue) !important; background: #f5faff !important; }
      `}</style>

      <PageHeader
        title="PDF Ingestion"
        subtitle="Upload any department timetable in BIT Mesra format — the system does the rest"
      />

      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        {/* ── Drop zone card ── */}
        <div
          className="card fade-up"
          style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}
        >
          {/* Upload area */}
          <div
            className={!isLocked ? "drop-zone" : ""}
            onClick={() => !isLocked && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isLocked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f && !isLocked) handleFile(f);
            }}
            style={{
              padding: "36px 32px",
              textAlign: "center",
              cursor: isLocked ? "not-allowed" : "pointer",
              background: dragging ? "#edf6ff" : "white",
              borderBottom: "1px solid var(--line)",
              transition: "background 0.18s",
              opacity: isLocked ? 0.85 : 1,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            {/* Icon */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                margin: "0 auto 16px",
                background: isLocked ? "#eaf4ff" : file ? "#eaf4ff" : "#f4f7fb",
                display: "grid",
                placeItems: "center",
                transition: "background 0.2s",
              }}
            >
              {isLocked ? (
                <Loader2
                  size={26}
                  style={{
                    color: "var(--brand-blue)",
                    animation: "spin 1.2s linear infinite",
                  }}
                />
              ) : file ? (
                <FileText size={26} style={{ color: "var(--brand-blue)" }} />
              ) : (
                <Upload size={26} style={{ color: "var(--muted)" }} />
              )}
            </div>

            {isLocked ? (
              <>
                <div
                  style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}
                >
                  Processing in progress…
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}
                >
                  Please wait until the current import completes
                </div>
              </>
            ) : file ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{file.name}</div>
                <div
                  style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}
                >
                  {(file.size / 1024).toFixed(1)} KB · Click to change file
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Drop a timetable PDF here
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}
                >
                  BIT Mesra format · any department · click to browse
                </div>
              </>
            )}
          </div>

          {/* Action bar */}
          <div
            style={{
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "#fafcff",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Extracts departments, branches, rooms, courses, faculty, and slots
              automatically.
            </p>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {(isDone || isFailed) && (
                <button
                  className="btn-secondary"
                  onClick={handleReset}
                  style={{ fontSize: 13 }}
                >
                  <RotateCcw size={13} /> New Import
                </button>
              )}
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!file || isLocked || isDone}
                style={{ fontSize: 13 }}
              >
                {stage === "uploading" ? (
                  <>
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Uploading…
                  </>
                ) : stage === "polling" ? (
                  <>
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Processing…
                  </>
                ) : (
                  "Start Ingestion"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Live status card (visible once job exists) ── */}
        {job && (
          <div
            className="card fade-up"
            style={{ padding: "24px 28px", marginBottom: 16 }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <div
                style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}
              >
                {job.filename}
              </div>
              {statusMeta && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: statusMeta.bg,
                    color: statusMeta.color,
                    border: `1px solid ${statusMeta.border}`,
                    borderRadius: "var(--r-pill)",
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {statusMeta.icon}
                  {statusMeta.label}
                </div>
              )}
            </div>

            {/* Hint text */}
            {statusMeta && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  margin: "4px 0 0",
                  fontWeight: 500,
                }}
              >
                {statusMeta.hint}
              </p>
            )}

            {/* Stepper */}
            <ProgressStepper status={job.status} />

            {/* ── DONE summary ── */}
            {isDone && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  Import Summary
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <SummaryChip
                    icon={<CheckCircle size={13} />}
                    label="Created"
                    value={job.created ?? 0}
                    color="green"
                  />
                  <SummaryChip
                    icon={<RefreshCw size={13} />}
                    label="Matched"
                    value={job.matched ?? 0}
                    color="blue"
                  />
                  {(job.failed ?? 0) > 0 && (
                    <SummaryChip
                      icon={<XCircle size={13} />}
                      label="Failed rows"
                      value={job.failed ?? 0}
                      color="red"
                    />
                  )}
                </div>

                {/* Failed rows detail */}
                {job.errorLog && job.errorLog.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        marginBottom: 8,
                      }}
                    >
                      Parse Errors
                    </div>
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        overflow: "hidden",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {(job.errorLog as any[]).map((e, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 10,
                            padding: "9px 14px",
                            borderBottom:
                              i < job.errorLog!.length - 1
                                ? "1px solid var(--line)"
                                : "none",
                            fontSize: 13,
                            background: i % 2 === 0 ? "white" : "#fafcff",
                          }}
                        >
                          <span
                            className="badge badge-red"
                            style={{ flexShrink: 0, fontSize: 10 }}
                          >
                            {e.row || `Row ${i + 1}`}
                          </span>
                          <span style={{ color: "var(--ink-soft)", flex: 1 }}>
                            {e.reason || e.details || JSON.stringify(e)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analytics note */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#d5f5ec",
                    border: "1px solid #b6ead9",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1c7a5c",
                  }}
                >
                  <CheckCircle size={14} />
                  Dashboard analytics have been recalculated to include this
                  department.
                </div>
              </div>
            )}

            {/* ── FAILED detail ── */}
            {isFailed && (
              <div
                style={{
                  marginTop: 14,
                  background: "#fdecee",
                  border: "1px solid #f9c8cc",
                  borderRadius: 12,
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#b3303c",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={14} /> Ingestion failed
                </div>
                {job.errorLog && (job.errorLog as any[]).length > 0 && (
                  <ul style={{ margin: "4px 0 0 16px", lineHeight: 1.8 }}>
                    {(job.errorLog as any[]).slice(0, 6).map((e, i) => (
                      <li key={i}>
                        {e.reason || e.details || JSON.stringify(e)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Format note ── */}
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(255,255,255,0.65)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            backdropFilter: "blur(8px)",
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.75,
          }}
        >
          <strong style={{ color: "var(--ink)" }}>Expected format:</strong> BIT
          Mesra timetable PDF — department header, day-wise rows, course
          abbreviation with room in parentheses (e.g.{" "}
          <code style={{ fontFamily: "monospace", fontSize: 12 }}>
            CD (219)
          </code>
          ), and a faculty table at the bottom. Any department in this layout
          works without code changes.
        </div>
      </div>
    </PageShell>
  );
}

// ─── Summary chip ─────────────────────────────────────────────────────────────
function SummaryChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const cls: Record<string, string> = {
    green: "badge-green",
    blue: "badge-blue",
    red: "badge-red",
  };
  return (
    <div
      className={`badge ${cls[color] ?? "badge-gray"}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "7px 14px",
      }}
    >
      {icon}
      <strong style={{ fontSize: 15 }}>{value}</strong>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>

    
  );
}
