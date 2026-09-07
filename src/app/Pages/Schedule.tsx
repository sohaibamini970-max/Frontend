"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  CalendarClock,
  User,
  CheckCircle2,
  Clock3,
  Circle,
  FolderKanban,
  ClipboardList,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  GanttChart,
  Timer,
  Flag,
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

type TaskStatus = "To Do" | "In Progress" | "Done";

type Priority = "Low" | "Medium" | "High";

type Project = {
  id: string;
  name: string;
  domain?: string;
  status?: string;
  priority?: Priority;
  start_date?: string | null;
  deadline?: string | null;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  creator_id?: string;
  creator_name?: string;
  creator_role?: string;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  manager_role?: string | null;
};

type Task = {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type CurrentUser = {
  id: string;
  full_name?: string;
  name?: string;
  role: Role;
  email?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
}

function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      id: parsed.id || parsed.user_id || parsed.userId,
      full_name: parsed.full_name || parsed.fullName || parsed.name,
      name: parsed.name || parsed.full_name || parsed.fullName,
      role: parsed.role,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function formatDate(date?: string | null) {
  if (!date) return "Not set";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(date?: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date.substring(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getProgressPercentage(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

/* =========================================================
   BADGES
========================================================= */

function StatusBadge({ status }: { status?: string }) {
  if (status === "Done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 size={13} />
        Done
      </span>
    );
  }
  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700">
        <Clock3 size={13} />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
      <Circle size={12} />
      To Do
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: Priority }) {
  const value = priority || "Medium";
  if (value === "High") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-600">
        <Flag size={11} />
        High
      </span>
    );
  }
  if (value === "Medium") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
        <Flag size={11} />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
      <Flag size={11} />
      Low
    </span>
  );
}

