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

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

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
  status: "To Do" | "In Progress" | "Done";
  assignee_id?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  project_name?: string;
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
   NAVIGATION (unchanged)
========================================================= */

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Projects", href: "/projects" },
  { name: "Tasks", href: "/tasks" },
  { name: "Team", href: "/teams" },
  { name: "Reports", href: "/reports" },
  { name: "Schedule", href: "/schedule" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authenticated user state & actions from hook (untouched)
  const { user, loading, logout } = useAuth();

  /* =========================================================
     ROLE-SCOPED DATA
     Fetched once we know who the user is, then used to derive
     both the stat cards and the notification feed below.
  ========================================================= */

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]); // org/team scoped, depends on role
  const [myTasks, setMyTasks] = useState<Task[]>([]); // tasks assigned directly to this user
  const [dataLoading, setDataLoading] = useState(true);

  const isOrgWide =
    user?.role === "Executive Manager" || user?.role === "System Administrator";

  const getHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchProjectTasks = async (projectId: string, headers: HeadersInit) => {
    try {
      const r = await fetch(`${API_BASE}/tasks/project/${projectId}`, {
        headers,
      });
      if (!r.ok) return [];
      const d = await r.json();
      // getProjectTasks returns a bare array; other endpoints wrap it.
      return Array.isArray(d) ? d : d.tasks || d.data || [];
    } catch {
      return [];
    }
  };

  const loadHeaderData = async (currentUser: any) => {
    try {
      setDataLoading(true);

      const headers = getHeaders();

      const myTasksData: Task[] = await fetch(`${API_BASE}/tasks/my/tasks`, {
        headers,
      })
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((d) => d.tasks || [])
        .catch(() => []);

      setMyTasks(myTasksData);

      if (isOrgWide) {
        const projRes = await fetch(`${API_BASE}/projects`, { headers });
        const projJson = await projRes.json();
        const allProjects: Project[] = projJson.projects || projJson.data || [];

        const taskResults = await Promise.all(
          allProjects.map((p) => fetchProjectTasks(p.id, headers))
        );

        setProjects(allProjects);
        setTasks(taskResults.flat());
      } else if (currentUser.role === "Project Manager") {
        const projRes = await fetch(`${API_BASE}/projects`, { headers });
        const projJson = await projRes.json();
        const allProjects: Project[] = projJson.projects || projJson.data || [];

        const myProjects = allProjects.filter(
          (p) =>
            p.manager_id === currentUser.id ||
            p.manager_id === String(currentUser.id)
        );

        const taskResults = await Promise.all(
          myProjects.map((p) => fetchProjectTasks(p.id, headers))
        );

        setProjects(myProjects);
        setTasks(taskResults.flat());
      } else {
        // Member — dedicated endpoints already scope everything to this user
        const projRes = await fetch(`${API_BASE}/tasks/my/projects`, {
          headers,
        });
        const projJson = await projRes.json();

        setProjects(projJson.projects || []);
        setTasks(myTasksData);
      }
    } catch (err) {
      console.error("Header data loading error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id || !user?.role) return;
    loadHeaderData(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  /* =========================================================
     STAT CARDS — role dependent
  ========================================================= */

  const statsData: StatCard[] = useMemo(() => {
    if (!user) return [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const overdueTasks = tasks.filter((t) => {
      const days = getDaysUntil(t.due_date);
      return days !== null && days < 0 && t.status !== "Done";
    }).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (isOrgWide) {
      const completedProjects = projects.filter(
        (p) => p.status === "Completed"
      ).length;

      return [
        {
          value: String(projects.length),
          label: "Total",
          label2: "Projects",
          badge: `${completedProjects}`,
          note: "completed",
          icon: FolderKanban,
          iconClass: "bg-emerald-500/15 text-emerald-300",
        },
        {
          value: String(totalTasks),
          label: "Total",
          label2: "Tasks",
          badge: `${completedTasks}`,
          note: "done",
          icon: CheckSquare,
          iconClass: "bg-blue-500/15 text-blue-300",
        },
        {
          value: String(completedTasks),
          label: "Completed",
          label2: "Tasks",
          badge: `${completionRate}%`,
          note: "of all tasks",
          icon: TrendingUp,
          iconClass: "bg-purple-500/15 text-purple-300",
        },
        {
          value: String(overdueTasks),
          label: "Overdue",
          label2: "Tasks",
          badge: overdueTasks > 0 ? "!" : "✓",
          note: overdueTasks > 0 ? "needs attention" : "all on track",
          icon: CalendarDays,
          iconClass: "bg-red-500/15 text-red-300",
        },
      ];
    }

    if (user.role === "Project Manager") {
      const completedProjects = projects.filter(
        (p) => p.status === "Completed"
      ).length;

      return [
        {
          value: String(projects.length),
          label: "My",
          label2: "Projects",
          badge: `${completedProjects}`,
          note: "completed",
          icon: FolderKanban,
          iconClass: "bg-emerald-500/15 text-emerald-300",
        },
        {
          value: String(totalTasks),
          label: "Team",
          label2: "Tasks",
          badge: `${completedTasks}`,
          note: "done",
          icon: CheckSquare,
          iconClass: "bg-blue-500/15 text-blue-300",
        },
        {
          value: String(completedTasks),
          label: "Completed",
          label2: "Tasks",
          badge: `${completionRate}%`,
          note: "of team tasks",
          icon: TrendingUp,
          iconClass: "bg-purple-500/15 text-purple-300",
        },
        {
          value: String(overdueTasks),
          label: "Overdue",
          label2: "Tasks",
          badge: overdueTasks > 0 ? "!" : "✓",
          note: overdueTasks > 0 ? "needs attention" : "all on track",
          icon: CalendarDays,
          iconClass: "bg-red-500/15 text-red-300",
        },
      ];
    }

    // Member
    const dueSoon = tasks.filter((t) => {
      const days = getDaysUntil(t.due_date);
      return days !== null && days >= 0 && days <= 3 && t.status !== "Done";
    }).length;

    return [
      {
        value: String(projects.length),
        label: "My",
        label2: "Projects",
        badge: `${projects.length}`,
        note: "assigned to you",
        icon: FolderKanban,
        iconClass: "bg-emerald-500/15 text-emerald-300",
      },
      {
        value: String(totalTasks),
        label: "My",
        label2: "Tasks",
        badge: `${completedTasks}`,
        note: "done",
        icon: CheckSquare,
        iconClass: "bg-blue-500/15 text-blue-300",
      },
      {
        value: String(completedTasks),
        label: "Completed",
        label2: "Tasks",
        badge: `${completionRate}%`,
        note: "of your tasks",
        icon: TrendingUp,
        iconClass: "bg-purple-500/15 text-purple-300",
      },
      {
        value: String(overdueTasks),
        label: "Overdue",
        label2: "Tasks",
        badge: `${dueSoon}`,
        note: overdueTasks > 0 ? "needs attention" : "due within 3 days",
        icon: CalendarDays,
        iconClass: "bg-red-500/15 text-red-300",
      },
    ];
  }, [user, isOrgWide, projects, tasks]);

  /* =========================================================
     NOTIFICATIONS — role dependent

     Member / Project Manager : notified when a task is assigned to them
     Project Manager          : also notified when a project is assigned to them
     Executive / Admin        : notified when any task or project is completed
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
        iconClass: "bg-blue-500/15 text-blue-300",
        title: "Task assigned to you",
        description: `"${task.name}"${task.project_name ? ` in ${task.project_name}` : ""
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
          iconClass: "bg-emerald-500/15 text-emerald-300",
          title: "Project assigned to you",
          description: `You're now managing "${project.name}"`,
          time,
        });
      });
    }

    if (isOrgWide) {
      tasks.forEach((task) => {
        if (task.status !== "Done") return;
        const time = task.updated_at || task.created_at;
        if (!time) return;

        items.push({
          id: `task-completed-${task.id}`,
          icon: CheckCircle2,
          iconClass: "bg-emerald-500/15 text-emerald-300",
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
          iconClass: "bg-purple-500/15 text-purple-300",
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

  /* =========================================================
     READ / UNREAD TRACKING (client-side, per browser)
  ========================================================= */

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("notif_read_ids");
      if (raw) setReadIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore malformed storage
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
          localStorage.setItem("notif_read_ids", JSON.stringify(Array.from(ids)));
        } catch {
          // ignore storage write failures
        }
      }

      return next;
    });
  };

  // Helper to get initials (e.g., "James Bond" -> "JB")
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className="relative overflow-hidden bg-black text-white"
      style={{
        backgroundImage: "url('/Dashboard-Img/HeaderBackground.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/85" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        {/* =====================================================
            TOP NAVBAR
        ====================================================== */}

        <div className="flex h-[50px] items-center justify-between border-b border-white/10">
          {/* LOGO */}

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
              <div className="relative h-4 w-4">
                <span className="absolute left-[1px] top-[6px] h-[9px] w-[9px] rotate-45 rounded-[2px] bg-black" />
                <span className="absolute left-[6px] top-[1px] h-[11px] w-[8px] rotate-45 rounded-[2px] bg-black" />
              </div>
            </div>

            <span className="text-[17px] font-medium tracking-tight">
              ProjectSpace
            </span>
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav className="hidden h-full items-center gap-7 lg:flex">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-full items-center text-[13px] font-medium transition ${active ? "text-white" : "text-white/55 hover:text-white"
                    }`}
                >
                  {item.name}

                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex items-center gap-3">
            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell size={19} strokeWidth={1.7} />

                {unreadCount > 0 && (
                  <span className="absolute right-[3px] top-[2px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-white px-1 text-[8px] font-bold text-black">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#171717] shadow-2xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-medium text-white">
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
                        <Inbox size={22} className="text-white/25" />
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
                            className="flex gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/5"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconClass}`}
                            >
                              <Icon size={14} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white">
                                {n.title}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-white/50">
                                {n.description}
                              </p>

                              <p className="mt-1 text-[10px] text-white/30">
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

            {/* =================================================
                PROFILE
            ================================================= */}

            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(false);
                  setProfileOpen(!profileOpen);
                }}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-white/10"
              >
                {/* Avatar */}

                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-[#d2c2b8] via-[#8b776b] to-[#332c29] text-[10px] font-semibold text-white">
                  {loading ? "..." : getInitials(user?.fullName)}
                </div>

                {/* Profile information */}

                <div className="hidden text-left sm:block">
                  <p className="text-[12px] font-semibold">
                    {loading ? "Loading..." : user?.fullName || "Guest User"}
                  </p>

                  <p className="text-[10px] text-white/50">
                    {loading ? "..." : user?.role || "Member"}
                  </p>
                </div>

                <ChevronDown
                  size={15}
                  className={`transition-transform ${profileOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* =================================================
                  PROFILE DROPDOWN
              ================================================= */}

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#171717] p-1.5 shadow-2xl">
                  <div className="border-b border-white/10 px-3 py-3">
                    <p className="text-sm font-medium text-white">
                      {user?.fullName || "User Account"}
                    </p>

                    <p className="mt-0.5 text-xs text-white/40">
                      {user?.email || "user@projectspace.com"}
                    </p>
                  </div>

                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
                    <User size={16} />
                    Profile
                  </button>

                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      router.replace("/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu */}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {/* =====================================================
            MOBILE NAVIGATION
        ====================================================== */}

        {mobileMenuOpen && (
          <nav className="border-b border-white/10 py-3 lg:hidden">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-4 py-3 text-sm transition ${active
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* =====================================================
            HERO AREA
        ====================================================== */}

        <div className="grid min-h-[250px] grid-cols-1 items-center gap-8 py-9 lg:grid-cols-[1fr_auto]">
          {/* =================================================
              LEFT SIDE - WELCOME + TITLE
          ================================================= */}

          <div className="max-w-[520px]">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              Welcome back, {user?.fullName || "User"}!
            </div>

            <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-1.5px] sm:text-[40px]">
              Here's what's happening
              <br className="hidden sm:block" /> 
               in your projects today.
            </h1>
          </div>

          {/* =================================================
              RIGHT SIDE - STATISTIC CARDS (role dependent)
          ================================================= */}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[610px]">
            {dataLoading ? (
              <div className="col-span-2 flex min-h-[125px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/5 backdrop-blur-md sm:col-span-4">
                <Loader2 size={22} className="animate-spin text-white/40" />
              </div>
            ) : (
              statsData.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label + stat.label2}
                    className="min-h-[125px] rounded-xl border border-white/[0.08] bg-white/5 p-3.5 shadow-xl backdrop-blur-md transition hover:bg-black/55"
                  >
                    {/* TOP */}

                    <div className="mb-3 flex items-start justify-between">
                      <span className="text-[28px] font-medium leading-none tracking-tight">
                        {stat.value}
                      </span>

                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconClass}`}
                      >
                        <Icon size={17} strokeWidth={1.7} />
                      </div>
                    </div>

                    {/* LABEL */}

                    <p className="text-[11px] font-medium leading-tight text-white">
                      {stat.label}
                    </p>

                    <p className="text-[11px] font-medium leading-tight text-white">
                      {stat.label2}
                    </p>

                    {/* NOTE */}

                    <p className="mt-2 text-[9px] text-white/45">
                      <span className="font-semibold text-emerald-400">
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
    </header>
  );
}
