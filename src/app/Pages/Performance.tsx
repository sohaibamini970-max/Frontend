"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Flame,
  Users,
  ClipboardList,
  Timer,
  History,
  CalendarClock,
  ListChecks,
  ChevronDown,
  UserCircle2,
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

type HistoryItem = {
  id: string;
  name: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  project_name?: string | null;
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
};

type SimpleMember = {
  id: string;
  full_name: string;
  email: string;
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

function formatDate(date?: string | null) {
  if (!date) return "—";
  const time = Date.parse(date);
  if (Number.isNaN(time)) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(time);
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({ status }: { status?: string }) {
  if (status === "Done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
        <CheckCircle2 size={12} />
        Done
      </span>
    );
  }
  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-extrabold text-blue-300 ring-1 ring-blue-400/30">
        <Clock3 size={12} />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-extrabold text-slate-300 ring-1 ring-slate-400/30">
      <XCircle size={12} />
      To Do
    </span>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PerformancePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<BreakdownItem[]>([]);
  const [priorityBreakdown, setPriorityBreakdown] = useState<BreakdownItem[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<BreakdownItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [teamMembers, setTeamMembers] = useState<MemberPerformance[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
  const [historyLimit, setHistoryLimit] = useState(10);

  const [membersList, setMembersList] = useState<SimpleMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  const isManagerView = useMemo(
    () =>
      user?.role === "Executive Manager" ||
      user?.role === "System Administrator" ||
      user?.role === "Project Manager",
    [user]
  );

  /* =======================================================
     INITIAL USER — runs once
  ======================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    } else {
      setLoading(false);
      setError("User session not found. Please login again.");
    }
  }, []);

  /* =======================================================
     LOAD EVERYTHING IN PARALLEL
  ======================================================= */

  const loadData = useCallback(
    async (signal?: AbortSignal, isRefresh = false, memberId?: string | null) => {
      const storedUser = getStoredUser();
      if (!storedUser?.id) {
        setLoading(false);
        setError("User session not found. Please login again.");
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const headers = getHeaders();
        const isManager =
          storedUser.role === "Executive Manager" ||
          storedUser.role === "System Administrator" ||
          storedUser.role === "Project Manager";

        // Personal panel endpoint
        let personalUrl: string;
        if (isManager) {
          if (memberId) {
            personalUrl = `${API_BASE}/performance/member/${memberId}`;
          } else {
            personalUrl = `${API_BASE}/performance/all`;
          }
        } else {
          personalUrl = `${API_BASE}/performance/member/${storedUser.id}`;
        }

        const personalReq = fetch(personalUrl, {
          headers,
          signal,
          cache: "no-store",
        });

        // History endpoint
        const historyUrl = isManager
          ? memberId
            ? `${API_BASE}/performance/history?limit=50&userId=${memberId}`
            : `${API_BASE}/performance/history?limit=50`
          : `${API_BASE}/performance/history?limit=50`;

        const historyReq = fetch(historyUrl, {
          headers,
          signal,
          cache: "no-store",
        });

        // Team leaderboard (managers only)
        const teamReq = isManager
          ? fetch(`${API_BASE}/performance/team`, {
              headers,
              signal,
              cache: "no-store",
            })
          : Promise.resolve(null);

        const [personalRes, historyRes, teamRes] = await Promise.all([
          personalReq,
          historyReq,
          teamReq,
        ]);

        if (signal?.aborted) return;

        const [personalData, historyData, teamData] = await Promise.all([
          personalRes.ok ? personalRes.json() : null,
          historyRes.ok ? historyRes.json() : null,
          teamRes && teamRes.ok ? teamRes.json() : null,
        ]);

        if (signal?.aborted) return;

        if (personalData?.success) {
          setStats(personalData.stats);
          setStatusBreakdown(personalData.statusBreakdown || []);
          setPriorityBreakdown(personalData.priorityBreakdown || []);
          setProjectBreakdown(personalData.projectBreakdown || []);
        }

        if (historyData?.success) {
          setHistory(historyData.history || []);
        }

        if (teamData?.success) {
          setTeamMembers(teamData.members || []);
        }

        if (!personalRes.ok) {
          throw new Error(`Performance request failed: ${personalRes.status}`);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Performance load error:", err);
        setError(err?.message || "Failed to load performance data.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  /* =======================================================
     LOAD MEMBERS LIST (managers only)
  ======================================================= */

  const loadMembersList = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE}/performance/members-list`, {
        headers: getHeaders(),
        signal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setMembersList(data.members || []);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Members list error:", err);
    }
  }, []);

  /* =======================================================
     MAIN LOAD EFFECT
  ======================================================= */

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();

    // Managers: also load the member list
    if (
      user.role === "Executive Manager" ||
      user.role === "System Administrator" ||
      user.role === "Project Manager"
    ) {
      loadMembersList(controller.signal);
    }

    loadData(controller.signal, false, selectedMemberId);

    return () => controller.abort();
  }, [user?.id, selectedMemberId, loadData, loadMembersList]);

  /* =======================================================
     RESET HISTORY LIMIT ON MEMBER CHANGE
  ======================================================= */

  useEffect(() => {
    setHistoryLimit(10);
  }, [selectedMemberId]);

  /* =======================================================
     RESET SELECTION WHEN SWITCHING TO TEAM VIEW
  ======================================================= */

  useEffect(() => {
    if (viewMode === "team") {
      setSelectedMemberId(null);
      setMemberDropdownOpen(false);
    }
  }, [viewMode]);

  /* =======================================================
     OUTSIDE-CLICK TO CLOSE MEMBER DROPDOWN
  ======================================================= */

  useEffect(() => {
    if (!memberDropdownOpen) return;
    const handler = () => setMemberDropdownOpen(false);
    const t = setTimeout(() => {
      window.addEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", handler);
    };
  }, [memberDropdownOpen]);

  /* =======================================================
     DERIVED
  ======================================================= */

  const selectedMember = useMemo(
    () => membersList.find((m) => m.id === selectedMemberId) || null,
    [membersList, selectedMemberId]
  );

  const dropdownLabel = useMemo(() => {
    if (!selectedMemberId) return "All Members";
    return selectedMember?.full_name || "Select Member";
  }, [selectedMemberId, selectedMember]);

  const filteredTeamMembers = useMemo(() => {
    if (!search.trim()) return teamMembers;
    const q = search.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [teamMembers, search]);

  const visibleHistory = useMemo(
    () => history.slice(0, historyLimit),
    [history, historyLimit]
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a1628] px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#1e3a5f]" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-cyan-400" />
            </div>
            <p className="mt-5 text-base font-bold text-white">
              Loading performance data...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#0a1628] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* =================================================
            HEADER — dark navy
        ================================================= */}

        <div className="relative rounded-3xl bg-gradient-to-r from-[#0f1f3a] via-[#132a4a] to-[#0f1f3a] px-6 py-8 shadow-2xl ring-1 ring-white/5 sm:px-10 sm:py-10">
          {/* Decorative blurs — clipped to header shape only */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-400/30">
                <BarChart3 size={28} className="text-cyan-300" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Performance Dashboard
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-300 sm:text-base">
                  {isManagerView
                    ? "Track your performance and team productivity"
                    : "Your personal task performance overview"}
                </p>

                {user && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 ring-1 ring-white/10">
                    <User size={13} className="text-cyan-300" />
                    <span className="text-xs font-bold text-white">
                      {user.full_name || user.name || user.email}
                    </span>
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-200">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS: view toggle + refresh */}
            <div className="flex flex-wrap items-center gap-3">
              {isManagerView && (
                <div className="flex rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
                  <button
                    onClick={() => setViewMode("personal")}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      viewMode === "personal"
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Target size={15} />
                      My Performance
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode("team")}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      viewMode === "team"
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users size={15} />
                      Team
                    </span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  loadData(undefined, true, selectedMemberId)
                }
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-bold text-white ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-6 rounded-2xl border-2 border-red-500/30 bg-red-500/10 px-6 py-4 text-base font-semibold text-red-300">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          </div>
        )}

        {/* =================================================
            PERSONAL VIEW
        ================================================= */}

        {viewMode === "personal" && stats && (
          <>
            {/* SHOWING LABEL + MEMBER DROPDOWN — managers only */}
            {isManagerView && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
                  <UserCircle2 size={16} className="text-cyan-400" />
                  Showing:
                </div>

                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setMemberDropdownOpen((v) => !v)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-bold text-cyan-300 ring-1 ring-cyan-400/30 transition hover:bg-white/10"
                  >
                    <span className="max-w-[200px] truncate">
                      {dropdownLabel}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`transition-transform ${
                        memberDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {memberDropdownOpen && (
                    <div className="absolute left-0 top-12 z-[100] max-h-80 w-72 overflow-y-auto rounded-2xl bg-[#0f1f3a] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                      {/* All members option */}
                      <button
                        onClick={() => {
                          setSelectedMemberId(null);
                          setMemberDropdownOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          selectedMemberId === null
                            ? "bg-cyan-500/15 ring-1 ring-cyan-400/30"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                          <Users size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">
                            All Members
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Aggregate performance
                          </p>
                        </div>
                      </button>

                      <div className="my-1 border-t border-white/5" />

                      {membersList.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-slate-500">
                          No members found
                        </p>
                      ) : (
                        membersList.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setMemberDropdownOpen(false);
                            }}
                            className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                              selectedMemberId === m.id
                                ? "bg-cyan-500/15 ring-1 ring-cyan-400/30"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-white">
                              {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">
                                {m.full_name}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">
                                {m.email}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ TOP 4 COLORFUL CARDS ============ */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {/* Total Tasks — Indigo */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <ClipboardList size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.totalTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-indigo-50">
                    Total Tasks
                  </p>
                  <p className="text-xs font-medium text-indigo-100/80">
                    Assigned to you
                  </p>
                </div>
              </div>

              {/* Completed — Emerald */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.completedTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-emerald-50">
                    Completed
                  </p>
                  <p className="text-xs font-medium text-emerald-100/80">
                    {stats.completionRate}% of total
                  </p>
                </div>
              </div>

              {/* Pending — Amber */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-xl shadow-amber-500/20 transition-all hover:-translate-y-1">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <Clock3 size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.pendingTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-amber-50">
                    Pending
                  </p>
                  <p className="text-xs font-medium text-amber-100/80">
                    In progress or to do
                  </p>
                </div>
              </div>

              {/* Overdue — Rose */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 shadow-xl shadow-red-500/20 transition-all hover:-translate-y-1">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <AlertTriangle size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {stats.overdueTasks}
                  </p>
                  <p className="mt-1 text-base font-bold text-red-50">
                    Overdue
                  </p>
                  <p className="text-xs font-medium text-red-100/80">
                    Past due date
                  </p>
                </div>
              </div>
            </div>

            {/* ============ 4 WHITE CARDS ============ */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Not Completed */}
              <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 p-2.5">
                    <XCircle size={20} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                      Not Completed
                    </p>
                    <p className="text-3xl font-black text-violet-700">
                      {stats.notCompletedTasks}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Past due & still open
                    </p>
                  </div>
                </div>
              </div>

              {/* Overdue Done */}
              <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-100 p-2.5">
                    <Flame size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                      Overdue Done
                    </p>
                    <p className="text-3xl font-black text-rose-700">
                      {stats.overdueDoneTasks}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Completed after deadline
                    </p>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-100 p-2.5">
                    <FolderKanban size={20} className="text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                      Projects
                    </p>
                    <p className="text-3xl font-black text-cyan-700">
                      {stats.projectCount}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      You've worked on
                    </p>
                  </div>
                </div>
              </div>

              {/* Avg Days */}
              <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-100 p-2.5">
                    <Timer size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-500">
                      Avg. Days
                    </p>
                    <p className="text-3xl font-black text-emerald-700">
                      {stats.avgCompletionDays || "—"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      To complete a task
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============ BREAKDOWN CHARTS ============ */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Status Breakdown */}
              <div className="rounded-3xl bg-[#0f1f3a] p-6 shadow-xl ring-1 ring-white/10">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <Target size={20} className="text-purple-400" />
                  Task Status Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {statusBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400">No tasks yet.</p>
                  ) : (
                    statusBreakdown.map((item) => {
                      const total = statusBreakdown.reduce(
                        (s, i) => s + (i.count || 0),
                        0
                      );
                      const percentage =
                        total > 0
                          ? Math.round(((item.count || 0) / total) * 100)
                          : 0;

                      const color =
                        item.status === "Done"
                          ? "bg-emerald-400"
                          : item.status === "In Progress"
                          ? "bg-blue-400"
                          : "bg-slate-400";

                      return (
                        <div key={item.status}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-200">
                              {item.status}
                            </span>
                            <span className="text-sm font-black text-white">
                              {item.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${color} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className="rounded-3xl bg-[#0f1f3a] p-6 shadow-xl ring-1 ring-white/10">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <Zap size={20} className="text-amber-400" />
                  Task Priority Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {priorityBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400">No tasks yet.</p>
                  ) : (
                    priorityBreakdown.map((item) => {
                      const total = priorityBreakdown.reduce(
                        (s, i) => s + (i.count || 0),
                        0
                      );
                      const percentage =
                        total > 0
                          ? Math.round(((item.count || 0) / total) * 100)
                          : 0;

                      const color =
                        item.priority === "High"
                          ? "bg-red-400"
                          : item.priority === "Medium"
                          ? "bg-amber-400"
                          : "bg-slate-400";

                      return (
                        <div key={item.priority}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-200">
                              {item.priority}
                            </span>
                            <span className="text-sm font-black text-white">
                              {item.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${color} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ============ PROJECT BREAKDOWN ============ */}
            {projectBreakdown.length > 0 && (
              <div className="mt-8 rounded-3xl bg-[#0f1f3a] p-6 shadow-xl ring-1 ring-white/10">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <FolderKanban size={20} className="text-cyan-400" />
                  Performance by Project
                </h3>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projectBreakdown.map((proj) => {
                    const rate =
                      proj.total_tasks && proj.total_tasks > 0
                        ? Math.round(
                            ((proj.completed_tasks || 0) / proj.total_tasks) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={proj.project_id}
                        className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition-all hover:bg-white/10"
                      >
                        <p className="truncate text-base font-black text-white">
                          {proj.project_name}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-emerald-300">
                                {proj.completed_tasks} done
                              </span>
                              <span className="text-slate-300">
                                {proj.total_tasks} total
                              </span>
                            </div>
                            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-2xl font-black text-white">
                            {rate}%
                          </span>
                        </div>
                        {proj.overdue_tasks && proj.overdue_tasks > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 ring-1 ring-red-400/30">
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

            {/* ============ HISTORY ============ */}
            <div className="mt-8 rounded-3xl bg-[#0f1f3a] p-6 shadow-xl ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <History size={20} className="text-cyan-400" />
                  History
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {visibleHistory.length} / {history.length}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {visibleHistory.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-white/10 px-5 py-12 text-center">
                    <ListChecks size={32} className="mx-auto text-slate-600" />
                    <p className="mt-2 text-sm font-bold text-slate-300">
                      No task history yet
                    </p>
                  </div>
                ) : (
                  visibleHistory.map((task) => {
                    const displayDate =
                      task.completed_at ||
                      task.updated_at ||
                      task.created_at;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              task.status === "Done"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : task.status === "In Progress"
                                ? "bg-blue-500/15 text-blue-300"
                                : "bg-slate-500/15 text-slate-300"
                            }`}
                          >
                            {task.status === "Done" ? (
                              <CheckCircle2 size={18} />
                            ) : task.status === "In Progress" ? (
                              <Clock3 size={18} />
                            ) : (
                              <XCircle size={18} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {task.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                              {task.project_name && (
                                <span className="inline-flex items-center gap-1">
                                  <FolderKanban size={11} />
                                  {task.project_name}
                                </span>
                              )}
                              {isManagerView && task.assignee_name && (
                                <span className="inline-flex items-center gap-1">
                                  <User size={11} />
                                  {task.assignee_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden items-center gap-1.5 text-xs font-bold text-slate-300 sm:inline-flex">
                            <CalendarClock
                              size={13}
                              className="text-slate-500"
                            />
                            {formatDate(displayDate)}
                          </span>
                          <StatusPill status={task.status} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {historyLimit < history.length && (
                <button
                  onClick={() => setHistoryLimit((n) => n + 10)}
                  className="mt-5 w-full rounded-2xl bg-white/5 py-3 text-sm font-bold text-cyan-300 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Load more
                </button>
              )}
            </div>
          </>
        )}

        {/* =================================================
            TEAM VIEW
        ================================================= */}

        {viewMode === "team" && isManagerView && (
          <section className="mt-8">
            <div className="relative max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f1f3a] px-12 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <div className="mt-6 space-y-4">
              {filteredTeamMembers.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-white/10 bg-[#0f1f3a] px-6 py-20 text-center">
                  <Users size={48} className="mx-auto text-slate-600" />
                  <p className="mt-4 text-lg font-black text-white">
                    No team members found
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {search
                      ? "Try a different search term."
                      : "No members with assigned tasks yet."}
                  </p>
                </div>
              ) : (
                filteredTeamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="overflow-hidden rounded-3xl bg-[#0f1f3a] shadow-lg ring-1 ring-white/10 transition-all hover:ring-cyan-400/30"
                  >
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                      {/* RANK */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-base font-black text-slate-300 ring-1 ring-white/10">
                        #{index + 1}
                      </div>

                      {/* AVATAR + NAME */}
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-black text-white shadow-lg shadow-cyan-500/20">
                          {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">
                            {member.full_name}
                          </p>
                          <p className="truncate text-xs font-medium text-slate-400">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      {/* STATS */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
                        <div className="rounded-2xl bg-indigo-500/10 px-4 py-2.5 text-center ring-1 ring-indigo-400/20">
                          <p className="text-[10px] font-bold uppercase text-indigo-300">
                            Total
                          </p>
                          <p className="text-xl font-black text-indigo-200">
                            {member.total_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-center ring-1 ring-emerald-400/20">
                          <p className="text-[10px] font-bold uppercase text-emerald-300">
                            Done
                          </p>
                          <p className="text-xl font-black text-emerald-200">
                            {member.completed_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-amber-500/10 px-4 py-2.5 text-center ring-1 ring-amber-400/20">
                          <p className="text-[10px] font-bold uppercase text-amber-300">
                            Pending
                          </p>
                          <p className="text-xl font-black text-amber-200">
                            {member.pending_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-center ring-1 ring-red-400/20">
                          <p className="text-[10px] font-bold uppercase text-red-300">
                            Overdue
                          </p>
                          <p className="text-xl font-black text-red-200">
                            {member.overdue_tasks}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="border-t border-white/5 px-6 py-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400">
                          Completion
                        </span>
                        <div className="flex-1">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                              style={{ width: `${member.completion_rate}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-300">
                          {member.completion_rate}%
                        </span>
                        <span className="text-sm font-bold text-slate-500">
                          |
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          On-time: {member.on_time_rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
