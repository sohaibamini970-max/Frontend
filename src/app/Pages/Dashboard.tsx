"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  role?: string;
  user_role?: string;
  full_name?: string;
  name?: string;
  email?: string;
};

/* =========================================================
   API
========================================================= */

const API_BASE =
  "https://backend-five-swart-88.vercel.app/api";

/* =========================================================
   PROJECT GRAPH COLORS
========================================================= */

const PROJECT_OVERVIEW_COLORS = [
  {
    bar: "from-[#3b82f6] to-[#2563eb]",
    icon: "bg-[#eff6ff] text-[#2563eb]",
  },
  {
    bar: "from-[#34c759] to-[#239447]",
    icon: "bg-[#ecfdf3] text-[#239447]",
  },
  {
    bar: "from-[#8b5cf6] to-[#6d3fd1]",
    icon: "bg-[#f5f3ff] text-[#6d3fd1]",
  },
  {
    bar: "from-[#f59e0b] to-[#d97706]",
    icon: "bg-[#fff7e6] text-[#d97706]",
  },
  {
    bar: "from-[#14b8a6] to-[#0f8f83]",
    icon: "bg-[#ecfdf9] text-[#0f8f83]",
  },
  {
    bar: "from-[#ec4899] to-[#c02670]",
    icon: "bg-[#fdf2f8] text-[#c02670]",
  },
  {
    bar: "from-[#315da5] to-[#172d61]",
    icon: "bg-[#eef3ff] text-[#315da5]",
  },
  {
    bar: "from-[#eabf35] to-[#ca9415]",
    icon: "bg-[#fffbea] text-[#ca9415]",
  },
];

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [scheduleDate, setScheduleDate] =
    useState(new Date());

  const [
    selectedOverviewProject,
    setSelectedOverviewProject,
  ] = useState<Project | null>(null);

  /* =======================================================
     CURRENT USER / ROLE
  ======================================================= */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (!storedUser) {
        return;
      }

      const parsedUser =
        JSON.parse(storedUser);

      setCurrentUser({
        id:
          parsedUser?.id ||
          parsedUser?.user_id ||
          undefined,

        user_id:
          parsedUser?.user_id ||
          parsedUser?.id ||
          undefined,

        role:
          parsedUser?.role ||
          parsedUser?.user_role ||
          undefined,

        user_role:
          parsedUser?.user_role ||
          parsedUser?.role ||
          undefined,

        full_name:
          parsedUser?.full_name ||
          parsedUser?.name ||
          undefined,

        name:
          parsedUser?.name ||
          parsedUser?.full_name ||
          undefined,

        email:
          parsedUser?.email ||
          undefined,
      });
    } catch (err) {
      console.error(
        "Unable to read logged-in user:",
        err
      );
    }
  }, []);

  /* =======================================================
     ROLE NORMALIZATION
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
    normalizedRole ===
      "system administrator" ||
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

      /* =====================================================
         PROJECTS
      ===================================================== */

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

      const validProjects =
        Array.isArray(loadedProjects)
          ? loadedProjects
          : [];

      setProjects(validProjects);

      /* =====================================================
         TEAMS
      ===================================================== */

      const [
        teamsResponse,
        membersResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/teams`, {
          headers,
        }),
        fetch(`${API_BASE}/teams/members`, {
          headers,
        }),
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

      /* =====================================================
         TASKS
      ===================================================== */

      const taskRequests =
        validProjects.map(
          async (project) => {
            try {
              const response =
                await fetch(
                  `${API_BASE}/tasks/project/${project.id}`,
                  {
                    headers,
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
     ROLE-BASED PROJECTS
  ======================================================= */

  const visibleProjects = useMemo(() => {
    if (isManagement) {
      return projects;
    }

    if (isProjectManager) {
      if (!currentUserId) {
        return [];
      }

      return projects.filter(
        (project) =>
          String(project.manager_id || "") ===
          String(currentUserId)
      );
    }

    if (isMember) {
      if (!currentUserId) {
        return [];
      }

      const memberProjectIds =
        new Set(
          tasks
            .filter(
              (task) =>
                String(
                  task.assignee_id || ""
                ) ===
                String(currentUserId)
            )
            .map(
              (task) =>
                String(
                  task.project_id || ""
                )
            )
        );

      return projects.filter(
        (project) =>
          memberProjectIds.has(
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
     ROLE-BASED TASKS
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

      return tasks.filter(
        (task) =>
          projectIds.has(
            String(
              task.project_id || ""
            )
          )
      );
    }

    if (isMember) {
      if (!currentUserId) {
        return [];
      }

      return tasks.filter(
        (task) =>
          String(
            task.assignee_id || ""
          ) ===
          String(currentUserId)
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
     ROLE DESCRIPTION
  ======================================================= */

  const roleDescription = useMemo(() => {
    if (isExecutiveManager) {
      return "Organization-wide project and task overview.";
    }

    if (isSystemAdministrator) {
      return "Complete system-wide project and task overview.";
    }

    if (isProjectManager) {
      return "Overview of projects assigned to you and their tasks.";
    }

    if (isMember) {
      return "Overview of your assigned projects and tasks.";
    }

    return "Monitor your projects, teams and task progress.";
  }, [
    isExecutiveManager,
    isSystemAdministrator,
    isProjectManager,
    isMember,
  ]);

  /* =======================================================
     ACTIVE PROJECTS
  ======================================================= */

  const activeProjects = useMemo(() => {
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
     PROJECTS OVERVIEW
  ======================================================= */

  const projectOverview = useMemo(() => {
    return visibleProjects.map(
      (project) => {
        const projectTasks =
          visibleTasks.filter(
            (task) =>
              String(
                task.project_id || ""
              ) === String(project.id)
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
                status === "completed"
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
        };
      }
    );
  }, [
    visibleProjects,
    visibleTasks,
  ]);

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
            status === "completed"
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
            status === "in progress" ||
            status === "in_progress"
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
     TEAM ROLE OVERVIEW
  ======================================================= */

  const teamRoleStats = useMemo(() => {
    const developers =
      teamMembers.filter(
        (member) => {
          const role =
            member.role?.toLowerCase();

          return (
            role.includes("developer") ||
            role.includes("software") ||
            role.includes("engineer")
          );
        }
      ).length;

    const designers =
      teamMembers.filter(
        (member) => {
          const role =
            member.role?.toLowerCase();

          return (
            role.includes("designer") ||
            role.includes("ui") ||
            role.includes("ux")
          );
        }
      ).length;

    const managers =
      teamMembers.filter(
        (member) => {
          const role =
            member.role?.toLowerCase();

          return role.includes("manager");
        }
      ).length;

    const qa =
      teamMembers.filter(
        (member) => {
          const role =
            member.role?.toLowerCase();

          return (
            role.includes("qa") ||
            role.includes("quality") ||
            role.includes("tester")
          );
        }
      ).length;

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

    visibleProjects.forEach(
      (project) => {
        const domain =
          project.domain?.trim();

        if (!domain) {
          return;
        }

        domains[domain] =
          (domains[domain] || 0) + 1;
      }
    );

    return Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [visibleProjects]);

  /* =======================================================
     SCHEDULE
  ======================================================= */

  const scheduleTasks = useMemo(() => {
    const selectedDate =
      scheduleDate
        .toISOString()
        .split("T")[0];

    const filtered =
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

    if (filtered.length > 0) {
      return filtered.slice(0, 8);
    }

    return visibleTasks
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
      <main className="min-h-screen bg-[#d1d1d1]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <RefreshCw
                size={22}
                className="animate-spin text-[#315da5]"
              />
            </div>

            <p className="text-[15px] font-bold text-[#263746]">
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
      <main className="min-h-screen bg-[#d1d1d1]">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">

          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle
                className="text-red-500"
                size={28}
              />
            </div>

            <h2 className="mt-5 text-[21px] font-bold text-[#172633]">
              Unable to load dashboard
            </h2>

            <p className="mx-auto mt-2 max-w-[500px] text-[14px] leading-6 text-[#596775]">
              {error}
            </p>

            <button
              onClick={handleRefresh}
              className="mt-6 rounded-xl bg-[#315da5] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#244b8e]"
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
    <main className="min-h-screen bg-[#d1d1d1]">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="mb-3 flex flex-wrap items-center gap-3">

              <span className="rounded-lg bg-[#315da5] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-white">
                Workspace Overview
              </span>

              {currentUser.role && (
                <span className="rounded-lg border border-[#cbd7e7] bg-white px-3 py-1.5 text-[11px] font-bold text-[#315da5]">
                  {currentUser.role}
                </span>
              )}

            </div>

            <h1 className="text-[36px] font-extrabold tracking-tight text-[#172633] sm:text-[40px]">
              Dashboard
            </h1>

            <p className="mt-2 max-w-[720px] text-[15px] font-medium leading-6 text-[#465461]">
              {roleDescription}
            </p>

          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-fit items-center gap-2.5 rounded-xl bg-[#172b3a] px-5 py-3.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#263f50] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Dashboard
          </button>

        </div>

        {/* =================================================
            ROW 1 — PROJECTS OVERVIEW
        ================================================= */}

        <section className="mb-7 overflow-hidden rounded-2xl border border-[#cfd7df] bg-white shadow-[0_2px_10px_rgba(24,39,54,0.05)]">

          {/* HEADER */}

          <div className="flex flex-col gap-4 border-b border-[#e5e9ed] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">

            <div>

              <div className="flex items-center gap-3">

                <span className="rounded-lg bg-[#315da5] px-3.5 py-2">
                  <h2 className="text-[18px] font-extrabold text-white">
                    Projects Overview
                  </h2>
                </span>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#edf3ff] px-2 text-[12px] font-extrabold text-[#315da5]">
                  {projectOverview.length}
                </span>

              </div>

              <p className="mt-2 text-[13px] font-medium text-[#596775]">
                Task completion progress for each visible project
              </p>

            </div>

            <div className="flex w-fit items-center gap-2.5 rounded-lg border border-[#dce2e8] bg-[#f8fafc] px-4 py-2.5">

              <CalendarDays
                size={15}
                className="text-[#315da5]"
              />

              <span className="text-[12px] font-bold text-[#465461]">
                Data as of{" "}
                {new Date().toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>

            </div>

          </div>

          {/* EMPTY */}

          {projectOverview.length === 0 ? (

            <div className="flex min-h-[250px] items-center justify-center px-5">

              <EmptyState
                title={
                  isProjectManager
                    ? "No projects assigned to you"
                    : isMember
                    ? "No assigned projects yet"
                    : "No projects available"
                }
                description={
                  isProjectManager
                    ? "Projects assigned to you will appear here."
                    : isMember
                    ? "Projects will appear here when tasks are assigned to you."
                    : "Projects will appear here once they are created."
                }
              />

            </div>

          ) : (

            <div className="px-5 pb-6 pt-7 sm:px-7">

              {/* GRAPH */}

              <div className="relative">

                {/* HORIZONTAL GRID */}

                <div className="pointer-events-none absolute inset-x-0 bottom-[92px] top-0 flex flex-col justify-between">

                  <div className="h-px w-full border-t border-dashed border-[#e5e9ee]" />

                  <div className="h-px w-full border-t border-dashed border-[#e5e9ee]" />

                  <div className="h-px w-full border-t border-dashed border-[#e5e9ee]" />

                  <div className="h-px w-full border-t border-dashed border-[#e5e9ee]" />

                  <div className="h-px w-full border-t border-dashed border-[#e5e9ee]" />

                </div>

                <div className="relative grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

                  {projectOverview.map(
                    (
                      {
                        project,
                        totalTasks,
                        completedTasks,
                        progress,
                      },
                      index
                    ) => {

                      const color =
                        PROJECT_OVERVIEW_COLORS[
                          index %
                            PROJECT_OVERVIEW_COLORS.length
                        ];

                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() =>
                            setSelectedOverviewProject(
                              project
                            )
                          }
                          className="group flex min-w-0 flex-col items-center rounded-xl px-2 py-2 transition hover:bg-[#f8fafc]"
                        >

                          {/* PERCENTAGE */}

                          <div className="mb-3 flex h-7 items-center">

                            <span className="text-[17px] font-extrabold text-[#172633] group-hover:text-[#315da5]">
                              {progress}%
                            </span>

                          </div>

                          {/* BAR AREA */}

                          <div className="relative flex h-[150px] w-full items-end justify-center">

                            {/* BACKGROUND BAR */}

                            <div className="absolute bottom-0 h-full w-[22px] rounded-t-md bg-[#f2f5f8]" />

                            {/* ACTUAL BAR */}

                            <div
                              className={`relative z-10 w-[22px] rounded-t-md bg-gradient-to-t ${color.bar} shadow-[0_3px_8px_rgba(24,39,54,0.12)] transition-all duration-500 group-hover:-translate-y-1`}
                              style={{
                                height: `${Math.max(
                                  progress,
                                  progress === 0
                                    ? 3
                                    : 6
                                )}%`,
                              }}
                            />

                          </div>

                          {/* PROJECT ICON */}

                          <div
                            className={`mt-4 flex h-9 w-9 items-center justify-center rounded-lg ${color.icon} transition group-hover:scale-105`}
                          >
                            <FolderKanban size={16} />
                          </div>

                          {/* PROJECT NAME */}

                          <div className="mt-2 min-h-[42px] w-full px-1 text-center">

                            <p className="line-clamp-2 text-[13px] font-extrabold uppercase leading-[18px] text-[#243442]">
                              {project.name}
                            </p>

                          </div>

                          {/* TASK COUNT */}

                          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#e5e9ed] bg-[#f8fafc] px-2.5 py-1.5">

                            <CheckCircle2
                              size={14}
                              className="shrink-0 text-[#2f8a4f]"
                            />

                            <span className="text-[12px] font-bold text-[#4b5966]">
                              {completedTasks}/{totalTasks} completed
                            </span>

                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>

              {/* GRAPH LEGEND */}

              <div className="mt-6 flex justify-center">

                <div className="flex items-center gap-2 rounded-lg border border-[#e1e6eb] bg-[#fafbfd] px-4 py-2.5">

                  <Eye
                    size={15}
                    className="text-[#315da5]"
                  />

                  <span className="text-[12px] font-semibold text-[#53616d]">
                    Select a project bar to view details
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

                <span className="rounded-lg bg-[#2f8a4f] px-3.5 py-2">
                  <h2 className="text-[18px] font-extrabold text-white">
                    Active Projects
                  </h2>
                </span>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-[12px] font-extrabold text-[#315da5] shadow-sm">
                  {activeProjects.length}
                </span>

              </div>

              <p className="mt-2 text-[13px] font-medium text-[#465461]">
                Current projects requiring attention
              </p>

            </div>

            <button
              onClick={() =>
                router.push("/projects")
              }
              className="flex items-center gap-2 rounded-lg border border-[#cfd7df] bg-white px-4 py-2.5 text-[12px] font-bold text-[#3d4c59] shadow-sm transition hover:border-[#315da5] hover:text-[#315da5]"
            >
              View all projects
              <ChevronRight size={14} />
            </button>

          </div>

          {activeProjects.length === 0 ? (

            <EmptyState
              title={
                isProjectManager
                  ? "No active assigned projects"
                  : isMember
                  ? "No active projects assigned to you"
                  : "No active projects"
              }
              description={
                isProjectManager
                  ? "Active projects managed by you will appear here."
                  : isMember
                  ? "Projects with your assigned tasks will appear here."
                  : "There are currently no active projects available."
              }
            />

          ) : (

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {activeProjects.map(
                (project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
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
            ROW 3 — TEAM OVERVIEW
        ================================================= */}

        <section className="mb-7 overflow-hidden rounded-2xl border border-[#cfd7df] bg-white shadow-[0_2px_10px_rgba(24,39,54,0.05)]">

          <div className="flex items-center justify-between border-b border-[#e5e9ed] px-5 py-5 sm:px-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf3ff] text-[#315da5]">
                <Users size={19} />
              </div>

              <div>

                <h2 className="text-[19px] font-extrabold text-[#172633]">
                  Team Overview
                </h2>

                <p className="mt-1 text-[13px] font-medium text-[#596775]">
                  Team members, roles and project domains
                </p>

              </div>

            </div>

            <button
              onClick={() =>
                router.push("/teams")
              }
              className="flex items-center gap-2 rounded-lg bg-[#172b3a] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#263f50]"
            >
              View teams
              <ChevronRight size={13} />
            </button>

          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[0.8fr_1.2fr] sm:p-7">

            {/* TEAM DISTRIBUTION */}

            <div className="rounded-xl border border-[#e1e6eb] bg-[#fafbfd] p-6">

              <div className="mb-6">

                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#667481]">
                  Team Distribution
                </p>

                <p className="mt-1.5 text-[13px] font-medium text-[#596775]">
                  Current workforce composition
                </p>

              </div>

              <div className="flex items-center justify-center gap-9">

                <div className="relative h-[155px] w-[155px] shrink-0">

                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        createTeamGradient(
                          teamRoleStats
                        ),
                    }}
                  />

                  <div className="absolute inset-[28px] flex flex-col items-center justify-center rounded-full bg-white">

                    <span className="text-[27px] font-extrabold text-[#172633]">
                      {teamRoleStats.total}
                    </span>

                    <span className="mt-1 text-[10px] font-extrabold tracking-wide text-[#687581]">
                      MEMBERS
                    </span>

                  </div>

                </div>

                <div className="space-y-3">

                  <TeamItemNew
                    color="bg-[#557bd2]"
                    label="Developers"
                    value={
                      teamRoleStats.developers
                    }
                  />

                  <TeamItemNew
                    color="bg-[#438d5d]"
                    label="Designers"
                    value={
                      teamRoleStats.designers
                    }
                  />

                  <TeamItemNew
                    color="bg-[#be8944]"
                    label="Managers"
                    value={
                      teamRoleStats.managers
                    }
                  />

                  <TeamItemNew
                    color="bg-[#895a9d]"
                    label="QA Team"
                    value={
                      teamRoleStats.qa
                    }
                  />

                  <TeamItemNew
                    color="bg-[#d15b58]"
                    label="Other"
                    value={
                      teamRoleStats.other
                    }
                  />

                </div>

              </div>

            </div>

            {/* DOMAINS */}

            <div>

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#667481]">
                    Project Domains
                  </p>

                  <p className="mt-1.5 text-[13px] font-medium text-[#596775]">
                    Distribution across active work
                  </p>

                </div>

                <span className="rounded-lg bg-[#f1f4f7] px-3 py-1.5 text-[11px] font-bold text-[#53616d]">
                  {domainStats.length} domains
                </span>

              </div>

              {domainStats.length === 0 ? (

                <div className="rounded-xl border border-dashed border-[#cfd7df] bg-[#fafbfd] px-4 py-10 text-center">

                  <FolderKanban
                    size={25}
                    className="mx-auto text-[#9aa6b1]"
                  />

                  <p className="mt-3 text-[13px] font-bold text-[#596775]">
                    No project domains available
                  </p>

                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2">

                  {domainStats.map(
                    (
                      [
                        domain,
                        count,
                      ],
                      index
                    ) => (
                      <div
                        key={domain}
                        className="group flex items-center justify-between rounded-xl border border-[#e1e6eb] bg-white px-4 py-3.5 transition hover:border-[#c2d0e5] hover:bg-[#fafcff]"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white ${
                              index % 4 === 0
                                ? "bg-[#557bd2]"
                                : index % 4 === 1
                                ? "bg-[#438d5d]"
                                : index % 4 === 2
                                ? "bg-[#be8944]"
                                : "bg-[#895a9d]"
                            }`}
                          >
                            {domain
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span className="truncate text-[13px] font-bold text-[#3e4d5a]">
                            {domain}
                          </span>

                        </div>

                        <span className="ml-2 shrink-0 rounded-lg bg-[#f1f4f7] px-2.5 py-1.5 text-[11px] font-extrabold text-[#53616d]">
                          {count}
                        </span>

                      </div>
                    )
                  )}

                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="rounded-xl border border-[#dce5f4] bg-[#f2f6ff] p-5">

                  <div className="flex items-center gap-2">

                    <FolderKanban
                      size={16}
                      className="text-[#315da5]"
                    />

                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#53616d]">
                      Active Teams
                    </span>

                  </div>

                  <p className="mt-2 text-[27px] font-extrabold text-[#172633]">
                    {teams.length}
                  </p>

                </div>

                <div className="rounded-xl border border-[#e6dff0] bg-[#f8f3fc] p-5">

                  <div className="flex items-center gap-2">

                    <Users
                      size={16}
                      className="text-[#895a9d]"
                    />

                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#53616d]">
                      Developers
                    </span>

                  </div>

                  <p className="mt-2 text-[27px] font-extrabold text-[#172633]">
                    {
                      teamRoleStats.developers
                    }
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            ROLE TASK SUMMARY
        ================================================= */}

        <section className="mb-7 grid grid-cols-2 gap-4 md:grid-cols-4">

          <DashboardStat
            icon={<Circle size={17} />}
            label="Total Tasks"
            value={taskStats.total}
            className="bg-[#edf3ff]"
            iconClass="text-[#315da5]"
          />

          <DashboardStat
            icon={<CheckCircle2 size={17} />}
            label="Completed"
            value={taskStats.completed}
            className="bg-[#ecf8ef]"
            iconClass="text-[#2f8a4f]"
          />

          <DashboardStat
            icon={<Clock3 size={17} />}
            label="In Progress"
            value={taskStats.inProgress}
            className="bg-[#fff6e8]"
            iconClass="text-[#b7791f]"
          />

          <DashboardStat
            icon={<FolderKanban size={17} />}
            label="My Visible Projects"
            value={visibleProjects.length}
            className="bg-[#f5eff9]"
            iconClass="text-[#895a9d]"
          />

        </section>

        {/* =================================================
            ROW 4 — TASK SCHEDULE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-[#cfd7df] bg-white shadow-[0_2px_10px_rgba(24,39,54,0.05)]">

          <div className="flex flex-col gap-4 border-b border-[#e5e9ed] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5eff9] text-[#895a9d]">
                <CalendarDays size={19} />
              </div>

              <div>

                <h2 className="text-[19px] font-extrabold text-[#172633]">
                  Task Schedule
                </h2>

                <p className="mt-1 text-[13px] font-medium text-[#596775]">
                  Upcoming deadlines and scheduled tasks
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() =>
                  changeScheduleDate(-1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d6dde4] bg-white text-[#53616d] transition hover:bg-[#f4f7fa]"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="min-w-[150px] rounded-lg border border-[#dfe5ea] bg-[#f7f9fb] px-4 py-2.5 text-center">

                <span className="text-[12px] font-bold text-[#3d4b58]">
                  {formattedScheduleDate}
                </span>

              </div>

              <button
                onClick={() =>
                  changeScheduleDate(1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d6dde4] bg-white text-[#53616d] transition hover:bg-[#f4f7fa]"
              >
                <ChevronRight size={16} />
              </button>

            </div>

          </div>

          <div className="max-h-[450px] overflow-y-auto px-5 sm:px-7">

            {scheduleTasks.length === 0 ? (

              <div className="flex min-h-[300px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#f3f5f7]">

                    <CalendarDays
                      size={25}
                      className="text-[#8996a1]"
                    />

                  </div>

                  <p className="mt-4 text-[14px] font-bold text-[#53616d]">
                    No scheduled tasks
                  </p>

                  <p className="mt-1.5 text-[12px] font-medium text-[#7b8791]">
                    {isMember
                      ? "Your tasks with due dates will appear here."
                      : "Tasks with due dates will appear here."}
                  </p>

                </div>

              </div>

            ) : (

              <div className="relative py-5">

                <div className="absolute bottom-0 left-[72px] top-0 w-px bg-[#e1e6eb]" />

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
                        visibleProjects
                      }
                    />
                  )
                )}

              </div>

            )}

          </div>

          <div className="border-t border-[#e5e9ed] bg-[#fafbfd] p-5 sm:p-6">

            <button
              onClick={() =>
                router.push("/Schedule")
              }
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#172b3a] py-3.5 text-[12px] font-bold text-white transition hover:bg-[#263f50]"
            >
              <CalendarDays size={15} />
              View Full Schedule
              <ChevronRight size={14} />
            </button>

          </div>

        </section>

      </div>

      {/* =================================================
          PROJECT OVERVIEW DETAILS MODAL
      ================================================= */}

      {selectedOverviewProject &&
        (() => {
          const project =
            selectedOverviewProject;

          const projectTasks =
            visibleTasks.filter(
              (task) =>
                String(
                  task.project_id || ""
                ) === String(project.id)
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
                  status === "completed"
                );
              }
            ).length;

          const inProgressTasks =
            projectTasks.filter(
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

          const progress =
            totalTasks > 0
              ? Math.round(
                  (completedTasks /
                    totalTasks) *
                    100
                )
              : 0;

          return (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/60 px-4 backdrop-blur-sm"
              onClick={() =>
                setSelectedOverviewProject(
                  null
                )
              }
            >

              <div
                className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-[#dce2e8] bg-white shadow-2xl"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                {/* MODAL HEADER */}

                <div className="relative overflow-hidden bg-[#172b3a] px-6 py-6">

                  <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#315da5]/25" />

                  <div className="absolute -bottom-16 left-20 h-28 w-28 rounded-full bg-[#2f8a4f]/10" />

                  <div className="relative flex items-start justify-between">

                    <div className="flex min-w-0 items-center gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                        <FolderKanban size={22} />
                      </div>

                      <div className="min-w-0">

                        <h2 className="truncate text-[20px] font-extrabold text-white">
                          {project.name}
                        </h2>

                        <p className="mt-1 text-[12px] font-medium text-white/70">
                          Project Progress Details
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOverviewProject(
                          null
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                      <X size={17} />
                    </button>

                  </div>

                </div>

                {/* MODAL BODY */}

                <div className="max-h-[68vh] overflow-y-auto p-6">

                  {/* PROGRESS */}

                  <div className="rounded-xl border border-[#dfe5ea] bg-[#fafbfd] p-6">

                    <div className="flex items-end justify-between">

                      <div>

                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#687581]">
                          Task Completion
                        </p>

                        <p className="mt-1 text-[34px] font-extrabold text-[#172633]">
                          {progress}%
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-[11px] font-semibold text-[#687581]">
                          Completed
                        </p>

                        <p className="text-[17px] font-extrabold text-[#2f8a4f]">
                          {completedTasks} /{" "}
                          {totalTasks}
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e5e9ed]">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#315da5] to-[#6f91d8] transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* STATS */}

                  <div className="mt-5 grid grid-cols-3 gap-3">

                    <ModalStat
                      icon={
                        <Circle size={14} />
                      }
                      label="Total Tasks"
                      value={totalTasks}
                      iconClass="text-[#315da5]"
                    />

                    <ModalStat
                      icon={
                        <CheckCircle2
                          size={14}
                        />
                      }
                      label="Completed"
                      value={completedTasks}
                      iconClass="text-[#2f8a4f]"
                    />

                    <ModalStat
                      icon={
                        <Clock3
                          size={14}
                        />
                      }
                      label="In Progress"
                      value={inProgressTasks}
                      iconClass="text-[#b7791f]"
                    />

                  </div>

                  {/* PROJECT INFORMATION */}

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <ProjectDetailItem
                      label="Status"
                      value={
                        project.status ||
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
                      label="Domain"
                      value={
                        project.domain ||
                        "General"
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

                  </div>

                  {(project.about_description ||
                    project.about_title) && (
                    <div className="mt-5 rounded-xl border border-[#e1e6eb] bg-[#fafbfd] p-5">

                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#687581]">
                        Description
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-6 text-[#4d5b67]">
                        {project.about_description ||
                          project.about_title}
                      </p>

                    </div>
                  )}

                </div>

                {/* MODAL FOOTER */}

                <div className="border-t border-[#e5e9ed] bg-[#fafbfd] p-5">

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOverviewProject(
                        null
                      );

                      router.push(
                        `/projects?projectId=${project.id}`
                      );
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#315da5] py-3.5 text-[12px] font-extrabold text-white transition hover:bg-[#244b8e]"
                  >
                    <Eye size={15} />
                    Open Project
                    <ChevronRight size={14} />
                  </button>

                </div>

              </div>

            </div>
          );
        })()}

    </main>
  );
}

/* =========================================================
   DASHBOARD STAT
========================================================= */

function DashboardStat({
  icon,
  label,
  value,
  className,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className: string;
  iconClass: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#dce3e9] p-5 ${className}`}
    >

      <div className="flex items-center gap-2.5">

        <span className={iconClass}>
          {icon}
        </span>

        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#53616d]">
          {label}
        </span>

      </div>

      <p className="mt-3 text-[28px] font-extrabold text-[#172633]">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MODAL STAT
========================================================= */

function ModalStat({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-[#e1e6eb] bg-[#fafbfd] p-4">

      <div className="flex items-center gap-2">

        <span className={iconClass}>
          {icon}
        </span>

        <span className="text-[10px] font-bold text-[#687581]">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[24px] font-extrabold ${iconClass}`}
      >
        {value}
      </p>

    </div>
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
    project.status || "Unassigned";

  const statusClass =
    getProjectStatusClass(status);

  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(project.progress) || 0
    )
  );

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-[#cfd7df] bg-white shadow-[0_2px_10px_rgba(24,39,54,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(24,39,54,0.10)]">

        {/* CARD HEADER */}

        <div className="relative overflow-hidden bg-[#172b3a] px-6 pb-6 pt-6">

          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#315da5]/20" />

          <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-[#2f8a4f]/10" />

          <div className="relative flex items-start justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
              <FolderKanban size={19} />
            </div>

            <span
              className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold ${statusClass}`}
            >
              {status}
            </span>

          </div>

          <div className="relative mt-7">

            <h3 className="truncate text-[19px] font-extrabold text-white">
              {project.name}
            </h3>

            <p className="mt-2 line-clamp-2 min-h-[40px] text-[12px] font-medium leading-5 text-white/70">
              {description}
            </p>

          </div>

        </div>

        {/* CARD BODY */}

        <div className="p-6">

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-xl border border-[#e5e9ed] bg-[#f8fafc] p-4">

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={13}
                  className="text-[#315da5]"
                />

                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#687581]">
                  Deadline
                </p>

              </div>

              <p className="mt-2 text-[12px] font-extrabold text-[#3d4c59]">
                {project.deadline
                  ? formatDate(
                      project.deadline
                    )
                  : "Not set"}
              </p>

            </div>

            <div className="rounded-xl border border-[#e5e9ed] bg-[#f8fafc] p-4">

              <div className="flex items-center gap-2">

                <FolderKanban
                  size={13}
                  className="text-[#895a9d]"
                />

                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#687581]">
                  Domain
                </p>

              </div>

              <p className="mt-2 truncate text-[12px] font-extrabold text-[#3d4c59]">
                {project.domain ||
                  "General"}
              </p>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-6">

            <div className="mb-2.5 flex items-center justify-between">

              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#687581]">
                Project Progress
              </p>

              <span className="text-[14px] font-extrabold text-[#172b3a]">
                {progress}%
              </span>

            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-[#e5e9ed]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#315da5] to-[#7694d5] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          {/* MANAGER */}

          <div className="mt-6 flex items-center justify-between border-t border-[#e5e9ed] pt-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#315da5] to-[#244b8e] text-[10px] font-extrabold text-white">

                {getInitials(
                  project.manager_name ||
                    "PM"
                )}

              </div>

              <div className="min-w-0">

                <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#8996a1]">
                  Project Manager
                </p>

                <p className="truncate text-[11px] font-extrabold text-[#3d4c59]">
                  {project.manager_name ||
                    "Not assigned"}
                </p>

              </div>

            </div>

            <span className="rounded-lg bg-[#edf3ff] px-2.5 py-1.5 text-[10px] font-extrabold text-[#315da5]">
              {project.priority ||
                "Normal"}
            </span>

          </div>

          {/* BUTTONS */}

          <div className="mt-6 grid grid-cols-2 gap-2.5">

            <button
              onClick={onView}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#315da5] py-3.5 text-[11px] font-extrabold text-white transition hover:bg-[#244b8e] active:scale-[0.98]"
            >
              <Eye size={14} />
              View Project
            </button>

            <button
              onClick={() =>
                setDetailsOpen(true)
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#172b3a] py-3.5 text-[11px] font-extrabold text-white transition hover:bg-[#263f50] active:scale-[0.98]"
            >
              <Eye size={14} />
              Details
            </button>

          </div>

        </div>

      </div>

      {/* PROJECT DETAILS MODAL */}

      {detailsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/60 px-4 backdrop-blur-sm"
          onClick={() =>
            setDetailsOpen(false)
          }
        >

          <div
            className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-[#dce2e8] bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="relative overflow-hidden bg-[#172b3a] px-6 py-6">

              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#315da5]/25" />

              <div className="relative flex items-center justify-between">

                <div className="flex min-w-0 items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                    <FolderKanban size={21} />
                  </div>

                  <div className="min-w-0">

                    <h2 className="truncate text-[20px] font-extrabold text-white">
                      {project.name}
                    </h2>

                    <p className="mt-1 text-[12px] font-medium text-white/70">
                      Project Details
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    setDetailsOpen(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X size={17} />
                </button>

              </div>

            </div>

            <div className="max-h-[68vh] overflow-y-auto p-6">

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

              <div className="mt-5 rounded-xl border border-[#e1e6eb] bg-[#fafbfd] p-5">

                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#687581]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-6 text-[#4d5b67]">
                  {description}
                </p>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">

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
                <div className="mt-4 rounded-xl border border-[#e1e6eb] bg-[#fafbfd] p-4">

                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#687581]">
                    Created By
                  </p>

                  <p className="mt-1.5 text-[13px] font-extrabold text-[#3d4c59]">
                    {project.creator_name}
                  </p>

                  {project.creator_role && (
                    <p className="mt-1 text-[11px] font-medium text-[#7b8791]">
                      {project.creator_role}
                    </p>
                  )}

                </div>
              )}

            </div>

            <div className="border-t border-[#e5e9ed] bg-[#fafbfd] p-5">

              <button
                onClick={onView}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#315da5] py-3.5 text-[12px] font-extrabold text-white transition hover:bg-[#244b8e]"
              >
                <Eye size={15} />
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
    <div className="rounded-xl border border-[#e1e6eb] bg-[#f8fafc] p-4">

      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#687581]">
        {label}
      </p>

      <p className="mt-1.5 truncate text-[12px] font-extrabold text-[#3d4c59]">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   TEAM ITEM
========================================================= */

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
    <div className="flex min-w-[120px] items-center justify-between gap-5">

      <div className="flex items-center gap-2.5">

        <span
          className={`h-2.5 w-2.5 rounded-full ${color}`}
        />

        <span className="text-[12px] font-semibold text-[#53616d]">
          {label}
        </span>

      </div>

      <span className="text-[13px] font-extrabold text-[#34424d]">
        {value}
      </span>

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
        String(task.project_id || "")
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
    <div className="relative flex min-h-[60px] items-center">

      <div className="w-[56px] shrink-0 text-[11px] font-bold text-[#687581]">
        {time}
      </div>

      <div className="relative z-10 mx-[7px] flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-white bg-[#aeb8c1] shadow-sm" />

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#9aa5ae] to-[#596570] text-[9px] font-extrabold text-white">
            {initials}
          </div>

          <div className="min-w-0">

            <span className="block truncate text-[12px] font-bold text-[#34424d]">
              {taskName}
            </span>

            {project && (
              <span className="mt-0.5 block truncate text-[10px] font-medium text-[#7b8791]">
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
      "bg-[#fff6e8] text-[#a66d21]";
  } else if (
    normalized.includes("progress")
  ) {
    className =
      "bg-[#edf3ff] text-[#315da5]";
  } else if (
    normalized.includes("done") ||
    normalized.includes("complete")
  ) {
    className =
      "bg-[#ecf8ef] text-[#2f8a4f]";
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
      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold ${className}`}
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
    <div className="w-full rounded-xl border border-dashed border-[#cfd7df] bg-[#f8fafc] px-6 py-12 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white">
        <Users
          size={25}
          className="text-[#9aa6b1]"
        />
      </div>

      <p className="mt-4 text-[14px] font-extrabold text-[#53616d]">
        {title}
      </p>

      <p className="mt-1.5 text-[12px] font-medium text-[#7b8791]">
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
    return "bg-[#edf3ff] text-[#315da5]";
  }

  if (
    normalized.includes("done") ||
    normalized.includes("complete")
  ) {
    return "bg-[#ecf8ef] text-[#2f8a4f]";
  }

  if (
    normalized.includes("pause")
  ) {
    return "bg-[#fff6e8] text-[#a66d21]";
  }

  if (
    normalized.includes(
      "backlog"
    )
  ) {
    return "bg-[#f3eafa] text-[#85579a]";
  }

  return "bg-[#f1f4f7] text-[#53616d]";
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