function DaysRemainingBadge({ date }: { date?: string | null }) {
  const days = getDaysUntil(date);
  if (days === null) {
    return <span className="text-sm font-medium text-gray-400">No due date</span>;
  }
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3.5 py-2 text-sm font-bold text-red-700 animate-pulse">
        <AlertTriangle size={16} />
        {Math.abs(days)} days overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-orange-100 px-3.5 py-2 text-sm font-bold text-orange-700">
        <Timer size={16} />
        Due today
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-orange-100 px-3.5 py-2 text-sm font-bold text-orange-700">
        <Timer size={16} />
        {days} days left
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3.5 py-2 text-sm font-bold text-amber-700">
        <Timer size={16} />
        {days} days left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3.5 py-2 text-sm font-bold text-emerald-700">
      <Timer size={16} />
      {days} days left
    </span>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function SchedulePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
  }, []);

  const getHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = getStoredUser();
      if (!storedUser?.id) {
        setError("User session not found. Please login again.");
        return;
      }

      setUser(storedUser);

      const projectResponse = await fetch(`${API_BASE}/projects`, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!projectResponse.ok) {
        throw new Error(`Projects request failed: ${projectResponse.status}`);
      }

      const projectData = await projectResponse.json();
      const allProjects: Project[] = projectData.projects || projectData.data || [];

      let allowedProjects: Project[] = [];

      if (storedUser.role === "Executive Manager" || storedUser.role === "System Administrator") {
        allowedProjects = allProjects;
      } else if (storedUser.role === "Project Manager") {
        allowedProjects = allProjects.filter(
          (project) =>
            project.manager_id === storedUser.id ||
            project.manager_id === String(storedUser.id)
        );
      } else if (storedUser.role === "Member") {
        allowedProjects = allProjects;
      } else {
        allowedProjects = [];
      }

      const taskResults = await Promise.all(
        allowedProjects.map(async (project) => {
          try {
            const response = await fetch(`${API_BASE}/tasks/project/${project.id}`, {
              method: "GET",
              headers: getHeaders(),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data) ? data : data.tasks || data.data || [];
          } catch (taskError) {
            console.error("Task loading error:", taskError);
            return [];
          }
        })
      );

      const allTasks: Task[] = taskResults.flat();

      if (storedUser.role === "Member") {
        const memberTasks = allTasks.filter(
          (task) =>
            task.assignee_id === storedUser.id ||
            task.assignee_id === String(storedUser.id)
        );
        setTasks(memberTasks);
        const memberProjectIds = new Set(memberTasks.map((task) => task.project_id));
        allowedProjects = allowedProjects.filter((project) =>
          memberProjectIds.has(project.id)
        );
      } else {
        setTasks(allTasks);
      }

      setProjects(allowedProjects);
      setExpandedProjects(allowedProjects.map((project) => project.id));
    } catch (err: any) {
      console.error("Schedule data loading error:", err);
      setError(err?.message || "Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const getProjectTasks = (projectId: string) => {
    return tasks.filter((task) => task.project_id === projectId);
  };

  const isManagerView =
    user?.role === "Executive Manager" ||
    user?.role === "System Administrator" ||
    user?.role === "Project Manager";

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return projects;
    return projects.filter((project) => {
      const projectTasks = getProjectTasks(project.id);
      return (
        project.name.toLowerCase().includes(query) ||
        project.domain?.toLowerCase().includes(query) ||
        projectTasks.some((task) => task.name.toLowerCase().includes(query))
      );
    });
  }, [projects, tasks, search]);

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return tasks;
    return tasks.filter((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      return (
        task.name.toLowerCase().includes(query) ||
        project?.name.toLowerCase().includes(query)
      );
    });
  }, [tasks, projects, search]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    );
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "Done").length;
  const overdueTasks = tasks.filter((task) => {
    const days = getDaysUntil(task.due_date);
    return days !== null && days < 0 && task.status !== "Done";
  }).length;
  const upcomingDeadlines = projects.filter((project) => {
    const days = getDaysUntil(project.deadline);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-[#1a1a2e] animate-spin"></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">Loading your schedule...</p>
            <p className="mt-1 text-xs text-slate-400">Fetching projects and tasks</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* ================================================= 
            HEADER
        ================================================= */}

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl"></div>
          
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <GanttChart size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Schedule
                </h1>
                <p className="mt-1.5 text-sm text-blue-200/80">
                  {isManagerView
                    ? "Project and task timelines across your portfolio"
                    : "Your tasks and project timelines at a glance"}
                </p>
                {user && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <User size={13} className="text-blue-300" />
                    <span className="text-xs font-medium text-white">
                      {user.full_name || user.name || user.email}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold text-blue-200">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* ================================================= 
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-medium text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          </div>
        )}

        {/* ================================================= 
            STATS CARDS - Updated Design
        ================================================= */}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {/* Visible Projects */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Visible Projects</p>
                <div className="rounded-xl bg-white/60 p-2.5 text-blue-600 shadow-sm">
                  <FolderKanban size={18} />
                </div>
              </div>
              <p className="relative mt-3 text-4xl font-bold text-blue-900">{projects.length}</p>
              <p className="relative text-sm font-medium text-blue-600/80">All projects</p>
            </div>
          </div>

          {/* Visible Tasks */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Visible Tasks</p>
                <div className="rounded-xl bg-white/60 p-2.5 text-purple-600 shadow-sm">
                  <ClipboardList size={18} />
                </div>
              </div>
              <p className="relative mt-3 text-4xl font-bold text-purple-900">{totalTasks}</p>
              <p className="relative text-sm font-medium text-purple-600/80">Tasks available in your view</p>
            </div>
          </div>

          {/* Completed */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</p>
                <div className="rounded-xl bg-white/60 p-2.5 text-emerald-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="relative mt-3 text-4xl font-bold text-emerald-900">{completedTasks}</p>
              <p className="relative text-sm font-medium text-emerald-600/80">
                {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% of visible tasks` : "No tasks"}
              </p>
            </div>
          </div>

          {/* Overdue */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-red-500/10 blur-2xl group-hover:bg-red-500/20 transition"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">Overdue</p>
                <div className="rounded-xl bg-white/60 p-2.5 text-red-600 shadow-sm">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <p className="relative mt-3 text-4xl font-bold text-red-900">{overdueTasks}</p>
              <p className="relative text-sm font-medium text-red-600/80">Tasks past due date</p>
            </div>
          </div>
        </div>

        {/* ================================================= 
            SEARCH
        ================================================= */}

        <div className="relative mt-6 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isManagerView ? "Search projects or tasks..." : "Search your tasks..."}
            className="h-12 w-full rounded-xl border-0 bg-white px-10 text-sm text-slate-800 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1a1a2e] transition"
          />
        </div>

        {/* ================================================= 
            MANAGER VIEW
        ================================================= */}

        {isManagerView ? (
          <section className="mt-6">
            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <FolderKanban size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No projects found</p>
                <p className="mt-1 text-xs text-slate-400">No projects are available for your role.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project, index) => {
                  const projectTasks = getProjectTasks(project.id);
                  const expanded = expandedProjects.includes(project.id);
                  const completedProjectTasks = projectTasks.filter(t => t.status === "Done").length;
                  const progress = projectTasks.length > 0 ? Math.round((completedProjectTasks / projectTasks.length) * 100) : 0;
                  const daysUntilDeadline = getDaysUntil(project.deadline);
                  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;

                  const headerColor = "bg-gradient-to-r from-[#1a1a2e] to-[#16213e]";

                  return (
                    <div
                      key={project.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                    >
                      {/* Project Header */}
                      <div className={`${headerColor} px-5 py-4 text-white`}>
                        <div className="flex flex-wrap items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleProject(project.id)}
                            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                          >
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-white">{project.name}</h3>
                              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                                project.status === "Done" ? "bg-emerald-500/30 text-emerald-100" :
                                project.status === "In Progress" ? "bg-blue-500/30 text-blue-100" :
                                "bg-white/20 text-white"
                              }`}>
                                {project.status || "Active"}
                              </span>
                              <PriorityBadge priority={project.priority} />
                            </div>
                            <p className="mt-0.5 text-xs text-white/70">
                              {project.domain || "No domain"}
                              {project.manager_name && ` · Managed by ${project.manager_name}`}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <p className="text-[8px] font-bold uppercase text-white/60">Progress</p>
                              <p className="text-base font-bold text-white">{progress}%</p>
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white">
                              {projectTasks.length}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                progress === 100 ? "bg-emerald-400" :
                                progress >= 60 ? "bg-blue-400" :
                                progress >= 30 ? "bg-amber-400" :
                                "bg-red-400"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[8px] font-bold uppercase text-white/50">Start</p>
                            <p className="text-sm font-semibold text-white">{formatDate(project.start_date)}</p>
                          </div>
                          <div className={`rounded-lg px-3 py-2 backdrop-blur-sm ${isOverdue ? "bg-red-500/20" : "bg-white/10"}`}>
                            <p className={`text-[8px] font-bold uppercase ${isOverdue ? "text-red-300" : "text-white/50"}`}>
                              Deadline
                            </p>
                            <p className={`text-sm font-semibold ${isOverdue ? "text-red-200" : "text-white"}`}>
                              {formatDate(project.deadline)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[8px] font-bold uppercase text-white/50">Tasks</p>
                            <p className="text-sm font-semibold text-white">
                              {completedProjectTasks}/{projectTasks.length} done
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[8px] font-bold uppercase text-white/50">Time Left</p>
                            <DaysRemainingBadge date={project.deadline} />
                          </div>
                        </div>
                      </div>

                      {/* Tasks Section */}
                      {expanded && (
                        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
                          {projectTasks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                              <ClipboardList size={22} className="mx-auto text-slate-300" />
                              <p className="mt-2 text-xs font-medium text-slate-500">No tasks yet</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {projectTasks.map((task) => {
                                return (
                                  <div
                                    key={task.id}
                                    className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
                                  >
                                    {/* Task Row: Name | Start Date | Deadline | Days Left | Assignee */}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">
                                      {/* Task Name with Status & Priority */}
                                      <div className="sm:col-span-1">
                                        <div className="flex items-start gap-3">
                                          <div className="mt-1">
                                            {task.status === "Done" ? (
                                              <CheckCircle2 size={20} className="text-emerald-500" />
                                            ) : task.status === "In Progress" ? (
                                              <Clock3 size={20} className="text-blue-500" />
                                            ) : (
                                              <Circle size={20} className="text-slate-300" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-base font-bold text-slate-800">{task.name}</p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                              <StatusBadge status={task.status} />
                                              <PriorityBadge priority={task.priority} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Start Date */}
                                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                        <Calendar size={16} className="text-slate-400" />
                                        <div>
                                          <p className="text-[10px] font-bold uppercase text-slate-400">Start</p>
                                          <p className="text-sm font-semibold text-slate-700">{formatDate(task.start_date)}</p>
                                        </div>
                                      </div>

                                      {/* Deadline */}
                                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                        <Calendar size={16} className="text-slate-400" />
                                        <div>
                                          <p className="text-[10px] font-bold uppercase text-slate-400">Deadline</p>
                                          <p className="text-sm font-semibold text-slate-700">{formatDate(task.due_date)}</p>
                                        </div>
                                      </div>

                                      {/* Days Remaining - Color coded */}
                                      <div className="flex items-center">
                                        <DaysRemainingBadge date={task.due_date} />
                                      </div>

                                      {/* Assignee */}
                                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                        <User size={16} className="text-slate-400" />
                                        <div>
                                          <p className="text-[10px] font-bold uppercase text-slate-400">Assignee</p>
                                          <p className="text-sm font-semibold text-slate-700">
                                            {task.assignee_name || "Unassigned"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ================================================= 
              MEMBER VIEW
          ================================================= */

          <section className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">My Tasks</h2>
                <p className="mt-0.5 text-sm text-slate-500">Tasks assigned to you with project context</p>
              </div>

              <div className="p-4">
                {filteredTasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-5 py-16 text-center">
                    <ClipboardList size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700">No tasks assigned</p>
                    <p className="mt-1 text-xs text-slate-400">You don't have any tasks yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => {
                      const project = projects.find((p) => p.id === task.project_id);
                      const isOverdue = getDaysUntil(task.due_date) !== null && getDaysUntil(task.due_date)! < 0 && task.status !== "Done";

                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl border p-5 transition hover:shadow-sm ${
                            isOverdue && task.status !== "Done"
                              ? "border-red-200 bg-red-50/30"
                              : task.status === "Done"
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          {/* Task Row: Name | Start Date | Deadline | Days Left | Assignee */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">
                            {/* Task Name with Status & Priority */}
                            <div className="sm:col-span-1">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {task.status === "Done" ? (
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                  ) : task.status === "In Progress" ? (
                                    <Clock3 size={20} className="text-blue-500" />
                                  ) : (
                                    <Circle size={20} className="text-slate-300" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-base font-bold text-slate-900">{task.name}</p>
                                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                    <FolderKanban size={14} />
                                    {project?.name || "Unknown project"}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <StatusBadge status={task.status} />
                                    <PriorityBadge priority={task.priority} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Start Date */}
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                              <Calendar size={16} className="text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Start</p>
                                <p className="text-sm font-semibold text-slate-700">{formatDate(task.start_date)}</p>
                              </div>
                            </div>

                            {/* Deadline */}
                            <div className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 ${isOverdue && task.status !== "Done" ? "bg-red-50" : "bg-slate-50"}`}>
                              <Calendar size={16} className={isOverdue && task.status !== "Done" ? "text-red-400" : "text-slate-400"} />
                              <div>
                                <p className={`text-[10px] font-bold uppercase ${isOverdue && task.status !== "Done" ? "text-red-400" : "text-slate-400"}`}>
                                  Deadline
                                </p>
                                <p className={`text-sm font-semibold ${isOverdue && task.status !== "Done" ? "text-red-600" : "text-slate-700"}`}>
                                  {formatDate(task.due_date)}
                                </p>
                              </div>
                            </div>

                            {/* Days Remaining - Color coded */}
                            <div className="flex items-center">
                              <DaysRemainingBadge date={task.due_date} />
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                              <User size={16} className="text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Assignee</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {task.assignee_name || "Unassigned"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
