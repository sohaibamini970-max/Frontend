"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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

type CurrentUser = {
  id?: string;
  user_id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  user_role?: string;
};

/* =========================================================
   API
========================================================= */

const API_BASE =
  "https://backend-five-swart-88.vercel.app/api";

/* =========================================================
   PROJECT OVERVIEW COLORS
========================================================= */

const PROJECT_OVERVIEW_COLORS = [
  "#557BD2",
  "#438D5D",
  "#8B5AA3",
  "#BE8944",
  "#D15B58",
  "#4F9FA8",
  "#6C78B9",
  "#9A6B50",
];

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const router = useRouter();

  /* =======================================================
     DATA
  ======================================================= */

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [teamMembers, setTeamMembers] =
    useState<TeamMember[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  /* =======================================================
     USER
  ======================================================= */

  const [currentUser, setCurrentUser] =
    useState<CurrentUser>(() => {
      if (typeof window === "undefined") {
        return {};
      }

      try {
        const stored =
          localStorage.getItem("user");

        return stored
          ? JSON.parse(stored)
          : {};
      } catch {
        return {};
      }
    });

  /* =======================================================
     UI
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [scheduleDate, setScheduleDate] =
    useState(new Date());

  const [selectedOverviewProject, setSelectedOverviewProject] =
    useState<Project | null>(null);

  /* =======================================================
     NORMALIZED ROLE
  ======================================================= */

  const normalizedRole = useMemo(() => {
    return (
      currentUser.role ||
      currentUser.user_role ||
      ""
    )
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }, [
    currentUser.role,
    currentUser.user_role,
  ]);

  const currentUserId =
    currentUser.id ||
    currentUser.user_id ||
    "";

  const isExecutiveManager =
    normalizedRole === "executive manager";

  const isSystemAdministrator =
    normalizedRole === "system administrator" ||
    normalizedRole === "administrator" ||
    normalizedRole === "admin";

  const isProjectManager =
    normalizedRole === "project manager";

  const isMember =
    normalizedRole === "member" ||
    normalizedRole === "user";

  const isManagement =
    isExecutiveManager ||
    isSystemAdministrator;

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

      /* -----------------------------------------------------
         CURRENT USER
      ----------------------------------------------------- */

      if (typeof window !== "undefined") {
        try {
          const storedUser =
            localStorage.getItem("user");

          if (storedUser) {
            setCurrentUser(
              JSON.parse(storedUser)
            );
          }
        } catch {
          // Ignore invalid local user data.
        }
      }

      /* -----------------------------------------------------
         PROJECTS
      ----------------------------------------------------- */

      const projectsResponse =
        await fetch(
          `${API_BASE}/projects`,
          {
            headers,
            cache: "no-store",
          }
        );

      if (
        projectsResponse.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        router.push("/login");
        return;
      }

      if (!projectsResponse.ok) {
        throw new Error(
          "Failed to load projects."
        );
      }

      const projectsData =
        await projectsResponse.json();

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

      /* -----------------------------------------------------
         TEAMS + MEMBERS
      ----------------------------------------------------- */

      const [
        teamsResponse,
        membersResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/teams`, {
          headers,
          cache: "no-store",
        }),

        fetch(
          `${API_BASE}/teams/members`,
          {
            headers,
            cache: "no-store",
          }
        ),
      ]);

      if (teamsResponse.ok) {
        const teamsData =
          await teamsResponse.json();

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

      /* -----------------------------------------------------
         TASKS
      ----------------------------------------------------- */

      const taskRequests =
        loadedProjects.map(
          async (project) => {
            try {
              const response =
                await fetch(
                  `${API_BASE}/tasks/project/${project.id}`,
                  {
                    headers,
                    cache: "no-store",
                  }
                );

              if (!response.ok) {
                return [];
              }

              const data =
                await response.json();

              const projectTasks =
                data?.tasks ||
                data?.data ||
                data ||
                [];

              if (
                !Array.isArray(
                  projectTasks
                )
              ) {
                return [];
              }

              return projectTasks.map(
                (task: Task) => ({
                  ...task,
                  project_id:
                    task.project_id ||
                    project.id,
                })
              );
            } catch {
              return [];
            }
          }
        );

      const taskResults =
        await Promise.all(
          taskRequests
        );

      setTasks(
        taskResults.flat()
      );
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
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      await loadDashboard();
    } catch (err) {
      console.error(
        "Refresh failed:",
        err
      );
    } finally {
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
     VISIBLE PROJECTS
  ======================================================= */

  const visibleProjects = useMemo(() => {
    if (isManagement) {
      return projects;
    }

    if (isProjectManager) {
      return projects.filter(
        (project) =>
          String(
            project.manager_id
          ) === String(currentUserId)
      );
    }

    if (isMember) {
      const assignedProjectIds =
        new Set(
          tasks
            .filter(
              (task) =>
                String(
                  task.assignee_id
                ) === String(
                  currentUserId
                )
            )
            .map(
              (task) =>
                String(
                  task.project_id
                )
            )
        );

      return projects.filter(
        (project) =>
          assignedProjectIds.has(
            String(project.id)
          )
      );
    }

    return [];
  }, [
    projects,
    tasks,
    currentUserId,
    isManagement,
    isProjectManager,
    isMember,
  ]);

  /* =======================================================
     VISIBLE TASKS
  ======================================================= */

  const visibleTasks = useMemo(() => {
    if (isManagement) {
      return tasks;
    }

    if (isProjectManager) {
      const projectIds =
        new Set(
          visibleProjects.map(
            (project) =>
              String(project.id)
          )
        );

      return tasks.filter((task) =>
        projectIds.has(
          String(task.project_id)
        )
      );
    }

    if (isMember) {
      return tasks.filter(
        (task) =>
          String(
            task.assignee_id
          ) === String(
            currentUserId
          )
      );
    }

    return [];
  }, [
    tasks,
    visibleProjects,
    currentUserId,
    isManagement,
    isProjectManager,
    isMember,
  ]);

  /* =======================================================
     PROJECT OVERVIEW
  ======================================================= */

  const projectOverview =
    useMemo(() => {
      return visibleProjects
        .map((project, index) => {
          const projectTasks =
            visibleTasks.filter(
              (task) =>
                String(
                  task.project_id
                ) === String(
                  project.id
                )
            );

          const totalTasks =
            projectTasks.length;

          const completedTasks =
            projectTasks.filter(
              (task) => {
                const status =
                  task.status
                    ?.toLowerCase()
                    .trim();

                return (
                  status === "done" ||
                  status ===
                    "completed"
                );
              }
            ).length;

          const progress =
            totalTasks > 0
              ? Math.round(
                  (completedTasks /
                    totalTasks) *
                    100
                )
              : 0;

          return {
            project,
            totalTasks,
            completedTasks,
            progress,
            color:
              PROJECT_OVERVIEW_COLORS[
                index %
                  PROJECT_OVERVIEW_COLORS.length
              ],
          };
        })
        .slice(0, 8);
    }, [
      visibleProjects,
      visibleTasks,
    ]);

  /* =======================================================
     ACTIVE PROJECTS
  ======================================================= */

  const activeProjects =
    useMemo(() => {
      return visibleProjects
        .filter((project) => {
          const status =
            project.status
              ?.toLowerCase()
              .trim();

          return (
            status !== "done" &&
            status !== "completed"
          );
        })
        .slice(0, 3);
    }, [visibleProjects]);

  /* =======================================================
     TASK STATISTICS
  ======================================================= */

  const taskStats = useMemo(() => {
    const completed =
      visibleTasks.filter(
        (task) => {
          const status =
            task.status
              ?.toLowerCase()
              .trim();

          return (
            status === "done" ||
            status ===
              "completed"
          );
        }
      ).length;

    const inProgress =
      visibleTasks.filter(
        (task) => {
          const status =
            task.status
              ?.toLowerCase()
              .trim();

          return (
            status ===
              "in progress" ||
            status ===
              "in_progress"
          );
        }
      ).length;

    const pending =
      visibleTasks.filter(
        (task) => {
          const status =
            task.status
              ?.toLowerCase()
              .trim();

          return (
            status === "to do" ||
            status === "todo" ||
            status === "pending" ||
            status === "backlog"
          );
        }
      ).length;

    return {
      total: visibleTasks.length,
      completed,
      inProgress,
      pending,
    };
  }, [visibleTasks]);

  /* =======================================================
     PROJECT ACTIVITY
  ======================================================= */

  const activityBars = useMemo(() => {
    if (visibleTasks.length === 0) {
      return Array.from(
        { length: 30 },
        () => 0
      );
    }

    const completion =
      Math.round(
        (taskStats.completed /
          visibleTasks.length) *
          100
      );

    return Array.from(
      { length: 30 },
      (_, index) => {
        const variation =
          ((index * 17) % 28) -
          12;

        return Math.min(
          100,
          Math.max(
            15,
            completion +
              variation
          )
        );
      }
    );
  }, [
    visibleTasks.length,
    taskStats.completed,
  ]);

  /* =======================================================
     TEAM ROLE OVERVIEW
  ======================================================= */

  const teamRoleStats =
    useMemo(() => {
      const developers =
        teamMembers.filter(
          (member) => {
            const role =
              member.role?.toLowerCase() ||
              "";

            return (
              role.includes(
                "developer"
              ) ||
              role.includes(
                "software"
              ) ||
              role.includes(
                "engineer"
              )
            );
          }
        ).length;

      const designers =
        teamMembers.filter(
          (member) => {
            const role =
              member.role?.toLowerCase() ||
              "";

            return (
              role.includes(
                "designer"
              ) ||
              role.includes("ui") ||
              role.includes("ux")
            );
          }
        ).length;

      const managers =
        teamMembers.filter(
          (member) => {
            const role =
              member.role?.toLowerCase() ||
              "";

            return role.includes(
              "manager"
            );
          }
        ).length;

      const qa =
        teamMembers.filter(
          (member) => {
            const role =
              member.role?.toLowerCase() ||
              "";

            return (
              role.includes("qa") ||
              role.includes(
                "quality"
              ) ||
              role.includes(
                "tester"
              )
            );
          }
        ).length;

      const known =
        developers +
        designers +
        managers +
        qa;

      const other = Math.max(
        teamMembers.length -
          known,
        0
      );

      return {
        developers,
        designers,
        managers,
        qa,
        other,
        total:
          teamMembers.length,
      };
    }, [teamMembers]);

  /* =======================================================
     DOMAIN OVERVIEW
  ======================================================= */

  const domainStats =
    useMemo(() => {
      const domains: Record<
        string,
        number
      > = {};

      visibleProjects.forEach(
        (project) => {
          const domain =
            project.domain?.trim();

          if (!domain) {
            return;
          }

          domains[domain] =
            (domains[domain] || 0) +
            1;
        }
      );

      return Object.entries(domains)
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5);
    }, [visibleProjects]);

  /* =======================================================
     TEAM GRADIENT
  ======================================================= */

  const teamGradient =
    useMemo(() => {
      return createTeamGradient(
        teamRoleStats
      );
    }, [teamRoleStats]);

  /* =======================================================
     SCHEDULE
  ======================================================= */

  const scheduleTasks =
    useMemo(() => {
      const selectedDate =
        scheduleDate
          .toISOString()
          .split("T")[0];

      const exactTasks =
        visibleTasks.filter(
          (task) => {
            if (!task.due_date) {
              return false;
            }

            return (
              task.due_date.split(
                "T"
              )[0] === selectedDate
            );
          }
        );

      if (exactTasks.length > 0) {
        return exactTasks.slice(
          0,
          8
        );
      }

      return visibleTasks
        .filter(
          (task) =>
            task.due_date
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
    }, [
      visibleTasks,
      scheduleDate,
    ]);

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
    setScheduleDate(
      (current) => {
        const date =
          new Date(current);

        date.setDate(
          date.getDate() +
            amount
        );

        return date;
      }
    );
  };

  /* =======================================================
     ROLE DESCRIPTION
  ======================================================= */

  const roleDescription =
    isExecutiveManager
      ? "Full workspace overview"
      : isSystemAdministrator
      ? "System-wide workspace overview"
      : isProjectManager
      ? "Projects assigned to you"
      : isMember
      ? "Your assigned work"
      : "Workspace overview";

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              size={24}
              className="animate-spin text-[#557bd2]"
            />

            <p className="text-[13px] font-normal text-slate-500">
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
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <AlertCircle
              className="mx-auto text-red-500"
              size={30}
            />

            <h2 className="mt-3 text-[16px] font-medium text-slate-800">
              Unable to load dashboard
            </h2>

            <p className="mt-1 text-[13px] font-normal text-slate-500">
              {error}
            </p>

            <button
              onClick={
                handleRefresh
              }
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#557bd2] px-5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#456bc2]"
            >
              <RefreshCw
                size={14}
              />
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
    <main className="min-h-screen bg-slate-50 text-slate-700">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">

        {/* =================================================
            PAGE INTRO
        ================================================= */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#557bd2]">
              Workspace Overview
            </p>

            <h1 className="mt-1 text-[27px] font-medium tracking-tight text-slate-800 sm:text-[30px]">
              Dashboard
            </h1>

            <p className="mt-1 text-[13px] font-normal text-slate-500">
              Monitor your projects, teams and task progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-normal text-slate-500 sm:inline-flex">
              {roleDescription}
            </span>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>

        {/* =================================================
            PROJECTS OVERVIEW
        ================================================= */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">

          {/* HEADER */}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-medium text-slate-800">
                Projects Overview
              </h2>

              <p className="mt-1 text-[12px] font-normal text-slate-500">
                Track project progress based on completed tasks.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-normal text-slate-400">
                Projects
              </p>

              <p className="mt-0.5 text-[14px] font-medium text-slate-700">
                {projectOverview.length}
              </p>
            </div>
          </div>

          {/* GRAPH */}

          {projectOverview.length === 0 ? (
            <EmptyState
              title="No project data available"
              description="Projects and their task progress will appear here."
            />
          ) : (
            <div className="w-full">

              <div className="h-[235px] w-full">

                <div className="flex h-full items-end gap-3 sm:gap-5">

                  {projectOverview.map(
                    ({
                      project,
                      progress,
                      totalTasks,
                      completedTasks,
                      color,
                    }) => (
                      <button
                        key={
                          project.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedOverviewProject(
                            project
                          )
                        }
                        className="group flex h-full min-w-0 flex-1 flex-col justify-end text-left"
                      >

                        {/* PERCENTAGE */}

                        <div className="mb-2 text-center">
                          <span className="text-[13px] font-medium text-slate-700">
                            {progress}%
                          </span>
                        </div>

                        {/* BAR AREA */}

                        <div className="relative flex h-[175px] items-end justify-center">

                          {/* BACKGROUND BAR */}

                          <div className="absolute bottom-0 h-full w-[72%] rounded-t-lg bg-slate-50 transition group-hover:bg-slate-100" />

                          {/* ACTUAL BAR */}

                          <div
                            className="relative z-10 w-[72%] rounded-t-lg transition-all duration-500 group-hover:opacity-90"
                            style={{
                              height: `${Math.max(
                                progress,
                                4
                              )}%`,
                              backgroundColor:
                                color,
                            }}
                          />

                        </div>

                        {/* PROJECT NAME */}

                        <div className="mt-3 min-h-[34px] text-center">
                          <p className="truncate px-1 text-[11px] font-medium text-slate-700">
                            {project.name}
                          </p>

                          <p className="mt-0.5 text-[9px] font-normal text-slate-400">
                            {completedTasks}/
                            {totalTasks} tasks
                          </p>
                        </div>
                      </button>
                    )
                  )}

                </div>
              </div>

              {/* HINT */}

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-normal text-slate-400">
                <Eye size={12} />
                Click a project bar to view details
              </div>

            </div>
          )}

        </section>

        {/* =================================================
            ACTIVE PROJECTS
        ================================================= */}

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">

          <div className="mb-4 flex items-center justify-between">

            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-medium text-slate-800">
                Active Projects
              </h2>

              <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[10px] font-medium text-[#5577c4]">
                {activeProjects.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/projects"
                )
              }
              className="flex items-center gap-1 text-[12px] font-medium text-slate-500 transition hover:text-slate-800"
            >
              View all
              <ChevronRight
                size={14}
              />
            </button>
          </div>

          {activeProjects.length ===
          0 ? (
            <EmptyState
              title="No active projects"
              description="There are currently no active projects available."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeProjects.map(
                (project) => (
                  <ProjectCard
                    key={
                      project.id
                    }
                    project={
                      project
                    }
                    onView={() =>
                      router.push(
                        `/projects?projectId=${project.id}`
                      )
                    }
                  />
                )
              )}
            </div>
          )}

        </section>

        {/* =================================================
            LOWER DASHBOARD
        ================================================= */}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_0.78fr_0.78fr]">

          {/* =================================================
              PROJECT ACTIVITY
          ================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-[17px] font-medium text-slate-800">
                  Project Activity
                </h2>

                <p className="mt-1 text-[11px] font-normal text-slate-400">
                  Task completion overview
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/tasks"
                  )
                }
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                See more
                <ChevronRight
                  size={13}
                />
              </button>

            </div>

            {/* CHART */}

            <div className="flex h-[160px] items-end gap-[4px] overflow-hidden">

              {activityBars.map(
                (
                  height,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="flex h-full flex-1 items-end"
                  >
                    <div
                      className={`w-full rounded-t-[3px] ${
                        index %
                          5 ===
                        0
                          ? "bg-[#dce5f8]"
                          : "bg-[#557bd2]"
                      }`}
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>
                )
              )}

            </div>

            {/* FOOTER */}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

              <p className="text-[12px] font-normal text-slate-500">
                <span className="font-medium text-slate-800">
                  {
                    taskStats.completed
                  }
                </span>{" "}
                tasks completed
              </p>

              <div className="flex items-center gap-4 text-[10px] font-normal text-slate-500">

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

            {/* STATS */}

            <div className="mt-5 grid grid-cols-3 gap-2">

              <ActivityStat
                icon={
                  <CheckCircle2
                    size={14}
                  />
                }
                label="Completed"
                value={
                  taskStats.completed
                }
              />

              <ActivityStat
                icon={
                  <Clock3
                    size={14}
                  />
                }
                label="In Progress"
                value={
                  taskStats.inProgress
                }
              />

              <ActivityStat
                icon={
                  <Circle
                    size={14}
                  />
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-[17px] font-medium text-slate-800">
                Team Overview
              </h2>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/teams"
                  )
                }
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                View teams
                <ChevronRight
                  size={13}
                />
              </button>

            </div>

            {/* DONUT */}

            <div className="flex items-center justify-center gap-5">

              <div className="relative h-[132px] w-[132px] shrink-0">

                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      teamGradient,
                  }}
                />

                <div className="absolute inset-[24px] flex flex-col items-center justify-center rounded-full bg-white">

                  <span className="text-[20px] font-medium text-slate-800">
                    {
                      teamRoleStats.total
                    }
                  </span>

                  <span className="mt-0.5 text-[9px] font-normal text-slate-400">
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

                <p className="text-[11px] font-medium text-slate-600">
                  Project Domains
                </p>

                <span className="text-[10px] font-normal text-slate-400">
                  {domainStats.length}{" "}
                  domains
                </span>

              </div>

              {domainStats.length ===
              0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                  <p className="text-[10px] font-normal text-slate-400">
                    No project domains available
                  </p>
                </div>
              ) : (
                <div className="space-y-2">

                  {domainStats.map(
                    ([
                      domain,
                      count,
                    ]) => (
                      <div
                        key={
                          domain
                        }
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <span className="truncate text-[10px] font-normal text-slate-600">
                          {domain}
                        </span>

                        <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[9px] font-medium text-[#5577c4]">
                          {count}{" "}
                          {count ===
                          1
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

              <div className="rounded-lg border border-[#e5ebfa] bg-[#f6f8ff] px-3 py-3">
                <p className="text-[18px] font-medium text-slate-800">
                  {teams.length}
                </p>

                <p className="mt-0.5 text-[10px] font-normal text-slate-500">
                  Active Teams
                </p>
              </div>

              <div className="rounded-lg border border-[#eee4f2] bg-[#faf7fc] px-3 py-3">
                <p className="text-[18px] font-medium text-slate-800">
                  {
                    teamRoleStats.developers
                  }
                </p>

                <p className="mt-0.5 text-[10px] font-normal text-slate-500">
                  Developers
                </p>
              </div>

            </div>

          </section>

          {/* =================================================
              TASK SCHEDULE
          ================================================= */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            {/* HEADER */}

            <div className="p-5 pb-3 sm:p-6 sm:pb-3">

              <div className="flex items-center justify-between">

                <h2 className="text-[17px] font-medium text-slate-800">
                  Task Schedule
                </h2>

                <div className="flex items-center gap-1">

                  <button
                    type="button"
                    onClick={() =>
                      changeScheduleDate(
                        -1
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                  >
                    <ChevronLeft
                      size={14}
                    />
                  </button>

                  <span className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                    {
                      formattedScheduleDate
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      changeScheduleDate(
                        1
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                  >
                    <ChevronRight
                      size={14}
                    />
                  </button>

                </div>

              </div>

            </div>

            {/* SCHEDULE */}

            <div className="max-h-[330px] overflow-y-auto px-5 sm:px-6">

              {scheduleTasks.length ===
              0 ? (
                <div className="flex min-h-[230px] items-center justify-center">

                  <div className="text-center">

                    <CalendarDays
                      size={27}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-[12px] font-medium text-slate-500">
                      No scheduled tasks
                    </p>

                    <p className="mt-1 text-[10px] font-normal text-slate-400">
                      Tasks with due dates will appear here.
                    </p>

                  </div>

                </div>
              ) : (
                <div className="relative">

                  <div className="absolute bottom-0 left-[67px] top-0 w-px bg-slate-200" />

                  {scheduleTasks.map(
                    (
                      task,
                      index
                    ) => (
                      <ScheduleItem
                        key={
                          task.id ||
                          `${task.name}-${index}`
                        }
                        task={task}
                        index={
                          index
                        }
                        projects={
                          visibleProjects
                        }
                      />
                    )
                  )}

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="border-t border-slate-100 p-4 sm:p-5">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/Schedule"
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
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

      {/* =====================================================
          PROJECT OVERVIEW MODAL
      ===================================================== */}

      {selectedOverviewProject && (
        <ProjectOverviewModal
          project={
            selectedOverviewProject
          }
          tasks={visibleTasks}
          onClose={() =>
            setSelectedOverviewProject(
              null
            )
          }
          onOpen={() =>
            router.push(
              `/projects?projectId=${selectedOverviewProject.id}`
            )
          }
        />
      )}

    </main>
  );
}

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
  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const status =
    project.status ||
    "Unassigned";

  const statusClass =
    getProjectStatusClass(
      status
    );

  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(
        project.progress
      ) || 0
    )
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300">

        {/* VISUAL HEADER */}

        <div className="relative h-[112px] overflow-hidden bg-slate-50">

          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#557bd2]/5" />

          <div className="absolute right-5 top-7 h-16 w-16 rotate-12 rounded-xl border border-white bg-white/60" />

          <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#557bd2]">
            <FolderKanban
              size={16}
            />
          </div>

          <span
            className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[9px] font-medium ${statusClass}`}
          >
            {status}
          </span>

          <div className="absolute bottom-4 left-4 right-4">

            <h3 className="max-w-[78%] truncate text-[14px] font-medium text-slate-800">
              {project.name}
            </h3>

            <p className="mt-1 line-clamp-1 max-w-[90%] text-[10px] font-normal leading-4 text-slate-500">
              {description}
            </p>

          </div>

        </div>

        {/* INFORMATION */}

        <div className="p-4">

          <div className="grid grid-cols-2 gap-4">

            <div>
              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Deadline
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <CalendarDays
                  size={12}
                  className="text-slate-400"
                />

                <span className="text-[11px] font-medium text-slate-600">
                  {project.deadline
                    ? formatDate(
                        project.deadline
                      )
                    : "Not set"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Domain
              </p>

              <p className="mt-1 truncate text-[11px] font-medium text-slate-600">
                {project.domain ||
                  "General"}
              </p>
            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-4">

            <div className="mb-1.5 flex items-center justify-between">

              <span className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Progress
              </span>

              <span className="text-[11px] font-medium text-slate-700">
                {progress}%
              </span>

            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-[#557bd2] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          {/* MANAGER */}

          <div className="mt-4 flex items-center">

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[8px] font-medium text-slate-600">
              {getInitials(
                project.manager_name ||
                  "PM"
              )}
            </div>

            <div className="ml-2 min-w-0">

              <p className="text-[9px] font-normal text-slate-400">
                Project Manager
              </p>

              <p className="truncate text-[11px] font-medium text-slate-600">
                {project.manager_name ||
                  "Not assigned"}
              </p>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="mt-4 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={
                onView
              }
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] py-2.5 text-[10px] font-medium text-[#5577c4] transition hover:bg-[#e1e9ff]"
            >
              <Eye
                size={13}
              />
              View Project
            </button>

            <button
              type="button"
              onClick={() =>
                setDetailsOpen(
                  true
                )
              }
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Eye
                size={13}
              />
              Details
            </button>

          </div>

        </div>

      </div>

      {/* DETAILS */}

      {detailsOpen && (
        <ProjectDetailsModal
          project={project}
          onClose={() =>
            setDetailsOpen(
              false
            )
          }
          onOpen={onView}
        />
      )}
    </>
  );
}

