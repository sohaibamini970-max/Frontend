"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  User,
  FolderKanban,
  BarChart3,
  Zap,
  Star,
  Trophy,
  Medal,
  Crown,
  Flame,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  ClipboardList,
  Timer,
  Sparkles,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

/* =========================================================
   TYPES
========================================================= */

type Role =
  | "Executive Manager"
  | "Project Manager"
  | "Member"
  | "System Administrator";

type CurrentUser = {
  id: string;
  full_name?: string;
  name?: string;
  role: Role;
  email?: string;
};

type PerformanceStats = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  overdueDoneTasks: number;
  notCompletedTasks: number;
  projectCount: number;
  completionRate: number;
  onTimeRate: number;
  avgCompletionDays: number;
  lastActivity?: string;
};

type PerformanceGrade = {
  grade: string;
  label: string;
  score: number;
};

type BreakdownItem = {
  status?: string;
  priority?: string;
  project_id?: string;
  project_name?: string;
  count?: number;
  total_tasks?: number;
  completed_tasks?: number;
  overdue_tasks?: number;
};

type RecentTask = {
  id: string;
  name: string;
  status: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  project_name: string;
};

type MemberPerformance = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  overdue_done_tasks: number;
  completion_rate: number;
  on_time_rate: number;
  performance: PerformanceGrade;
};

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.id && !parsed.user_id && !parsed.userId) return null;
    return {
      id: String(parsed.id || parsed.user_id || parsed.userId),
      full_name: parsed.full_name || parsed.fullName || parsed.name,
      name: parsed.name || parsed.full_name || parsed.fullName,
      role: parsed.role,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* =========================================================
   GRADE COLORS
========================================================= */

function getGradeConfig(grade: string) {
  switch (grade) {
    case "A+":
      return {
        bg: "from-violet-500 via-purple-500 to-fuchsia-500",
        text: "text-white",
        badge: "bg-violet-100 text-violet-700",
        ring: "ring-violet-400",
        glow: "shadow-violet-500/50",
        icon: Crown,
      };
    case "A":
      return {
        bg: "from-emerald-500 via-green-500 to-teal-500",
        text: "text-white",
        badge: "bg-emerald-100 text-emerald-700",
        ring: "ring-emerald-400",
        glow: "shadow-emerald-500/50",
        icon: Trophy,
      };
    case "B":
      return {
        bg: "from-blue-500 via-cyan-500 to-sky-500",
        text: "text-white",
        badge: "bg-blue-100 text-blue-700",
        ring: "ring-blue-400",
        glow: "shadow-blue-500/50",
        icon: Medal,
      };
    case "C":
      return {
        bg: "from-amber-500 via-yellow-500 to-orange-500",
        text: "text-white",
        badge: "bg-amber-100 text-amber-700",
        ring: "ring-amber-400",
        glow: "shadow-amber-500/50",
        icon: Star,
      };
    case "D":
      return {
        bg: "from-orange-500 via-red-500 to-rose-500",
        text: "text-white",
        badge: "bg-orange-100 text-orange-700",
        ring: "ring-orange-400",
        glow: "shadow-orange-500/50",
        icon: Flame,
      };
    case "F":
      return {
        bg: "from-red-600 via-rose-600 to-pink-600",
        text: "text-white",
        badge: "bg-red-100 text-red-700",
        ring: "ring-red-400",
        glow: "shadow-red-500/50",
        icon: XCircle,
      };
    default:
      return {
        bg: "from-slate-500 via-gray-500 to-zinc-500",
        text: "text-white",
        badge: "bg-slate-100 text-slate-700",
        ring: "ring-slate-400",
        glow: "shadow-slate-500/50",
        icon: Minus,
      };
  }
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PerformancePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Member performance data
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceGrade | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<BreakdownItem[]>([]);
  const [priorityBreakdown, setPriorityBreakdown] = useState<BreakdownItem[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<BreakdownItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  // Team performance (for managers)
  const [teamMembers, setTeamMembers] = useState<MemberPerformance[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"personal" | "team">("personal");

  const isManagerView = useMemo(
    () =>
      user?.role === "Executive Manager" ||
      user?.role === "System Administrator" ||
      user?.role === "Project Manager",
    [user]
  );

  /* =======================================================
     INITIAL USER
  ======================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      if (!isManagerView) {
        setViewMode("personal");
      }
    } else {
      setLoading(false);
      setError("User session not found. Please login again.");
    }
  }, [isManagerView]);

  /* =======================================================
     LOAD PERSONAL PERFORMANCE
  ======================================================= */

  const loadPersonalPerformance = useCallback(
    async (signal?: AbortSignal) => {
      const storedUser = getStoredUser();
      if (!storedUser?.id) return;

      try {
        const res = await fetch(
          `${API_BASE}/performance/member/${storedUser.id}`,
          {
            method: "GET",
            headers: getHeaders(),
            signal,
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(`Performance request failed: ${res.status}`);
        }

        const data = await res.json();

        if (signal?.aborted) return;

        if (data.success) {
          setStats(data.stats);
          setPerformance(data.performance);
          setStatusBreakdown(data.statusBreakdown || []);
          setPriorityBreakdown(data.priorityBreakdown || []);
          setProjectBreakdown(data.projectBreakdown || []);
          setRecentTasks(data.recentTasks || []);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Personal performance error:", err);
        throw err;
      }
    },
    []
  );

  /* =======================================================
     LOAD TEAM PERFORMANCE
  ======================================================= */

  const loadTeamPerformance = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`${API_BASE}/performance/team`, {
          method: "GET",
          headers: getHeaders(),
          signal,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Team performance request failed: ${res.status}`);
        }

        const data = await res.json();

        if (signal?.aborted) return;

        if (data.success) {
          setTeamMembers(data.members || []);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Team performance error:", err);
        throw err;
      }
    },
    []
  );

  /* =======================================================
     LOAD ALL DATA
  ======================================================= */

  const loadData = useCallback(
    async (signal?: AbortSignal, isRefresh = false) => {
      const storedUser = getStoredUser();
      if (!storedUser?.id) {
        setLoading(false);
        setError("User session not found. Please login again.");
        return;
      }

      setUser(storedUser);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const promises: Promise<void>[] = [loadPersonalPerformance(signal)];

        if (
          storedUser.role === "Executive Manager" ||
          storedUser.role === "System Administrator" ||
          storedUser.role === "Project Manager"
        ) {
          promises.push(loadTeamPerformance(signal));
        }

        await Promise.all(promises);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load performance data.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loadPersonalPerformance, loadTeamPerformance]
  );

  /* =======================================================
     LOAD ON USER
  ======================================================= */

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [user?.id, loadData]);

  /* =======================================================
     FILTERED TEAM MEMBERS
  ======================================================= */

  const filteredTeamMembers = useMemo(() => {
    if (!search.trim()) return teamMembers;
    const q = search.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [teamMembers, search]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-violet-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-violet-600" />
            </div>
            <p className="mt-6 text-lg font-bold text-slate-700">
              Analyzing your performance...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Crunching the numbers
            </p>
          </div>
        </div>
      </main>
    );
  }

  const gradeConfig = getGradeConfig(performance?.grade || "N/A");
  const GradeIcon = gradeConfig.icon;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 sm:px-10 sm:py-12 shadow-2xl shadow-purple-500/30">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute right-1/3 bottom-0 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
                <BarChart3 size={32} className="text-white" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Performance Dashboard
                </h1>
                <p className="mt-2 text-base font-medium text-purple-100 sm:text-lg">
                  {isManagerView
                    ? "Track your performance and team productivity"
                    : "Your personal task performance overview"}
                </p>

                {user && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-md">
                    <User size={14} className="text-yellow-300" />
                    <span className="text-sm font-bold text-white">
                      {user.full_name || user.name || user.email}
                    </span>
                    <span className="rounded-full bg-yellow-400/30 px-2.5 py-0.5 text-[10px] font-extrabold text-yellow-100">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isManagerView && (
                <div className="flex rounded-2xl bg-white/15 p-1.5 backdrop-blur-md">
                  <button
                    onClick={() => setViewMode("personal")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      viewMode === "personal"
                        ? "bg-white text-purple-700 shadow-lg"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Target size={16} />
                      My Performance
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode("team")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      viewMode === "team"
                        ? "bg-white text-purple-700 shadow-lg"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users size={16} />
                      Team
                    </span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => loadData(undefined, true)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/20 px-5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-semibold text-red-700">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          </div>
        )}

        {/* =================================================
            PERSONAL VIEW
        ================================================= */}

        {viewMode === "personal" && stats && performance && (
          <>
            {/* HERO GRADE CARD */}
            <div
              className={`mt-8 overflow-hidden rounded-3xl bg-gradient-to-br ${gradeConfig.bg} p-8 shadow-2xl ${gradeConfig.glow} sm:p-10`}
            >
              <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-white/30 blur-2xl" />
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/25 backdrop-blur-md shadow-2xl sm:h-32 sm:w-32">
                      <GradeIcon size={56} className="text-white" />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-white/80">
                      Performance Grade
                    </p>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-6xl font-black text-white drop-shadow-lg sm:text-7xl">
                        {performance.grade}
                      </span>
                      <span className="text-xl font-bold text-white/90 sm:text-2xl">
                        {performance.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white/80">
                      Score:{" "}
                      <span className="text-lg font-black text-white">
                        {performance.score}
                      </span>{" "}
                      / 100
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 sm:items-end">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/20 px-6 py-4 backdrop-blur-md">
                    <Sparkles size={24} className="text-yellow-300" />
                    <div>
                      <p className="text-xs font-bold uppercase text-white/70">
                        Completion Rate
                      </p>
                      <p className="text-3xl font-black text-white">
                        {stats.completionRate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-white/20 px-6 py-4 backdrop-blur-md">
                    <Timer size={24} className="text-cyan-300" />
                    <div>
                      <p className="text-xs font-bold uppercase text-white/70">
                        On-Time Rate
                      </p>
                      <p className="text-3xl font-black text-white">
                        {stats.onTimeRate}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS GRID */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {/* Total Tasks */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                      <ClipboardList size={24} className="text-white" />
                    </div>
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.totalTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-indigo-100">
                    Total Tasks
                  </p>
                  <p className="text-xs font-medium text-indigo-200">
                    Assigned to you
                  </p>
                </div>
              </div>

              {/* Completed */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                      <CheckCircle2 size={24} className="text-white" />
                    </div>
                    <ArrowUpRight size={20} className="text-emerald-200" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.completedTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-emerald-100">
                    Completed
                  </p>
                  <p className="text-xs font-medium text-emerald-200">
                    {stats.completionRate}% of total
                  </p>
                </div>
              </div>

              {/* Pending */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-xl shadow-amber-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                      <Clock3 size={24} className="text-white" />
                    </div>
                    <Minus size={20} className="text-amber-200" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.pendingTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-amber-100">
                    Pending
                  </p>
                  <p className="text-xs font-medium text-amber-200">
                    In progress or to do
                  </p>
                </div>
              </div>

              {/* Overdue */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 shadow-xl shadow-red-500/30 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                      <AlertTriangle size={24} className="text-white" />
                    </div>
                    <ArrowDownRight size={20} className="text-red-200" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.overdueTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-red-100">
                    Overdue
                  </p>
                  <p className="text-xs font-medium text-red-200">
                    Past due date
                  </p>
                </div>
              </div>
            </div>

            {/* SECONDARY STATS */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-violet-200 bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 p-2.5">
                    <XCircle size={20} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-violet-500">
                      Not Completed
                    </p>
                    <p className="text-2xl font-black text-violet-700">
                      {stats.notCompletedTasks}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-rose-200 bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-100 p-2.5">
                    <Flame size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-rose-500">
                      Overdue Done
                    </p>
                    <p className="text-2xl font-black text-rose-700">
                      {stats.overdueDoneTasks}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-cyan-200 bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-100 p-2.5">
                    <FolderKanban size={20} className="text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-cyan-500">
                      Projects
                    </p>
                    <p className="text-2xl font-black text-cyan-700">
                      {stats.projectCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-teal-200 bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-100 p-2.5">
                    <Timer size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-teal-500">
                      Avg. Days
                    </p>
                    <p className="text-2xl font-black text-teal-700">
                      {stats.avgCompletionDays || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BREAKDOWN CHARTS */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Status Breakdown */}
              <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <Target size={20} className="text-purple-600" />
                  Task Status Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {statusBreakdown.map((item) => {
                    const total = statusBreakdown.reduce(
                      (sum, i) => sum + (i.count || 0),
                      0
                    );
                    const percentage =
                      total > 0 ? Math.round(((item.count || 0) / total) * 100) : 0;

                    const color =
                      item.status === "Done"
                        ? "bg-emerald-500"
                        : item.status === "In Progress"
                        ? "bg-blue-500"
                        : "bg-gray-400";

                    return (
                      <div key={item.status}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">
                            {item.status}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {statusBreakdown.length === 0 && (
                    <p className="text-sm text-slate-400">No tasks yet.</p>
                  )}
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <Zap size={20} className="text-amber-600" />
                  Task Priority Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {priorityBreakdown.map((item) => {
                    const total = priorityBreakdown.reduce(
                      (sum, i) => sum + (i.count || 0),
                      0
                    );
                    const percentage =
                      total > 0 ? Math.round(((item.count || 0) / total) * 100) : 0;

                    const color =
                      item.priority === "High"
                        ? "bg-red-500"
                        : item.priority === "Medium"
                        ? "bg-amber-500"
                        : "bg-gray-400";

                    return (
                      <div key={item.priority}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">
                            {item.priority}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {priorityBreakdown.length === 0 && (
                    <p className="text-sm text-slate-400">No tasks yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* PROJECT BREAKDOWN */}
            {projectBreakdown.length > 0 && (
              <div className="mt-8 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <FolderKanban size={20} className="text-indigo-600" />
                  Performance by Project
                </h3>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projectBreakdown.map((proj) => {
                    const completionRate =
                      proj.total_tasks && proj.total_tasks > 0
                        ? Math.round(
                            ((proj.completed_tasks || 0) / proj.total_tasks) * 100
                          )
                        : 0;

                    return (
                      <div
                        key={proj.project_id}
                        className="rounded-2xl border-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 transition-all hover:shadow-lg"
                      >
                        <p className="truncate text-base font-black text-slate-800">
                          {proj.project_name}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-emerald-600">
                                {proj.completed_tasks} done
                              </span>
                              <span className="text-slate-500">
                                {proj.total_tasks} total
                              </span>
                            </div>
                            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-2xl font-black text-slate-800">
                            {completionRate}%
                          </span>
                        </div>
                        {proj.overdue_tasks && proj.overdue_tasks > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            <AlertTriangle size={12} />
                            {proj.overdue_tasks} overdue
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RECENT TASKS */}
            {recentTasks.length > 0 && (
              <div className="mt-8 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <Calendar size={20} className="text-cyan-600" />
                  Recent Activity
                </h3>
                <div className="mt-5 space-y-3">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-4 transition hover:bg-white hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === "Done" ? (
                          <CheckCircle2 size={22} className="text-emerald-500" />
                        ) : task.status === "In Progress" ? (
                          <Clock3 size={22} className="text-blue-500" />
                        ) : (
                          <XCircle size={22} className="text-slate-300" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {task.name}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {task.project_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          task.status === "Done"
                            ? "bg-emerald-100 text-emerald-700"
                            : task.status === "In Progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* =================================================
            TEAM VIEW
        ================================================= */}

        {viewMode === "team" && isManagerView && (
          <section className="mt-8">
            {/* SEARCH */}
            <div className="relative max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-12 text-base font-medium text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            {/* LEADERBOARD */}
            <div className="mt-6 space-y-4">
              {filteredTeamMembers.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                  <Users size={48} className="mx-auto text-slate-300" />
                  <p className="mt-4 text-lg font-black text-slate-700">
                    No team members found
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {search
                      ? "Try a different search term."
                      : "No members with assigned tasks yet."}
                  </p>
                </div>
              ) : (
                filteredTeamMembers.map((member, index) => {
                  const gradeConfig = getGradeConfig(member.performance.grade);
                  const GradeIcon = gradeConfig.icon;
                  const rank = index + 1;

                  const rankBadge =
                    rank === 1
                      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/50"
                      : rank === 2
                      ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/50"
                      : rank === 3
                      ? "bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-lg shadow-orange-500/50"
                      : "bg-slate-100 text-slate-600";

                  return (
                    <div
                      key={member.id}
                      className="group overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                        {/* RANK */}
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${rankBadge}`}
                        >
                          {rank <= 3 ? (
                            rank === 1 ? (
                              <Crown size={28} />
                            ) : rank === 2 ? (
                              <Trophy size={26} />
                            ) : (
                              <Medal size={26} />
                            )
                          ) : (
                            `#${rank}`
                          )}
                        </div>

                        {/* AVATAR + NAME */}
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradeConfig.bg} text-2xl font-black text-white shadow-lg ${gradeConfig.glow}`}
                          >
                            {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-slate-800">
                              {member.full_name}
                            </p>
                            <p className="truncate text-sm font-medium text-slate-500">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        {/* STATS */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                          <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-center">
                            <p className="text-xs font-bold uppercase text-indigo-500">
                              Total
                            </p>
                            <p className="text-2xl font-black text-indigo-700">
                              {member.total_tasks}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
                            <p className="text-xs font-bold uppercase text-emerald-500">
                              Done
                            </p>
                            <p className="text-2xl font-black text-emerald-700">
                              {member.completed_tasks}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center">
                            <p className="text-xs font-bold uppercase text-amber-500">
                              Pending
                            </p>
                            <p className="text-2xl font-black text-amber-700">
                              {member.pending_tasks}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-red-50 px-4 py-3 text-center">
                            <p className="text-xs font-bold uppercase text-red-500">
                              Overdue
                            </p>
                            <p className="text-2xl font-black text-red-700">
                              {member.overdue_tasks}
                            </p>
                          </div>
                        </div>

                        {/* GRADE */}
                        <div
                          className={`flex shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${gradeConfig.bg} px-6 py-4 shadow-lg ${gradeConfig.glow}`}
                        >
                          <GradeIcon size={24} className="text-white" />
                          <p className="mt-1 text-3xl font-black text-white">
                            {member.performance.grade}
                          </p>
                          <p className="text-xs font-bold text-white/80">
                            {member.performance.label}
                          </p>
                        </div>
                      </div>

                      {/* PROGRESS BAR */}
                      <div className="border-t-2 border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-slate-600">
                            Completion
                          </span>
                          <div className="flex-1">
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all"
                                style={{
                                  width: `${member.completion_rate}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-black text-emerald-600">
                            {member.completion_rate}%
                          </span>
                          <span className="text-sm font-bold text-slate-400">
                            |
                          </span>
                          <span className="text-sm font-bold text-slate-600">
                            On-time: {member.on_time_rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
