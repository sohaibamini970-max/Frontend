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
   NAVIGATION
========================================================= */

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
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

  const { user, loading, logout } = useAuth();
  const isSystemAdministrator = user?.role === "System Administrator";

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
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
  }, [user?.id, user?.role]);

  /* =========================================================
     STAT CARDS
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
          label: "My",
          label2: "Projects",
          badge: `${completedProjects}`,
          note: "completed",
          icon: FolderKanban,
          iconClass: "bg-[#e7f5ee] text-[#2e9460]",
        },
        {
          value: String(totalTasks),
          label: "Team",
          label2: "Tasks",
          badge: `${completedTasks}`,
          note: "done",
          icon: CheckSquare,
          iconClass: "bg-[#e8f1ff] text-[#3b78bd]",
        },
        {
          value: String(completedTasks),
          label: "Completed",
          label2: "Tasks",
          badge: `${completionRate}%`,
          note: "of team tasks",
          icon: TrendingUp,
          iconClass: "bg-[#f1eafa] text-[#8a5ba5]",
        },
        {
          value: String(overdueTasks),
          label: "Overdue",
          label2: "Tasks",
          badge: overdueTasks > 0 ? "!" : "✓",
          note: overdueTasks > 0 ? "needs attention" : "all on track",
          icon: CalendarDays,
          iconClass: "bg-[#fae9ec] text-[#c35c68]",
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
          iconClass: "bg-[#e7f5ee] text-[#2e9460]",
        },
        {
          value: String(totalTasks),
          label: "Team",
          label2: "Tasks",
          badge: `${completedTasks}`,
          note: "done",
          icon: CheckSquare,
          iconClass: "bg-[#e8f1ff] text-[#3b78bd]",
        },
        {
          value: String(completedTasks),
          label: "Completed",
          label2: "Tasks",
          badge: `${completionRate}%`,
          note: "of team tasks",
          icon: TrendingUp,
          iconClass: "bg-[#f1eafa] text-[#8a5ba5]",
        },
        {
          value: String(overdueTasks),
          label: "Overdue",
          label2: "Tasks",
          badge: overdueTasks > 0 ? "!" : "✓",
          note: overdueTasks > 0 ? "needs attention" : "all on track",
          icon: CalendarDays,
          iconClass: "bg-[#fae9ec] text-[#c35c68]",
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
        iconClass: "bg-[#e7f5ee] text-[#2e9460]",
      },
      {
        value: String(totalTasks),
        label: "My",
        label2: "Tasks",
        badge: `${completedTasks}`,
        note: "done",
        icon: CheckSquare,
        iconClass: "bg-[#e8f1ff] text-[#3b78bd]",
      },
      {
        value: String(completedTasks),
        label: "Completed",
        label2: "Tasks",
        badge: `${completionRate}%`,
        note: "of your tasks",
        icon: TrendingUp,
        iconClass: "bg-[#f1eafa] text-[#8a5ba5]",
      },
      {
        value: String(overdueTasks),
        label: "Overdue",
        label2: "Tasks",
        badge: `${dueSoon}`,
        note: overdueTasks > 0 ? "needs attention" : "due within 3 days",
        icon: CalendarDays,
        iconClass: "bg-[#fae9ec] text-[#c35c68]",
      },
    ];
  }, [user, isOrgWide, projects, tasks]);

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
        iconClass: "bg-[#e8f1ff] text-[#3b78bd]",
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
          iconClass: "bg-[#e7f5ee] text-[#2e9460]",
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
          iconClass: "bg-[#e7f5ee] text-[#2e9460]",
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
          iconClass: "bg-[#f1eafa] text-[#8a5ba5]",
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
          localStorage.setItem("notif_read_ids", JSON.stringify(Array.from(ids)));
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

  return (
    <header className="border-b border-[#d5d5d5] bg-[#f0f2f5]">

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
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d5d5d5] bg-white shadow-sm">
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
                (item.href !== "/" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex h-full items-center
                    text-[14px] font-medium
                    transition-colors
                    ${active
                      ? "text-[#18212b]"
                      : "text-[#7a7a7a] hover:text-[#18212b]"
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
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#18212b] transition hover:bg-[#e8eaed]"
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
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[#d5d5d5] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-[#f0f0f0] px-4 py-3">
                    <p className="text-sm font-semibold text-[#18212b]">
                      Notifications
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-[#b0b0b0]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Inbox size={22} className="text-[#d5d5d5]" />
                        <p className="text-xs text-[#b0b0b0]">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <div
                            key={n.id}
                            className="flex gap-3 border-b border-[#f0f0f0] px-4 py-3 last:border-0 hover:bg-[#fafafa]"
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconClass}`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#18212b]">
                                {n.title}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-[#7a7a7a]">
                                {n.description}
                              </p>
                              <p className="mt-1 text-[10px] text-[#b0b0b0]">
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
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-[#e8eaed]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d5d5d5] bg-[#d5d5d5] text-[11px] font-semibold text-[#18212b]">
                  {loading ? "..." : getInitials(user?.fullName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-[13px] font-medium text-[#18212b]">
                    {loading ? "Loading..." : user?.fullName || "Guest User"}
                  </p>
                  <p className="text-[11px] text-[#7a7a7a]">
                    {loading ? "..." : user?.role || "Member"}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[#7a7a7a] transition-transform ${profileOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* PROFILE DROPDOWN */}
              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#d5d5d5] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-[#f0f0f0] px-3 py-3">
                    <p className="text-sm font-semibold text-[#18212b]">
                      {user?.fullName || "User Account"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#b0b0b0]">
                      {user?.email || "user@projectspace.com"}
                    </p>
                  </div>
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#7a7a7a] transition hover:bg-[#f5f5f5] hover:text-[#18212b]">
                    <User size={16} />
                    Profile
                  </button>
                  <button
                    onClick={() => router.push("/settings/password")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#7a7a7a] transition hover:bg-[#f5f5f5] hover:text-[#18212b]"
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
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#c35c68] transition hover:bg-[#fae9ec]"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#7a7a7a] transition hover:bg-[#e8eaed] lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

          </div>
        </div>

        {/* MOBILE NAV */}
        {mobileMenuOpen && (
          <nav className="border-t border-[#f0f0f0] py-3 lg:hidden">
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
                    ${active
                      ? "bg-[#e8eaed] font-semibold text-[#18212b]"
                      : "text-[#7a7a7a] hover:bg-[#e8eaed] hover:text-[#18212b]"
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
          DASHBOARD HERO - Light background with darker cards area
      ===================================================== */}
      <div className="border-t border-[#d5d5d5] bg-[#f0f2f5]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_650px]">

            {/* LEFT - Welcome Text - Dark text on light background */}
            <div className="max-w-[560px] pt-1">
              <h2 className="text-[32px] font-light tracking-[-0.5px] text-[#18212b] sm:text-[38px]">
                WELCOME BACK,
                <br />
                <span className="font-semibold">
                  {user?.fullName?.toUpperCase() || "USER"}!
                </span>
              </h2>

              <p className="mt-4 text-[18px] font-medium text-[#18212b]">
                Here's what's happening in your projects today.
              </p>

              <p className="mt-2 text-[14px] text-[#7a7a7a]">
                Stay up to date with your projects, tasks and team activity.
              </p>
            </div>

            {/* RIGHT - STAT CARDS - Slightly darker blue/gray background */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

              {dataLoading ? (
                <div className="col-span-2 flex min-h-[145px] items-center justify-center rounded-2xl border border-[#c8cdd4] bg-[#e4e7ec] sm:col-span-4">
                  <Loader2 size={22} className="animate-spin text-[#7a7a7a]" />
                </div>
              ) : (
                statsData.map((stat, index) => {
                  const Icon = stat.icon;

                  const cardColors = [
                    { icon: "bg-[#e7f5ee] text-[#2e9460]" },
                    { icon: "bg-[#e8f1ff] text-[#3b78bd]" },
                    { icon: "bg-[#f1eafa] text-[#8a5ba5]" },
                    { icon: "bg-[#fae9ec] text-[#c35c68]" },
                  ][index] || { icon: "bg-[#f5f5f5] text-[#7a7a7a]" };

                  return (
                    <div
                      key={stat.label + stat.label2}
                      className="min-h-[145px] rounded-2xl border border-[#c8cdd4] bg-[#e4e7ec] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[30px] font-medium leading-none tracking-tight text-[#18212b]">
                          {stat.value}
                        </span>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${cardColors.icon}`}
                        >
                          <Icon size={20} strokeWidth={1.8} />
                        </div>
                      </div>

                      <p className="mt-4 text-[13px] font-medium leading-tight text-[#18212b]">
                        {stat.label}
                        <br />
                        {stat.label2}
                      </p>

                      <p className="mt-2 text-[11px] text-[#2e9460]">
                        <span className="font-bold text-[#2e9460]">
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
