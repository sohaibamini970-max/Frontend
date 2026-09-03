"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  FolderKanban,
  Info,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  manager_id?: string | null;
  manager_name?: string | null;
  manager_role?: string | null;
  creator_name?: string | null;
  creator_role?: string | null;
};

type TeamMember = {
  id: string;
  full_name: string;
  role: string;
  team_id?: string;
  team_name?: string;
};

type Team = {
  id: string;
  name: string;
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
  role?: string;
  user_role?: string;
  fullName?: string;
  name?: string;
  email?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend-five-swart-88.vercel.app/api";

const PROJECT_OVERVIEW_COLORS = [
  "#557BD2",
  "#3E9B78",
  "#8B68B0",
  "#D18B45",
  "#3B9AA8",
  "#C56585",
  "#5367B8",
  "#B79543",
];

function getInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatDate(date?: string | null) {
  if (!date) return "Not set";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeRole(role?: string) {
  return (role || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isDoneStatus(status?: string) {
  const value = normalizeRole(status);
  return value === "done" || value === "completed";
}

function getProjectStatusClass(status: string) {
  const value = normalizeRole(status);

  if (value.includes("progress"))
    return "bg-[#edf3ff] text-[#5577c2]";
  if (value.includes("done") || value.includes("complete"))
    return "bg-[#eaf6ee] text-[#438759]";
  if (value.includes("pause"))
    return "bg-[#fbf1e5] text-[#ad8144]";
  if (value.includes("backlog"))
    return "bg-[#f4edfa] text-[#85579a]";

  return "bg-[#f3f4f6] text-[#61656b]";
}

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>({});
  const [userReady, setUserReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [selectedOverviewProject, setSelectedOverviewProject] =
    useState<Project | null>(null);

  const normalizedRole = useMemo(
    () =>
      normalizeRole(
        currentUser.role || currentUser.user_role
      ),
    [currentUser.role, currentUser.user_role]
  );

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
    isExecutiveManager || isSystemAdministrator;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          id: String(
            parsed?.id ??
              parsed?.user_id ??
              parsed?._id ??
              ""
          ),
          role: parsed?.role || parsed?.user_role || "",
          user_role: parsed?.user_role,
          fullName:
            parsed?.fullName ||
            parsed?.full_name ||
            parsed?.name,
          name: parsed?.name,
          email: parsed?.email,
        });
      }
    } catch (err) {
      console.error("Failed to read logged-in user:", err);
    } finally {
      setUserReady(true);
    }
  }, []);

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

      const projectsResponse = await fetch(
        `${API_BASE}/projects`,
        { headers }
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

      const projectsData =
        await projectsResponse.json();

      const loadedProjects: Project[] =
        projectsData?.projects ||
        projectsData?.data ||
        projectsData ||
        [];

      const safeProjects = Array.isArray(loadedProjects)
        ? loadedProjects
        : [];

      const [teamsResponse, membersResponse] =
        await Promise.all([
          fetch(`${API_BASE}/teams`, { headers }),
          fetch(`${API_BASE}/teams/members`, { headers }),
        ]);

      let loadedTeams: Team[] = [];
      let loadedMembers: TeamMember[] = [];

      if (teamsResponse.ok) {
        const data = await teamsResponse.json();
        const value =
          data?.teams || data?.data || data || [];
        loadedTeams = Array.isArray(value) ? value : [];
      }

      if (membersResponse.ok) {
        const data = await membersResponse.json();
        const value =
          data?.members || data?.data || data || [];
        loadedMembers = Array.isArray(value) ? value : [];
      }

      const taskResults = await Promise.all(
        safeProjects.map(async (project) => {
          try {
            const response = await fetch(
              `${API_BASE}/tasks/project/${project.id}`,
              { headers }
            );

            if (!response.ok) return [];

            const data = await response.json();
            const value =
              data?.tasks || data?.data || data || [];

            if (!Array.isArray(value)) return [];

            return value.map((task: Task) => ({
              ...task,
              project_id:
                task.project_id || project.id,
            }));
          } catch {
            return [];
          }
        })
      );

      const loadedTasks = taskResults.flat();

      setTeams(loadedTeams);
      setTeamMembers(loadedMembers);

      const userId = String(currentUser.id || "");

      let visibleProjects = safeProjects;
      let visibleTasks = loadedTasks;

      if (isManagement) {
        visibleProjects = safeProjects;
        visibleTasks = loadedTasks;
      } else if (isProjectManager) {
        visibleProjects = safeProjects.filter(
          (project) =>
            String(project.manager_id || "") === userId
        );

        const visibleIds = new Set(
          visibleProjects.map((project) =>
            String(project.id)
          )
        );

        visibleTasks = loadedTasks.filter((task) =>
          visibleIds.has(String(task.project_id || ""))
        );
      } else if (isMember) {
        visibleTasks = loadedTasks.filter(
          (task) =>
            String(task.assignee_id || "") === userId
        );

        const projectIds = new Set(
          visibleTasks.map((task) =>
            String(task.project_id || "")
          )
        );

        visibleProjects = safeProjects.filter((project) =>
          projectIds.has(String(project.id))
        );
      } else {
        visibleProjects = [];
        visibleTasks = [];
      }

      setProjects(visibleProjects);
      setTasks(visibleTasks);
    } catch (err) {
      console.error("Dashboard loading error:", err);
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

  useEffect(() => {
    if (!userReady) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReady, currentUser.id, currentUser.role]);

  // Keep this OUTSIDE loadDashboard so the buttons can access it.
  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      await loadDashboard();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const activeProjects = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            !isDoneStatus(project.status)
        )
        .slice(0, 3),
    [projects]
  );

  const projectOverview = useMemo(
    () =>
      projects.map((project, index) => {
        const projectTasks = tasks.filter(
          (task) =>
            String(task.project_id || "") ===
            String(project.id)
        );

        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter(
          (task) => isDoneStatus(task.status)
        ).length;

        const progress =
          totalTasks > 0
            ? Math.round(
                (completedTasks / totalTasks) * 100
              )
            : 0;

        return {
          project,
          totalTasks,
          completedTasks,
          progress,
          color:
            PROJECT_OVERVIEW_COLORS[
              index % PROJECT_OVERVIEW_COLORS.length
            ],
        };
      }),
    [projects, tasks]
  );

  const taskStats = useMemo(() => {
    const completed = tasks.filter((task) =>
      isDoneStatus(task.status)
    ).length;

    const inProgress = tasks.filter((task) => {
      const value = normalizeRole(task.status);
      return value === "in progress";
    }).length;

    const pending = tasks.filter((task) => {
      const value = normalizeRole(task.status);
      return (
        value === "to do" ||
        value === "todo" ||
        value === "pending" ||
        value === "backlog"
      );
    }).length;

    return {
      total: tasks.length,
      completed,
      inProgress,
      pending,
    };
  }, [tasks]);

  const teamRoleStats = useMemo(() => {
    const developers = teamMembers.filter((member) => {
      const role = normalizeRole(member.role);
      return (
        role.includes("developer") ||
        role.includes("software") ||
        role.includes("engineer")
      );
    }).length;

    const designers = teamMembers.filter((member) => {
      const role = normalizeRole(member.role);
      return (
        role.includes("designer") ||
        role.includes("ui") ||
        role.includes("ux")
      );
    }).length;

    const managers = teamMembers.filter((member) =>
      normalizeRole(member.role).includes("manager")
    ).length;

    const qa = teamMembers.filter((member) => {
      const role = normalizeRole(member.role);
      return (
        role.includes("qa") ||
        role.includes("quality") ||
        role.includes("tester")
      );
    }).length;

    const known =
      developers + designers + managers + qa;

    return {
      developers,
      designers,
      managers,
      qa,
      other: Math.max(teamMembers.length - known, 0),
      total: teamMembers.length,
    };
  }, [teamMembers]);

  const domainStats = useMemo(() => {
    const domains: Record<string, number> = {};

    projects.forEach((project) => {
      const domain = project.domain?.trim();
      if (!domain) return;
      domains[domain] = (domains[domain] || 0) + 1;
    });

    return Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [projects]);

  const scheduleTasks = useMemo(() => {
    const selectedDate = scheduleDate
      .toISOString()
      .split("T")[0];

    const exact = tasks.filter(
      (task) =>
        task.due_date &&
        task.due_date.split("T")[0] === selectedDate
    );

    if (exact.length) return exact.slice(0, 8);

    return tasks
      .filter((task) => task.due_date)
      .sort(
        (a, b) =>
          new Date(a.due_date || "").getTime() -
          new Date(b.due_date || "").getTime()
      )
      .slice(0, 8);
  }, [tasks, scheduleDate]);

  const formattedScheduleDate =
    scheduleDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const changeScheduleDate = (amount: number) => {
    setScheduleDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw
              size={24}
              className="animate-spin text-[#557bd2]"
            />
            <p className="text-[13px] text-gray-500">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-6">
        <div className="mx-auto max-w-[1440px]">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <AlertCircle
              size={28}
              className="mx-auto text-red-500"
            />
            <h2 className="mt-3 text-[16px] font-medium text-gray-900">
              Unable to load dashboard
            </h2>
            <p className="mt-1 text-[12px] text-gray-500">
              {error}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-5 rounded-lg bg-[#111827] px-5 py-2.5 text-[12px] font-medium text-white hover:bg-black"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#18181b]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#557bd2]">
              Workspace Overview
            </p>
            <h1 className="mt-1 text-[29px] font-normal tracking-[-0.8px] text-[#17181b]">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] font-normal text-gray-500">
              Monitor your projects, teams and task progress.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[12px] font-normal text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh Dashboard
          </button>
        </div>

        {/* PROJECTS OVERVIEW */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-normal text-[#18181b]">
                Projects Overview
              </h2>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Track project progress at a glance
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-[#fafafa] px-3 py-2 sm:flex">
              <CalendarDays size={13} className="text-gray-400" />
              <span className="text-[10px] text-gray-500">
                Live project data
              </span>
            </div>
          </div>

          {projectOverview.length === 0 ? (
            <EmptyState
              title="No projects available"
              description="Projects visible to your role will appear here."
            />
          ) : (
            <div className="mt-4">
              <div className="h-[180px] w-full overflow-hidden sm:h-[195px]">
                <div className="flex h-full items-end gap-3 px-1 sm:gap-5">
                  {projectOverview.map(
                    ({
                      project,
                      progress,
                      color,
                    }) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() =>
                          setSelectedOverviewProject(
                            project
                          )
                        }
                        className="group flex h-full min-w-0 flex-1 flex-col justify-end text-center outline-none"
                        title={`View ${project.name}`}
                      >
                        <div className="mb-1.5 text-[12px] font-normal text-gray-600">
                          {progress}%
                        </div>

                        <div className="relative mx-auto flex h-[125px] w-full max-w-[74px] items-end justify-center rounded-t-lg bg-[#f7f8fa] sm:max-w-[88px]">
                          <div
                            className="w-[70%] rounded-t-lg transition-all duration-300 group-hover:brightness-95"
                            style={{
                              height: `${Math.max(
                                progress,
                                3
                              )}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>

                        <div className="mt-2 truncate px-1 text-[11px] font-normal text-gray-700">
                          {project.name}
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <Info size={12} />
                Click any project bar to view details
              </div>
            </div>
          )}
        </section>

        {/* ACTIVE PROJECTS */}
        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-normal text-[#18181b]">
                  Active Projects
                </h2>
                <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[10px] font-normal text-[#5577c2]">
                  {activeProjects.length}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-gray-500">
                Current projects requiring attention
              </p>
            </div>

            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-1 text-[11px] font-normal text-gray-500 hover:text-gray-900"
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  tasks={tasks}
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

        {/* LOWER DASHBOARD */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.82fr_0.82fr]">

          {/* PROJECT ACTIVITY */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-normal">
                  Project Activity
                </h2>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  Task completion overview
                </p>
              </div>

              <button
                onClick={() => router.push("/tasks")}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900"
              >
                See more
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="flex h-[145px] items-end gap-[4px] overflow-hidden border-b border-gray-100">
              {Array.from({ length: 30 }, (_, index) => {
                const completion =
                  taskStats.total > 0
                    ? Math.round(
                        (taskStats.completed /
                          taskStats.total) *
                          100
                      )
                    : 0;

                const value = Math.min(
                  100,
                  Math.max(
                    12,
                    completion +
                      (((index * 17) % 30) - 14)
                  )
                );

                return (
                  <div
                    key={index}
                    className="flex h-full flex-1 items-end"
                  >
                    <div
                      className="w-full rounded-t-[3px] bg-[#557bd2]"
                      style={{
                        height: `${value}%`,
                        opacity:
                          index % 5 === 0 ? 0.35 : 1,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[12px] text-gray-500">
                <span className="font-normal text-gray-800">
                  {taskStats.completed}
                </span>{" "}
                tasks completed
              </p>

              <div className="flex gap-4 text-[10px] text-gray-500">
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

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ActivityStat
                icon={<CheckCircle2 size={14} />}
                label="Completed"
                value={taskStats.completed}
              />
              <ActivityStat
                icon={<Clock3 size={14} />}
                label="In Progress"
                value={taskStats.inProgress}
              />
              <ActivityStat
                icon={<Circle size={14} />}
                label="Pending"
                value={taskStats.pending}
              />
            </div>
          </section>

          {/* TEAM OVERVIEW */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-normal">
                  Team Overview
                </h2>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  Team members and project domains
                </p>
              </div>

              <button
                onClick={() => router.push("/teams")}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900"
              >
                View teams
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="relative h-[118px] w-[118px] shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: createTeamGradient(
                      teamRoleStats
                    ),
                  }}
                />
                <div className="absolute inset-[23px] flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-[21px] font-normal text-gray-800">
                    {teamRoleStats.total}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    Members
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <TeamItem
                  color="#557bd2"
                  label="Developers"
                  value={teamRoleStats.developers}
                />
                <TeamItem
                  color="#438d5d"
                  label="Designers"
                  value={teamRoleStats.designers}
                />
                <TeamItem
                  color="#be8944"
                  label="Managers"
                  value={teamRoleStats.managers}
                />
                <TeamItem
                  color="#895a9d"
                  label="QA Team"
                  value={teamRoleStats.qa}
                />
                <TeamItem
                  color="#d15b58"
                  label="Other"
                  value={teamRoleStats.other}
                />
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-normal text-gray-700">
                  Project Domains
                </p>
                <span className="text-[10px] text-gray-400">
                  {domainStats.length} domains
                </span>
              </div>

              {domainStats.length === 0 ? (
                <div className="rounded-lg bg-[#fafafa] px-3 py-3 text-center">
                  <p className="text-[10px] text-gray-400">
                    No project domains available
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {domainStats.map(([domain, count]) => (
                    <div
                      key={domain}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-[#fafafa] px-3 py-2"
                    >
                      <span className="truncate text-[10px] text-gray-600">
                        {domain}
                      </span>
                      <span className="rounded-md bg-[#edf2ff] px-2 py-0.5 text-[9px] text-[#5577c4]">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-100 bg-[#f7f9ff] px-3 py-2.5">
                <p className="text-[17px] font-normal text-gray-800">
                  {teams.length}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  Active Teams
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-[#faf7fc] px-3 py-2.5">
                <p className="text-[17px] font-normal text-gray-800">
                  {teamRoleStats.developers}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  Developers
                </p>
              </div>
            </div>
          </section>

          {/* TASK SCHEDULE */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="p-4 pb-3 sm:p-5 sm:pb-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[17px] font-normal">
                  Task Schedule
                </h2>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      changeScheduleDate(-1)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <span className="whitespace-nowrap text-[10px] text-gray-500">
                    {formattedScheduleDate}
                  </span>

                  <button
                    onClick={() =>
                      changeScheduleDate(1)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto px-4 sm:px-5">
              {scheduleTasks.length === 0 ? (
                <div className="flex min-h-[230px] items-center justify-center">
                  <div className="text-center">
                    <CalendarDays
                      size={25}
                      className="mx-auto text-gray-300"
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      No scheduled tasks
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      Tasks with due dates will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute bottom-0 left-[61px] top-0 w-px bg-gray-200" />

                  {scheduleTasks.map(
                    (task, index) => (
                      <ScheduleItem
                        key={
                          task.id ||
                          `${task.name}-${index}`
                        }
                        task={task}
                        projects={projects}
                      />
                    )
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                onClick={() =>
                  router.push("/schedule")
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-[#fafafa] py-2.5 text-[11px] text-gray-600 hover:bg-gray-100"
              >
                <CalendarDays size={13} />
                View full schedule
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* PROJECT OVERVIEW MODAL */}
      {selectedOverviewProject && (
        <ProjectOverviewModal
          project={selectedOverviewProject}
          tasks={tasks}
          onClose={() =>
            setSelectedOverviewProject(null)
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

function ProjectCard({
  project,
  tasks,
  onView,
}: {
  project: Project;
  tasks: Task[];
  onView: () => void;
}) {
  const projectTasks = tasks.filter(
    (task) =>
      String(task.project_id || "") ===
      String(project.id)
  );

  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((task) =>
    isDoneStatus(task.status)
  ).length;

  const progress =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0;

  const status = project.status || "Unassigned";
  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-[0_5px_18px_rgba(0,0,0,0.05)]">
      <div className="border-b border-gray-100 bg-[#fafbfc] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf2ff] text-[#557bd2]">
              <FolderKanban size={17} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-normal text-gray-900">
                {project.name}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                {description}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] ${getProjectStatusClass(
              status
            )}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-400">
              Deadline
            </p>
            <p className="mt-1 text-[11px] text-gray-700">
              {formatDate(project.deadline)}
            </p>
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-wide text-gray-400">
              Domain
            </p>
            <p className="mt-1 truncate text-[11px] text-gray-700">
              {project.domain || "General"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between">
            <span className="text-[9px] uppercase tracking-wide text-gray-400">
              Progress
            </span>
            <span className="text-[11px] text-gray-700">
              {progress}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#557bd2] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f3] text-[9px] text-gray-600">
            {getInitials(project.manager_name)}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-gray-400">
              Project Manager
            </p>
            <p className="truncate text-[10px] text-gray-700">
              {project.manager_name || "Not assigned"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onView}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] py-2.5 text-[10px] text-[#5577c4] hover:bg-[#e3ebff]"
          >
            <Eye size={13} />
            View Project
          </button>

          <button
            onClick={onView}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2.5 text-[10px] text-gray-600 hover:bg-gray-50"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const projectTasks = tasks.filter(
    (task) =>
      String(task.project_id || "") ===
      String(project.id)
  );

  const completedTasks = projectTasks.filter((task) =>
    isDoneStatus(task.status)
  ).length;

  const totalTasks = projectTasks.length;

  const progress =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0;

  const status = project.status || "Unassigned";
  const description =
    project.about_description ||
    project.about_title ||
    "No project description available.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-gray-100 bg-[#fafbfc] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#edf2ff] text-[#557bd2]">
              <FolderKanban size={18} />
            </div>

            <div>
              <h2 className="text-[17px] font-normal text-gray-900">
                {project.name}
              </h2>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Project details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <ModalStat
              label="Progress"
              value={`${progress}%`}
            />
            <ModalStat
              label="Tasks"
              value={`${completedTasks}/${totalTasks}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ProjectDetailItem
              label="Status"
              value={status}
              badgeClass={getProjectStatusClass(status)}
            />
            <ProjectDetailItem
              label="Priority"
              value={project.priority || "Not specified"}
            />
            <ProjectDetailItem
              label="Start Date"
              value={formatDate(project.start_date)}
            />
            <ProjectDetailItem
              label="Deadline"
              value={formatDate(project.deadline)}
            />
            <ProjectDetailItem
              label="Domain"
              value={project.domain || "Not specified"}
            />
            <ProjectDetailItem
              label="Project Manager"
              value={project.manager_name || "Not assigned"}
            />
          </div>

          <div className="mt-3 rounded-lg border border-gray-100 bg-[#fafafa] p-4">
            <p className="text-[9px] uppercase tracking-wide text-gray-400">
              Description
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-gray-600">
              {description}
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-700">
                Task completion
              </p>
              <span className="text-[11px] text-gray-500">
                {completedTasks} of {totalTasks} done
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#557bd2]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-[#fafafa] p-4">
          <button
            onClick={onOpen}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-2.5 text-[11px] text-white hover:bg-black"
          >
            <Eye size={14} />
            Open Project
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-[#fafafa] p-3">
      <p className="text-[9px] uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-normal text-gray-800">
        {value}
      </p>
    </div>
  );
}

function ProjectDetailItem({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-[#fafafa] p-3">
      <p className="text-[9px] uppercase tracking-wide text-gray-400">
        {label}
      </p>

      {badgeClass ? (
        <span
          className={`mt-1.5 inline-flex rounded-full px-2 py-1 text-[9px] ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-1 truncate text-[11px] text-gray-700">
          {value}
        </p>
      )}
    </div>
  );
}

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
    <div className="rounded-lg border border-gray-100 bg-[#fafafa] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-[9px]">
          {label}
        </span>
      </div>
      <p className="mt-1 text-[16px] font-normal text-gray-800">
        {value}
      </p>
    </div>
  );
}

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
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] text-gray-500">
        {label}
      </span>
      <span className="text-[10px] text-gray-800">
        {value}
      </span>
    </div>
  );
}

function ScheduleItem({
  task,
  projects,
}: {
  task: Task;
  projects: Project[];
}) {
  const project = projects.find(
    (item) =>
      String(item.id) ===
      String(task.project_id || "")
  );

  const taskName =
    task.name ||
    task.title ||
    "Untitled Task";

  const dueDate = task.due_date
    ? new Date(task.due_date)
    : null;

  const time =
    dueDate &&
    !Number.isNaN(dueDate.getTime())
      ? dueDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

  return (
    <div className="relative flex min-h-[52px] items-center">
      <div className="w-[52px] shrink-0 text-[9px] text-gray-400">
        {time}
      </div>

      <div className="relative z-10 mx-[7px] h-2 w-2 shrink-0 rounded-full border border-white bg-[#c9ced5]" />

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[8px] text-gray-600">
            {getInitials(taskName)}
          </div>

          <div className="min-w-0">
            <span className="block truncate text-[10px] text-gray-700">
              {taskName}
            </span>

            {project && (
              <span className="block truncate text-[9px] text-gray-400">
                {project.name}
              </span>
            )}
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-[#f4edfa] px-2 py-1 text-[8px] text-[#85579a]">
          {task.status || "Pending"}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-[#fafafa] px-5 py-9 text-center">
      <Users
        size={24}
        className="mx-auto text-gray-300"
      />
      <p className="mt-2 text-[12px] text-gray-600">
        {title}
      </p>
      <p className="mt-1 text-[10px] text-gray-400">
        {description}
      </p>
    </div>
  );
}

function createTeamGradient(stats: {
  developers: number;
  designers: number;
  managers: number;
  qa: number;
  other: number;
  total: number;
}) {
  if (!stats.total) return "#e5e7eb";

  const total = stats.total;
  const developerDeg =
    (stats.developers / total) * 360;
  const designerDeg =
    developerDeg +
    (stats.designers / total) * 360;
  const managerDeg =
    designerDeg +
    (stats.managers / total) * 360;
  const qaDeg =
    managerDeg + (stats.qa / total) * 360;

  return `conic-gradient(
    #557bd2 0deg ${developerDeg}deg,
    #438d5d ${developerDeg}deg ${designerDeg}deg,
    #be8944 ${designerDeg}deg ${managerDeg}deg,
    #895a9d ${managerDeg}deg ${qaDeg}deg,
    #d15b58 ${qaDeg}deg 360deg
  )`;
}
