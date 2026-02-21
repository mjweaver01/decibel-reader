import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { RecordingMetadata } from "../../../shared/types";

const API_BASE = "/api";

type TimeGrouping = "hour" | "day" | "week";

const COLORS = [
  "#10b981", // emerald-500
  "#34d399", // emerald-400
  "#6ee7b7", // emerald-300
  "#a7f3d0", // emerald-200
  "#5eead4", // teal-300
  "#2dd4bf", // teal-400
  "#14b8a6", // teal-500
];

function formatBucketLabel(key: string, grouping: TimeGrouping): string {
  const d = new Date(key);
  if (grouping === "hour") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric" });
  }
  if (grouping === "day") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function getBucketKey(timestamp: string, grouping: TimeGrouping): string {
  const d = new Date(timestamp);
  if (grouping === "hour") {
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }
  if (grouping === "day") {
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  // week: start of week (Sunday)
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface ChartDataPoint {
  bucket: string;
  label: string;
  count: number;
  classifications: Record<string, number>;
}

export function AnalyticsView() {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState<TimeGrouping>("day");
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "all">("30");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [stacked, setStacked] = useState(true);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recordings`);
      const data = await res.json();
      setRecordings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const filteredRecordings = useMemo(() => {
    let list = recordings;

    const now = Date.now();
    const ms = { "7": 7 * 24 * 60 * 60 * 1000, "30": 30 * 24 * 60 * 60 * 1000, "90": 90 * 24 * 60 * 60 * 1000 };
    if (dateRange !== "all") {
      const cutoff = now - ms[dateRange];
      list = list.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
    }

    if (classificationFilter !== "all") {
      list = list.filter((r) => (r.classification ?? "(none)") === classificationFilter);
    }

    return list;
  }, [recordings, dateRange, classificationFilter]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { count: number; classifications: Record<string, number> }>();

    for (const r of filteredRecordings) {
      const key = getBucketKey(r.timestamp, grouping);
      const cls = r.classification ?? "(none)";
      if (!buckets.has(key)) {
        buckets.set(key, { count: 0, classifications: {} });
      }
      const b = buckets.get(key)!;
      b.count += 1;
      b.classifications[cls] = (b.classifications[cls] ?? 0) + 1;
    }

    const allClasses = new Set<string>();
    for (const [, data] of buckets) {
      for (const k of Object.keys(data.classifications)) allClasses.add(k);
    }
    const sorted = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([bucket, data]) => {
      const flat: Record<string, number> = {};
      for (const c of allClasses) {
        flat[c] = data.classifications[c] ?? 0;
      }
      return {
        bucket,
        label: formatBucketLabel(bucket, grouping),
        count: data.count,
        classifications: data.classifications,
        ...flat,
      };
    });
  }, [filteredRecordings, grouping]);

  const classifications = useMemo(() => {
    const set = new Set<string>();
    for (const r of recordings) {
      set.add(r.classification ?? "(none)");
    }
    return Array.from(set).sort();
  }, [recordings]);

  const chartClassifications = useMemo(() => {
    const set = new Set<string>();
    for (const d of chartData) {
      for (const k of Object.keys(d)) {
        if (k !== "bucket" && k !== "label" && k !== "count" && k !== "classifications") {
          set.add(k);
        }
      }
    }
    return Array.from(set).sort();
  }, [chartData]);

  const summary = useMemo(() => {
    const total = filteredRecordings.length;
    const byClass: Record<string, number> = {};
    for (const r of filteredRecordings) {
      const c = r.classification ?? "(none)";
      byClass[c] = (byClass[c] ?? 0) + 1;
    }
    const days = dateRange === "all" ? 0 : parseInt(dateRange, 10);
    const avgPerDay = days > 0 && total > 0 ? (total / days).toFixed(1) : "-";
    return { total, byClass, avgPerDay };
  }, [filteredRecordings, dateRange]);

  if (loading) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Analytics</h2>
        <p className="text-zinc-500">Loading recordings...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-zinc-900 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
        <button
          type="button"
          onClick={fetchRecordings}
          className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Time grouping</label>
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as TimeGrouping)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="hour">By hour</option>
            <option value="day">By day</option>
            <option value="week">By week</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Date range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "7" | "30" | "90" | "all")}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Classification</label>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All</option>
            {classifications.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {classificationFilter === "all" && (
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={stacked}
                onChange={(e) => setStacked(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-400">Stack by classification</span>
            </label>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
          <p className="text-xs text-zinc-500">Total recordings</p>
          <p className="text-xl font-semibold text-emerald-400">{summary.total}</p>
        </div>
        <div className="rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
          <p className="text-xs text-zinc-500">Avg per day</p>
          <p className="text-xl font-semibold text-zinc-200">{summary.avgPerDay}</p>
        </div>
        {Object.entries(summary.byClass).slice(0, 2).map(([cls, count], i) => (
          <div key={cls} className="rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-3">
            <p className="text-xs text-zinc-500">{cls}</p>
            <p className="text-xl font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
              {count}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/30 text-zinc-500">
          No data to display for the selected filters
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="label"
                stroke="#71717a"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + "…" : v)}
              />
              <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm">
                      <p className="font-medium text-zinc-100">{d.label}</p>
                      <p className="mt-1 text-emerald-400">Total: {d.count}</p>
                      {Object.entries(d.classifications)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cls, cnt]) => (
                          <p key={cls} className="text-xs text-zinc-400">
                            {cls}: {cnt}
                          </p>
                        ))}
                    </div>
                  );
                }}
              />
              {stacked && classificationFilter === "all" && chartClassifications.length > 0 ? (
                <>
                  {chartClassifications.map((cls, i) => (
                    <Bar
                      key={cls}
                      dataKey={cls}
                      stackId="a"
                      fill={COLORS[i % COLORS.length]}
                      radius={i === chartClassifications.length - 1 ? [4, 4, 0, 0] : 0}
                      name={cls}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) => <span className="text-zinc-400">{value}</span>}
                  />
                </>
              ) : (
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
