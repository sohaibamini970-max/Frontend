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

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

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

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/* =========================================================
   BADGES
========================================================= */

function StatusBadge({ status }: { status?: string }) {
  if (status === "Done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
        <CheckCircle2 size={11} />
        Done
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
        <Clock3 size={11} />
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-600">
      <Circle size={10} />
      To Do
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: Priority }) {
  const value = priority || "Medium";

  if (value === "High") {
    return (
      <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-bold text-red-600">
        High
      </span>
    );
  }

  if (value === "Medium") {
    return (
      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
        Medium
      </span>
    );
  }

  return (
    <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-500">
      Low
    </span>
  );
}

/* Days-left / overdue pill. Reused for both project deadlines and task due dates. */
function DueBadge({ date }: { date?: string | null }) {
  const days = getDaysUntil(date);

  if (days === null) {
    return (
      <span className="text-[8px] font-semibold text-gray-400">
        No due date
      </span>
    );
  }

  if (days < 0) {
    return (
      <span className="flex items-center gap-1 text-[8px] font-semibold text-red-600">
        <AlertTriangle size={10} />
        {Math.abs(days)} days overdue
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="text-[8px] font-semibold text-amber-600">
        Due today
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span className="text-[8px] font-semibold text-amber-600">
        {days} days left
      </span>
    );
  }

  return (
    <span className="text-[8px] font-semibold text-gray-400">
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

  /* =========================================================
     LOAD USER
  ========================================================= */

  useEffect(() => {
    const storedUser = getStoredUser();

    setUser(storedUser);
  }, []);

  /* =========================================================
     API HEADERS
  ========================================================= */

  const getHeaders = () => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  /* =========================================================
     LOAD PROJECTS + TASKS (role based)
  ========================================================= */

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

      /* -----------------------------------------------------
         PROJECTS
      ----------------------------------------------------- */

      const projectResponse = await fetch(`${API_BASE}/projects`, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!projectResponse.ok) {
        throw new Error(
          `Projects request failed: ${projectResponse.status}`
        );
      }

      const projectData = await projectResponse.json();

      const allProjects: Project[] =
        projectData.projects || projectData.data || [];

      /* -----------------------------------------------------
         ROLE BASED PROJECT FILTERING

         Executive Manager -> all projects
         Project Manager   -> only projects assigned to them
         Member            -> projects narrowed down below,
                               once we know which tasks are theirs
      ----------------------------------------------------- */

      let allowedProjects: Project[] = [];

      if (storedUser.role === "Executive Manager") {
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

      /* -----------------------------------------------------
         FETCH TASKS FOR ALLOWED PROJECTS
      ----------------------------------------------------- */

      const taskResults = await Promise.all(
        allowedProjects.map(async (project) => {
          try {
            const response = await fetch(
              `${API_BASE}/tasks/project/${project.id}`,
              {
                method: "GET",
                headers: getHeaders(),
              }
            );

            if (!response.ok) {
              console.error(
                `Failed to load tasks for project ${project.id}`
              );

              return [];
            }

            const data = await response.json();

            // getProjectTasks returns a bare array (res.json(result.rows)),
            // not { tasks: [...] } or { data: [...] } — handle both shapes.
            if (Array.isArray(data)) {
              return data;
            }

            return data.tasks || data.data || [];
          } catch (taskError) {
            console.error("Task loading error:", taskError);

            return [];
          }
        })
      );

      const allTasks: Task[] = taskResults.flat();

      /* -----------------------------------------------------
         MEMBER FILTER

         Members only see their own tasks, and only the
         projects those tasks belong to.
      ----------------------------------------------------- */

      if (storedUser.role === "Member") {
        const memberTasks = allTasks.filter(
          (task) =>
            task.assignee_id === storedUser.id ||
            task.assignee_id === String(storedUser.id)
        );

        setTasks(memberTasks);

        const memberProjectIds = new Set(
          memberTasks.map((task) => task.project_id)
        );

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

  /* =========================================================
     PROJECT TASKS
  ========================================================= */

  const getProjectTasks = (projectId: string) => {
    return tasks.filter((task) => task.project_id === projectId);
  };

  const isManagerView =
    user?.role === "Executive Manager" || user?.role === "Project Manager";

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const projectTasks = getProjectTasks(project.id);

      return (
        project.name.toLowerCase().includes(query) ||
        project.domain?.toLowerCase().includes(query) ||
        projectTasks.some((task) =>
          task.name.toLowerCase().includes(query)
        )
      );
    });
  }, [projects, tasks, search]);

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return tasks;
    }

    return tasks.filter((task) => {
      const project = projects.find((p) => p.id === task.project_id);

      return (
        task.name.toLowerCase().includes(query) ||
        project?.name.toLowerCase().includes(query)
      );
    });
  }, [tasks, projects, search]);

  /* =========================================================
     TOGGLE PROJECT
  ========================================================= */

  const toggleProject = (projectId: string) => {
    setExpandedProjects((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    );
  };

  /* =========================================================
     STATS
  ========================================================= */

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  const overdueTasks = tasks.filter((task) => {
    const days = getDaysUntil(task.due_date);
    return days !== null && days < 0 && task.status !== "Done";
  }).length;

  const upcomingDeadlines = projects.filter((project) => {
    const days = getDaysUntil(project.deadline);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-[#f5f6f8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center py-32">
          <div className="text-center">
            <Loader2
              size={30}
              className="mx-auto animate-spin text-[#07111f]"
            />

            <p className="mt-3 text-sm font-semibold text-gray-700">
              Loading schedule...
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Loading projects and tasks based on your role.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* ================================================= 
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                <CalendarClock size={19} />
              </div>

              <h1 className="text-[30px] font-semibold tracking-tight text-[#07111f]">
                Schedule
              </h1>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              {isManagerView
                ? "Project and task timelines for everything assigned to you."
                : "Your tasks and the timelines of the projects they belong to."}
            </p>

            {user && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <User size={13} className="text-gray-400" />

                <span className="text-[10px] font-semibold text-gray-600">
                  {user.full_name || user.name || user.email}
                </span>

                <span className="rounded-md bg-gray-100 px-2 py-1 text-[8px] font-bold text-gray-600">
                  {user.role}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* ================================================= 
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= 
            SUMMARY
        ================================================= */}

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isManagerView && (
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Projects
                </p>

                <FolderKanban size={16} className="text-gray-400" />
              </div>

              <p className="mt-2 text-2xl font-bold text-[#07111f]">
                {projects.length}
              </p>

              <p className="mt-1 text-[9px] text-gray-400">
                Projects visible to you
              </p>
            </div>
          )}

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tasks
              </p>

              <ClipboardList size={16} className="text-gray-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-[#07111f]">
              {totalTasks}
            </p>

            <p className="mt-1 text-[9px] text-gray-400">
              {isManagerView ? "Tasks across your projects" : "Tasks assigned to you"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Overdue
              </p>

              <AlertTriangle size={16} className="text-red-500" />
            </div>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {overdueTasks}
            </p>

            <p className="mt-1 text-[9px] text-gray-400">
              Tasks past their due date
            </p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {isManagerView ? "Deadlines this week" : "Completed"}
              </p>

              {isManagerView ? (
                <Calendar size={16} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-500" />
              )}
            </div>

            <p
              className={`mt-2 text-2xl font-bold ${isManagerView ? "text-amber-700" : "text-emerald-700"
                }`}
            >
              {isManagerView ? upcomingDeadlines : completedTasks}
            </p>

            <p className="mt-1 text-[9px] text-gray-400">
              {isManagerView
                ? "Project deadlines within 7 days"
                : "Tasks you have completed"}
            </p>
          </div>
        </div>

        {/* ================================================= 
            SEARCH
        ================================================= */}

        <div className="relative mt-6 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isManagerView ? "Search projects or tasks..." : "Search your tasks..."
            }
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
          />
        </div>

        {/* ================================================= 
            EXECUTIVE MANAGER / PROJECT MANAGER VIEW
            Projects, each with its schedule (created / start /
            deadline) and its tasks nested underneath with
            their own start / due dates.
        ================================================= */}

        {isManagerView ? (
          <section className="mt-5 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-300 bg-[#07111f] px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                <FolderKanban size={17} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">
                  Project & Task Schedule
                </h2>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Creation date, start date and deadline for every
                  project, with each task's own timeline underneath.
                </p>
              </div>
            </div>

            <div className="p-4">
              {filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-5 py-16 text-center">
                  <FolderKanban
                    size={30}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 text-sm font-bold text-gray-700">
                    No projects found
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    No projects are available for your role.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((project) => {
                    const projectTasks = getProjectTasks(project.id);

                    const expanded = expandedProjects.includes(
                      project.id
                    );

                    return (
                      <div
                        key={project.id}
                        className="overflow-hidden rounded-xl border border-gray-300 bg-white"
                      >
                        {/* PROJECT ROW */}

                        <div className="flex flex-col gap-3 bg-gray-50 p-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleProject(project.id)}
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-100"
                            >
                              {expanded ? (
                                <ChevronDown size={15} />
                              ) : (
                                <ChevronRight size={15} />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-bold text-gray-900">
                                  {project.name}
                                </h3>

                                <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[8px] font-bold text-gray-500">
                                  {project.status || "Active"}
                                </span>
                              </div>

                              <p className="mt-1 text-[9px] text-gray-400">
                                {project.domain || "No domain"}
                                {project.manager_name
                                  ? ` · Managed by ${project.manager_name}`
                                  : ""}
                              </p>
                            </div>

                            <PriorityBadge priority={project.priority} />
                          </div>

                          {/* PROJECT SCHEDULE */}

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Clock3
                                  size={11}
                                  className="text-gray-400"
                                />

                                <span className="text-[8px] font-bold uppercase text-gray-400">
                                  Created
                                </span>
                              </div>

                              <p className="mt-1 text-[9px] font-bold text-gray-700">
                                {formatDate(project.created_at)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar
                                  size={11}
                                  className="text-gray-400"
                                />

                                <span className="text-[8px] font-bold uppercase text-gray-400">
                                  Start
                                </span>
                              </div>

                              <p className="mt-1 text-[9px] font-bold text-gray-700">
                                {formatDate(project.start_date)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-red-100 bg-red-50 p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar
                                  size={11}
                                  className="text-red-400"
                                />

                                <span className="text-[8px] font-bold uppercase text-red-400">
                                  Deadline
                                </span>
                              </div>

                              <p className="mt-1 text-[9px] font-bold text-red-700">
                                {formatDate(project.deadline)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
                              <div className="flex items-center gap-1.5">
                                <ClipboardList
                                  size={11}
                                  className="text-gray-400"
                                />

                                <span className="text-[8px] font-bold uppercase text-gray-400">
                                  Time left
                                </span>
                              </div>

                              <p className="mt-1">
                                <DueBadge date={project.deadline} />
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* TASKS */}

                        {expanded && (
                          <div className="border-t border-gray-200 bg-[#fafafa] p-3">
                            {projectTasks.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                                <ClipboardList
                                  size={22}
                                  className="mx-auto text-gray-300"
                                />

                                <p className="mt-2 text-[10px] font-bold text-gray-600">
                                  No tasks
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {projectTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="rounded-xl border border-gray-300 bg-white p-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5">
                                        {task.status === "Done" ? (
                                          <CheckCircle2
                                            size={14}
                                            className="text-emerald-600"
                                          />
                                        ) : (
                                          <Circle
                                            size={14}
                                            className="text-gray-300"
                                          />
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-xs font-bold text-gray-800">
                                            {task.name}
                                          </p>

                                          {task.assignee_name && (
                                            <span className="text-[9px] text-gray-400">
                                              · {task.assignee_name}
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-3">
                                          <StatusBadge status={task.status} />

                                          <PriorityBadge
                                            priority={task.priority}
                                          />

                                          <span className="flex items-center gap-1 text-[8px] text-gray-500">
                                            <Calendar size={10} />
                                            Start: {formatDate(task.start_date)}
                                          </span>

                                          <span className="flex items-center gap-1 text-[8px] text-gray-500">
                                            <Calendar size={10} />
                                            Due: {formatDate(task.due_date)}
                                          </span>

                                          <DueBadge date={task.due_date} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ================================================= 
              MEMBER VIEW
              A flat list of the member's own tasks, each one
              showing its own schedule plus the parent
              project's start/deadline for context.
          ================================================= */

          <section className="mt-5 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-300 bg-[#07111f] px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                <ClipboardList size={17} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">
                  My Task Schedule
                </h2>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Your tasks, with the dates of the project each one
                  belongs to.
                </p>
              </div>
            </div>

            <div className="p-4">
              {filteredTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-5 py-16 text-center">
                  <ClipboardList
                    size={30}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 text-sm font-bold text-gray-700">
                    No tasks found
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    You don't have any tasks assigned yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const project = projects.find(
                      (p) => p.id === task.project_id
                    );

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-gray-300 bg-white p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {task.status === "Done" ? (
                              <CheckCircle2
                                size={16}
                                className="text-emerald-600"
                              />
                            ) : (
                              <Circle size={16} className="text-gray-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900">
                                {task.name}
                              </h3>

                              <StatusBadge status={task.status} />

                              <PriorityBadge priority={task.priority} />
                            </div>

                            <p className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                              <FolderKanban size={11} />
                              {project?.name || "Unknown project"}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                                <p className="text-[8px] font-bold uppercase text-gray-400">
                                  Task Start
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-gray-700">
                                  {formatDate(task.start_date)}
                                </p>
                              </div>

                              <div className="rounded-lg border border-red-100 bg-red-50 p-2.5">
                                <p className="text-[8px] font-bold uppercase text-red-400">
                                  Task Due
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-red-700">
                                  {formatDate(task.due_date)}
                                </p>

                                <p className="mt-1">
                                  <DueBadge date={task.due_date} />
                                </p>
                              </div>

                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                                <p className="text-[8px] font-bold uppercase text-gray-400">
                                  Project Start
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-gray-700">
                                  {formatDate(project?.start_date)}
                                </p>
                              </div>

                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                                <p className="text-[8px] font-bold uppercase text-gray-400">
                                  Project Deadline
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-gray-700">
                                  {formatDate(project?.deadline)}
                                </p>
                              </div>
                            </div>
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
      </div>
    </main>
  );
}
