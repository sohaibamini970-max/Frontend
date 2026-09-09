"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  User,
  CheckCircle2,
  Clock3,
  Circle,
  FolderKanban,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  GanttChart,
  Timer,
  Flag,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_BASE =
  "https://backend-five-swart-88.vercel.app/api";

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

    if (!parsed.id && !parsed.user_id && !parsed.userId) {
      return null;
    }

    return {
      id: String(parsed.id || parsed.user_id || parsed.userId),
      full_name:
        parsed.full_name ||
        parsed.fullName ||
        parsed.name,
      name:
        parsed.name ||
        parsed.full_name ||
        parsed.fullName,
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
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function extractArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.projects)) {
    return data.projects;
  }

  if (Array.isArray(data?.tasks)) {
    return data.tasks;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

/* =========================================================
   DATE HELPERS
========================================================= */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date?: string | null) {
  if (!date) return "Not set";

  const time = Date.parse(date);

  if (Number.isNaN(time)) return "Not set";

  return dateFormatter.format(time);
}

function getDaysUntil(date?: string | null) {
  if (!date) return null;

  const datePart = date.substring(0, 10);

  const target = Date.parse(`${datePart}T00:00:00`);

  if (Number.isNaN(target)) return null;

  const now = new Date();

  const today = Date.parse(
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}T00:00:00`
  );

  return Math.ceil(
    (target - today) / 86400000
  );
}

/* =========================================================
   BADGES
========================================================= */

function StatusBadge({
  status,
}: {
  status?: string;
}) {
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

function PriorityBadge({
  priority,
}: {
  priority?: Priority;
}) {
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

function DaysRemainingBadge({
  date,
}: {
  date?: string | null;
}) {
  const days = getDaysUntil(date);

  if (days === null) {
    return (
      <span className="text-sm font-medium text-gray-400">
        No due date
      </span>
    );
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
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [expandedProjects, setExpandedProjects] =
    useState<Set<string>>(new Set());

  /* =======================================================
     INITIAL USER
  ======================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setUser(storedUser);
    } else {
      setLoading(false);
      setError(
        "User session not found. Please login again."
      );
    }
  }, []);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      const storedUser = getStoredUser();

      if (!storedUser?.id) {
        setLoading(false);
        setError(
          "User session not found. Please login again."
        );
        return;
      }

      setUser(storedUser);
      setLoading(true);
      setError("");

      try {
        /*
         * IMPORTANT:
         * Projects and tasks are requested at the SAME TIME.
         */

        const projectsPromise = fetch(
          `${API_BASE}/projects`,
          {
            method: "GET",
            headers: getHeaders(),
            signal,
            cache: "no-store",
          }
        );

        const tasksEndpoint =
          storedUser.role === "Member"
            ? `${API_BASE}/tasks/my/tasks`
            : `${API_BASE}/tasks`;

        const tasksPromise = fetch(
          tasksEndpoint,
          {
            method: "GET",
            headers: getHeaders(),
            signal,
            cache: "no-store",
          }
        );

        const [
          projectResponse,
          taskResponse,
        ] = await Promise.all([
          projectsPromise,
          tasksPromise,
        ]);

        if (!projectResponse.ok) {
          throw new Error(
            `Projects request failed: ${projectResponse.status}`
          );
        }

        /*
         * If /tasks is not implemented correctly,
         * we throw here rather than silently showing
         * an incomplete Schedule.
         */

        if (!taskResponse.ok) {
          throw new Error(
            `Tasks request failed: ${taskResponse.status}`
          );
        }

        const [
          projectData,
          taskData,
        ] = await Promise.all([
          projectResponse.json(),
          taskResponse.json(),
        ]);

        if (signal?.aborted) return;

        const allProjects =
          extractArray<Project>(projectData);

        const allTasks =
          extractArray<Task>(taskData);

        /* =================================================
           ROLE FILTERING
        ================================================= */

        let visibleProjects: Project[] = [];
        let visibleTasks: Task[] = [];

        if (
          storedUser.role ===
            "Executive Manager" ||
          storedUser.role ===
            "System Administrator"
        ) {
          visibleProjects = allProjects;
          visibleTasks = allTasks;
        } else if (
          storedUser.role ===
          "Project Manager"
        ) {
          visibleProjects =
            allProjects.filter(
              (project) =>
                String(project.manager_id) ===
                String(storedUser.id)
            );

          const visibleProjectIds =
            new Set(
              visibleProjects.map(
                (project) => String(project.id)
              )
            );

          visibleTasks =
            allTasks.filter((task) =>
              visibleProjectIds.has(
                String(task.project_id)
              )
            );
        } else if (
          storedUser.role === "Member"
        ) {
          visibleTasks =
            allTasks.filter(
              (task) =>
                String(task.assignee_id) ===
                String(storedUser.id)
            );

          const memberProjectIds =
            new Set(
              visibleTasks.map((task) =>
                String(task.project_id)
              )
            );

          visibleProjects =
            allProjects.filter((project) =>
              memberProjectIds.has(
                String(project.id)
              )
            );
        }

        setProjects(visibleProjects);
        setTasks(visibleTasks);

        /*
         * Don't unnecessarily create a huge Set when
         * there are no projects.
         *
         * All projects are initially expanded to preserve
         * your current behavior.
         */
        setExpandedProjects(
          new Set(
            visibleProjects.map(
              (project) => String(project.id)
            )
          )
        );
      } catch (err: any) {
        if (
          err?.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Schedule loading error:",
          err
        );

        setError(
          err?.message ||
            "Failed to load schedule data."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  /* =======================================================
     LOAD ON USER
  ======================================================= */

  useEffect(() => {
    if (!user?.id) return;

    const controller =
      new AbortController();

    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [user?.id, loadData]);

  /* =======================================================
     O(1) PROJECT LOOKUP
  ======================================================= */

  const projectMap = useMemo(() => {
    const map = new Map<
      string,
      Project
    >();

    for (const project of projects) {
      map.set(String(project.id), project);
    }

    return map;
  }, [projects]);

  /* =======================================================
     O(1) TASK LOOKUP BY PROJECT
  ======================================================= */

  const taskMap = useMemo(() => {
    const map = new Map<
      string,
      Task[]
    >();

    for (const task of tasks) {
      const projectId =
        String(task.project_id);

      const existing =
        map.get(projectId);

      if (existing) {
        existing.push(task);
      } else {
        map.set(projectId, [task]);
      }
    }

    return map;
  }, [tasks]);

  /* =======================================================
     MANAGER VIEW
  ======================================================= */

  const isManagerView =
    user?.role ===
      "Executive Manager" ||
    user?.role ===
      "System Administrator" ||
    user?.role ===
      "Project Manager";

  /* =======================================================
     SEARCH
  ======================================================= */

  const query =
    search.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    if (!query) {
      return projects;
    }

    const result: Project[] = [];

    for (const project of projects) {
      if (
        project.name
          .toLowerCase()
          .includes(query) ||
        project.domain
          ?.toLowerCase()
          .includes(query)
      ) {
        result.push(project);
        continue;
      }

      const projectTasks =
        taskMap.get(
          String(project.id)
        ) || [];

      const hasMatchingTask =
        projectTasks.some((task) =>
          task.name
            .toLowerCase()
            .includes(query)
        );

      if (hasMatchingTask) {
        result.push(project);
      }
    }

    return result;
  }, [
    projects,
    taskMap,
    query,
  ]);

  const filteredTasks = useMemo(() => {
    if (!query) {
      return tasks;
    }

    return tasks.filter((task) => {
      const project =
        projectMap.get(
          String(task.project_id)
        );

      return (
        task.name
          .toLowerCase()
          .includes(query) ||
        project?.name
          .toLowerCase()
          .includes(query)
      );
    });
  }, [
    tasks,
    projectMap,
    query,
  ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    let completed = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.status === "Done") {
        completed++;
      }

      const days =
        getDaysUntil(task.due_date);

      if (
        days !== null &&
        days < 0 &&
        task.status !== "Done"
      ) {
        overdue++;
      }
    }

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      overdueTasks: overdue,
      completionPercentage:
        tasks.length > 0
          ? Math.round(
              (completed /
                tasks.length) *
                100
            )
          : 0,
    };
  }, [tasks]);

  /* =======================================================
     TOGGLE
  ======================================================= */

  const toggleProject = useCallback(
    (projectId: string) => {
      setExpandedProjects(
        (previous) => {
          const next = new Set(
            previous
          );

          if (next.has(projectId)) {
            next.delete(projectId);
          } else {
            next.add(projectId);
          }

          return next;
        }
      );
    },
    []
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />

              <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[#1a1a2e]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Loading your schedule...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Fetching projects and tasks
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] px-6 py-8 sm:px-8 sm:py-10">

          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <GanttChart
                  size={28}
                  className="text-white"
                />
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

                    <User
                      size={13}
                      className="text-blue-300"
                    />

                    <span className="text-xs font-medium text-white">
                      {user.full_name ||
                        user.name ||
                        user.email}
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
              <RefreshCw size={14} />
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
            STATS
        ================================================= */}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Visible Projects
                </p>

                <div className="rounded-xl bg-white/60 p-2.5 text-blue-600 shadow-sm">
                  <FolderKanban size={18} />
                </div>
              </div>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {projects.length}
              </p>

              <p className="text-sm font-medium text-blue-600/80">
                All projects
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Visible Tasks
                </p>

                <div className="rounded-xl bg-white/60 p-2.5 text-purple-600 shadow-sm">
                  <ClipboardList size={18} />
                </div>
              </div>

              <p className="mt-3 text-4xl font-bold text-purple-900">
                {stats.totalTasks}
              </p>

              <p className="text-sm font-medium text-purple-600/80">
                Tasks available in your view
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Completed
                </p>

                <div className="rounded-xl bg-white/60 p-2.5 text-emerald-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <p className="mt-3 text-4xl font-bold text-emerald-900">
                {stats.completedTasks}
              </p>

              <p className="text-sm font-medium text-emerald-600/80">
                {stats.totalTasks > 0
                  ? `${stats.completionPercentage}% of visible tasks`
                  : "No tasks"}
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Overdue
                </p>

                <div className="rounded-xl bg-white/60 p-2.5 text-red-600 shadow-sm">
                  <AlertTriangle size={18} />
                </div>
              </div>

              <p className="mt-3 text-4xl font-bold text-red-900">
                {stats.overdueTasks}
              </p>

              <p className="text-sm font-medium text-red-600/80">
                Tasks past due date
              </p>
            </div>
          </div>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="relative mt-6 max-w-sm">

          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder={
              isManagerView
                ? "Search projects or tasks..."
                : "Search your tasks..."
            }
            className="h-12 w-full rounded-xl border-0 bg-white px-10 text-sm text-slate-800 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 transition focus:ring-2 focus:ring-[#1a1a2e]"
          />

        </div>

        {/* =================================================
            MANAGER VIEW
        ================================================= */}

        {isManagerView ? (
          <section className="mt-6">

            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <FolderKanban
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-bold text-slate-700">
                  No projects found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No projects are available for your role.
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {filteredProjects.map(
                  (project) => {
                    const projectTasks =
                      taskMap.get(
                        String(project.id)
                      ) || [];

                    const expanded =
                      expandedProjects.has(
                        String(project.id)
                      );

                    const completedProjectTasks =
                      projectTasks.reduce(
                        (count, task) =>
                          count +
                          (task.status === "Done"
                            ? 1
                            : 0),
                        0
                      );

                    const progress =
                      projectTasks.length > 0
                        ? Math.round(
                            (completedProjectTasks /
                              projectTasks.length) *
                              100
                          )
                        : 0;

                    const daysUntilDeadline =
                      getDaysUntil(
                        project.deadline
                      );

                    const isOverdue =
                      daysUntilDeadline !== null &&
                      daysUntilDeadline < 0;

                    return (
                      <div
                        key={project.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                      >

                        {/* PROJECT HEADER */}

                        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] px-5 py-4 text-white">

                          <div className="flex flex-wrap items-start gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                toggleProject(
                                  String(
                                    project.id
                                  )
                                )
                              }
                              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                            >
                              {expanded ? (
                                <ChevronDown
                                  size={16}
                                />
                              ) : (
                                <ChevronRight
                                  size={16}
                                />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="text-lg font-bold text-white">
                                  {project.name}
                                </h3>

                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                                    project.status ===
                                    "Done"
                                      ? "bg-emerald-500/30 text-emerald-100"
                                      : project.status ===
                                        "In Progress"
                                      ? "bg-blue-500/30 text-blue-100"
                                      : "bg-white/20 text-white"
                                  }`}
                                >
                                  {project.status ||
                                    "Active"}
                                </span>

                                <PriorityBadge
                                  priority={
                                    project.priority
                                  }
                                />

                              </div>

                              <p className="mt-0.5 text-xs text-white/70">
                                {project.domain ||
                                  "No domain"}

                                {project.manager_name &&
                                  ` · Managed by ${project.manager_name}`}
                              </p>

                            </div>

                            <div className="flex shrink-0 items-center gap-3">

                              <div className="text-right">
                                <p className="text-[8px] font-bold uppercase text-white/60">
                                  Progress
                                </p>

                                <p className="text-base font-bold text-white">
                                  {progress}%
                                </p>
                              </div>

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white">
                                {projectTasks.length}
                              </div>

                            </div>

                          </div>

                          {/* PROGRESS */}

                          <div className="mt-3">
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">

                              <div
                                className={`h-full rounded-full ${
                                  progress === 100
                                    ? "bg-emerald-400"
                                    : progress >= 60
                                    ? "bg-blue-400"
                                    : progress >= 30
                                    ? "bg-amber-400"
                                    : "bg-red-400"
                                }`}
                                style={{
                                  width: `${progress}%`,
                                }}
                              />

                            </div>
                          </div>

                          {/* TIMELINE */}

                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                            <div className="rounded-lg bg-white/10 px-3 py-2">
                              <p className="text-[8px] font-bold uppercase text-white/50">
                                Start
                              </p>

                              <p className="text-sm font-semibold text-white">
                                {formatDate(
                                  project.start_date
                                )}
                              </p>
                            </div>

                            <div
                              className={`rounded-lg px-3 py-2 ${
                                isOverdue
                                  ? "bg-red-500/20"
                                  : "bg-white/10"
                              }`}
                            >
                              <p
                                className={`text-[8px] font-bold uppercase ${
                                  isOverdue
                                    ? "text-red-300"
                                    : "text-white/50"
                                }`}
                              >
                                Deadline
                              </p>

                              <p
                                className={`text-sm font-semibold ${
                                  isOverdue
                                    ? "text-red-200"
                                    : "text-white"
                                }`}
                              >
                                {formatDate(
                                  project.deadline
                                )}
                              </p>
                            </div>

                            <div className="rounded-lg bg-white/10 px-3 py-2">
                              <p className="text-[8px] font-bold uppercase text-white/50">
                                Tasks
                              </p>

                              <p className="text-sm font-semibold text-white">
                                {
                                  completedProjectTasks
                                }
                                /
                                {
                                  projectTasks.length
                                }{" "}
                                done
                              </p>
                            </div>

                            <div className="rounded-lg bg-white/10 px-3 py-2">
                              <p className="text-[8px] font-bold uppercase text-white/50">
                                Time Left
                              </p>

                              <DaysRemainingBadge
                                date={
                                  project.deadline
                                }
                              />
                            </div>

                          </div>
                        </div>

                        {/* TASKS */}

                        {expanded && (
                          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">

                            {projectTasks.length ===
                            0 ? (
                              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                                <ClipboardList
                                  size={22}
                                  className="mx-auto text-slate-300"
                                />

                                <p className="mt-2 text-xs font-medium text-slate-500">
                                  No tasks yet
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">

                                {projectTasks.map(
                                  (task) => (
                                    <div
                                      key={task.id}
                                      className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
                                    >

                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">

                                        <div>
                                          <div className="flex items-start gap-3">

                                            <div className="mt-1">
                                              {task.status ===
                                              "Done" ? (
                                                <CheckCircle2
                                                  size={
                                                    20
                                                  }
                                                  className="text-emerald-500"
                                                />
                                              ) : task.status ===
                                                "In Progress" ? (
                                                <Clock3
                                                  size={
                                                    20
                                                  }
                                                  className="text-blue-500"
                                                />
                                              ) : (
                                                <Circle
                                                  size={
                                                    20
                                                  }
                                                  className="text-slate-300"
                                                />
                                              )}
                                            </div>

                                            <div>
                                              <p className="text-base font-bold text-slate-800">
                                                {
                                                  task.name
                                                }
                                              </p>

                                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <StatusBadge
                                                  status={
                                                    task.status
                                                  }
                                                />

                                                <PriorityBadge
                                                  priority={
                                                    task.priority
                                                  }
                                                />
                                              </div>
                                            </div>

                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                          <Calendar
                                            size={16}
                                            className="text-slate-400"
                                          />

                                          <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                              Start
                                            </p>

                                            <p className="text-sm font-semibold text-slate-700">
                                              {formatDate(
                                                task.start_date
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                          <Calendar
                                            size={16}
                                            className="text-slate-400"
                                          />

                                          <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                              Deadline
                                            </p>

                                            <p className="text-sm font-semibold text-slate-700">
                                              {formatDate(
                                                task.due_date
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center">
                                          <DaysRemainingBadge
                                            date={
                                              task.due_date
                                            }
                                          />
                                        </div>

                                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                          <User
                                            size={16}
                                            className="text-slate-400"
                                          />

                                          <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                              Assignee
                                            </p>

                                            <p className="text-sm font-semibold text-slate-700">
                                              {task.assignee_name ||
                                                "Unassigned"}
                                            </p>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  )
                                )}

                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

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
                <h2 className="text-base font-bold text-slate-900">
                  My Tasks
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Tasks assigned to you with project context
                </p>
              </div>

              <div className="p-4">

                {filteredTasks.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-5 py-16 text-center">
                    <ClipboardList
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No tasks assigned
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      You don't have any tasks yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">

                    {filteredTasks.map(
                      (task) => {
                        const project =
                          projectMap.get(
                            String(
                              task.project_id
                            )
                          );

                        const days =
                          getDaysUntil(
                            task.due_date
                          );

                        const isOverdue =
                          days !== null &&
                          days < 0 &&
                          task.status !==
                            "Done";

                        return (
                          <div
                            key={task.id}
                            className={`rounded-xl border p-5 transition hover:shadow-sm ${
                              isOverdue
                                ? "border-red-200 bg-red-50/30"
                                : task.status ===
                                  "Done"
                                ? "border-emerald-200 bg-emerald-50/30"
                                : "border-slate-200 bg-white"
                            }`}
                          >

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:gap-4">

                              <div>
                                <div className="flex items-start gap-3">

                                  <div className="mt-1">
                                    {task.status ===
                                    "Done" ? (
                                      <CheckCircle2
                                        size={20}
                                        className="text-emerald-500"
                                      />
                                    ) : task.status ===
                                      "In Progress" ? (
                                      <Clock3
                                        size={20}
                                        className="text-blue-500"
                                      />
                                    ) : (
                                      <Circle
                                        size={20}
                                        className="text-slate-300"
                                      />
                                    )}
                                  </div>

                                  <div>

                                    <p className="text-base font-bold text-slate-900">
                                      {task.name}
                                    </p>

                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                      <FolderKanban
                                        size={14}
                                      />
                                      {project?.name ||
                                        "Unknown project"}
                                    </p>

                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                      <StatusBadge
                                        status={
                                          task.status
                                        }
                                      />

                                      <PriorityBadge
                                        priority={
                                          task.priority
                                        }
                                      />
                                    </div>

                                  </div>

                                </div>
                              </div>

                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                <Calendar
                                  size={16}
                                  className="text-slate-400"
                                />

                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">
                                    Start
                                  </p>

                                  <p className="text-sm font-semibold text-slate-700">
                                    {formatDate(
                                      task.start_date
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div
                                className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 ${
                                  isOverdue
                                    ? "bg-red-50"
                                    : "bg-slate-50"
                                }`}
                              >
                                <Calendar
                                  size={16}
                                  className={
                                    isOverdue
                                      ? "text-red-400"
                                      : "text-slate-400"
                                  }
                                />

                                <div>
                                  <p
                                    className={`text-[10px] font-bold uppercase ${
                                      isOverdue
                                        ? "text-red-400"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    Deadline
                                  </p>

                                  <p
                                    className={`text-sm font-semibold ${
                                      isOverdue
                                        ? "text-red-600"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {formatDate(
                                      task.due_date
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center">
                                <DaysRemainingBadge
                                  date={
                                    task.due_date
                                  }
                                />
                              </div>

                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5">
                                <User
                                  size={16}
                                  className="text-slate-400"
                                />

                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">
                                    Assignee
                                  </p>

                                  <p className="text-sm font-semibold text-slate-700">
                                    {task.assignee_name ||
                                      "Unassigned"}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      }
                    )}

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
