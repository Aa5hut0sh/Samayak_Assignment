"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "@/components/layout/PageShell";
import { analyticsService } from "@/services/analytics.service";
import { departmentService } from "@/services/department.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  RefreshCw,
  Building2,
  DoorOpen,
  BookOpen,
  AlertTriangle,
  TrendingDown,
  Clock,
  Activity,
} from "lucide-react";

// ─── Shared tokens ────────────────────────────────────────────────────────────
const GRAD = ["#256199", "#2E7CC1", "#3DA1FF"];
const SUCCESS = "#27ae8a";
const WARNING = "#f5a524";
const ERROR = "#ef4655";

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  color = "var(--brand-deep)",
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <div
      className={`card fade-up`}
      style={{
        padding: "22px 24px",
        animationDelay: `${delay}s`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${color}18`,
            display: "grid",
            placeItems: "center",
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 14,
        marginTop: 6,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function ChartCard({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="card fade-up"
      style={{ padding: "20px 22px", animationDelay: `${delay}s` }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: "-0.02em",
          marginBottom: 18,
          color: "var(--ink)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "var(--sh-md)",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div
          key={i}
          style={{ color: p.color || "var(--brand-deep)", fontWeight: 600 }}
        >
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.unit || ""}
        </div>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const qc = useQueryClient();
  const [deptFilter, setDeptFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: deptData } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => departmentService.list({ limit: 100 }),
  });

  const {
    data: analyticsData,
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["analytics", deptFilter],
    queryFn: () => analyticsService.getDashboard(deptFilter || undefined),
    refetchInterval: 30_000, // live refresh every 30s
    refetchOnWindowFocus: true,
  });

  const metrics = analyticsData?.data;
  const departments = deptData?.data || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["analytics"] });
    setTimeout(() => setRefreshing(false), 600);
  };

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  // ── Derived data for charts ──────────────────────────────────────────────

  // Metric 1: per-room utilisation (top 10 for readability)
  const roomUtilData = (metrics?.roomUtilisation?.perRoom ?? [])
    .slice(0, 12)
    .map((r: any) => ({
      name: r.roomNumber,
      utilisation: r.percentage,
      occupied: r.occupied,
      total: r.total,
    }));

  // Metric 2: P(empty room) per period
  const recoveryData = Object.entries(
    metrics?.recoveryProbability?.periods ?? {},
  )
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([period, prob]) => ({
      period: `P${period}`,
      probability: Math.round((prob as number) * 100),
      risk: Math.round((1 - (prob as number)) * 100),
    }));

  // Metric 3: under-running courses
  const underRunning = metrics?.underRunningCourses?.courses ?? [];

  // Metric 4: avg empty room-hours
  const avgEmptyHours = metrics?.avgEmptyRoomHoursPerDay ?? 0;
  const overallUtil = metrics?.roomUtilisation?.overallPercentage ?? 0;

  // Utilisation distribution for pie
  const utilBuckets = {
    "High (>70%)": 0,
    "Medium (30-70%)": 0,
    "Low (<30%)": 0,
  };
  (metrics?.roomUtilisation?.perRoom ?? []).forEach((r: any) => {
    if (r.percentage > 70) utilBuckets["High (>70%)"]++;
    else if (r.percentage >= 30) utilBuckets["Medium (30-70%)"]++;
    else utilBuckets["Low (<30%)"]++;
  });
  const pieData = Object.entries(utilBuckets).map(([name, value]) => ({
    name,
    value,
  }));
  const PIE_COLORS = [SUCCESS, WARNING, ERROR];

  const getUtilColor = (pct: number) =>
    pct > 70 ? SUCCESS : pct >= 30 ? WARNING : ERROR;

  return (
    <PageShell>
      {/* ── Header ── */}
      <div
        className="fade-up"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              margin: "5px 0 0",
              color: "var(--muted)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Live analytical instrument — updates automatically
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {updatedLabel && (
            <span
              style={{
                fontSize: 12,
                color: "var(--muted)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Activity size={12} /> Updated {updatedLabel}
            </span>
          )}

          <select
            className="input"
            style={{ width: 200, fontSize: 13, padding: "8px 12px" }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {(departments as any[]).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <button
            className="btn-secondary"
            onClick={handleRefresh}
            style={{ padding: "8px 14px" }}
          >
            <RefreshCw
              size={14}
              style={{ animation: refreshing ? "spin 0.6s linear" : "none" }}
            />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div
          style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}
        >
          <RefreshCw
            size={24}
            style={{ animation: "spin 1s linear infinite", marginBottom: 12 }}
          />
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            Computing analytics…
          </div>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : !metrics ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Building2
            size={32}
            style={{ color: "var(--muted)", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 700, fontSize: 16 }}>No data yet</div>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
            Import a department timetable to see analytics.
          </p>
        </div>
      ) : (
        <>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

          {/* ── KPI row ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <MetricCard
              icon={<DoorOpen size={16} />}
              label="Room Utilisation"
              value={`${overallUtil}%`}
              sub={`across ${metrics.roomUtilisation.perRoom.length} rooms`}
              color="var(--brand-deep)"
              delay={0}
            />
            <MetricCard
              icon={<Clock size={16} />}
              label="Avg Empty Room-Hours/Day"
              value={avgEmptyHours.toFixed(1)}
              sub="hours per room per day"
              color={avgEmptyHours > 4 ? ERROR : WARNING}
              delay={0.06}
            />
            <MetricCard
              icon={<BookOpen size={16} />}
              label="Under-Running Courses"
              value={metrics.underRunningCourses.count}
              sub={
                metrics.underRunningCourses.count > 0
                  ? "need attention"
                  : "all on track"
              }
              color={metrics.underRunningCourses.count > 0 ? ERROR : SUCCESS}
              delay={0.12}
            />
            <MetricCard
              icon={<Activity size={16} />}
              label="Best Recovery Window"
              value={
                recoveryData.length
                  ? recoveryData.reduce(
                      (best, d) =>
                        d.probability > best.probability ? d : best,
                      recoveryData[0],
                    ).period
                  : "—"
              }
              sub="highest P(empty room)"
              color={SUCCESS}
              delay={0.18}
            />
          </div>

          {/* ── Row 1: Utilisation bar + Pie ── */}
          <SectionHeading>
            <DoorOpen size={13} /> Metric 1 — Room Utilisation %
          </SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <ChartCard title="Utilisation per Room" delay={0.1}>
              {roomUtilData.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={roomUtilData}
                    margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef1f7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fontSize: 12,
                        fontWeight: 600,
                        fill: "var(--muted)",
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      unit="%"
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="utilisation"
                      radius={[6, 6, 0, 0]}
                      name="Utilisation"
                      unit="%"
                    >
                      {roomUtilData.map((entry, i) => (
                        <Cell key={i} fill={getUtilColor(entry.utilisation)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <LegendDot color={SUCCESS} label="High (>70%)" />
                <LegendDot color={WARNING} label="Medium (30–70%)" />
                <LegendDot color={ERROR} label="Low (<30%)" />
              </div>
            </ChartCard>

            <ChartCard title="Utilisation Distribution" delay={0.15}>
              {pieData.every((p) => p.value === 0) ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => (value > 0 ? `${value}` : "")}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ── Row 2: Recovery probability ── */}
          <SectionHeading>
            <Activity size={13} /> Metric 2 — P(Empty Room) per Time Slot
          </SectionHeading>
          <ChartCard
            title="Recovery Probability by Period — P(free room | slot)"
            delay={0.2}
          >
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Higher probability = safer window for rescheduling lost classes. A
              coordinator checking recovery options should target
              high-probability periods.
            </p>
            {recoveryData.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={recoveryData}
                  margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef1f7"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: "var(--muted)",
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="probability"
                    radius={[6, 6, 0, 0]}
                    name="P(empty)"
                    unit="%"
                    fill="none"
                  >
                    {recoveryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.probability > 60
                            ? SUCCESS
                            : entry.probability > 30
                              ? WARNING
                              : ERROR
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── Row 3: Under-running courses ── */}
          <div style={{ marginTop: 28 }}>
            <SectionHeading>
              <AlertTriangle size={13} /> Metric 3 — Under-Running Courses
            </SectionHeading>

            <div
              className="card fade-up"
              style={{
                animationDelay: "0.25s",
                overflow: "hidden",
                marginBottom: 28,
              }}
            >
              {underRunning.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                  <div style={{ fontWeight: 700, color: SUCCESS }}>
                    All courses are on track
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    Every course meets its required contact hours.
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--line)",
                      background: "#fffbf0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#9a6800",
                      }}
                    >
                      <AlertTriangle size={14} />
                      {underRunning.length} course
                      {underRunning.length > 1 ? "s" : ""} are behind required
                      contact hours
                    </div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Type</th>
                        <th>Scheduled Slots</th>
                        <th>Required Hours</th>
                        <th>Gap</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {underRunning.map((c: any) => {
                        const gapPct = Math.round((c.gap / c.required) * 100);
                        return (
                          <tr key={c.id}>
                            <td>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  fontSize: 13,
                                }}
                              >
                                {c.code}
                              </div>
                              <div
                                style={{ fontSize: 12, color: "var(--muted)" }}
                              >
                                {c.name}
                              </div>
                            </td>
                            <td>
                              <span
                                className="badge badge-blue"
                                style={{ fontSize: 10 }}
                              >
                                {c.type || "LECTURE"}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{c.scheduled}</td>
                            <td style={{ fontWeight: 600 }}>{c.required}</td>
                            <td>
                              <span
                                style={{
                                  color: ERROR,
                                  fontWeight: 800,
                                  fontSize: 14,
                                }}
                              >
                                −{c.gap}
                              </span>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    height: 6,
                                    background: "#fee",
                                    borderRadius: 99,
                                    overflow: "hidden",
                                    minWidth: 60,
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${Math.min(100, Math.round((c.scheduled / c.required) * 100))}%`,
                                      background: gapPct > 50 ? ERROR : WARNING,
                                      borderRadius: 99,
                                      transition: "width 0.4s",
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--muted)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {Math.round((c.scheduled / c.required) * 100)}
                                  %
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* ── Row 4: Avg empty room-hours ── */}
          <SectionHeading>
            <TrendingDown size={13} /> Metric 4 — Average Empty Room-Hours per
            Day
          </SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <ChartCard
              title="Empty Hours vs Occupied Hours (daily avg per room)"
              delay={0.3}
            >
              {roomUtilData.length === 0 ? (
                <Empty />
              ) : (
                (() => {
                  const periodDuration = 1; // 1 hour per period
                  const totalHoursPerDay = 9 * periodDuration;
                  const stackData = (metrics.roomUtilisation.perRoom as any[])
                    .slice(0, 10)
                    .map((r) => ({
                      name: r.roomNumber,
                      occupied: parseFloat(
                        ((r.occupied / 5) * periodDuration).toFixed(1),
                      ),
                      empty: parseFloat(
                        (
                          totalHoursPerDay -
                          (r.occupied / 5) * periodDuration
                        ).toFixed(1),
                      ),
                    }));
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={stackData}
                        margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#eef1f7"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "var(--muted)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted)" }}
                          unit="h"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="occupied"
                          stackId="a"
                          fill="#3DA1FF"
                          name="Occupied"
                          unit="h"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="empty"
                          stackId="a"
                          fill="#fee9e9"
                          name="Empty"
                          unit="h"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()
              )}
            </ChartCard>

            <div
              className="card fade-up"
              style={{
                padding: "24px",
                animationDelay: "0.35s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 8,
                  }}
                >
                  Institution-wide idle capacity
                </div>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: avgEmptyHours > 4 ? ERROR : WARNING,
                    lineHeight: 1,
                  }}
                >
                  {avgEmptyHours.toFixed(1)}
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginLeft: 4,
                    }}
                  >
                    hr/room/day
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: "#f6f9fd",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    fontWeight: 500,
                    lineHeight: 1.7,
                  }}
                >
                  {avgEmptyHours > 6
                    ? "⚠️ High idle capacity — scheduling appears sparse. Consider consolidating sections or reducing room allocation."
                    : avgEmptyHours > 3
                      ? "📊 Moderate idle time — typical for academic schedules with breaks between sessions."
                      : "✅ Efficient room usage — idle time is within acceptable bounds."}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 10,
                  }}
                >
                  Overall Utilisation
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#eef1f7",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${overallUtil}%`,
                      background: `linear-gradient(90deg, #256199, #3DA1FF)`,
                      borderRadius: 99,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>0%</span>
                  <span style={{ color: "var(--brand-deep)" }}>
                    {overallUtil}%
                  </span>
                  <span style={{ color: "var(--muted)" }}>100%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        color: "var(--muted)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function Empty() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 0",
        color: "var(--muted)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      No data available yet
    </div>
  );
}
