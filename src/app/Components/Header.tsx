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
  const isSystemAdministrator =
  user?.role === "System Administrator";
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
  <header className="border-b border-gray-200 bg-white text-[#18212b] shadow-[0_1px_8px_rgba(15,23,42,0.04)]">

    {/* =====================================================
        TOP NAVIGATION
    ===================================================== */}
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

      <div className="flex h-[68px] items-center justify-between">

        {/* LOGO */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
            <div className="relative h-5 w-5">
              <span className="absolute left-[2px] top-[8px] h-[10px] w-[10px] rotate-45 rounded-[3px] bg-[#17232d]" />
              <span className="absolute left-[8px] top-[2px] h-[13px] w-[9px] rotate-45 rounded-[3px] bg-[#17232d]" />
            </div>
          </div>

          <span className="text-[20px] font-medium tracking-[-0.6px] text-[#18212b]">
            ProjectSpace
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden h-full items-center gap-8 lg:flex">

          {[
            ...navigation,
            ...(isSystemAdministrator
              ? [{ name: "Users", href: "/users" }]
              : []),
          ].map((item) => {

            const active =
              pathname === item.href ||
              (item.href !== "/" &&
                pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex h-full items-center
                  text-[14px] font-medium
                  transition-colors
                  ${
                    active
                      ? "text-[#18212b]"
                      : "text-gray-500 hover:text-[#18212b]"
                  }
                `}
              >
                {item.name}

                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#18212b]" />
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
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#18212b] transition hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell size={21} strokeWidth={1.7} />

              {unreadCount > 0 && (
                <span className="absolute right-[3px] top-[2px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#18212b] px-1 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">

                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Notifications
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto">

                  {dataLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2
                        size={20}
                        className="animate-spin text-gray-400"
                      />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Inbox
                        size={22}
                        className="text-gray-300"
                      />

                      <p className="text-xs text-gray-400">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = n.icon;

                      return (
                        <div
                          key={n.id}
                          className="flex gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconClass}`}
                          >
                            <Icon size={14} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800">
                              {n.title}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              {n.description}
                            </p>

                            <p className="mt-1 text-[10px] text-gray-400">
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
              className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-gray-100"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-br from-[#d8cec5] to-[#75685f] text-[11px] font-semibold text-white">
                {loading
                  ? "..."
                  : getInitials(user?.fullName)}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-[13px] font-semibold text-[#18212b]">
                  {loading
                    ? "Loading..."
                    : user?.fullName || "Guest User"}
                </p>

                <p className="text-[11px] text-gray-500">
                  {loading
                    ? "..."
                    : user?.role || "Member"}
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`text-gray-600 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />

            </button>

            {/* PROFILE DROPDOWN */}
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">

                <div className="border-b border-gray-100 px-3 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.fullName || "User Account"}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {user?.email || "user@projectspace.com"}
                  </p>
                </div>

                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900">
                  <User size={16} />
                  Profile
                </button>

                <button
                  onClick={() =>
                    router.push("/settings/password")
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>

              </div>
            )}

          </div>

          {/* MOBILE */}
          <button
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen
              ? <X size={21} />
              : <Menu size={21} />}
          </button>

        </div>

      </div>

      {/* MOBILE NAV */}
      {mobileMenuOpen && (
        <nav className="border-t border-gray-100 py-3 lg:hidden">

          {[
            ...navigation,
            ...(isSystemAdministrator
              ? [{ name: "Users", href: "/users" }]
              : []),
          ].map((item) => {

            const active =
              pathname === item.href ||
              (item.href !== "/" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className={`
                  block rounded-lg px-4 py-3 text-sm
                  ${
                    active
                      ? "bg-gray-100 font-semibold text-gray-900"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
        DASHBOARD HERO
    ===================================================== */}

    <div className="border-t border-gray-100 bg-[#E8E6E6]">

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">

        <div className="grid items-center gap-8 lg:grid-cols-[1fr_650px]">

          {/* LEFT */}
          <div className="max-w-[560px]">

            <div className="mb-4 inline-flex rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-medium text-gray-600 shadow-sm">
              Welcome back, {user?.fullName || "User"}!
            </div>

            <h1 className="text-[32px] font-medium leading-[1.08] tracking-[-1.7px] text-[#18212b] sm:text-[42px]">
              Here's what's happening
              <br />
              in your projects today.
            </h1>

            <p className="mt-4 max-w-[430px] text-[13px] leading-6 text-gray-500">
              Stay up to date with your projects,
              tasks and team activity.
            </p>

          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            {dataLoading ? (
              <div className="col-span-2 flex min-h-[150px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm sm:col-span-4">
                <Loader2
                  size={22}
                  className="animate-spin text-gray-400"
                />
              </div>
            ) : (
              statsData.map((stat, index) => {

                const Icon = stat.icon;

                const cardColors = [
                  {
                    icon: "bg-[#e7f5ee] text-[#2e9460]",
                    number: "text-[#18212b]",
                  },
                  {
                    icon: "bg-[#e8f1ff] text-[#3b78bd]",
                    number: "text-[#18212b]",
                  },
                  {
                    icon: "bg-[#f1eafa] text-[#8a5ba5]",
                    number: "text-[#18212b]",
                  },
                  {
                    icon: "bg-[#fae9ec] text-[#c35c68]",
                    number: "text-[#18212b]",
                  },
                ][index] || {
                  icon: "bg-gray-100 text-gray-600",
                  number: "text-[#18212b]",
                };

                return (
                  <div
                    key={stat.label + stat.label2}
                    className="min-h-[150px] rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)]"
                  >

                    <div className="flex items-start justify-between">

                      <span
                        className={`text-[30px] font-medium leading-none tracking-tight ${cardColors.number}`}
                      >
                        {stat.value}
                      </span>

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${cardColors.icon}`}
                      >
                        <Icon
                          size={20}
                          strokeWidth={1.8}
                        />
                      </div>

                    </div>

                    <p className="mt-5 text-[13px] font-semibold leading-tight text-gray-800">
                      {stat.label}
                      <br />
                      {stat.label2}
                    </p>

                    <p className="mt-3 text-[11px] text-emerald-600">
                      <span className="font-bold text-emerald-600">
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
);
}