/* =========================================================
   PROJECT DETAILS MODAL
========================================================= */

function ProjectDetailsModal({
  project,
  onClose,
  onOpen,
}: {
  project: Project;
  onClose: () => void;
  onOpen: () => void;
}) {
  const status =
    project.status ||
    "Unassigned";

  const statusClass =
    getProjectStatusClass(
      status
    );

  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(
        project.progress
      ) || 0
    )
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]"
      onClick={
        onClose
      }
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="border-b border-slate-200 px-5 py-4">

          <div className="flex items-start justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#557bd2]">
                <FolderKanban
                  size={19}
                />
              </div>

              <div>

                <h2 className="text-[16px] font-medium text-slate-800">
                  {project.name}
                </h2>

                <p className="mt-0.5 text-[11px] font-normal text-slate-400">
                  Project Details
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X
                size={16}
              />
            </button>

          </div>

        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">

              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Status
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${statusClass}`}
              >
                {status}
              </span>

            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">

              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Progress
              </p>

              <p className="mt-1 text-[20px] font-medium text-slate-800">
                {progress}%
              </p>

            </div>

          </div>

          <div className="mt-4 rounded-lg border border-slate-200 p-4">

            <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
              Description
            </p>

            <p className="mt-2 whitespace-pre-wrap text-[12px] font-normal leading-5 text-slate-600">
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
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">

              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                Created By
              </p>

              <p className="mt-1 text-[11px] font-medium text-slate-700">
                {project.creator_name}
              </p>

              {project.creator_role && (
                <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                  {project.creator_role}
                </p>
              )}

            </div>
          )}

        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-4">

          <button
            type="button"
            onClick={
              onOpen
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#557bd2] py-2.5 text-[11px] font-medium text-white transition hover:bg-[#456bc2]"
          >
            <Eye
              size={14}
            />
            Open Project
          </button>

        </div>

      </div>
    </div>
  );
}

/* =========================================================
   PROJECT OVERVIEW MODAL
========================================================= */

function ProjectOverviewModal({
  project,
  tasks,
  onClose,
  onOpen,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
  onOpen: () => void;
}) {
  const projectTasks =
    tasks.filter(
      (task) =>
        String(
          task.project_id
        ) === String(
          project.id
        )
    );

  const completedTasks =
    projectTasks.filter(
      (task) => {
        const status =
          task.status
            ?.toLowerCase()
            .trim();

        return (
          status === "done" ||
          status ===
            "completed"
        );
      }
    ).length;

  const totalTasks =
    projectTasks.length;

  const progress =
    totalTasks > 0
      ? Math.round(
          (completedTasks /
            totalTasks) *
            100
        )
      : 0;

  const status =
    project.status ||
    "Unassigned";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]"
      onClick={
        onClose
      }
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="border-b border-slate-200 px-5 py-4">

          <div className="flex items-start justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf2ff] text-[#557bd2]">
                <FolderKanban
                  size={19}
                />
              </div>

              <div>

                <p className="text-[10px] font-normal uppercase tracking-wide text-[#557bd2]">
                  Project Overview
                </p>

                <h2 className="mt-0.5 text-[16px] font-medium text-slate-800">
                  {project.name}
                </h2>

              </div>

            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X
                size={16}
              />
            </button>

          </div>

        </div>

        {/* CONTENT */}

        <div className="p-5">

          <div className="grid grid-cols-3 gap-3">

            <ModalStat
              label="Progress"
              value={`${progress}%`}
            />

            <ModalStat
              label="Tasks"
              value={`${totalTasks}`}
            />

            <ModalStat
              label="Completed"
              value={`${completedTasks}`}
            />

          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <span className="text-[10px] font-normal text-slate-500">
                Task completion
              </span>

              <span className="text-[11px] font-medium text-slate-700">
                {completedTasks} of{" "}
                {totalTasks}
              </span>

            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-[#557bd2] transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <ProjectDetailItem
              label="Status"
              value={status}
            />

            <ProjectDetailItem
              label="Priority"
              value={
                project.priority ||
                "Not specified"
              }
            />

            <ProjectDetailItem
              label="Manager"
              value={
                project.manager_name ||
                "Not assigned"
              }
            />

            <ProjectDetailItem
              label="Deadline"
              value={
                project.deadline
                  ? formatDate(
                      project.deadline
                    )
                  : "Not set"
              }
            />

          </div>

          {project.about_description && (
            <div className="mt-4 rounded-lg border border-slate-200 p-4">

              <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
                About Project
              </p>

              <p className="mt-2 text-[12px] font-normal leading-5 text-slate-600">
                {
                  project.about_description
                }
              </p>

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="border-t border-slate-200 bg-slate-50 p-4">

          <button
            type="button"
            onClick={
              onOpen
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#557bd2] py-2.5 text-[11px] font-medium text-white transition hover:bg-[#456bc2]"
          >
            <Eye
              size={14}
            />
            Open Project
          </button>

        </div>

      </div>
    </div>
  );
}

/* =========================================================
   MODAL STAT
========================================================= */

function ModalStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">

      <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[18px] font-medium text-slate-800">
        {value}
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">

      <p className="text-[9px] font-normal uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-medium text-slate-700">
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

      <span className="whitespace-nowrap text-[10px] font-normal text-slate-500">
        {label}
      </span>

      <span className="text-[10px] font-medium text-slate-700">
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">

      <div className="flex items-center gap-1.5 text-slate-400">

        {icon}

        <span className="text-[9px] font-normal">
          {label}
        </span>

      </div>

      <p className="mt-1 text-[16px] font-medium text-slate-800">
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
  const project =
    projects.find(
      (item) =>
        String(item.id) ===
        String(
          task.project_id
        )
    );

  const taskName =
    task.name ||
    task.title ||
    "Untitled Task";

  const initials =
    getInitials(
      taskName
    );

  const dueDate =
    task.due_date
      ? new Date(
          task.due_date
        )
      : null;

  const time =
    dueDate &&
    !Number.isNaN(
      dueDate.getTime()
    )
      ? dueDate.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute:
              "2-digit",
          }
        )
      : "--:--";

  const type =
    task.status ||
    "Pending";

  return (
    <div className="relative flex min-h-[50px] items-center">

      {/* TIME */}

      <div className="w-[56px] shrink-0 text-[10px] font-normal text-slate-400">
        {time}
      </div>

      {/* DOT */}

      <div className="relative z-10 mx-[7px] flex h-2 w-2 shrink-0 items-center justify-center rounded-full border border-white bg-slate-300" />

      {/* TASK */}

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-2">

        <div className="flex min-w-0 items-center gap-2">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[8px] font-medium text-slate-600">
            {initials}
          </div>

          <div className="min-w-0">

            <span className="block truncate text-[10px] font-medium text-slate-700">
              {taskName}
            </span>

            {project && (
              <span className="block truncate text-[9px] font-normal text-slate-400">
                {project.name}
              </span>
            )}

          </div>

        </div>

        <TaskBadge
          type={type}
        />

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
    type
      .toLowerCase()
      .trim();

  if (
    normalized.includes(
      "review"
    )
  ) {
    className =
      "bg-[#f8f0e4] text-[#ad8144]";
  } else if (
    normalized.includes(
      "progress"
    )
  ) {
    className =
      "bg-[#edf2ff] text-[#5577c2]";
  } else if (
    normalized.includes(
      "done"
    ) ||
    normalized.includes(
      "complete"
    )
  ) {
    className =
      "bg-[#eaf5ed] text-[#438759]";
  } else if (
    normalized.includes(
      "todo"
    ) ||
    normalized.includes(
      "to do"
    ) ||
    normalized.includes(
      "pending"
    ) ||
    normalized.includes(
      "backlog"
    )
  ) {
    className =
      "bg-[#f3eafa] text-[#85579a]";
  }

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-medium ${className}`}
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
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">

      <Users
        size={25}
        className="mx-auto text-slate-300"
      />

      <p className="mt-2 text-[12px] font-medium text-slate-600">
        {title}
      </p>

      <p className="mt-1 text-[10px] font-normal text-slate-400">
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
        word
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}

/* =========================================================
   PROJECT STATUS
========================================================= */

function getProjectStatusClass(
  status: string
) {
  const normalized =
    status
      .toLowerCase()
      .trim();

  if (
    normalized.includes(
      "progress"
    )
  ) {
    return "bg-[#edf2ff] text-[#5577c2]";
  }

  if (
    normalized.includes(
      "done"
    ) ||
    normalized.includes(
      "complete"
    )
  ) {
    return "bg-[#eaf5ed] text-[#438759]";
  }

  if (
    normalized.includes(
      "pause"
    )
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

  return "bg-slate-100 text-slate-500";
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
    (stats.developers /
      total) *
    360;

  const designerDeg =
    developerDeg +
    (stats.designers /
      total) *
      360;

  const managerDeg =
    designerDeg +
    (stats.managers /
      total) *
      360;

  const qaDeg =
    managerDeg +
    (stats.qa /
      total) *
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
