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
    <main className="min-h-screen bg-[#DEDAD9]">
      <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 lg:px-10">

        {/* =================================================
            ACTIVE PROJECTS
        ================================================= */}

        <section className="rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-5">

          {/* HEADER */}

          <div className="mb-5 flex items-center justify-between">

            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#18181b]">
                Active Projects
              </h2>

              <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[10px] font-semibold text-[#5c76c2]">
                {activeProjects.length}
              </span>
            </div>

            <div className="flex items-center gap-4">

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-400 transition hover:text-black disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              <button
                onClick={() =>
                  router.push("/projects")
                }
                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 transition hover:text-black"
              >
                View all
                <ChevronRight size={13} />
              </button>

            </div>

          </div>

          {/* PROJECT CARDS */}

          {activeProjects.length === 0 ? (
            <EmptyState
              title="No active projects"
              description="There are currently no active projects available."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

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
            LOWER DASHBOARD
        ================================================= */}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.72fr_0.72fr]">

          {/* =================================================
              PROJECT ACTIVITY
          ================================================= */}

          <section className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-6">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-[15px] font-semibold text-[#18181b]">
                  Project Activity
                </h2>

                <p className="mt-0.5 text-[9px] text-gray-400">
                  Task completion overview
                </p>
              </div>

              <button
                onClick={() =>
                  router.push("/tasks")
                }
                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 transition hover:text-black"
              >
                See more
                <ChevronRight size={13} />
              </button>

            </div>

            {/* CHART */}

            <div className="flex h-[170px] items-end gap-[4px] overflow-hidden">

              {activityBars.map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex h-full flex-1 items-end"
                  >
                    <div
                      className={`w-full rounded-t-[3px] ${index % 5 === 0
                          ? "bg-[#dce5f8]"
                          : "bg-[#557bd2]"
                        }`}
                      style={{
                        height:
                          `${height}%`,
                      }}
                    />
                  </div>
                )
              )}

            </div>

            {/* FOOTER */}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

              <p className="text-[11px] text-gray-500">

                <span className="font-semibold text-gray-800">
                  {taskStats.completed}
                </span>{" "}
                tasks completed

              </p>

              <div className="flex items-center gap-4 text-[10px] text-gray-500">

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#557bd2]" />
                  Completed
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#dce5f8]" />
                  Pending
                </span>

              </div>

            </div>

            {/* STAT CARDS */}

            <div className="mt-5 grid grid-cols-3 gap-2">

              <ActivityStat
                icon={
                  <CheckCircle2
                    size={13}
                  />
                }
                label="Completed"
                value={
                  taskStats.completed
                }
              />

              <ActivityStat
                icon={
                  <Clock3 size={13} />
                }
                label="In Progress"
                value={
                  taskStats.inProgress
                }
              />

              <ActivityStat
                icon={
                  <Circle size={13} />
                }
                label="Pending"
                value={
                  taskStats.pending
                }
              />

            </div>

          </section>

          {/* =================================================
              TEAM OVERVIEW
          ================================================= */}

          <section className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-6">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-[15px] font-semibold text-[#18181b]">
                Team Overview
              </h2>

              <button
                onClick={() =>
                  router.push("/teams")
                }
                className="flex items-center gap-1 text-[10px] font-medium text-gray-700"
              >
                View teams
                <ChevronRight size={13} />
              </button>

            </div>

            {/* DONUT */}

            <div className="flex items-center justify-center gap-4">

              <div className="relative h-[138px] w-[138px] shrink-0">

                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      createTeamGradient(
                        teamRoleStats
                      ),
                  }}
                />

                <div className="absolute inset-[25px] flex flex-col items-center justify-center rounded-full bg-white">

                  <span className="text-[18px] font-semibold">
                    {teamRoleStats.total}
                  </span>

                  <span className="text-[9px] text-gray-400">
                    Team Members
                  </span>

                </div>

              </div>

              {/* LEGEND */}

              <div className="space-y-2.5">

                <TeamItem
                  color="bg-[#557bd2]"
                  label="Developers"
                  value={
                    teamRoleStats.developers
                  }
                />

                <TeamItem
                  color="bg-[#438d5d]"
                  label="Designers"
                  value={
                    teamRoleStats.designers
                  }
                />

                <TeamItem
                  color="bg-[#be8944]"
                  label="Managers"
                  value={
                    teamRoleStats.managers
                  }
                />

                <TeamItem
                  color="bg-[#895a9d]"
                  label="QA Team"
                  value={
                    teamRoleStats.qa
                  }
                />

                <TeamItem
                  color="bg-[#d15b58]"
                  label="Other"
                  value={
                    teamRoleStats.other
                  }
                />

              </div>

            </div>

            {/* DOMAINS */}

            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-700">
                  Project Domains
                </p>

                <span className="text-[9px] text-gray-400">
                  {domainStats.length} domains
                </span>
              </div>

              {domainStats.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
                  <p className="text-[9px] text-gray-400">
                    No project domains available
                  </p>
                </div>
              ) : (
                <div className="space-y-2">

                  {domainStats.map(
                    ([domain, count]) => (
                      <div
                        key={domain}
                        className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                      >

                        <span className="truncate text-[9px] font-medium text-gray-600">
                          {domain}
                        </span>

                        <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[8px] font-semibold text-[#5577c4]">
                          {count}{" "}
                          {count === 1
                            ? "project"
                            : "projects"}
                        </span>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* TEAM CARDS */}

            <div className="mt-4 grid grid-cols-2 gap-2">

              <div className="rounded-xl bg-[#f0f4ff] px-3 py-3">

                <p className="text-[17px] font-semibold text-gray-800">
                  {teams.length}
                </p>

                <p className="mt-0.5 text-[9px] text-gray-500">
                  Active Teams
                </p>

              </div>

              <div className="rounded-xl bg-[#f7f0fa] px-3 py-3">

                <p className="text-[17px] font-semibold text-gray-800">
                  {teamRoleStats.developers}
                </p>

                <p className="mt-0.5 text-[9px] text-gray-500">
                  Developers
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              TASK SCHEDULE
          ================================================= */}

          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">

            {/* HEADER */}

            <div className="p-5 pb-3 sm:p-6 sm:pb-3">

              <div className="flex items-center justify-between">

                <h2 className="text-[15px] font-semibold text-[#18181b]">
                  Task Schedule
                </h2>

                <div className="flex items-center gap-1">

                  <button
                    onClick={() =>
                      changeScheduleDate(
                        -1
                      )
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-gray-100"
                  >
                    <ChevronLeft
                      size={13}
                    />
                  </button>

                  <span className="whitespace-nowrap text-[10px] font-medium">
                    {formattedScheduleDate}
                  </span>

                  <button
                    onClick={() =>
                      changeScheduleDate(
                        1
                      )
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-gray-100"
                  >
                    <ChevronRight
                      size={13}
                    />
                  </button>

                </div>

              </div>

            </div>

            {/* SCHEDULE */}

            <div className="max-h-[360px] overflow-y-auto px-5 sm:px-6">

              {scheduleTasks.length === 0 ? (
                <div className="flex min-h-[250px] items-center justify-center">
                  <div className="text-center">

                    <CalendarDays
                      size={26}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-2 text-[10px] font-medium text-gray-500">
                      No scheduled tasks
                    </p>

                    <p className="mt-1 text-[9px] text-gray-400">
                      Tasks with due dates will appear here.
                    </p>

                  </div>
                </div>
              ) : (
                <div className="relative">

                  {/* TIMELINE */}

                  <div className="absolute bottom-0 left-[66px] top-0 w-px bg-gray-200" />

                  {scheduleTasks.map(
                    (task, index) => (
                      <ScheduleItem
                        key={
                          task.id ||
                          `${task.name}-${index}`
                        }
                        task={task}
                        index={index}
                        projects={
                          projects
                        }
                      />
                    )
                  )}

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="border-t border-gray-100 p-4 sm:p-5">

              <button
                onClick={() =>
                  router.push(
                    "/Schedule"
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f7f7f7] py-3 text-[10px] font-medium text-gray-700 transition hover:bg-gray-100"
              >

                <CalendarDays
                  size={14}
                />

                View full schedule

              </button>

            </div>

          </section>

        </div>
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

  const initials = getInitials(project.name);

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
      {/* =====================================================
          PROJECT CARD
      ===================================================== */}

      <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_22px_rgba(0,0,0,0.09)]">

        {/* =================================================
            VISUAL HEADER
        ================================================= */}

        <div className="relative h-[132px] overflow-hidden bg-gradient-to-br from-[#e8f0ff] via-[#f3f6fb] to-[#dfe8f7]">

          {/* Decorative shapes */}

          <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[#557bd2]/10" />

          <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-[#557bd2]/10" />

          <div className="absolute right-5 top-8 h-20 w-20 rotate-12 rounded-2xl border border-white/70 bg-white/40 shadow-sm backdrop-blur-sm" />

          <div className="absolute bottom-[-20px] right-12 h-16 w-16 rounded-full bg-white/40" />

          {/* Project icon */}

          <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#557bd2] shadow-sm">

            <FolderKanban size={16} />

          </div>

          {/* Status */}

          <span
            className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[8px] font-semibold shadow-sm ${statusClass}`}
          >
            {status}
          </span>

          {/* Main title */}

          <div className="absolute bottom-4 left-4 right-4">

            <h3 className="max-w-[75%] truncate text-[14px] font-bold text-[#18181b]">
              {project.name}
            </h3>

            <p className="mt-1 line-clamp-1 max-w-[85%] text-[9px] leading-4 text-gray-500">
              {description}
            </p>

          </div>

        </div>

        {/* =================================================
            PROJECT INFORMATION
        ================================================= */}

        <div className="p-4">

          {/* DATE + DOMAIN */}

          <div className="grid grid-cols-2 gap-3">

            <div>
              <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                Deadline
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <CalendarDays
                  size={11}
                  className="text-gray-400"
                />

                <span className="text-[10px] font-semibold text-gray-700">
                  {project.deadline
                    ? formatDate(project.deadline)
                    : "Not set"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                Domain
              </p>

              <p className="mt-1 truncate text-[10px] font-semibold text-gray-700">
                {project.domain || "General"}
              </p>
            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-4">

            <div className="mb-1.5 flex items-center justify-between">

              <span className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                Progress
              </span>

              <span className="text-[9px] font-bold text-gray-700">
                {progress}%
              </span>

            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">

              <div
                className="h-full rounded-full bg-[#557bd2] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          {/* MANAGER */}

          <div className="mt-3 flex items-center justify-between">

            <div className="flex min-w-0 items-center gap-2">

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-600 text-[7px] font-bold text-white">
                {getInitials(
                  project.manager_name || "PM"
                )}
              </div>

              <div className="min-w-0">

                <p className="text-[7px] uppercase tracking-wide text-gray-400">
                  Project Manager
                </p>

                <p className="truncate text-[9px] font-semibold text-gray-700">
                  {project.manager_name || "Not assigned"}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              TWO ACTION BUTTONS
          ================================================= */}

          <div className="mt-4 grid grid-cols-2 gap-2">

            {/* VIEW PROJECT */}

            <button
              onClick={onView}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] py-2.5 text-[9px] font-semibold text-[#5577c4] transition hover:bg-[#dfe8ff] active:scale-[0.98]"
            >
              <Eye size={13} />

              View Project
            </button>

            {/* DETAILS POPUP */}

            <button
              onClick={() => setDetailsOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2.5 text-[9px] font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
            >
              <Eye size={13} />

              Details
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          PROJECT DETAILS MODAL
      ===================================================== */}

      {detailsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
          onClick={() => setDetailsOpen(false)}
        >

          <div
            className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="relative overflow-hidden bg-gradient-to-br from-[#e8f0ff] via-[#f4f7fc] to-[#dfe8f7] px-5 py-5">

              <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#557bd2]/10" />

              <div className="relative flex items-start justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#557bd2] shadow-sm">
                    <FolderKanban size={20} />
                  </div>

                  <div>

                    <h2 className="text-[15px] font-bold text-gray-900">
                      {project.name}
                    </h2>

                    <p className="mt-0.5 text-[9px] text-gray-500">
                      Project Details
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    setDetailsOpen(false)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 transition hover:bg-white hover:text-gray-900"
                >
                  <X size={16} />
                </button>

              </div>

            </div>

            {/* MODAL CONTENT */}

            <div className="max-h-[65vh] overflow-y-auto p-5">

              {/* STATUS + PROGRESS */}

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">

                  <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                    Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[8px] font-semibold ${statusClass}`}
                  >
                    {status}
                  </span>

                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">

                  <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                    Progress
                  </p>

                  <p className="mt-1 text-[17px] font-bold text-gray-800">
                    {progress}%
                  </p>

                </div>

              </div>

              {/* DESCRIPTION */}

              <div className="mt-4 rounded-xl border border-gray-100 p-4">

                <p className="text-[8px] font-semibold uppercase tracking-wide text-gray-400">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-gray-600">
                  {description}
                </p>

              </div>

              {/* PROJECT INFORMATION */}

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

              {/* CREATED BY */}

              {project.creator_name && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">

                  <p className="text-[8px] font-medium uppercase tracking-wide text-gray-400">
                    Created By
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-gray-700">
                    {project.creator_name}
                  </p>

                  {project.creator_role && (
                    <p className="mt-0.5 text-[8px] text-gray-400">
                      {project.creator_role}
                    </p>
                  )}

                </div>
              )}

            </div>

            {/* MODAL FOOTER */}

            <div className="border-t border-gray-100 bg-gray-50 p-4">

              <button
                onClick={onView}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#456bc2]"
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
