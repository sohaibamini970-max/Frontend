"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock3,
  Circle,
  AlertCircle,
  X,
  FolderKanban,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type Project = {
  id: string;
  name: string;
  domain?: string | null;
  about_title?: string | null;
  about_description?: string | null;
  status?: string | null;
  priority?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  progress?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  creator_name?: string;
  manager_name?: string;
  manager_email?: string;
};

type Task = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  project_id?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  status?: string;
  priority?: string;
  start_date?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

type TeamRoleStats = {
  developers: number;
  designers: number;
  managers: number;
  qa: number;
  other: number;
  total: number;
};

type DashboardData = {
  user: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  projects: Project[];
  tasks: Task[];
  teams: TeamRoleStats;
  projectStats: {
    total: number;
    completed: number;
    inProgress: number;
    averageProgress: number;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  activeProjects: Project[];
  domainStats: [string, number][];
  scheduleTasks: Task[];
  projectOverview: Array<{
    project: Project;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }>;
  isManagement: boolean;
  isProjectManager: boolean;
  isMember: boolean;
  roleDescription: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Dashboard() {
  const router = useRouter();
  const API_BASE = "https://backend-five-swart-88.vercel.app/api";

  // State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [selectedOverviewProject, setSelectedOverviewProject] = useState<Project | null>(null);

  // Load dashboard - Single API call
  const loadDashboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const startTime = performance.now();

      const response = await fetch(`${API_BASE}/dashboard/optimized`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to load dashboard");
      }

      setDashboardData(result.data);

      const endTime = performance.now();
      console.log(`⏱️ Dashboard loaded in ${(endTime - startTime).toFixed(2)}ms`);

    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Initial load
  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(false);
  }, [loadDashboard]);

  // Format date
  const formatDate = useCallback((date?: string | null) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Get initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }, []);

  // Get project status class
  const getProjectStatusClass = useCallback((status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("progress")) return "bg-[#edf2ff] text-[#5577c2]";
    if (normalized.includes("done") || normalized.includes("complete")) 
      return "bg-[#eaf5ed] text-[#438759]";
    if (normalized.includes("pause")) return "bg-[#f8f0e4] text-[#ad8144]";
    if (normalized.includes("backlog")) return "bg-[#f3eafa] text-[#85579a]";
    return "bg-gray-100 text-gray-600";
  }, []);

  // Create team gradient
  const createTeamGradient = useCallback((stats: TeamRoleStats) => {
    if (stats.total === 0) return "#e5e7eb";
    const total = stats.total;
    const developerDeg = (stats.developers / total) * 360;
    const designerDeg = developerDeg + (stats.designers / total) * 360;
    const managerDeg = designerDeg + (stats.managers / total) * 360;
    const qaDeg = managerDeg + (stats.qa / total) * 360;
    return `
      conic-gradient(
        #557bd2 0deg ${developerDeg}deg,
        #438d5d ${developerDeg}deg ${designerDeg}deg,
        #be8944 ${designerDeg}deg ${managerDeg}deg,
        #895a9d ${managerDeg}deg ${qaDeg}deg,
        #d15b58 ${qaDeg}deg 360deg
      )
    `;
  }, []);

  // Date navigation
  const changeScheduleDate = useCallback((amount: number) => {
    setScheduleDate((current) => {
      const date = new Date(current);
      date.setDate(date.getDate() + amount);
      return date;
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={30} className="animate-spin text-[#557bd2]" />
            <p className="text-[14px] font-semibold text-gray-600">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto text-red-500" size={34} />
            <h2 className="mt-4 text-[18px] font-bold text-gray-900">
              Unable to load dashboard
            </h2>
            <p className="mt-2 text-[13px] text-gray-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-6 rounded-xl bg-[#557bd2] px-6 py-3 text-[12px] font-bold text-white transition hover:bg-[#456bc2]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboardData) return null;

  const {
    user,
    projects,
    tasks,
    teams,
    projectStats,
    taskStats,
    activeProjects,
    domainStats,
    scheduleTasks,
    projectOverview,
    isManagement,
    isProjectManager,
    isMember,
    roleDescription
  } = dashboardData;

  const formattedScheduleDate = scheduleDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "long",
  });

  // Filter schedule tasks for selected date
  const filteredScheduleTasks = useMemo(() => {
    const selectedDate = scheduleDate.toISOString().split("T")[0];
    const filtered = scheduleTasks.filter((task) => {
      if (!task.due_date) return false;
      return task.due_date.split("T")[0] === selectedDate;
    });
    return filtered.length > 0 ? filtered.slice(0, 8) : scheduleTasks.slice(0, 8);
  }, [scheduleTasks, scheduleDate]);

  return (
    <main className="min-h-screen bg-[#c4c4c4]">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">
        {/* =================================================
            PAGE HEADER
        ================================================= */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#557bd2]">
                Workspace Overview
              </p>
              {user.role && (
                <span className="rounded-full border border-[#d5e0f7] bg-[#edf2ff] px-3 py-1.5 text-[10px] font-bold text-[#557bd2]">
                  {user.role}
                </span>
              )}
            </div>
            <h1 className="text-[30px] font-bold tracking-tight text-[#16212d] sm:text-[32px]">
              Dashboard
            </h1>
            <p className="mt-2 max-w-[700px] text-[13px] leading-5 text-[#697783]">
              {roleDescription}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-fit items-center gap-2.5 rounded-xl bg-[#172b3a] px-5 py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#223d50] disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh Dashboard
          </button>
        </div>

        {/* =================================================
            ROW 1 — PROJECTS OVERVIEW
        ================================================= */}
        <section className="mb-7 overflow-hidden rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">
          <div className="flex flex-col gap-4 border-b border-[#edf0f3] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[25px] font-bold text-[#172633]">
                  Projects Overview
                </h2>
                <span className="rounded-full bg-[#e7efff] px-3 py-1.5 text-[13px] font-bold text-[#557bd2]">
                  {projectOverview.length}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-[#7b8794]">
                Track project progress and task completion at a glance
              </p>
            </div>
            <div className="flex w-fit items-center gap-2.5 rounded-xl border border-[#dfe5ea] bg-[#fafbfd] px-4 py-3">
              <CalendarDays size={15} className="text-[#557bd2]" />
              <span className="text-[13px] font-semibold text-[#53616d]">
                Data: {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {projectOverview.length === 0 ? (
            <div className="flex min-h-[330px] items-center justify-center px-5">
              <EmptyState
                title={isProjectManager ? "No projects assigned to you" : 
                       isMember ? "No assigned projects yet" : "No projects available"}
                description={isProjectManager ? "Projects assigned to you will appear here." :
                            isMember ? "Projects will appear here when tasks are assigned to you." :
                            "Projects will appear here once they are created."}
              />
            </div>
          ) : (
            <div className="px-5 pb-6 pt-7 sm:px-7 sm:pb-7">
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 bottom-[72px] h-px bg-[#6f7b87]" />
                <div className="relative flex flex-wrap justify-start gap-x-8 gap-y-8 pl-6">
                  {projectOverview.map(({ project, totalTasks, completedTasks, progress }, index) => {
                    const color = PROJECT_OVERVIEW_COLORS[index % PROJECT_OVERVIEW_COLORS.length];
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedOverviewProject(project)}
                        className="group flex w-[120px] flex-col items-center rounded-xl px-1 pt-1 transition hover:bg-[#fafbfd]"
                      >
                        <div className="mb-3 h-6">
                          <span className="text-[15px] font-bold text-[#172633] transition group-hover:text-[#557bd2]">
                            {progress}%
                          </span>
                        </div>
                        <div className="relative flex h-[200px] w-full max-w-[42px] items-end justify-center">
                          <div
                            className={`absolute bottom-0 h-full w-full rounded-t-xl opacity-[0.035] ${color.bar}`}
                          />
                          <div
                            className={`relative z-10 w-full rounded-t-xl bg-gradient-to-t ${color.bar} shadow-[0_8px_18px_rgba(85,123,210,0.16)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_12px_25px_rgba(85,123,210,0.22)]`}
                            style={{
                              height: `${Math.max(progress, progress === 0 ? 2 : 8)}%`,
                            }}
                          >
                            <div className="absolute inset-x-0 top-0 h-12 rounded-t-xl bg-white/10" />
                          </div>
                        </div>
                        <div className="mt-2 min-h-[52px] w-[125px] text-center">
                          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a98a8]">
                            Project {index + 1}
                          </p>
                          <p className="text-[12px] font-bold uppercase leading-4 text-[#172633] transition group-hover:text-[#557bd2]">
                            {project.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center">
                <div className="flex items-center gap-2.5 rounded-full bg-[#f7f9fb] px-5 py-2.5">
                  <Eye size={18} className="text-[#557bd2]" />
                  <span className="text-[14px] font-medium text-[#7b8794]">
                    Click any project bar to view detailed progress
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            ROW 2 — ACTIVE PROJECTS
        ================================================= */}
        <section className="mb-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[19px] font-bold text-[#172633]">
                  Active Projects
                </h2>
                <span className="rounded-full bg-[#e7efff] px-3 py-1.5 text-[11px] font-bold text-[#557bd2]">
                  {activeProjects.length}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-[#8b96a3]">
                Current projects requiring attention
              </p>
            </div>
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-2 rounded-lg border border-[#dce2e8] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#53616d] shadow-sm transition hover:border-[#557bd2] hover:text-[#557bd2]"
            >
              View all projects
              <ChevronRight size={14} />
            </button>
          </div>

          {activeProjects.length === 0 ? (
            <EmptyState
              title={isProjectManager ? "No active assigned projects" :
                     isMember ? "No active projects assigned to you" : "No active projects"}
              description={isProjectManager ? "Active projects managed by you will appear here." :
                          isMember ? "Projects with your assigned tasks will appear here." :
                          "There are currently no active projects available."}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={() => router.push(`/projects?projectId=${project.id}`)}
                  getInitials={getInitials}
                  getProjectStatusClass={getProjectStatusClass}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </section>

        {/* Continue with Team Overview, Task Stats, and Schedule sections... */}
        {/* These sections remain the same as before, using the dashboardData props */}
      </div>

      {/* Project Overview Modal - Same as before */}
      {selectedOverviewProject && (
        <ProjectOverviewModal
          project={selectedOverviewProject}
          projectOverview={projectOverview}
          tasks={tasks}
          projects={projects}
          onClose={() => setSelectedOverviewProject(null)}
          onViewProject={(projectId) => {
            setSelectedOverviewProject(null);
            router.push(`/projects?projectId=${projectId}`);
          }}
          formatDate={formatDate}
        />
      )}
    </main>
  );
}

// [Rest of the helper components remain the same...]
// EmptyState, DashboardStat, ProjectCard, ScheduleItem, etc.
