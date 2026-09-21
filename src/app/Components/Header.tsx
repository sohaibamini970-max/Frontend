"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  CheckCircle2,
  UserPlus,
  Inbox,
  Loader2,
} from "lucide-react";

// ============================================================
// CLIENT ONLY WRAPPER COMPONENT
// ============================================================
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";
const PROGRAM_API = `${API_BASE}/program-tasks`;

/* =========================================================
   TYPES
========================================================= */

type Project = {
  id: string;
  name: string;
  status?: string;
  manager_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Task = {
  id: string;
  project_id?: string;
  name: string;
  status: "To Do" | "In Progress" | "Done" | "Completed";
  assignee_id?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  project_name?: string;
};

type ProgramTask = {
  id: string;
  name: string;
  status: "To Do" | "In Progress" | "Done" | "Completed";
  assignee_id?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  program_project_id?: string;
  program_project_name?: string;
  program_project_manager_id?: string | null;
  program_name?: string;
};

type ProgramProject = {
  id: string;
  name: string;
  manager_id?: string | null;
};

type NotificationItem = {
  id: string;
  icon: typeof Bell;
  iconClass: string;
  title: string;
  description: string;
  time: string;
};

type StatCard = {
  value: string;
  label: string;
  label2: string;
  badge: string;
  note: string;
  icon: typeof Bell;
  iconClass: string;
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

function getDaysUntil(date?: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date.substring(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatRelativeTime(date?: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* =========================================================
   NAVIGATION
========================================================= */

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Projects", href: "/projects" },
  { name: "Teams", href: "/teams" },
  { name: "Tasks", href: "/tasks" },
  { name: "Reports", href: "/reports" },
  { name: "Schedule", href: "/schedule" },
  { name: "Performance", href: "/performance" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, loading, logout } = useAuth();
  const isSystemAdministrator = user?.role === "System Administrator";
  const isExecutiveManager = user?.role === "Executive Manager";
  const isProjectManager = user?.role === "Project Manager";
  const isMember = user?.role === "Member";

  const isOrgWide = isSystemAdministrator || isExecutiveManager;

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);

  // Program data
  const [programTasks, setProgramTasks] = useState<ProgramTask[]>([]);
  const [programProjects, setProgramProjects] = useState<ProgramProject[]>([]);
  const [myProgramProjectIds, setMyProgramProjectIds] = useState<string[]>([]);

  const [dataLoading, setDataLoading] = useState(true);

  const getHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchProjectTasks = async (
    projectId: string,
    headers: HeadersInit
  ): Promise<Task[]> => {
    try {
      const r = await fetch(`${API_BASE}/tasks/project/${projectId}`, {
        headers,
      });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : d.tasks || d.data || [];
    } catch {
      return [];
    }
  };

  const fetchProgramTasksAll = async (
    headers: HeadersInit
  ): Promise<ProgramTask[]> => {
    try {
      const r = await fetch(`${PROGRAM_API}/all`, { headers });
      if (!r.ok) return [];
      const d = await r.json();
      return d.tasks || d.data || [];
    } catch {
      return [];
    }
  };

  const fetchProgramTasksForMember = async (
    headers: HeadersInit,
    userId: string
  ): Promise<{ tasks: ProgramTask[]; programProjects: ProgramProject[] }> => {
    try {
      // Tasks directly assigned to the member
      const ownRes = await fetch(`${PROGRAM_API}/my/tasks`, { headers });
      const ownData = ownRes.ok ? await ownRes.json() : { tasks: [] };
      const ownTasks: ProgramTask[] = ownData.tasks || [];

      // Program projects the member belongs to
      const ppRes = await fetch(`${PROGRAM_API}/my/program-projects`, {
        headers,
      });
      const ppData = ppRes.ok ? await ppRes.json() : { programProjects: [] };
      const myProgramProjects: ProgramProject[] = (
        ppData.programProjects || []
      ).map((pp: any) => ({
        id: String(pp.id),
        name: pp.name || pp.program_project_name || "Program Project",
        manager_id: String(
          pp.manager_id ?? pp.program_project_manager_id ?? ""
        ),
      }));

      // Tasks in each of those program projects
      const taskLists = await Promise.all(
        myProgramProjects.map(async (pp) => {
          const r = await fetch(
            `${PROGRAM_API}/my/program-project/${pp.id}/tasks`,
            { headers }
          );
          if (!r.ok) return [];
          const d = await r.json();
          return d.tasks || [];
        })
      );

      // Merge + dedupe
      const merged = new Map<string, ProgramTask>();
      [...ownTasks, ...taskLists.flat()].forEach((t: any) => {
        merged.set(String(t.id), {
          id: String(t.id),
          name: t.name || t.title || "Untitled Task",
          status: t.status || "To Do",
          assignee_id: t.assignee_id ?? t.assigneeId ?? "",
          due_date: t.due_date ?? t.dueDate ?? null,
          created_at: t.created_at ?? t.createdAt ?? "",
          updated_at: t.updated_at ?? t.updatedAt ?? "",
          program_project_id: String(t.program_project_id || ""),
          program_project_name: t.program_project_name || "",
          program_project_manager_id: String(
            t.program_project_manager_id || ""
          ),
          program_name: t.program_name || "",
        });
      });

      return {
        tasks: Array.from(merged.values()),
        programProjects: myProgramProjects,
      };
    } catch (e) {
      console.error("Program member fetch error:", e);
      return { tasks: [], programProjects: [] };
    }
  };

  const loadHeaderData = async (currentUser: any) => {
    try {
      setDataLoading(true);
      const headers = getHeaders();

      // -----------------------------------------------------------
      // 1. My assigned regular tasks (used for notifications + member view)
      // -----------------------------------------------------------
      const myTasksData: Task[] = await fetch(
        `${API_BASE}/tasks/my/tasks`,
        { headers }
      )
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((d) => d.tasks || [])
        .catch(() => []);
      setMyTasks(myTasksData);

      // -----------------------------------------------------------
      // 2. Role-specific regular projects + tasks
      // -----------------------------------------------------------
      if (isOrgWide) {
        // --- All regular projects + all tasks ---
        const projRes = await fetch(`${API_BASE}/projects`, { headers });
        const projJson = await projRes.json();
        const allProjects: Project[] = projJson.projects || projJson.data || [];

        const taskResults = await Promise.all(
          allProjects.map((p) => fetchProjectTasks(p.id, headers))
        );

        setProjects(allProjects);
        setTasks(taskResults.flat());

        // --- All program tasks (org-wide) ---
        const allProgramTasks = await fetchProgramTasksAll(headers);
        setProgramTasks(allProgramTasks);

        // Derive unique program projects from program tasks
        const uniqueProgramProjects = deriveProgramProjects(allProgramTasks);
        setProgramProjects(uniqueProgramProjects);
        setMyProgramProjectIds(uniqueProgramProjects.map((pp) => pp.id));
      } else if (isProjectManager) {
        // --- Only PM's own regular projects ---
        const projRes = await fetch(`${API_BASE}/projects`, { headers });
        const projJson = await projRes.json();
        const allProjects: Project[] = projJson.projects || projJson.data || [];

        const myUserId = String(currentUser.id);
        const myProjects = allProjects.filter(
          (p) =>
            String(p.manager_id || "") === myUserId ||
            String((p as any).project_manager_id || "") === myUserId
        );

        const taskResults = await Promise.all(
          myProjects.map((p) => fetchProjectTasks(p.id, headers))
        );

        setProjects(myProjects);
        setTasks(taskResults.flat());

        // --- Program tasks: PM sees tasks in program projects they manage ---
        const allProgramTasks = await fetchProgramTasksAll(headers);
        const myProgramTasks = allProgramTasks.filter(
          (t) =>
            String(t.program_project_manager_id || "") === myUserId ||
            String(t.assignee_id || "") === myUserId
        );
        setProgramTasks(myProgramTasks);

        const uniqueProgramProjects = deriveProgramProjects(myProgramTasks);
        setProgramProjects(uniqueProgramProjects);
        setMyProgramProjectIds(uniqueProgramProjects.map((pp) => pp.id));
      } else {
        // --- Member: only their own regular projects + tasks ---
        const projRes = await fetch(`${API_BASE}/tasks/my/projects`, {
          headers,
        });
        const projJson = await projRes.json();
        setProjects(projJson.projects || []);
        setTasks(myTasksData);

        // --- Member: program projects they belong to + their program tasks ---
        const { tasks: memberProgramTasks, programProjects: memberProgramProjects } =
          await fetchProgramTasksForMember(headers, String(currentUser.id));

        setProgramTasks(memberProgramTasks);
        setProgramProjects(memberProgramProjects);
        setMyProgramProjectIds(memberProgramProjects.map((pp) => pp.id));
      }
    } catch (err) {
      console.error("Header data loading error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // Derive unique program projects from a list of program tasks
  const deriveProgramProjects = (list: ProgramTask[]): ProgramProject[] => {
    const map = new Map<string, ProgramProject>();
    list.forEach((t) => {
      const id = String(t.program_project_id || "");
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: t.program_project_name || "Program Project",
          manager_id: String(t.program_project_manager_id || ""),
        });
      }
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    if (!user?.id || !user?.role) return;
    loadHeaderData(user);
  }, [user?.id, user?.role]);

  /* =========================================================
     STAT CARDS — role-based, including program projects & tasks
  ========================================================= */

  const statsData: StatCard[] = useMemo(() => {
    if (!user) return [];

    // ----- Combined counts (regular + program) -----
    const regularProjectsCount = projects.length;
    const regularTasksCount = tasks.length;

    const programProjectsCount = programProjects.length;
    const programTasksCount = programTasks.length;

    const totalProjects = regularProjectsCount + programProjectsCount;
    const totalTasks = regularTasksCount + programTasksCount;

    // Completed regular tasks (Done or Completed both count as "completed"
    // for the user-facing summary — keep it simple and inclusive)
    const regularCompleted = tasks.filter(
      (t) => t.status === "Done" || t.status === "Completed"
    ).length;
    const programCompleted = programTasks.filter(
      (t) => t.status === "Done" || t.status === "Completed"
    ).length;
    const totalCompleted = regularCompleted + programCompleted;

    // Overdue across both
    const overdueRegular = tasks.filter((t) => {
      const d = getDaysUntil(t.due_date);
      return d !== null && d < 0 && t.status !== "Done" && t.status !== "Completed";
    }).length;
    const overdueProgram = programTasks.filter((t) => {
      const d = getDaysUntil(t.due_date);
      return d !== null && d < 0 && t.status !== "Done" && t.status !== "Completed";
    }).length;
    const overdueTasks = overdueRegular + overdueProgram;

    const completionRate =
      totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    // Completed projects (regular) + program projects fully done
    const completedRegularProjects = projects.filter(
      (p) => p.status === "Completed"
    ).length;

    // Program projects considered "completed" if all their program tasks are Done/Completed
    const programProjectProgress = new Map<string, { total: number; done: number }>();
    programTasks.forEach((t) => {
      const id = String(t.program_project_id || "");
      if (!id) return;
      const entry = programProjectProgress.get(id) || { total: 0, done: 0 };
      entry.total += 1;
      if (t.status === "Done" || t.status === "Completed") entry.done += 1;
      programProjectProgress.set(id, entry);
    });
    const completedProgramProjects = Array.from(
      programProjectProgress.values()
    ).filter((e) => e.total > 0 && e.done === e.total).length;

    const totalCompletedProjects =
      completedRegularProjects + completedProgramProjects;

    // ----- Labels & notes per role -----
    let projectLabel = "My";
    let projectLabel2 = "Projects";
    let projectNote = "assigned to you";

    let taskLabel = "My";
    let taskLabel2 = "Tasks";
    let taskNote = "assigned to you";

    let completedNote = "of your tasks";
    let overdueNote =
      overdueTasks > 0 ? "needs attention" : "all on track";

    if (isOrgWide) {
      projectLabel = "All";
      projectLabel2 = "Projects";
      projectNote = "incl. program projects";

      taskLabel = "All";
      taskLabel2 = "Tasks";
      taskNote = "incl. program tasks";

      completedNote = "of all tasks";
    } else if (isProjectManager) {
      projectLabel = "My";
      projectLabel2 = "Projects";
      projectNote = "projects you manage";

      taskLabel = "My";
      taskLabel2 = "Tasks";
      taskNote = "incl. program tasks";
    } else if (isMember) {
      projectLabel = "My";
      projectLabel2 = "Projects";
      projectNote = "incl. program projects";

      taskLabel = "My";
      taskLabel2 = "Tasks";
      taskNote = "incl. program tasks";
    }

    // 4 cards, same structure as before
    return [
      {
        value: String(totalProjects),
        label: projectLabel,
        label2: projectLabel2,
        badge: `${totalCompletedProjects}`,
        note: "completed",
        icon: FolderKanban,
        iconClass: "bg-[#e8f5e9] text-[#2e7d32]",
      },
      {
        value: String(totalTasks),
        label: taskLabel,
        label2: taskLabel2,
        badge: `${totalCompleted}`,
        note: "done",
        icon: CheckSquare,
        iconClass: "bg-[#e3f2fd] text-[#1565c0]",
      },
      {
        value: String(totalCompleted),
        label: "Completed",
        label2: "Tasks",
        badge: `${completionRate}%`,
        note: completedNote,
        icon: TrendingUp,
        iconClass: "bg-[#f3e5f5] text-[#7b1fa2]",
      },
      {
        value: String(overdueTasks),
        label: "Overdue",
        label2: "Tasks",
        badge: overdueTasks > 0 ? "!" : "✓",
        note: overdueNote,
        icon: CalendarDays,
        iconClass: "bg-[#fce4ec] text-[#c62828]",
      },
    ];
  }, [
    user,
    isOrgWide,
    isProjectManager,
    isMember,
    projects,
    tasks,
    programProjects,
    programTasks,
  ]);

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const notifications: NotificationItem[] = useMemo(() => {
    if (!user) return [];

    const items: NotificationItem[] = [];

    myTasks.forEach((task) => {
      const time = task.created_at || task.updated_at;
      if (!time) return;

      items.push({
        id: `task-assigned-${task.id}`,
        icon: UserPlus,
        iconClass: "bg-[#e3f2fd] text-[#1565c0]",
        title: "Task assigned to you",
        description: `"${task.name}"${
          task.project_name ? ` in ${task.project_name}` : ""
        }`,
        time,
      });
    });

    if (user.role === "Project Manager") {
      projects.forEach((project) => {
        const time = project.updated_at || project.created_at;
        if (!time) return;

        items.push({
          id: `project-assigned-${project.id}`,
          icon: FolderKanban,
          iconClass: "bg-[#e8f5e9] text-[#2e7d32]",
          title: "Project assigned to you",
          description: `You're now managing "${project.name}"`,
          time,
        });
      });
    }

    if (isOrgWide) {
      tasks.forEach((task) => {
        if (task.status !== "Done" && task.status !== "Completed") return;
        const time = task.updated_at || task.created_at;
        if (!time) return;

        items.push({
          id: `task-completed-${task.id}`,
          icon: CheckCircle2,
          iconClass: "bg-[#e8f5e9] text-[#2e7d32]",
          title: "Task completed",
          description: `"${task.name}" was marked done`,
          time,
        });
      });

      projects.forEach((project) => {
        if (project.status !== "Completed") return;
        const time = project.updated_at || project.created_at;
        if (!time) return;

        items.push({
          id: `project-completed-${project.id}`,
          icon: TrendingUp,
          iconClass: "bg-[#f3e5f5] text-[#7b1fa2]",
          title: "Project completed",
          description: `"${project.name}" was marked completed`,
          time,
        });
      });
    }

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 12);
  }, [user, isOrgWide, projects, tasks, myTasks]);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("notif_read_ids");
      if (raw) setReadIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const toggleNotifications = () => {
    setProfileOpen(false);
    setNotifOpen((prev) => {
      const next = !prev;
      if (next && notifications.length > 0) {
        const ids = new Set(readIds);
        notifications.forEach((n) => ids.add(n.id));
        setReadIds(ids);
        try {
          localStorage.setItem(
            "notif_read_ids",
            JSON.stringify(Array.from(ids))
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // WRAP ENTIRE HEADER WITH ClientOnly TO PREVENT HYDRATION ERROR
  return (
    <ClientOnly>
      <header className="border-b border-[#1a2a3a] bg-[#1a2a3a]">
        {/* =====================================================
            TOP NAVIGATION - Dark background
        ===================================================== */}
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex h-[68px] items-center justify-between">
            {/* LOGO - White text */}
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-sm">
                <div className="relative h-5 w-5">
                  <span className="absolute left-[2px] top-[8px] h-[10px] w-[10px] rotate-45 rounded-[3px] bg-white" />
                  <span className="absolute left-[8px] top-[2px] h-[13px] w-[9px] rotate-45 rounded-[3px] bg-white" />
                </div>
              </div>
              <span className="text-[20px] font-medium tracking-[-0.6px] text-white">
                ARGProjectSpace
              </span>
            </Link>

            {/* DESKTOP NAVIGATION - White text */}
            <nav className="hidden h-full items-center gap-8 lg:flex">
              {[
                ...navigation,
                ...(isSystemAdministrator
                  ? [{ name: "Users", href: "/users" }]
                  : []),
              ].map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative flex h-full items-center
                      text-[13px] font-medium
                      transition-colors
                      ${
                        active
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }
                    `}
                  >
                    {item.name}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-3">
              {/* NOTIFICATIONS */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                  aria-label="Notifications"
                >
                  <Bell size={21} strokeWidth={1.7} />
                  {unreadCount > 0 && (
                    <span className="absolute right-[3px] top-[2px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#ef5350] px-1 text-[8px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[#2a3a4a] bg-[#1a2a3a] shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                    <div className="border-b border-[#2a3a4a] px-4 py-3">
                      <p className="text-sm font-semibold text-white">
                        Notifications
                      </p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {dataLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2
                            size={20}
                            className="animate-spin text-white/40"
                          />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                          <Inbox size={22} className="text-white/30" />
                          <p className="text-xs text-white/40">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const Icon = n.icon;
                          return (
                            <div
                              key={n.id}
                              className="flex gap-3 border-b border-[#2a3a4a] px-4 py-3 last:border-0 hover:bg-white/5"
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconClass}`}
                              >
                                <Icon size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white">
                                  {n.title}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-white/60">
                                  {n.description}
                                </p>
                                <p className="mt-1 text-[10px] text-white/40">
                                  {formatRelativeTime(n.time)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    setProfileOpen(!profileOpen);
                  }}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-white/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/20 text-[11px] font-semibold text-white">
                    {loading ? "..." : getInitials(user?.fullName)}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[13px] font-medium text-white">
                      {loading ? "Loading..." : user?.fullName || "Guest User"}
                    </p>
                    <p className="text-[11px] text-white/60">
                      {loading ? "..." : user?.role || "Member"}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white/60 transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* PROFILE DROPDOWN */}
                {profileOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#2a3a4a] bg-[#1a2a3a] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                    <div className="border-b border-[#2a3a4a] px-3 py-3">
                      <p className="text-sm font-semibold text-white">
                        {user?.fullName || "User Account"}
                      </p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {user?.email || "user@projectspace.com"}
                      </p>
                    </div>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
                      <User size={16} />
                      Profile
                    </button>
                    <button
                      onClick={() => router.push("/settings/password")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <Settings size={16} />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        router.replace("/login");
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#ef5350] transition hover:bg-[#ef5350]/10"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* MOBILE */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </div>

          {/* MOBILE NAV */}
          {mobileMenuOpen && (
            <nav className="border-t border-[#2a3a4a] py-3 lg:hidden">
              {[
                ...navigation,
                ...(isSystemAdministrator
                  ? [{ name: "Users", href: "/users" }]
                  : []),
              ].map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      block rounded-lg px-4 py-3 text-sm
                      ${
                        active
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* =====================================================
            DASHBOARD HERO - Dark background with transparent glass cards
        ===================================================== */}
        <div className="border-t border-[#2a3a4a] bg-[#1a2a3a]">
          <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_650px]">
              {/* LEFT - Welcome Text - White text */}
              <div className="max-w-[560px] pt-1">
                <h2 className="text-[32px] font-light tracking-[-0.5px] text-white sm:text-[38px]">
                  WELCOME BACK,
                  <br />
                  <span className="font-semibold">
                    {user?.fullName?.toUpperCase() || "USER"}!
                  </span>
                </h2>

                <p className="mt-4 text-[18px] font-medium text-white/90">
                  Here's what's happening in your projects today.
                </p>

                <p className="mt-2 text-[14px] text-white/60">
                  Stay up to date with your projects, tasks and team activity.
                </p>
              </div>

              {/* RIGHT - STAT CARDS - Glass/Transparent background */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {dataLoading ? (
                  <div className="col-span-2 flex min-h-[145px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm sm:col-span-4">
                    <Loader2
                      size={22}
                      className="animate-spin text-white/60"
                    />
                  </div>
                ) : (
                  statsData.map((stat, index) => {
                    const Icon = stat.icon;

                    const cardIconColors = [
                      { bg: "bg-[#e8f5e9]/20 text-[#81c784]" },
                      { bg: "bg-[#e3f2fd]/20 text-[#64b5f6]" },
                      { bg: "bg-[#f3e5f5]/20 text-[#ce93d8]" },
                      { bg: "bg-[#fce4ec]/20 text-[#ef9a9a]" },
                    ][index] || { bg: "bg-white/10 text-white/60" };

                    return (
                      <div
                        key={stat.label + stat.label2}
                        className="min-h-[145px] rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-4 shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition hover:bg-white/15"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[30px] font-medium leading-none tracking-tight text-white">
                            {stat.value}
                          </span>
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${cardIconColors.bg}`}
                          >
                            <Icon size={20} strokeWidth={1.8} />
                          </div>
                        </div>

                        <p className="mt-4 text-[13px] font-medium leading-tight text-white/90">
                          {stat.label}
                          <br />
                          {stat.label2}
                        </p>

                        <p className="mt-2 text-[11px] text-[#81c784]">
                          <span className="font-bold text-[#81c784]">
                            {stat.badge}
                          </span>{" "}
                          {stat.note}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </ClientOnly>
  );
}
