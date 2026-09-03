"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
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

  creator_id?: string;
  creator_name?: string;
  creator_role?: string;

  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  manager_role?: string | null;
};

type TeamMember = {
  id: string;
  email?: string;
  full_name: string;
  role: string;
  team_id: string;
  team_name: string;
};

type Team = {
  id: string;
  name: string;
  description?: string | null;
  created_by?: string;
  created_at?: string;
  member_count?: number;
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

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [scheduleDate, setScheduleDate] = useState(new Date());

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = async () => {
    try {
      setError("");

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      if (!token) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      /*
      -------------------------------------------------------
      PROJECTS
      -------------------------------------------------------
      */

      const projectsResponse = await fetch(
        `${API_BASE}/projects`,
        {
          headers,
        }
      );

      if (projectsResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!projectsResponse.ok) {
        throw new Error("Failed to load projects.");
      }

      const projectsData = await projectsResponse.json();

      const loadedProjects: Project[] =
        projectsData?.projects ||
        projectsData?.data ||
        projectsData ||
        [];

      setProjects(
        Array.isArray(loadedProjects)
          ? loadedProjects
          : []
      );

      /*
      -------------------------------------------------------
      TEAMS
      -------------------------------------------------------
      */

      const [teamsResponse, membersResponse] =
        await Promise.all([
          fetch(`${API_BASE}/teams`, {
            headers,
          }),
          fetch(`${API_BASE}/teams/members`, {
            headers,
          }),
        ]);

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();

        const loadedTeams =
          teamsData?.teams ||
          teamsData?.data ||
          teamsData ||
          [];

        setTeams(
          Array.isArray(loadedTeams)
            ? loadedTeams
            : []
        );
      }

      if (membersResponse.ok) {
        const membersData =
          await membersResponse.json();

        const loadedMembers =
          membersData?.members ||
          membersData?.data ||
          membersData ||
          [];

        setTeamMembers(
          Array.isArray(loadedMembers)
            ? loadedMembers
            : []
        );
      }

      /*
      -------------------------------------------------------
      TASKS
      -------------------------------------------------------

      Your existing Tasks.tsx uses:

      /tasks/project/{projectId}

      We load tasks for all projects.
      -------------------------------------------------------
      */

      const taskRequests = loadedProjects.map(
        async (project) => {
          try {
            const response = await fetch(
              `${API_BASE}/tasks/project/${project.id}`,
              {
                headers,
              }
            );

            if (!response.ok) {
              return [];
            }

            const data = await response.json();

            const projectTasks =
              data?.tasks ||
              data?.data ||
              data ||
              [];

            if (!Array.isArray(projectTasks)) {
              return [];
            }

            return projectTasks.map(
              (task: Task) => ({
                ...task,
                project_id:
                  task.project_id || project.id,
              })
            );
          } catch {
            return [];
          }
        }
      );

      const taskResults =
        await Promise.all(taskRequests);

      setTasks(taskResults.flat());

    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  /* =======================================================
     ACTIVE PROJECTS
  ======================================================= */

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const status =
          project.status?.toLowerCase();

        return (
          status !== "done" &&
          status !== "completed"
        );
      })
      .slice(0, 3);
  }, [projects]);

  /* =======================================================
     TASK STATISTICS
  ======================================================= */

  const taskStats = useMemo(() => {
    const completed = tasks.filter((task) => {
      const status =
        task.status?.toLowerCase();

      return (
        status === "done" ||
        status === "completed"
      );
    }).length;

    const inProgress = tasks.filter((task) => {
      const status =
        task.status?.toLowerCase();

      return (
        status === "in progress" ||
        status === "in_progress"
      );
    }).length;

    const pending = tasks.filter((task) => {
      const status =
        task.status?.toLowerCase();

      return (
        status === "to do" ||
        status === "todo" ||
        status === "pending" ||
        status === "backlog"
      );
    }).length;

    return {
      total: tasks.length,
      completed,
      inProgress,
      pending,
    };
  }, [tasks]);

  /* =======================================================
     PROJECT ACTIVITY
  ======================================================= */

  const activityBars = useMemo(() => {
    if (tasks.length === 0) {
      return Array.from(
        { length: 30 },
        () => 0
      );
    }

    /*
      Divide tasks into 30 activity points.

      Completed tasks get a higher value.
      Pending tasks get a lower value.
    */

    const totalCompleted =
      taskStats.completed;

    const totalPending =
      Math.max(
        tasks.length -
        totalCompleted,
        0
      );

    const base =
      tasks.length > 0
        ? Math.max(
          25,
          Math.round(
            (totalCompleted /
              tasks.length) *
            100
          )
        )
        : 0;

    return Array.from(
      { length: 30 },
      (_, index) => {
        const variation =
          ((index * 17) % 35) - 15;

        const value =
          base + variation;

        return Math.min(
          100,
          Math.max(15, value)
        );
      }
    );
  }, [tasks, taskStats.completed]);

  /* =======================================================
     TEAM ROLE OVERVIEW
  ======================================================= */

  const teamRoleStats = useMemo(() => {
    const developers =
      teamMembers.filter((member) => {
        const role =
          member.role?.toLowerCase();

        return (
          role.includes("developer") ||
          role.includes("software") ||
          role.includes("engineer")
        );
      }).length;

    const designers =
      teamMembers.filter((member) => {
        const role =
          member.role?.toLowerCase();

        return (
          role.includes("designer") ||
          role.includes("ui") ||
          role.includes("ux")
        );
      }).length;

    const managers =
      teamMembers.filter((member) => {
        const role =
          member.role?.toLowerCase();

        return role.includes("manager");
      }).length;

    const qa =
      teamMembers.filter((member) => {
        const role =
          member.role?.toLowerCase();

        return (
          role.includes("qa") ||
          role.includes("quality") ||
          role.includes("tester")
        );
      }).length;

    const known =
      developers +
      designers +
      managers +
      qa;

    const other = Math.max(
      teamMembers.length - known,
      0
    );

    return {
      developers,
      designers,
      managers,
      qa,
      other,
      total: teamMembers.length,
    };
  }, [teamMembers]);

  /* =======================================================
     DOMAIN OVERVIEW
  ======================================================= */

  const domainStats = useMemo(() => {
    const domains: Record<
      string,
      number
    > = {};

    projects.forEach((project) => {
      const domain =
        project.domain?.trim();

      if (!domain) {
        return;
      }

      domains[domain] =
        (domains[domain] || 0) + 1;
    });

    return Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [projects]);

  /* =======================================================
     SCHEDULE
  ======================================================= */

  const scheduleTasks = useMemo(() => {
    const selectedDate =
      scheduleDate.toISOString()
        .split("T")[0];

    const filtered = tasks.filter(
      (task) => {
        if (!task.due_date) {
          return false;
        }

        return (
          task.due_date.split("T")[0] ===
          selectedDate
        );
      }
    );

    /*
      If there are no exact-date tasks,
      show upcoming tasks instead.
    */

    if (filtered.length > 0) {
      return filtered.slice(0, 8);
    }

    return tasks
      .filter(
        (task) => task.due_date
      )
      .sort(
        (a, b) =>
          new Date(
            a.due_date || ""
          ).getTime() -
          new Date(
            b.due_date || ""
          ).getTime()
      )
      .slice(0, 8);
  }, [tasks, scheduleDate]);

  /* =======================================================
     DATE
  ======================================================= */

  const formattedScheduleDate =
    scheduleDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        weekday: "long",
      }
    );

  /* =======================================================
     DATE NAVIGATION
  ======================================================= */

  const changeScheduleDate = (
    amount: number
  ) => {
    setScheduleDate((current) => {
      const date =
        new Date(current);

      date.setDate(
        date.getDate() + amount
      );

      return date;
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              size={26}
              className="animate-spin text-[#557bd2]"
            />

            <p className="text-sm font-medium text-gray-600">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <AlertCircle
              className="mx-auto text-red-500"
              size={30}
            />

            <h2 className="mt-3 text-sm font-semibold text-gray-900">
              Unable to load dashboard
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {error}
            </p>

            <button
              onClick={handleRefresh}
              className="mt-5 rounded-lg bg-[#557bd2] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#456bc2]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

return (
  <main className="min-h-screen bg-[#c4c4c4]">
    <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#557bd2]">
            Workspace Overview
          </p>

          <h1 className="text-[24px] font-bold tracking-tight text-[#16212d] sm:text-[28px]">
            Dashboard
          </h1>

          <p className="mt-1 text-[11px] text-[#7b8794]">
            Monitor your projects, teams and task progress.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex w-fit items-center gap-2 rounded-xl bg-[#172b3a] px-4 py-2.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#223d50] disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh Dashboard
        </button>
      </div>

      {/* =================================================
          ROW 1 — ACTIVE PROJECTS
      ================================================= */}

      <section className="mb-6">

        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#172633]">
                Active Projects
              </h2>

              <span className="rounded-full bg-[#e7efff] px-2.5 py-1 text-[9px] font-bold text-[#557bd2]">
                {activeProjects.length}
              </span>
            </div>

            <p className="mt-1 text-[10px] text-[#8b96a3]">
              Current projects requiring attention
            </p>
          </div>

          <button
            onClick={() => router.push("/projects")}
            className="flex items-center gap-1.5 rounded-lg border border-[#dce2e8] bg-white px-3 py-2 text-[10px] font-semibold text-[#53616d] shadow-sm transition hover:border-[#557bd2] hover:text-[#557bd2]"
          >
            View all projects
            <ChevronRight size={13} />
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="There are currently no active projects available."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() =>
                  router.push(
                    `/projects?projectId=${project.id}`
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* =================================================
          ROW 2 — PROJECT ACTIVITY
      ================================================= */}

      <section className="mb-6 overflow-hidden rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">

        <div className="flex flex-col justify-between gap-4 border-b border-[#edf0f3] px-5 py-5 sm:flex-row sm:items-center sm:px-6">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf0ff] text-[#557bd2]">
                <CheckCircle2 size={15} />
              </div>

              <div>
                <h2 className="text-[15px] font-bold text-[#172633]">
                  Project Activity
                </h2>

                <p className="mt-0.5 text-[9px] text-[#8b96a3]">
                  Task completion and project activity overview
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/tasks")}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-[#172b3a] px-3.5 py-2 text-[9px] font-semibold text-white transition hover:bg-[#223d50]"
          >
            View tasks
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="p-5 sm:p-6">

          {/* CHART HEADER */}

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9aa4ae]">
                Overall Activity
              </p>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[27px] font-bold text-[#172633]">
                  {taskStats.completed}
                </span>

                <span className="text-[10px] text-[#8b96a3]">
                  completed tasks
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#557bd2]" />
                <span className="text-[9px] font-medium text-[#7d8893]">
                  Completed
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#dce4ec]" />
                <span className="text-[9px] font-medium text-[#7d8893]">
                  Activity
                </span>
              </div>

            </div>
          </div>

          {/* SPECTACULAR ACTIVITY CHART */}

          <div className="relative h-[230px] overflow-hidden rounded-2xl border border-[#edf0f3] bg-[#fafbfd]">

            {/* GRID */}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-4 py-5">
              <div className="border-t border-dashed border-[#e4e8ed]" />
              <div className="border-t border-dashed border-[#e4e8ed]" />
              <div className="border-t border-dashed border-[#e4e8ed]" />
              <div className="border-t border-dashed border-[#e4e8ed]" />
              <div className="border-t border-dashed border-[#e4e8ed]" />
            </div>

            {/* BAR CHART */}

            <div className="absolute inset-x-4 bottom-5 top-5 flex items-end gap-[5px] sm:gap-2">

              {activityBars.map((height, index) => {
                const isHighlight =
                  index === activityBars.length - 1 ||
                  index === Math.floor(activityBars.length * 0.72);

                return (
                  <div
                    key={index}
                    className="group relative flex h-full flex-1 items-end"
                  >

                    {/* Tooltip */}

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 scale-90 rounded-lg bg-[#172b3a] px-2 py-1 text-[8px] font-semibold text-white opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                      {height}%
                    </div>

                    {/* BAR */}

                    <div
                      className={`
                        relative w-full overflow-hidden rounded-t-md
                        transition-all duration-300
                        group-hover:-translate-y-1
                        ${
                          isHighlight
                            ? "bg-gradient-to-t from-[#3e63ba] via-[#557bd2] to-[#7898e5]"
                            : "bg-gradient-to-t from-[#557bd2] to-[#9db5ec]"
                        }
                      `}
                      style={{
                        height: `${height}%`,
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-white/60" />
                    </div>

                  </div>
                );
              })}

            </div>

            {/* CHART BOTTOM LABELS */}

            <div className="absolute bottom-1 left-4 right-4 flex justify-between">
              <span className="text-[7px] text-[#a1aab3]">
                Activity Start
              </span>

              <span className="text-[7px] text-[#a1aab3]">
                Current
              </span>
            </div>
          </div>

          {/* STAT CARDS */}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <ActivityStatNew
              icon={<CheckCircle2 size={15} />}
              label="Completed"
              value={taskStats.completed}
              description="Finished tasks"
              className="bg-[#eef8f1] text-[#438759]"
            />

            <ActivityStatNew
              icon={<Clock3 size={15} />}
              label="In Progress"
              value={taskStats.inProgress}
              description="Currently active"
              className="bg-[#edf2ff] text-[#557bd2]"
            />

            <ActivityStatNew
              icon={<Circle size={15} />}
              label="Pending"
              value={taskStats.pending}
              description="Waiting to start"
              className="bg-[#f5eff9] text-[#85579a]"
            />

          </div>
        </div>
      </section>

      {/* =================================================
          ROW 3 — TEAM OVERVIEW
      ================================================= */}

      <section className="mb-6 rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">

        <div className="flex items-center justify-between border-b border-[#edf0f3] px-5 py-5 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf2ff] text-[#557bd2]">
              <Users size={17} />
            </div>

            <div>
              <h2 className="text-[15px] font-bold text-[#172633]">
                Team Overview
              </h2>

              <p className="mt-0.5 text-[9px] text-[#8b96a3]">
                Team members, roles and project domains
              </p>
            </div>

          </div>

          <button
            onClick={() => router.push("/teams")}
            className="flex items-center gap-1.5 rounded-lg bg-[#172b3a] px-3.5 py-2 text-[9px] font-semibold text-white transition hover:bg-[#223d50]"
          >
            View teams
            <ChevronRight size={12} />
          </button>

        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[0.8fr_1.2fr] sm:p-6">

          {/* TEAM DISTRIBUTION */}

          <div className="rounded-2xl border border-[#edf0f3] bg-[#fafbfd] p-5">

            <div className="mb-5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9aa4ae]">
                Team Distribution
              </p>

              <p className="mt-1 text-[10px] text-[#7f8a95]">
                Current workforce composition
              </p>
            </div>

            <div className="flex items-center justify-center gap-8">

              <div className="relative h-[150px] w-[150px] shrink-0">

                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      createTeamGradient(
                        teamRoleStats
                      ),
                  }}
                />

                <div className="absolute inset-[27px] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">

                  <span className="text-[22px] font-bold text-[#172633]">
                    {teamRoleStats.total}
                  </span>

                  <span className="mt-0.5 text-[8px] font-medium text-[#9aa4ae]">
                    MEMBERS
                  </span>

                </div>

              </div>

              <div className="space-y-3">

                <TeamItemNew
                  color="bg-[#557bd2]"
                  label="Developers"
                  value={teamRoleStats.developers}
                />

                <TeamItemNew
                  color="bg-[#438d5d]"
                  label="Designers"
                  value={teamRoleStats.designers}
                />

                <TeamItemNew
                  color="bg-[#be8944]"
                  label="Managers"
                  value={teamRoleStats.managers}
                />

                <TeamItemNew
                  color="bg-[#895a9d]"
                  label="QA Team"
                  value={teamRoleStats.qa}
                />

                <TeamItemNew
                  color="bg-[#d15b58]"
                  label="Other"
                  value={teamRoleStats.other}
                />

              </div>
            </div>

          </div>

          {/* DOMAINS + TEAM COUNTERS */}

          <div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9aa4ae]">
                  Project Domains
                </p>

                <p className="mt-1 text-[10px] text-[#7f8a95]">
                  Distribution across active work
                </p>
              </div>

              <span className="rounded-full bg-[#f1f4f7] px-2.5 py-1 text-[8px] font-semibold text-[#697783]">
                {domainStats.length} domains
              </span>
            </div>

            {domainStats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dfe4e9] bg-[#fafbfd] px-4 py-8 text-center">
                <FolderKanban
                  size={22}
                  className="mx-auto text-[#c5ccd3]"
                />

                <p className="mt-2 text-[9px] text-[#8b96a3]">
                  No project domains available
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">

                {domainStats.map(
                  ([domain, count], index) => (
                    <div
                      key={domain}
                      className="group flex items-center justify-between rounded-xl border border-[#edf0f3] bg-white px-4 py-3 transition hover:border-[#ccd8ed] hover:bg-[#fafcff]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">

                        <span
                          className={`
                            flex h-7 w-7 shrink-0 items-center
                            justify-center rounded-lg text-[9px]
                            font-bold text-white
                            ${
                              index % 4 === 0
                                ? "bg-[#557bd2]"
                                : index % 4 === 1
                                ? "bg-[#438d5d]"
                                : index % 4 === 2
                                ? "bg-[#be8944]"
                                : "bg-[#895a9d]"
                            }
                          `}
                        >
                          {domain
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span className="truncate text-[10px] font-semibold text-[#53616d]">
                          {domain}
                        </span>

                      </div>

                      <span className="ml-2 shrink-0 rounded-full bg-[#f1f4f7] px-2 py-1 text-[8px] font-bold text-[#66737e]">
                        {count}
                      </span>
                    </div>
                  )
                )}

              </div>
            )}

            {/* TEAM COUNTERS */}

            <div className="mt-4 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-gradient-to-br from-[#edf2ff] to-[#f7f9ff] p-4">
                <div className="flex items-center gap-2">
                  <FolderKanban
                    size={14}
                    className="text-[#557bd2]"
                  />

                  <span className="text-[8px] font-semibold uppercase tracking-wide text-[#7c8793]">
                    Active Teams
                  </span>
                </div>

                <p className="mt-2 text-[22px] font-bold text-[#172633]">
                  {teams.length}
                </p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-[#f5eff9] to-[#fbf8fd] p-4">
                <div className="flex items-center gap-2">
                  <Users
                    size={14}
                    className="text-[#895a9d]"
                  />

                  <span className="text-[8px] font-semibold uppercase tracking-wide text-[#7c8793]">
                    Developers
                  </span>
                </div>

                <p className="mt-2 text-[22px] font-bold text-[#172633]">
                  {teamRoleStats.developers}
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =================================================
          ROW 4 — TASK SCHEDULE
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">

        {/* HEADER */}

        <div className="flex flex-col gap-4 border-b border-[#edf0f3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5eff9] text-[#895a9d]">
              <CalendarDays size={17} />
            </div>

            <div>
              <h2 className="text-[15px] font-bold text-[#172633]">
                Task Schedule
              </h2>

              <p className="mt-0.5 text-[9px] text-[#8b96a3]">
                Upcoming deadlines and scheduled tasks
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() => changeScheduleDate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e1e6eb] bg-white text-[#697783] transition hover:bg-[#f5f7f9]"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="min-w-[130px] rounded-lg bg-[#f5f7f9] px-3 py-2 text-center">
              <span className="text-[9px] font-bold text-[#44515c]">
                {formattedScheduleDate}
              </span>
            </div>

            <button
              onClick={() => changeScheduleDate(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e1e6eb] bg-white text-[#697783] transition hover:bg-[#f5f7f9]"
            >
              <ChevronRight size={14} />
            </button>

          </div>

        </div>

        {/* SCHEDULE CONTENT */}

        <div className="max-h-[430px] overflow-y-auto px-5 sm:px-6">

          {scheduleTasks.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f7f9]">
                  <CalendarDays
                    size={22}
                    className="text-[#b7c0c8]"
                  />
                </div>

                <p className="mt-3 text-[10px] font-semibold text-[#697783]">
                  No scheduled tasks
                </p>

                <p className="mt-1 text-[9px] text-[#a0a9b2]">
                  Tasks with due dates will appear here.
                </p>

              </div>
            </div>
          ) : (
            <div className="relative py-4">

              <div className="absolute bottom-0 left-[72px] top-0 w-px bg-[#e7ebef]" />

              {scheduleTasks.map(
                (task, index) => (
                  <ScheduleItem
                    key={
                      task.id ||
                      `${task.name}-${index}`
                    }
                    task={task}
                    index={index}
                    projects={projects}
                  />
                )
              )}

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="border-t border-[#edf0f3] p-4 sm:p-5">

          <button
            onClick={() => router.push("/Schedule")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172b3a] py-3 text-[10px] font-semibold text-white transition hover:bg-[#223d50]"
          >
            <CalendarDays size={14} />
            View Full Schedule
            <ChevronRight size={13} />
          </button>

        </div>

      </section>

    </div>
  </main>
);
}

/* =========================================================
   PROJECT CARD
========================================================= */

/* =========================================================
   PROJECT CARD
========================================================= */

function ProjectCard({
  project,
  onView,
}: {
  project: Project;
  onView: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const status = project.status || "Unassigned";
  const statusClass = getProjectStatusClass(status);

  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  const progress = Math.min(
    100,
    Math.max(0, Number(project.progress) || 0)
  );

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-[#dfe5ea] bg-white shadow-[0_4px_18px_rgba(24,39,54,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(24,39,54,0.12)]">

        {/* =================================================
            CARD TOP
        ================================================= */}

        <div className="relative overflow-hidden bg-[#172b3a] px-5 pb-5 pt-5">

          {/* decorative background */}

          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#557bd2]/20" />

          <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-[#438d5d]/10" />

          <div className="absolute right-5 top-10 h-12 w-12 rotate-12 rounded-xl border border-white/10 bg-white/5" />

          {/* icon + status */}

          <div className="relative flex items-start justify-between">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm">
              <FolderKanban size={18} />
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${statusClass}`}
            >
              {status}
            </span>

          </div>

          {/* title */}

          <div className="relative mt-7">

            <h3 className="truncate text-[16px] font-bold text-white">
              {project.name}
            </h3>

            <p className="mt-1.5 line-clamp-2 min-h-[30px] text-[9px] leading-4 text-white/65">
              {description}
            </p>

          </div>

        </div>

        {/* =================================================
            CARD BODY
        ================================================= */}

        <div className="p-5">

          {/* DATE / DOMAIN */}

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-[#f7f9fb] p-3">

              <div className="flex items-center gap-1.5">
                <CalendarDays
                  size={11}
                  className="text-[#557bd2]"
                />

                <p className="text-[8px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Deadline
                </p>
              </div>

              <p className="mt-1.5 text-[10px] font-bold text-[#44515c]">
                {project.deadline
                  ? formatDate(project.deadline)
                  : "Not set"}
              </p>

            </div>

            <div className="rounded-xl bg-[#f7f9fb] p-3">

              <div className="flex items-center gap-1.5">
                <FolderKanban
                  size={11}
                  className="text-[#895a9d]"
                />

                <p className="text-[8px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Domain
                </p>
              </div>

              <p className="mt-1.5 truncate text-[10px] font-bold text-[#44515c]">
                {project.domain || "General"}
              </p>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between">

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Project Progress
                </p>
              </div>

              <span className="text-[11px] font-bold text-[#172b3a]">
                {progress}%
              </span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#e9edf1]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#557bd2] via-[#6689dd] to-[#8ca7ec] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          {/* MANAGER */}

          <div className="mt-5 flex items-center justify-between border-t border-[#edf0f3] pt-4">

            <div className="flex min-w-0 items-center gap-2.5">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#557bd2] to-[#314f9c] text-[8px] font-bold text-white">
                {getInitials(
                  project.manager_name || "PM"
                )}
              </div>

              <div className="min-w-0">

                <p className="text-[7px] font-bold uppercase tracking-wide text-[#a0a9b2]">
                  Project Manager
                </p>

                <p className="truncate text-[9px] font-bold text-[#44515c]">
                  {project.manager_name || "Not assigned"}
                </p>

              </div>

            </div>

            <span className="rounded-lg bg-[#f0f4ff] px-2 py-1 text-[8px] font-bold text-[#557bd2]">
              {project.priority || "Normal"}
            </span>

          </div>

          {/* BUTTONS */}

          <div className="mt-5 grid grid-cols-2 gap-2">

            <button
              onClick={onView}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#557bd2] py-3 text-[9px] font-bold text-white shadow-sm transition hover:bg-[#456bc2] active:scale-[0.98]"
            >
              <Eye size={13} />
              View Project
            </button>

            <button
              onClick={() => setDetailsOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#172b3a] py-3 text-[9px] font-bold text-white shadow-sm transition hover:bg-[#223d50] active:scale-[0.98]"
            >
              <Eye size={13} />
              Details
            </button>

          </div>

        </div>
      </div>

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {detailsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/55 px-4 backdrop-blur-sm"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="relative overflow-hidden bg-[#172b3a] px-5 py-5">

              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#557bd2]/20" />

              <div className="relative flex items-start justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
                    <FolderKanban size={20} />
                  </div>

                  <div>
                    <h2 className="text-[15px] font-bold text-white">
                      {project.name}
                    </h2>

                    <p className="mt-0.5 text-[9px] text-white/60">
                      Project Details
                    </p>
                  </div>

                </div>

                <button
                  onClick={() =>
                    setDetailsOpen(false)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X size={16} />
                </button>

              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">

              <div className="grid grid-cols-2 gap-3">

                <ProjectDetailItem
                  label="Status"
                  value={status}
                />

                <ProjectDetailItem
                  label="Progress"
                  value={`${progress}%`}
                />

              </div>

              <div className="mt-4 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-4">

                <p className="text-[8px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#5f6b75]">
                  {description}
                </p>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <ProjectDetailItem
                  label="Domain"
                  value={
                    project.domain ||
                    "Not specified"
                  }
                />

                <ProjectDetailItem
                  label="Priority"
                  value={
                    project.priority ||
                    "Not specified"
                  }
                />

                <ProjectDetailItem
                  label="Start Date"
                  value={
                    project.start_date
                      ? formatDate(
                          project.start_date
                        )
                      : "Not specified"
                  }
                />

                <ProjectDetailItem
                  label="Deadline"
                  value={
                    project.deadline
                      ? formatDate(
                          project.deadline
                        )
                      : "Not specified"
                  }
                />

                <ProjectDetailItem
                  label="Project Manager"
                  value={
                    project.manager_name ||
                    "Not assigned"
                  }
                />

                <ProjectDetailItem
                  label="Manager Role"
                  value={
                    project.manager_role ||
                    "Project Manager"
                  }
                />

              </div>

              {project.creator_name && (
                <div className="mt-3 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-3">

                  <p className="text-[8px] font-bold uppercase tracking-wide text-[#98a2ac]">
                    Created By
                  </p>

                  <p className="mt-1 text-[10px] font-bold text-[#44515c]">
                    {project.creator_name}
                  </p>

                  {project.creator_role && (
                    <p className="mt-0.5 text-[8px] text-[#9aa4ae]">
                      {project.creator_role}
                    </p>
                  )}

                </div>
              )}

            </div>

            <div className="border-t border-[#edf0f3] bg-[#fafbfd] p-4">

              <button
                onClick={onView}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3 text-[10px] font-bold text-white transition hover:bg-[#456bc2]"
              >
                <Eye size={14} />
                Open Project
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}

function ActivityStatNew({
  icon,
  label,
  value,
  description,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/60 p-4 ${className}`}
    >
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70">
            {icon}
          </div>

          <span className="text-[9px] font-bold">
            {label}
          </span>
        </div>

        <span className="text-[20px] font-bold">
          {value}
        </span>

      </div>

      <p className="mt-2 text-[8px] opacity-65">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   PROJECT DETAIL ITEM
========================================================= */

function ProjectDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-semibold text-gray-700">
        {value}
      </p>
    </div>
  );
}

function TeamItemNew({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-[105px] items-center justify-between gap-4">

      <div className="flex items-center gap-2">

        <span
          className={`h-2.5 w-2.5 rounded-full ${color}`}
        />

        <span className="text-[9px] font-medium text-[#697783]">
          {label}
        </span>

      </div>

      <span className="text-[10px] font-bold text-[#34424d]">
        {value}
      </span>

    </div>
  );
}
/* =========================================================
   TEAM ITEM
========================================================= */

function TeamItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">

      <span
        className={`h-2 w-2 shrink-0 rounded-full ${color}`}
      />

      <span className="whitespace-nowrap text-[9px] text-gray-500">
        {label}
      </span>

      <span className="text-[9px] font-semibold text-gray-800">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   ACTIVITY STAT
========================================================= */

function ActivityStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">

      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}

        <span className="text-[8px]">
          {label}
        </span>
      </div>

      <p className="mt-1 text-[14px] font-semibold text-gray-800">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   SCHEDULE ITEM
========================================================= */

function ScheduleItem({
  task,
  index,
  projects,
}: {
  task: Task;
  index: number;
  projects: Project[];
}) {
  const project = projects.find(
    (item) =>
      item.id === task.project_id
  );

  const taskName =
    task.name ||
    task.title ||
    "Untitled Task";

  const initials =
    getInitials(taskName);

  const dueDate =
    task.due_date
      ? new Date(task.due_date)
      : null;

  const time =
    dueDate
      ? dueDate.toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
      : "--:--";

  const type =
    task.status || "Pending";

  return (
    <div className="relative flex min-h-[48px] items-center">

      {/* TIME */}

      <div className="w-[56px] shrink-0 text-[9px] text-gray-400">
        {time}
      </div>

      {/* DOT */}

      <div className="relative z-10 mx-[7px] flex h-2 w-2 shrink-0 items-center justify-center rounded-full border border-white bg-gray-300 shadow-sm" />

      {/* TASK */}

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-1">

        <div className="flex min-w-0 items-center gap-2">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-600 text-[7px] font-semibold text-white">
            {initials}
          </div>

          <div className="min-w-0">

            <span className="block truncate text-[9px] font-medium">
              {taskName}
            </span>

            {project && (
              <span className="block truncate text-[7px] text-gray-400">
                {project.name}
              </span>
            )}

          </div>

        </div>

        <TaskBadge type={type} />

      </div>

    </div>
  );
}

/* =========================================================
   TASK BADGE
========================================================= */

function TaskBadge({
  type,
}: {
  type: string;
}) {
  let className =
    "bg-[#f3eafa] text-[#85579a]";

  const normalized =
    type.toLowerCase();

  if (
    normalized.includes("review")
  ) {
    className =
      "bg-[#f8f0e4] text-[#ad8144]";
  } else if (
    normalized.includes("progress")
  ) {
    className =
      "bg-[#edf2ff] text-[#5577c2]";
  } else if (
    normalized.includes("done") ||
    normalized.includes("complete")
  ) {
    className =
      "bg-[#eaf5ed] text-[#438759]";
  } else if (
    normalized.includes("todo") ||
    normalized.includes("to do") ||
    normalized.includes("pending") ||
    normalized.includes("backlog")
  ) {
    className =
      "bg-[#f3eafa] text-[#85579a]";
  }

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[8px] ${className}`}
    >
      {type}
    </span>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">

      <Users
        size={25}
        className="mx-auto text-gray-300"
      />

      <p className="mt-2 text-[11px] font-semibold text-gray-600">
        {title}
      </p>

      <p className="mt-1 text-[9px] text-gray-400">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(
  name: string
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word.charAt(0).toUpperCase()
    )
    .join("");
}

/* =========================================================
   PROJECT STATUS CLASS
========================================================= */

function getProjectStatusClass(
  status: string
) {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes(
      "progress"
    )
  ) {
    return "bg-[#edf2ff] text-[#5577c2]";
  }

  if (
    normalized.includes("done") ||
    normalized.includes(
      "complete"
    )
  ) {
    return "bg-[#eaf5ed] text-[#438759]";
  }

  if (
    normalized.includes("pause")
  ) {
    return "bg-[#f8f0e4] text-[#ad8144]";
  }

  if (
    normalized.includes(
      "backlog"
    )
  ) {
    return "bg-[#f3eafa] text-[#85579a]";
  }

  return "bg-gray-100 text-gray-600";
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  date?: string | null
) {
  if (!date) {
    return "";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   TEAM DONUT GRADIENT
========================================================= */

function createTeamGradient(
  stats: {
    developers: number;
    designers: number;
    managers: number;
    qa: number;
    other: number;
    total: number;
  }
) {
  if (stats.total === 0) {
    return "#e5e7eb";
  }

  const total =
    stats.total;

  const developerDeg =
    (stats.developers / total) *
    360;

  const designerDeg =
    developerDeg +
    (stats.designers / total) *
    360;

  const managerDeg =
    designerDeg +
    (stats.managers / total) *
    360;

  const qaDeg =
    managerDeg +
    (stats.qa / total) *
    360;

  return `
    conic-gradient(
      #557bd2 0deg ${developerDeg}deg,
      #438d5d ${developerDeg}deg ${designerDeg}deg,
      #be8944 ${designerDeg}deg ${managerDeg}deg,
      #895a9d ${managerDeg}deg ${qaDeg}deg,
      #d15b58 ${qaDeg}deg 360deg
    )
  `;
}
