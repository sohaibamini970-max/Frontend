"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";
const PROGRAM_API = `${API_BASE}/program-tasks`;

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

type ProjectOverview = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  raw_status?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  project_manager_id?: string | null;
  project_manager_name?: string | null;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  member_count: number;
  completion_rate: number;
  is_completed: boolean;
};

/* NEW: program task type */
type ProgramTask = {
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
  program_project_id: string;
  program_project_name?: string;
  program_name?: string;
};

type ProgramProjectOverview = {
  program_project_id: string;
  program_project_name: string;
  program_name: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
};

type ViewMode = "personal" | "team" | "overall";

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

function getDaysUntil(date?: string | null) {
  if (!date) return null;
  const datePart = date.substring(0, 10);
  const target = Date.parse(`${datePart}T00:00:00`);
  if (Number.isNaN(target)) return null;
  const now = new Date();
  const today = Date.parse(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}T00:00:00`
  );
  return Math.ceil((target - today) / 86400000);
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({ status }: { status?: string }) {
  if (status === "Done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={12} />
        Done
      </span>
    );
  }
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200">
        <CheckCircle2 size={12} />
        Completed
      </span>
    );
  }
  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-200">
        <Clock3 size={12} />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
      <XCircle size={12} />
      To Do
    </span>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PerformancePage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<BreakdownItem[]>([]);
  const [priorityBreakdown, setPriorityBreakdown] = useState<BreakdownItem[]>(
    []
  );
  const [projectBreakdown, setProjectBreakdown] = useState<BreakdownItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [teamMembers, setTeamMembers] = useState<MemberPerformance[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("personal");
  const [historyLimit, setHistoryLimit] = useState(10);

  const [membersList, setMembersList] = useState<SimpleMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  // Overall view (Exec + Admin)
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [overallStats, setOverallStats] = useState<PerformanceStats | null>(
    null
  );
  const [overallStatusBreakdown, setOverallStatusBreakdown] = useState<
    BreakdownItem[]
  >([]);
  const [overallPriorityBreakdown, setOverallPriorityBreakdown] = useState<
    BreakdownItem[]
  >([]);

  /* -------- PROGRAM SECTION STATE -------- */
  const [programTasks, setProgramTasks] = useState<ProgramTask[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programSearch, setProgramSearch] = useState("");
  const [programHistoryLimit, setProgramHistoryLimit] = useState(10);
  const [selectedProgramProjectId, setSelectedProgramProjectId] = useState<
    string | null
  >(null);

  const isManagerView = useMemo(
    () =>
      user?.role === "Executive Manager" ||
      user?.role === "System Administrator" ||
      user?.role === "Project Manager",
    [user]
  );

  const isExecOrAdmin = useMemo(
    () =>
      user?.role === "Executive Manager" ||
      user?.role === "System Administrator",
    [user]
  );

  /* =======================================================
     INITIAL USER
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
     LOAD PERSONAL / TEAM DATA
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
     LOAD MEMBERS LIST
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
     LOAD OVERALL DATA
  ======================================================= */

  const loadOverallData = useCallback(async (signal?: AbortSignal) => {
    setProjectsLoading(true);
    try {
      const headers = getHeaders();

      const [allRes, projRes] = await Promise.all([
        fetch(`${API_BASE}/performance/all`, {
          headers,
          signal,
          cache: "no-store",
        }),
        fetch(`${API_BASE}/performance/projects`, {
          headers,
          signal,
          cache: "no-store",
        }),
      ]);

      if (signal?.aborted) return;

      const [allData, projData] = await Promise.all([
        allRes.ok ? allRes.json() : null,
        projRes.ok ? projRes.json() : null,
      ]);

      if (signal?.aborted) return;

      if (allData?.success) {
        setOverallStats(allData.stats || null);
        setOverallStatusBreakdown(allData.statusBreakdown || []);
        setOverallPriorityBreakdown(allData.priorityBreakdown || []);
      }

      if (projData?.success) {
        setProjects(projData.projects || []);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Overall load error:", err);
    } finally {
      if (!signal?.aborted) setProjectsLoading(false);
    }
  }, []);

  /* =======================================================
     LOAD PROGRAM TASKS
     - Member: /my/tasks + /my/program-projects + each project's tasks
     - Manager: /all
  ======================================================= */

  const loadProgramTasks = useCallback(async (signal?: AbortSignal) => {
    setProgramLoading(true);
    try {
      const storedUser = getStoredUser();
      if (!storedUser?.id) return;

      const headers = getHeaders();
      const role = storedUser.role;

      let merged: any[] = [];

      if (role === "Member") {
        const ownRes = await fetch(`${PROGRAM_API}/my/tasks`, {
          headers,
          signal,
          cache: "no-store",
        });
        const ownData = ownRes.ok ? await ownRes.json() : { tasks: [] };

        const ppRes = await fetch(`${PROGRAM_API}/my/program-projects`, {
          headers,
          signal,
          cache: "no-store",
        });
        const ppData = ppRes.ok
          ? await ppRes.json()
          : { programProjects: [] };

        const myProjects: any[] = ppData.programProjects || [];

        const lists = await Promise.all(
          myProjects.map(async (pp: any) => {
            const r = await fetch(
              `${PROGRAM_API}/my/program-project/${pp.id}/tasks`,
              { headers, signal, cache: "no-store" }
            );
            if (!r.ok) return [];
            const d = await r.json();
            return d.tasks || [];
          })
        );

        const map = new Map<string, any>();
        [...(ownData.tasks || []), ...lists.flat()].forEach((t: any) => {
          map.set(String(t.id), t);
        });
        merged = Array.from(map.values());
      } else {
        const res = await fetch(`${PROGRAM_API}/all`, {
          headers,
          signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        merged = data.tasks || [];
      }

      const normalized: ProgramTask[] = merged.map((t: any) => ({
        id: String(t.id ?? ""),
        name: t.name ?? t.title ?? "Untitled Task",
        status: t.status ?? "To Do",
        priority: t.priority ?? "Medium",
        due_date: t.due_date ?? t.dueDate ?? null,
        completed_at: t.completed_at ?? t.completedAt ?? null,
        updated_at: t.updated_at ?? t.updatedAt ?? null,
        created_at: t.created_at ?? t.createdAt ?? null,
        assignee_id: t.assignee_id ?? t.assigneeId ?? null,
        assignee_name: t.assignee_name ?? t.assigneeName ?? null,
        program_project_id: String(t.program_project_id || ""),
        program_project_name: t.program_project_name || "Program Project",
        program_name: t.program_name || "Program",
      }));

      setProgramTasks(normalized);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Program tasks load error:", err);
    } finally {
      if (!signal?.aborted) setProgramLoading(false);
    }
  }, []);

  /* =======================================================
     MAIN LOAD EFFECT
  ======================================================= */

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();

    const role = user.role;
    const isManager =
      role === "Executive Manager" ||
      role === "System Administrator" ||
      role === "Project Manager";
    const isExecAdmin =
      role === "Executive Manager" || role === "System Administrator";

    if (isManager) {
      loadMembersList(controller.signal);
    }

    loadData(controller.signal, false, selectedMemberId);
    loadProgramTasks(controller.signal);

    if (isExecAdmin) {
      loadOverallData(controller.signal);
    }

    return () => controller.abort();
  }, [
    user?.id,
    selectedMemberId,
    loadData,
    loadMembersList,
    loadOverallData,
    loadProgramTasks,
  ]);

  /* =======================================================
     RESET ON MEMBER / VIEW CHANGE
  ======================================================= */

  useEffect(() => {
    setHistoryLimit(10);
    setProgramHistoryLimit(10);
  }, [selectedMemberId]);

  useEffect(() => {
    if (viewMode === "team" || viewMode === "overall") {
      setSelectedMemberId(null);
      setMemberDropdownOpen(false);
    }
  }, [viewMode]);

  /* =======================================================
     OUTSIDE-CLICK FOR DROPDOWN
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

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.project_manager_name?.toLowerCase().includes(q)
    );
  }, [projects, projectSearch]);

  const topRiskProjects = useMemo(
    () =>
      [...projects]
        .filter((p) => !p.is_completed)
        .sort((a, b) => b.overdue_tasks - a.overdue_tasks)
        .slice(0, 5),
    [projects]
  );

  const topPerformers = useMemo(
    () =>
      [...teamMembers]
        .filter((m) => m.total_tasks > 0)
        .sort((a, b) => b.completion_rate - a.completion_rate)
        .slice(0, 5),
    [teamMembers]
  );

  /* =======================================================
     PROGRAM PROJECTS GROUPED
  ======================================================= */

  const programProjects = useMemo<ProgramProjectOverview[]>(() => {
    const map = new Map<string, ProgramProjectOverview>();

    for (const t of programTasks) {
      const key = t.program_project_id;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          program_project_id: key,
          program_project_name: t.program_project_name || "Program Project",
          program_name: t.program_name || "Program",
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0,
          completion_rate: 0,
        });
      }

      const g = map.get(key)!;
      g.total_tasks += 1;
      if (t.status === "Done") g.completed_tasks += 1;
      else {
        g.pending_tasks += 1;
        const days = getDaysUntil(t.due_date);
        if (days !== null && days < 0) g.overdue_tasks += 1;
      }
    }

    for (const g of map.values()) {
      g.completion_rate =
        g.total_tasks > 0
          ? Math.round((g.completed_tasks / g.total_tasks) * 100)
          : 0;
    }

    return Array.from(map.values());
  }, [programTasks]);

  const filteredProgramProjects = useMemo(() => {
    if (!programSearch.trim()) return programProjects;
    const q = programSearch.toLowerCase();
    return programProjects.filter(
      (p) =>
        p.program_project_name.toLowerCase().includes(q) ||
        p.program_name.toLowerCase().includes(q)
    );
  }, [programProjects, programSearch]);

  const programOverview = useMemo(() => {
    const total = programTasks.length;
    const done = programTasks.filter((t) => t.status === "Done").length;
    const pending = total - done;
    const overdue = programTasks.filter((t) => {
      if (t.status === "Done") return false;
      const d = getDaysUntil(t.due_date);
      return d !== null && d < 0;
    }).length;

    return {
      total,
      done,
      pending,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [programTasks]);

  // Which program project is currently focused?
  // If none chosen, aggregate across all program projects.
  const focusedProgramTasks = useMemo(() => {
    if (!selectedProgramProjectId) return programTasks;
    return programTasks.filter(
      (t) => t.program_project_id === selectedProgramProjectId
    );
  }, [programTasks, selectedProgramProjectId]);

  const programHistory = useMemo(() => {
    return [...focusedProgramTasks]
      .sort((a, b) => {
        const da = a.completed_at || a.updated_at || a.created_at || "";
        const db = b.completed_at || b.updated_at || b.created_at || "";
        return db.localeCompare(da);
      })
      .slice(0, programHistoryLimit);
  }, [focusedProgramTasks, programHistoryLimit]);

  const goToPrograms = () => {
    router.push("/programs");
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-cyan-500" />
            </div>
            <p className="mt-5 text-base font-bold text-slate-700">
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
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative rounded-3xl bg-white px-6 py-8 shadow-sm ring-1 ring-slate-200 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 ring-1 ring-cyan-200">
                <BarChart3 size={28} className="text-cyan-600" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Performance Dashboard
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-600 sm:text-base">
                  {isExecOrAdmin
                    ? "Overall tracking across all projects, tasks, and team members"
                    : isManagerView
                    ? "Track your performance and team productivity"
                    : "Your personal task performance overview"}
                </p>

                {user && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 ring-1 ring-slate-200">
                    <User size={13} className="text-cyan-600" />
                    <span className="text-xs font-bold text-slate-700">
                      {user.full_name || user.name || user.email}
                    </span>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-700">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap items-center gap-3">
              {isManagerView && (
                <div className="flex rounded-2xl bg-slate-100 p-1.5 ring-1 ring-slate-200">
                  {isExecOrAdmin && (
                    <button
                      onClick={() => setViewMode("overall")}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                        viewMode === "overall"
                          ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Activity size={15} />
                        Overall
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setViewMode("personal")}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      viewMode === "personal"
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Target size={15} />
                      {isExecOrAdmin ? "Aggregate" : "My Performance"}
                    </span>
                  </button>

                  <button
                    onClick={() => setViewMode("team")}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      viewMode === "team"
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                        : "text-slate-600 hover:bg-white"
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
                onClick={() => {
                  loadData(undefined, true, selectedMemberId);
                  loadProgramTasks(undefined);
                  if (isExecOrAdmin) loadOverallData(undefined);
                }}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:opacity-50"
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
          <div className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-base font-semibold text-red-700">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          </div>
        )}

        {/* =================================================
            PROGRAM PROJECTS SECTION — visible for BOTH roles
        ================================================= */}

        <section className="mt-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                  <Layers size={20} className="text-emerald-600" />
                </div>

                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Program Projects
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Performance overview of tasks inside your programs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={goToPrograms}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Open Program Projects
                <ArrowRight size={15} />
              </button>
            </div>

            {/* PROGRAM KPI CARDS */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-100 p-2.5">
                    <ClipboardList size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                      Program Tasks
                    </p>
                    <p className="text-3xl font-black text-indigo-900">
                      {programOverview.total}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Total assigned
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2.5">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                      Completed
                    </p>
                    <p className="text-3xl font-black text-emerald-900">
                      {programOverview.done}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      {programOverview.completionRate}% rate
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2.5">
                    <Clock3 size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                      Pending
                    </p>
                    <p className="text-3xl font-black text-amber-900">
                      {programOverview.pending}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      In progress or to do
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-100 p-2.5">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                      Overdue
                    </p>
                    <p className="text-3xl font-black text-red-900">
                      {programOverview.overdue}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Past due date
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <div className="relative mt-6 max-w-sm">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                placeholder="Search program projects..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
              />
            </div>

            {/* PROGRAM PROJECT CARDS */}
            {programLoading ? (
              <div className="mt-10 flex justify-center">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-cyan-500" />
                </div>
              </div>
            ) : filteredProgramProjects.length === 0 ? (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Layers size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">
                  No program projects assigned yet
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredProgramProjects.map((p) => {
                  const isFocused =
                    selectedProgramProjectId === p.program_project_id;

                  return (
                    <button
                      key={p.program_project_id}
                      type="button"
                      onClick={() =>
                        setSelectedProgramProjectId(
                          isFocused ? null : p.program_project_id
                        )
                      }
                      className={`overflow-hidden rounded-2xl text-left ring-1 transition-all ${
                        isFocused
                          ? "bg-emerald-50 ring-2 ring-emerald-400"
                          : "bg-white ring-slate-200 hover:bg-emerald-50/40"
                      }`}
                    >
                      <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-3 text-white">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Program
                          </span>
                          <span className="truncate text-[11px] font-bold text-emerald-50">
                            {p.program_name}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-base font-black">
                          {p.program_project_name}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-2 p-4">
                        <div className="rounded-xl bg-indigo-50 px-2 py-2 text-center ring-1 ring-indigo-100">
                          <p className="text-[9px] font-bold uppercase text-indigo-600">
                            Total
                          </p>
                          <p className="text-base font-black text-indigo-900">
                            {p.total_tasks}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                          <p className="text-[9px] font-bold uppercase text-emerald-600">
                            Done
                          </p>
                          <p className="text-base font-black text-emerald-900">
                            {p.completed_tasks}
                          </p>
                        </div>
                        <div className="rounded-xl bg-amber-50 px-2 py-2 text-center ring-1 ring-amber-100">
                          <p className="text-[9px] font-bold uppercase text-amber-600">
                            Pending
                          </p>
                          <p className="text-base font-black text-amber-900">
                            {p.pending_tasks}
                          </p>
                        </div>
                        <div className="rounded-xl bg-red-50 px-2 py-2 text-center ring-1 ring-red-100">
                          <p className="text-[9px] font-bold uppercase text-red-600">
                            Overdue
                          </p>
                          <p className="text-base font-black text-red-900">
                            {p.overdue_tasks}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            Progress
                          </span>
                          <div className="flex-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                style={{ width: `${p.completion_rate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-700">
                            {p.completion_rate}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* PROGRAM TASK HISTORY */}
            {!programLoading && focusedProgramTasks.length > 0 && (
              <div className="mt-8 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
                    <History size={18} className="text-cyan-600" />
                    {selectedProgramProjectId
                      ? `History — ${
                          programProjects.find(
                            (p) =>
                              p.program_project_id ===
                              selectedProgramProjectId
                          )?.program_project_name || "Program Project"
                        }`
                      : "Program Task History"}
                  </h3>

                  {selectedProgramProjectId && (
                    <button
                      type="button"
                      onClick={() => setSelectedProgramProjectId(null)}
                      className="text-xs font-bold text-cyan-600 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {programHistory.map((task) => {
                    const displayDate =
                      task.completed_at ||
                      task.updated_at ||
                      task.created_at;

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-white p-3.5 ring-1 ring-slate-200 transition hover:ring-emerald-300"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              task.status === "Done"
                                ? "bg-emerald-100 text-emerald-700"
                                : task.status === "In Progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.status === "Done" ? (
                              <CheckCircle2 size={16} />
                            ) : task.status === "In Progress" ? (
                              <Clock3 size={16} />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {task.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                              {!selectedProgramProjectId && (
                                <span className="inline-flex items-center gap-1">
                                  <FolderKanban size={11} />
                                  {task.program_project_name}
                                </span>
                              )}
                              {task.assignee_name && (
                                <span className="inline-flex items-center gap-1">
                                  <User size={11} />
                                  {task.assignee_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden items-center gap-1.5 text-xs font-bold text-slate-500 sm:inline-flex">
                            <CalendarClock size={13} />
                            {formatDate(displayDate)}
                          </span>
                          <StatusPill status={task.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {programHistoryLimit < focusedProgramTasks.length && (
                  <button
                    onClick={() =>
                      setProgramHistoryLimit((n) => n + 10)
                    }
                    className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-bold text-cyan-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            OVERALL VIEW
        ================================================= */}

        {viewMode === "overall" && isExecOrAdmin && (
          <section className="mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-lg">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <FolderKanban size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {projects.length}
                  </p>
                  <p className="mt-1 text-base font-bold text-indigo-50">
                    Total Projects
                  </p>
                  <p className="text-xs font-medium text-indigo-100/80">
                    {projects.filter((p) => p.is_completed).length} completed ·{" "}
                    {projects.filter((p) => !p.is_completed).length} active
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 p-6 shadow-lg">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <ClipboardList size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {overallStats?.totalTasks ?? 0}
                  </p>
                  <p className="mt-1 text-base font-bold text-cyan-50">
                    Total Tasks
                  </p>
                  <p className="text-xs font-medium text-cyan-100/80">
                    Across all members
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-lg">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {overallStats?.completedTasks ?? 0}
                  </p>
                  <p className="mt-1 text-base font-bold text-emerald-50">
                    Completed
                  </p>
                  <p className="text-xs font-medium text-emerald-100/80">
                    {overallStats?.completionRate ?? 0}% completion rate
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 shadow-lg">
                <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                    <AlertTriangle size={24} className="text-white" />
                  </div>
                  <p className="mt-5 text-5xl font-black text-white">
                    {overallStats?.overdueTasks ?? 0}
                  </p>
                  <p className="mt-1 text-base font-bold text-red-50">
                    Overdue
                  </p>
                  <p className="text-xs font-medium text-red-100/80">
                    Past due across all projects
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2.5">
                    <Clock3 size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
                      Pending
                    </p>
                    <p className="text-3xl font-black text-amber-700">
                      {overallStats?.pendingTasks ?? 0}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      In progress or to do
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-100 p-2.5">
                    <Flame size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                      Overdue Done
                    </p>
                    <p className="text-3xl font-black text-rose-700">
                      {overallStats?.overdueDoneTasks ?? 0}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Completed after deadline
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2.5">
                    <TrendingUp size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                      On-time Rate
                    </p>
                    <p className="text-3xl font-black text-emerald-700">
                      {overallStats?.onTimeRate ?? 0}%
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Completed before due date
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-100 p-2.5">
                    <Timer size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-500">
                      Avg. Days
                    </p>
                    <p className="text-3xl font-black text-teal-700">
                      {overallStats?.avgCompletionDays || "—"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Per completed task
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Target size={20} className="text-purple-500" />
                  Overall Status Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {overallStatusBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks yet.</p>
                  ) : (
                    overallStatusBreakdown.map((item) => {
                      const total = overallStatusBreakdown.reduce(
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
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Zap size={20} className="text-amber-500" />
                  Overall Priority Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {overallPriorityBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks yet.</p>
                  ) : (
                    overallPriorityBreakdown.map((item) => {
                      const total = overallPriorityBreakdown.reduce(
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
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <AlertTriangle size={20} className="text-red-500" />
                  Top Risk Projects
                </h3>
                <div className="mt-5 space-y-3">
                  {topRiskProjects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No active projects at risk. 🎉
                    </p>
                  ) : (
                    topRiskProjects.map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-black text-red-700 ring-1 ring-red-200">
                          #{i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {p.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            PM: {p.project_manager_name || "Unassigned"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-red-600">
                            {p.overdue_tasks}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            overdue
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <TrendingUp size={20} className="text-emerald-500" />
                  Top Performers
                </h3>
                <div className="mt-5 space-y-3">
                  {topPerformers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No member data yet.
                    </p>
                  ) : (
                    topPerformers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-white">
                          {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {m.full_name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {m.completed_tasks}/{m.total_tasks} done ·{" "}
                            {m.on_time_rate}% on-time
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">
                            {m.completion_rate}%
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            rate
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <FolderKanban size={20} className="text-cyan-600" />
                  All Projects
                </h3>

                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
                  />
                </div>
              </div>

              {projectsLoading ? (
                <div className="mt-10 flex justify-center">
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-cyan-500" />
                  </div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <FolderKanban size={36} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    No projects found
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredProjects.map((proj) => {
                    const rate = Math.round(proj.completion_rate || 0);
                    const isDone = proj.is_completed;

                    return (
                      <div
                        key={proj.id}
                        className={`overflow-hidden rounded-2xl bg-slate-50 ring-1 transition-all hover:bg-white ${
                          isDone ? "ring-emerald-200" : "ring-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200"
                              }`}
                            >
                              <FolderKanban size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">
                                {proj.name}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                PM: {proj.project_manager_name || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ring-1 ${
                              isDone
                                ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                : proj.overdue_tasks > 0
                                ? "bg-red-100 text-red-700 ring-red-200"
                                : "bg-cyan-100 text-cyan-700 ring-cyan-200"
                            }`}
                          >
                            {isDone
                              ? "Completed"
                              : proj.overdue_tasks > 0
                              ? "At Risk"
                              : "Active"}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 p-5">
                          <div className="rounded-xl bg-indigo-50 px-2 py-2 text-center ring-1 ring-indigo-100">
                            <p className="text-[9px] font-bold uppercase text-indigo-600">
                              Total
                            </p>
                            <p className="text-base font-black text-indigo-900">
                              {proj.total_tasks}
                            </p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                            <p className="text-[9px] font-bold uppercase text-emerald-600">
                              Done
                            </p>
                            <p className="text-base font-black text-emerald-900">
                              {proj.completed_tasks}
                            </p>
                          </div>
                          <div className="rounded-xl bg-amber-50 px-2 py-2 text-center ring-1 ring-amber-100">
                            <p className="text-[9px] font-bold uppercase text-amber-600">
                              Pending
                            </p>
                            <p className="text-base font-black text-amber-900">
                              {proj.pending_tasks}
                            </p>
                          </div>
                          <div className="rounded-xl bg-red-50 px-2 py-2 text-center ring-1 ring-red-100">
                            <p className="text-[9px] font-bold uppercase text-red-600">
                              Overdue
                            </p>
                            <p className="text-base font-black text-red-900">
                              {proj.overdue_tasks}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase text-slate-500">
                              Progress
                            </span>
                            <div className="flex-1">
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isDone
                                      ? "bg-gradient-to-r from-emerald-400 to-green-400"
                                      : "bg-gradient-to-r from-cyan-400 to-blue-400"
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                            <span
                              className={`text-xs font-black ${
                                isDone ? "text-emerald-600" : "text-cyan-600"
                              }`}
                            >
                              {rate}%
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Users size={11} />
                              {proj.member_count} member
                              {proj.member_count === 1 ? "" : "s"}
                            </span>
                            {proj.due_date && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock size={11} />
                                Due {formatDate(proj.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            PERSONAL VIEW
        ================================================= */}

        {viewMode === "personal" && stats && (
          <>
            {isManagerView && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                  <UserCircle2 size={16} className="text-cyan-600" />
                  Showing:
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setMemberDropdownOpen((v) => !v)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-cyan-700 ring-1 ring-cyan-200 transition hover:bg-cyan-50"
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
                    <div className="absolute left-0 top-12 z-[100] max-h-80 w-72 overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-slate-200">
                      <button
                        onClick={() => {
                          setSelectedMemberId(null);
                          setMemberDropdownOpen(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          selectedMemberId === null
                            ? "bg-cyan-50 ring-1 ring-cyan-200"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                          <Users size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            All Members
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Aggregate performance
                          </p>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      {membersList.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-slate-400">
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
                                ? "bg-cyan-50 ring-1 ring-cyan-200"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-white">
                              {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {m.full_name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
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

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 p-6 shadow-lg">
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
                    Assigned
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-lg">
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

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-lg">
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

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 shadow-lg">
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

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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
                      Involved in
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
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

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Target size={20} className="text-purple-500" />
                  Task Status Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {statusBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks yet.</p>
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
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Zap size={20} className="text-amber-500" />
                  Task Priority Breakdown
                </h3>
                <div className="mt-5 space-y-4">
                  {priorityBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks yet.</p>
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
                    })
                  )}
                </div>
              </div>
            </div>

            {projectBreakdown.length > 0 && (
              <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <FolderKanban size={20} className="text-cyan-600" />
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
                        className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition-all hover:bg-white"
                      >
                        <p className="truncate text-base font-black text-slate-900">
                          {proj.project_name}
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-emerald-600">
                                {proj.completed_tasks} done
                              </span>
                              <span className="text-slate-600">
                                {proj.total_tasks} total
                              </span>
                            </div>
                            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-2xl font-black text-slate-900">
                            {rate}%
                          </span>
                        </div>
                        {proj.overdue_tasks && proj.overdue_tasks > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
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

            <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <History size={20} className="text-cyan-600" />
                  History
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {visibleHistory.length} / {history.length}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {visibleHistory.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-12 text-center">
                    <ListChecks size={32} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-600">
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
                        className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:bg-white"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              task.status === "Done"
                                ? "bg-emerald-100 text-emerald-700"
                                : task.status === "In Progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
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
                            <p className="truncate text-sm font-bold text-slate-900">
                              {task.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
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
                          <span className="hidden items-center gap-1.5 text-xs font-bold text-slate-500 sm:inline-flex">
                            <CalendarClock size={13} />
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
                  className="mt-5 w-full rounded-2xl bg-slate-50 py-3 text-sm font-bold text-cyan-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-12 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div className="mt-6 space-y-4">
              {filteredTeamMembers.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-20 text-center">
                  <Users size={48} className="mx-auto text-slate-300" />
                  <p className="mt-4 text-lg font-black text-slate-700">
                    No team members found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {search
                      ? "Try a different search term."
                      : "No members with assigned tasks yet."}
                  </p>
                </div>
              ) : (
                filteredTeamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:ring-cyan-300"
                  >
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-base font-black text-slate-600 ring-1 ring-slate-200">
                        #{index + 1}
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-black text-white shadow-lg shadow-cyan-500/20">
                          {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-slate-900">
                            {member.full_name}
                          </p>
                          <p className="truncate text-xs font-medium text-slate-500">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
                        <div className="rounded-2xl bg-indigo-50 px-4 py-2.5 text-center ring-1 ring-indigo-100">
                          <p className="text-[10px] font-bold uppercase text-indigo-600">
                            Total
                          </p>
                          <p className="text-xl font-black text-indigo-900">
                            {member.total_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-center ring-1 ring-emerald-100">
                          <p className="text-[10px] font-bold uppercase text-emerald-600">
                            Done
                          </p>
                          <p className="text-xl font-black text-emerald-900">
                            {member.completed_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-4 py-2.5 text-center ring-1 ring-amber-100">
                          <p className="text-[10px] font-bold uppercase text-amber-600">
                            Pending
                          </p>
                          <p className="text-xl font-black text-amber-900">
                            {member.pending_tasks}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-red-50 px-4 py-2.5 text-center ring-1 ring-red-100">
                          <p className="text-[10px] font-bold uppercase text-red-600">
                            Overdue
                          </p>
                          <p className="text-xl font-black text-red-900">
                            {member.overdue_tasks}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 px-6 py-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-500">
                          Completion
                        </span>
                        <div className="flex-1">
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                              style={{ width: `${member.completion_rate}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-600">
                          {member.completion_rate}%
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          |
                        </span>
                        <span className="text-xs font-bold text-slate-500">
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
