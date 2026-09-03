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
    bar: "from-[#42b5e8] to-[#2d6dcc]",
    icon: "bg-[#172b3a] text-[#42b5e8]",
  },
  {
    bar: "from-[#69d19a] to-[#3ca67d]",
    icon: "bg-[#172b3a] text-[#69d19a]",
  },
  {
    bar: "from-[#9670ed] to-[#493bc0]",
    icon: "bg-[#172b3a] text-[#9670ed]",
  },
  {
    bar: "from-[#ffb25b] to-[#ed7440]",
    icon: "bg-[#172b3a] text-[#ffb25b]",
  },
  {
    bar: "from-[#4fc1c2] to-[#218a9b]",
    icon: "bg-[#172b3a] text-[#4fc1c2]",
  },
  {
    bar: "from-[#ed5d91] to-[#bd2f70]",
    icon: "bg-[#172b3a] text-[#ed5d91]",
  },
  {
    bar: "from-[#315da5] to-[#172d61]",
    icon: "bg-[#172b3a] text-[#7fa8ff]",
  },
  {
    bar: "from-[#f8d95c] to-[#d8aa2c]",
    icon: "bg-[#172b3a] text-[#f8d95c]",
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

  /*
   * Normalizes:
   * "Project Manager"
   * "project_manager"
   * "PROJECT-MANAGER"
   * into:
   * "project manager"
   */

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

  
      const handleRefresh = async () => {
          await loadDashboard();
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
    /*
     * Executive Manager + System Administrator
     * -----------------------------------------
     * Can see every project.
     */

    if (isManagement) {
      return projects;
    }

    /*
     * Project Manager
     * ---------------
     * Can only see projects assigned to them.
     */

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

    /*
     * Member / User
     * -------------
     * A member only sees projects for which
     * they have an assigned task.
     */

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

    /*
     * Fallback:
     * Unknown roles get no project data.
     */

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
    /*
     * Executive Manager / System Administrator
     */

    if (isManagement) {
      return tasks;
    }

    /*
     * Project Manager
     *
     * All tasks belonging to projects managed
     * by the logged-in Project Manager.
     */

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

    /*
     * Member / User
     *
     * Only their own assigned tasks.
     */

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
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              size={30}
              className="animate-spin text-[#557bd2]"
            />

            <p className="text-[16px] font-semibold text-gray-600">
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
        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
            <AlertCircle
              className="mx-auto text-red-500"
              size={34}
            />

            <h2 className="mt-4 text-[20px] font-bold text-gray-900">
              Unable to load dashboard
            </h2>

            <p className="mt-2 text-[14px] text-gray-500">
              {error}
            </p>

            <button
              onClick={handleRefresh}
              className="mt-6 rounded-xl bg-[#557bd2] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#456bc2]"
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
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">

              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#557bd2]">
                Workspace Overview
              </p>

              {currentUser.role && (
                <span className="rounded-full border border-[#d5e0f7] bg-[#edf2ff] px-3 py-1.5 text-[11px] font-bold text-[#557bd2]">
                  {currentUser.role}
                </span>
              )}

            </div>

            <h1 className="text-[36px] font-bold tracking-tight text-[#16212d] sm:text-[38px]">
              Dashboard
            </h1>

            <p className="mt-2 max-w-[700px] text-[14px] leading-6 text-[#697783]">
              {roleDescription}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-fit items-center gap-2.5 rounded-xl bg-[#172b3a] px-5 py-3 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#223d50] disabled:opacity-50"
          >
            <RefreshCw
              size={15}
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

       <section className="mb-7 overflow-hidden rounded-2xl border border-[#e1e6eb] bg-white">

  <div className="flex flex-col gap-4 border-b border-[#edf0f3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">

    <div>
      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-gradient-to-br from-[#557bd2] to-[#456bc2] px-3 py-1.5">
          <h2 className="text-[20px] font-bold text-white">
            Projects Overview
          </h2>
        </div>

        <span className="rounded-full bg-[#e7efff] px-3 py-1.5 text-[12px] font-bold text-[#557bd2]">
          {projectOverview.length}
        </span>

      </div>

      <p className="mt-1.5 text-[13px] text-[#7b8794]">
        Track project progress at a glance
      </p>
    </div>

    <div className="flex w-fit items-center gap-2.5 rounded-xl border border-[#dfe5ea] bg-[#fafbfd] px-4 py-3">

      <CalendarDays
        size={15}
        className="text-[#557bd2]"
      />

      <span className="text-[12px] font-semibold text-[#53616d]">
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

    <div className="px-4 pb-5 pt-6 sm:px-6">

      <div className="relative">

        <div className="pointer-events-none absolute inset-x-0 bottom-[75px] top-0 flex flex-col justify-between">

          <div className="h-px w-full bg-[#edf0f3]" />
          <div className="h-px w-full bg-[#edf0f3]" />
          <div className="h-px w-full bg-[#edf0f3]" />
          <div className="h-px w-full bg-[#edf0f3]" />
          <div className="h-px w-full bg-[#edf0f3]" />

        </div>

        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

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
                  className="group flex min-w-0 flex-col items-center rounded-xl px-2 py-2 transition hover:bg-[#fafbfd]"
                >

                  <div className="mb-2 h-5">
                    <span className="text-[16px] font-bold text-[#172633] transition group-hover:text-[#557bd2]">
                      {progress}%
                    </span>
                  </div>

                  <div className="relative flex h-[140px] w-full max-w-[60px] items-end justify-center">

                    <div className="absolute bottom-0 h-full w-full rounded-t-xl bg-[#f7f9fb]" />

                    <div
                      className={`relative z-10 w-full rounded-t-xl bg-gradient-to-t ${color.bar} shadow-[0_6px_14px_rgba(85,123,210,0.15)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_10px_20px_rgba(85,123,210,0.22)]`}
                      style={{
                        height: `${Math.max(
                          progress,
                          progress === 0
                            ? 2
                            : 6
                        )}%`,
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-10 rounded-t-xl bg-white/10" />
                    </div>

                  </div>

                  <div
                    className={`mt-3 flex h-10 w-10 items-center justify-center rounded-xl ${color.icon} shadow-sm transition group-hover:scale-105`}
                  >
                    <FolderKanban size={16} />
                  </div>

                  <div className="mt-2 min-h-[32px] w-full text-center">

                    <p className="line-clamp-2 text-[15px] font-bold uppercase leading-4 text-[#172633]">
                      {project.name}
                    </p>

                  </div>

                  <div className="mt-2 flex items-center gap-1 rounded-full bg-[#f5f7f9] px-2.5 py-1">

                    <CheckCircle2
                      size={15}
                      className="text-[#438d5d] shrink-0"
                    />

                    <span className="text-[13px] font-semibold text-[#697783]">
                      {completedTasks}/{totalTasks}
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </div>
      </div>

      <div className="mt-5 flex items-center justify-center">

        <div className="flex items-center gap-2 rounded-full bg-[#f7f9fb] px-4 py-2">

          <Eye
            size={15}
            className="text-[#557bd2] shrink-0"
          />

          <span className="text-[13px] font-medium text-[#7b8794]">
            Click any bar to view details
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

                <div className="rounded-lg bg-gradient-to-br from-[#438d5d] to-[#2d7a4a] px-3 py-1.5">
                  <h2 className="text-[20px] font-bold text-white">
                    Active Projects
                  </h2>
                </div>

                <span className="rounded-full bg-[#e7efff] px-3 py-1.5 text-[12px] font-bold text-[#557bd2]">
                  {activeProjects.length}
                </span>

              </div>

              <p className="mt-2 text-[13px] text-[#8b96a3]">
                Current projects requiring attention
              </p>

            </div>

            <button
              onClick={() =>
                router.push("/projects")
              }
              className="flex items-center gap-2 rounded-lg border border-[#dce2e8] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#53616d] shadow-sm transition hover:border-[#557bd2] hover:text-[#557bd2]"
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

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

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

        <section className="mb-7 rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">

          <div className="flex items-center justify-between border-b border-[#edf0f3] px-5 py-6 sm:px-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#557bd2]">
                <Users size={19} />
              </div>

              <div>

                <h2 className="text-[20px] font-bold text-[#172633]">
                  Team Overview
                </h2>

                <p className="mt-1 text-[12px] text-[#8b96a3]">
                  Team members, roles and project domains
                </p>

              </div>

            </div>

            <button
              onClick={() =>
                router.push("/teams")
              }
              className="flex items-center gap-2 rounded-lg bg-[#172b3a] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#223d50]"
            >
              View teams
              <ChevronRight size={13} />
            </button>

          </div>

          <div className="grid gap-7 p-6 lg:grid-cols-[0.8fr_1.2fr] sm:p-7">

            {/* TEAM DISTRIBUTION */}

            <div className="rounded-2xl border border-[#edf0f3] bg-[#fafbfd] p-6">

              <div className="mb-6">

                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa4ae]">
                  Team Distribution
                </p>

                <p className="mt-1.5 text-[13px] text-[#7f8a95]">
                  Current workforce composition
                </p>

              </div>

              <div className="flex items-center justify-center gap-9">

                <div className="relative h-[160px] w-[160px] shrink-0">

                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        createTeamGradient(
                          teamRoleStats
                        ),
                    }}
                  />

                  <div className="absolute inset-[29px] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">

                    <span className="text-[26px] font-bold text-[#172633]">
                      {teamRoleStats.total}
                    </span>

                    <span className="mt-1 text-[10px] font-bold text-[#9aa4ae]">
                      MEMBERS
                    </span>

                  </div>

                </div>

                <div className="space-y-3.5">

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

                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aa4ae]">
                    Project Domains
                  </p>

                  <p className="mt-1.5 text-[13px] text-[#7f8a95]">
                    Distribution across active work
                  </p>

                </div>

                <span className="rounded-full bg-[#f1f4f7] px-3 py-1.5 text-[10px] font-semibold text-[#697783]">
                  {domainStats.length} domains
                </span>

              </div>

              {domainStats.length === 0 ? (

                <div className="rounded-xl border border-dashed border-[#dfe4e9] bg-[#fafbfd] px-4 py-10 text-center">

                  <FolderKanban
                    size={25}
                    className="mx-auto text-[#c5ccd3]"
                  />

                  <p className="mt-3 text-[12px] font-medium text-[#8b96a3]">
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
                        className="group flex items-center justify-between rounded-xl border border-[#edf0f3] bg-white px-4 py-3.5 transition hover:border-[#ccd8ed] hover:bg-[#fafcff]"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${
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

                          <span className="truncate text-[12px] font-semibold text-[#53616d]">
                            {domain}
                          </span>

                        </div>

                        <span className="ml-2 shrink-0 rounded-full bg-[#f1f4f7] px-2.5 py-1.5 text-[10px] font-bold text-[#66737e]">
                          {count}
                        </span>

                      </div>
                    )
                  )}

                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-gradient-to-br from-[#edf2ff] to-[#f7f9ff] p-5">

                  <div className="flex items-center gap-2">

                    <FolderKanban
                      size={16}
                      className="text-[#557bd2]"
                    />

                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8793]">
                      Active Teams
                    </span>

                  </div>

                  <p className="mt-2 text-[27px] font-bold text-[#172633]">
                    {teams.length}
                  </p>

                </div>

                <div className="rounded-xl bg-gradient-to-br from-[#f5eff9] to-[#fbf8fd] p-5">

                  <div className="flex items-center gap-2">

                    <Users
                      size={16}
                      className="text-[#895a9d]"
                    />

                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8793]">
                      Developers
                    </span>

                  </div>

                  <p className="mt-2 text-[27px] font-bold text-[#172633]">
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
            className="bg-[#edf2ff]"
            iconClass="text-[#557bd2]"
          />

          <DashboardStat
            icon={<CheckCircle2 size={17} />}
            label="Completed"
            value={taskStats.completed}
            className="bg-[#eaf5ed]"
            iconClass="text-[#438d59]"
          />

          <DashboardStat
            icon={<Clock3 size={17} />}
            label="In Progress"
            value={taskStats.inProgress}
            className="bg-[#f8f0e4]"
            iconClass="text-[#be8944]"
          />

          <DashboardStat
            icon={<FolderKanban size={17} />}
            label="My Visible Projects"
            value={visibleProjects.length}
            className="bg-[#f3eafa]"
            iconClass="text-[#895a9d]"
          />

        </section>

        {/* =================================================
            ROW 4 — TASK SCHEDULE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-[#e1e6eb] bg-white shadow-[0_4px_20px_rgba(24,39,54,0.05)]">

          <div className="flex flex-col gap-4 border-b border-[#edf0f3] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5eff9] text-[#895a9d]">
                <CalendarDays size={19} />
              </div>

              <div>

                <h2 className="text-[20px] font-bold text-[#172633]">
                  Task Schedule
                </h2>

                <p className="mt-1 text-[12px] text-[#8b96a3]">
                  Upcoming deadlines and scheduled tasks
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() =>
                  changeScheduleDate(-1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e6eb] bg-white text-[#697783] transition hover:bg-[#f5f7f9]"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="min-w-[150px] rounded-lg bg-[#f5f7f9] px-4 py-2.5 text-center">

                <span className="text-[11px] font-bold text-[#44515c]">
                  {formattedScheduleDate}
                </span>

              </div>

              <button
                onClick={() =>
                  changeScheduleDate(1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e6eb] bg-white text-[#697783] transition hover:bg-[#f5f7f9]"
              >
                <ChevronRight size={16} />
              </button>

            </div>

          </div>

          <div className="max-h-[450px] overflow-y-auto px-5 sm:px-7">

            {scheduleTasks.length === 0 ? (

              <div className="flex min-h-[300px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f7f9]">

                    <CalendarDays
                      size={25}
                      className="text-[#b7c0c8]"
                    />

                  </div>

                  <p className="mt-4 text-[13px] font-semibold text-[#697783]">
                    No scheduled tasks
                  </p>

                  <p className="mt-1.5 text-[11px] text-[#a0a9b2]">
                    {isMember
                      ? "Your tasks with due dates will appear here."
                      : "Tasks with due dates will appear here."}
                  </p>

                </div>

              </div>

            ) : (

              <div className="relative py-5">

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
                      projects={
                        visibleProjects
                      }
                    />
                  )
                )}

              </div>

            )}

          </div>

          <div className="border-t border-[#edf0f3] p-5 sm:p-6">

            <button
              onClick={() =>
                router.push("/Schedule")
              }
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#172b3a] py-3.5 text-[12px] font-bold text-white transition hover:bg-[#223d50]"
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
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/55 px-4 backdrop-blur-sm"
              onClick={() =>
                setSelectedOverviewProject(
                  null
                )
              }
            >

              <div
                className="w-full max-w-[580px] overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="relative overflow-hidden bg-[#172b3a] px-6 py-6">

                  <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#557bd2]/20" />

                  <div className="absolute -bottom-16 left-20 h-28 w-28 rounded-full bg-[#438d5d]/10" />

                  <div className="relative flex items-start justify-between">

                    <div className="flex min-w-0 items-center gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                        <FolderKanban size={22} />
                      </div>

                      <div className="min-w-0">

                        <h2 className="truncate text-[20px] font-bold text-white">
                          {project.name}
                        </h2>

                        <p className="mt-1 text-[12px] text-white/60">
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

                <div className="max-h-[68vh] overflow-y-auto p-6">

                  <div className="rounded-2xl border border-[#e8edf2] bg-[#fafbfd] p-6">

                    <div className="flex items-end justify-between">

                      <div>

                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#98a2ac]">
                          Task Completion
                        </p>

                        <p className="mt-1 text-[32px] font-bold text-[#172633]">
                          {progress}%
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-[11px] text-[#98a2ac]">
                          Completed
                        </p>

                        <p className="text-[16px] font-bold text-[#438d5d]">
                          {completedTasks} /{" "}
                          {totalTasks}
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e9edf1]">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#557bd2] to-[#7c9bea] transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">

                    <ModalStat
                      icon={
                        <Circle
                          size={14}
                        />
                      }
                      label="Total Tasks"
                      value={totalTasks}
                      iconClass="text-[#557bd2]"
                    />

                    <ModalStat
                      icon={
                        <CheckCircle2
                          size={14}
                        />
                      }
                      label="Completed"
                      value={completedTasks}
                      iconClass="text-[#438d5d]"
                    />

                    <ModalStat
                      icon={
                        <Clock3
                          size={14}
                        />
                      }
                      label="In Progress"
                      value={inProgressTasks}
                      iconClass="text-[#be8944]"
                    />

                  </div>

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
                    <div className="mt-5 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-5">

                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#98a2ac]">
                        Description
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#5f6b75]">
                        {project.about_description ||
                          project.about_title}
                      </p>

                    </div>
                  )}

                </div>

                <div className="border-t border-[#edf0f3] bg-[#fafbfd] p-5">

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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#456bc2]"
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
      className={`rounded-2xl border border-white/70 p-5 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={iconClass}>
          {icon}
        </span>

        <span className="text-[11px] font-bold uppercase tracking-wide text-[#697783]">
          {label}
        </span>
      </div>

      <p className="mt-3 text-[28px] font-bold text-[#172633]">
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
    <div className="rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-4">

      <div className="flex items-center gap-2">

        <span className={iconClass}>
          {icon}
        </span>

        <span className="text-[10px] font-semibold text-[#7b8794]">
          {label}
        </span>

      </div>

      <p className={`mt-2 text-[24px] font-bold ${iconClass}`}>
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
      <div className="group overflow-hidden rounded-2xl border border-[#dfe5ea] bg-white shadow-[0_4px_18px_rgba(24,39,54,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(24,39,54,0.12)]">

        <div className="relative overflow-hidden bg-[#172b3a] px-6 pb-6 pt-6">

          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#557bd2]/20" />

          <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-[#438d5d]/10" />

          <div className="absolute right-5 top-10 h-12 w-12 rotate-12 rounded-xl border border-white/10 bg-white/5" />

          <div className="relative flex items-start justify-between">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm">
              <FolderKanban size={19} />
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${statusClass}`}
            >
              {status}
            </span>

          </div>

          <div className="relative mt-8">

            <h3 className="truncate text-[19px] font-bold text-white">
              {project.name}
            </h3>

            <p className="mt-2 line-clamp-2 min-h-[40px] text-[12px] leading-5 text-white/65">
              {description}
            </p>

          </div>

        </div>

        <div className="p-6">

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-[#f7f9fb] p-4">

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={13}
                  className="text-[#557bd2]"
                />

                <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Deadline
                </p>

              </div>

              <p className="mt-2 text-[12px] font-bold text-[#44515c]">
                {project.deadline
                  ? formatDate(
                      project.deadline
                    )
                  : "Not set"}
              </p>

            </div>

            <div className="rounded-xl bg-[#f7f9fb] p-4">

              <div className="flex items-center gap-2">

                <FolderKanban
                  size={13}
                  className="text-[#895a9d]"
                />

                <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Domain
                </p>

              </div>

              <p className="mt-2 truncate text-[12px] font-bold text-[#44515c]">
                {project.domain ||
                  "General"}
              </p>

            </div>

          </div>

          <div className="mt-6">

            <div className="mb-2.5 flex items-center justify-between">

              <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                Project Progress
              </p>

              <span className="text-[14px] font-bold text-[#172b3a]">
                {progress}%
              </span>

            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-[#e9edf1]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#557bd2] via-[#6689dd] to-[#8ca7ec] transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#edf0f3] pt-5">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#557bd2] to-[#314f9c] text-[10px] font-bold text-white">

                {getInitials(
                  project.manager_name ||
                    "PM"
                )}

              </div>

              <div className="min-w-0">

                <p className="text-[9px] font-bold uppercase tracking-wide text-[#a0a9b2]">
                  Project Manager
                </p>

                <p className="truncate text-[11px] font-bold text-[#44515c]">
                  {project.manager_name ||
                    "Not assigned"}
                </p>

              </div>

            </div>

            <span className="rounded-lg bg-[#f0f4ff] px-2.5 py-1.5 text-[10px] font-bold text-[#557bd2]">
              {project.priority ||
                "Normal"}
            </span>

          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">

            <button
              onClick={onView}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#456bc2] active:scale-[0.98]"
            >
              <Eye size={14} />
              View Project
            </button>

            <button
              onClick={() =>
                setDetailsOpen(true)
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#172b3a] py-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#223d50] active:scale-[0.98]"
            >
              <Eye size={14} />
              Details
            </button>

          </div>

        </div>

      </div>

      {detailsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/55 px-4 backdrop-blur-sm"
          onClick={() =>
            setDetailsOpen(false)
          }
        >

          <div
            className="w-full max-w-[580px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="relative overflow-hidden bg-[#172b3a] px-6 py-6">

              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#557bd2]/20" />

              <div className="relative flex items-center justify-between">

                <div className="flex min-w-0 items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                    <FolderKanban size={21} />
                  </div>

                  <div className="min-w-0">

                    <h2 className="truncate text-[20px] font-bold text-white">
                      {project.name}
                    </h2>

                    <p className="mt-1 text-[12px] text-white/60">
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

              <div className="mt-5 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-5">

                <p className="text-[11px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#5f6b75]">
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
                <div className="mt-4 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-4">

                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#98a2ac]">
                    Created By
                  </p>

                  <p className="mt-1.5 text-[13px] font-bold text-[#44515c]">
                    {project.creator_name}
                  </p>

                  {project.creator_role && (
                    <p className="mt-1 text-[11px] text-[#9aa4ae]">
                      {project.creator_role}
                    </p>
                  )}

                </div>
              )}

            </div>

            <div className="border-t border-[#edf0f3] bg-[#fafbfd] p-5">

              <button
                onClick={onView}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[12px] font-bold text-white transition hover:bg-[#456bc2]"
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 truncate text-[12px] font-bold text-gray-700">
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

        <span className="text-[11px] font-medium text-[#697783]">
          {label}
        </span>

      </div>

      <span className="text-[12px] font-bold text-[#34424d]">
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
    <div className="relative flex min-h-[58px] items-center">

      <div className="w-[56px] shrink-0 text-[11px] font-medium text-gray-400">
        {time}
      </div>

      <div className="relative z-10 mx-[7px] flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-white bg-gray-300 shadow-sm" />

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-600 text-[9px] font-bold text-white">
            {initials}
          </div>

          <div className="min-w-0">

            <span className="block truncate text-[12px] font-semibold text-[#34424d]">
              {taskName}
            </span>

            {project && (
              <span className="mt-0.5 block truncate text-[10px] text-gray-400">
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
      className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${className}`}
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
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">

      <Users
        size={28}
        className="mx-auto text-gray-300"
      />

      <p className="mt-3 text-[14px] font-bold text-gray-600">
        {title}
      </p>

      <p className="mt-1.5 text-[12px] text-gray-400">
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
    return "bg-[#edf2ff] text-[#5577c2]";
  }

  if (
    normalized.includes("done") ||
    normalized.includes("complete")
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
