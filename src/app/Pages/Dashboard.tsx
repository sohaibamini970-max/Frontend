"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  creator_name?: string;
  manager_name?: string;
  manager_email?: string;
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

type TeamRoleStats = {
  developers: number;
  designers: number;
  managers: number;
  qa: number;
  other: number;
  total: number;
};

type DashboardData = {
  user: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  projects: Project[];
  tasks: Task[];
  teams: TeamRoleStats;
  projectStats: {
    total: number;
    completed: number;
    inProgress: number;
    averageProgress: number;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  activeProjects: Project[];
  domainStats: [string, number][];
  scheduleTasks: Task[];
  projectOverview: Array<{
    project: Project;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }>;
  isManagement: boolean;
  isProjectManager: boolean;
  isMember: boolean;
  roleDescription: string;
};

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
   DASHBOARD STAT COMPONENT
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
    <div className={`rounded-2xl border border-white/70 p-5 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className={iconClass}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#697783]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-[26px] font-bold text-[#172633]">{value}</p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE COMPONENT
========================================================= */

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
      <Users size={28} className="mx-auto text-gray-300" />
      <p className="mt-3 text-[13px] font-bold text-gray-600">{title}</p>
      <p className="mt-1.5 text-[11px] text-gray-400">{description}</p>
    </div>
  );
}

/* =========================================================
   PROJECT CARD COMPONENT
========================================================= */

function ProjectCard({
  project,
  onView,
  getInitials,
  getProjectStatusClass,
  formatDate,
}: {
  project: Project;
  onView: () => void;
  getInitials: (name: string) => string;
  getProjectStatusClass: (status: string) => string;
  formatDate: (date?: string | null) => string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const status = project.status || "Unassigned";
  const statusClass = getProjectStatusClass(status);
  const description =
    project.about_description || project.about_title || "No project description available.";
  const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));

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
            <span className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${statusClass}`}>
              {status}
            </span>
          </div>

          <div className="relative mt-8">
            <h3 className="truncate text-[18px] font-bold text-white">{project.name}</h3>
            <p className="mt-2 line-clamp-2 min-h-[40px] text-[11px] leading-5 text-white/65">
              {description}
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f7f9fb] p-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={13} className="text-[#557bd2]" />
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Deadline
                </p>
              </div>
              <p className="mt-2 text-[11px] font-bold text-[#44515c]">
                {project.deadline ? formatDate(project.deadline) : "Not set"}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f9fb] p-4">
              <div className="flex items-center gap-2">
                <FolderKanban size={13} className="text-[#895a9d]" />
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Domain
                </p>
              </div>
              <p className="mt-2 truncate text-[11px] font-bold text-[#44515c]">
                {project.domain || "General"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#98a2ac]">
                Project Progress
              </p>
              <span className="text-[13px] font-bold text-[#172b3a]">{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#e9edf1]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#557bd2] via-[#6689dd] to-[#8ca7ec] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#edf0f3] pt-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#557bd2] to-[#314f9c] text-[9px] font-bold text-white">
                {getInitials(project.manager_name || "PM")}
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#a0a9b2]">
                  Project Manager
                </p>
                <p className="truncate text-[10px] font-bold text-[#44515c]">
                  {project.manager_name || "Not assigned"}
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-[#f0f4ff] px-2.5 py-1.5 text-[9px] font-bold text-[#557bd2]">
              {project.priority || "Normal"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button
              onClick={onView}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#456bc2] active:scale-[0.98]"
            >
              <Eye size={14} />
              View Project
            </button>
            <button
              onClick={() => setDetailsOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#172b3a] py-3.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#223d50] active:scale-[0.98]"
            >
              <Eye size={14} />
              Details
            </button>
          </div>
        </div>
      </div>

      {detailsOpen && (
        <ProjectDetailsModal
          project={project}
          onClose={() => setDetailsOpen(false)}
          onView={onView}
          getProjectStatusClass={getProjectStatusClass}
          formatDate={formatDate}
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
  onView,
  getProjectStatusClass,
  formatDate,
}: {
  project: Project;
  onClose: () => void;
  onView: () => void;
  getProjectStatusClass: (status: string) => string;
  formatDate: (date?: string | null) => string;
}) {
  const status = project.status || "Unassigned";
  const description =
    project.about_description || project.about_title || "No project description available.";
  const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/55 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[580px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-[#172b3a] px-6 py-6">
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#557bd2]/20" />
          <div className="relative flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                <FolderKanban size={21} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-bold text-white">{project.name}</h2>
                <p className="mt-1 text-[11px] text-white/60">Project Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <ProjectDetailItem label="Status" value={status} />
            <ProjectDetailItem label="Progress" value={`${progress}%`} />
          </div>

          <div className="mt-5 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
              Description
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[#5f6b75]">
              {description}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <ProjectDetailItem label="Domain" value={project.domain || "Not specified"} />
            <ProjectDetailItem label="Priority" value={project.priority || "Not specified"} />
            <ProjectDetailItem
              label="Start Date"
              value={project.start_date ? formatDate(project.start_date) : "Not specified"}
            />
            <ProjectDetailItem
              label="Deadline"
              value={project.deadline ? formatDate(project.deadline) : "Not specified"}
            />
            <ProjectDetailItem
              label="Project Manager"
              value={project.manager_name || "Not assigned"}
            />
            <ProjectDetailItem
              label="Manager Role"
              value={project.manager_name ? "Project Manager" : "Not assigned"}
            />
          </div>

          {project.creator_name && (
            <div className="mt-4 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                Created By
              </p>
              <p className="mt-1.5 text-[12px] font-bold text-[#44515c]">{project.creator_name}</p>
            </div>
          )}
        </div>

        <div className="border-t border-[#edf0f3] bg-[#fafbfd] p-5">
          <button
            onClick={onView}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[11px] font-bold text-white transition hover:bg-[#456bc2]"
          >
            <Eye size={15} />
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
  onViewProject,
  formatDate,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
  onViewProject: (projectId: string) => void;
  formatDate: (date?: string | null) => string;
}) {
  const projectTasks = tasks.filter((task) => String(task.project_id || "") === String(project.id));
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter((task) => {
    const status = task.status?.toLowerCase().trim();
    return status === "done" || status === "completed";
  }).length;
  const inProgressTasks = projectTasks.filter((task) => {
    const status = task.status?.toLowerCase().trim();
    return status === "in progress" || status === "in_progress";
  }).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172b3a]/55 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[580px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
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
                <h2 className="truncate text-[18px] font-bold text-white">{project.name}</h2>
                <p className="mt-1 text-[11px] text-white/60">Project Progress Details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
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
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                  Task Completion
                </p>
                <p className="mt-1 text-[30px] font-bold text-[#172633]">{progress}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#98a2ac]">Completed</p>
                <p className="text-[14px] font-bold text-[#438d5d]">
                  {completedTasks} / {totalTasks}
                </p>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e9edf1]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#557bd2] to-[#7c9bea] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <ModalStat
              icon={<Circle size={14} />}
              label="Total Tasks"
              value={totalTasks}
              iconClass="text-[#557bd2]"
            />
            <ModalStat
              icon={<CheckCircle2 size={14} />}
              label="Completed"
              value={completedTasks}
              iconClass="text-[#438d5d]"
            />
            <ModalStat
              icon={<Clock3 size={14} />}
              label="In Progress"
              value={inProgressTasks}
              iconClass="text-[#be8944]"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <ProjectDetailItem label="Status" value={project.status || "Not specified"} />
            <ProjectDetailItem label="Priority" value={project.priority || "Not specified"} />
            <ProjectDetailItem label="Domain" value={project.domain || "General"} />
            <ProjectDetailItem label="Project Manager" value={project.manager_name || "Not assigned"} />
            <ProjectDetailItem
              label="Start Date"
              value={project.start_date ? formatDate(project.start_date) : "Not specified"}
            />
            <ProjectDetailItem
              label="Deadline"
              value={project.deadline ? formatDate(project.deadline) : "Not specified"}
            />
          </div>

          {(project.about_description || project.about_title) && (
            <div className="mt-5 rounded-xl border border-[#edf0f3] bg-[#fafbfd] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#98a2ac]">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[#5f6b75]">
                {project.about_description || project.about_title}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#edf0f3] bg-[#fafbfd] p-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewProject(project.id);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#456bc2]"
          >
            <Eye size={15} />
            Open Project
            <ChevronRight size={14} />
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
        <span className={iconClass}>{icon}</span>
        <span className="text-[9px] font-semibold text-[#7b8794]">{label}</span>
      </div>
      <p className={`mt-2 text-[22px] font-bold ${iconClass}`}>{value}</p>
    </div>
  );
}

/* =========================================================
   PROJECT DETAIL ITEM
========================================================= */

function ProjectDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1.5 truncate text-[11px] font-bold text-gray-700">{value}</p>
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
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-[10px] font-medium text-[#697783]">{label}</span>
      </div>
      <span className="text-[11px] font-bold text-[#34424d]">{value}</span>
    </div>
  );
}

/* =========================================================
   SCHEDULE ITEM
========================================================= */

function ScheduleItem({ task, projects }: { task: Task; projects: Project[] }) {
  const project = projects.find((item) => String(item.id) === String(task.project_id || ""));
  const taskName = task.name || task.title || "Untitled Task";
  const initials = taskName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const time = dueDate
    ? dueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const type = task.status || "Pending";
  let statusClass = "bg-[#f3eafa] text-[#85579a]";
  const normalized = type.toLowerCase();
  if (normalized.includes("review")) {
    statusClass = "bg-[#f8f0e4] text-[#ad8144]";
  } else if (normalized.includes("progress")) {
    statusClass = "bg-[#edf2ff] text-[#5577c2]";
  } else if (normalized.includes("done") || normalized.includes("complete")) {
    statusClass = "bg-[#eaf5ed] text-[#438759]";
  } else if (normalized.includes("todo") || normalized.includes("to do") || normalized.includes("pending")) {
    statusClass = "bg-[#f3eafa] text-[#85579a]";
  }

  return (
    <div className="relative flex min-h-[58px] items-center">
      <div className="w-[56px] shrink-0 text-[10px] font-medium text-gray-400">{time}</div>
      <div className="relative z-10 mx-[7px] flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border border-white bg-gray-300 shadow-sm" />
      <div className="ml-3 flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-600 text-[8px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-semibold text-[#34424d]">{taskName}</span>
            {project && (
              <span className="mt-0.5 block truncate text-[9px] text-gray-400">{project.name}</span>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-semibold ${statusClass}`}>
          {type}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD COMPONENT
========================================================= */

export default function Dashboard() {
  const router = useRouter();
  const API_BASE = "https://backend-five-swart-88.vercel.app/api";

  // State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [selectedOverviewProject, setSelectedOverviewProject] = useState<Project | null>(null);

  // Load dashboard - Single API call
  const loadDashboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const startTime = performance.now();

      const response = await fetch(`${API_BASE}/dashboard/optimized`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load dashboard");
      }

      setDashboardData(result.data);

      const endTime = performance.now();
      console.log(`⏱️ Dashboard loaded in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Initial load
  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(false);
  }, [loadDashboard]);

  // Format date
  const formatDate = useCallback((date?: string | null) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Get initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }, []);

  // Get project status class
  const getProjectStatusClass = useCallback((status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("progress")) return "bg-[#edf2ff] text-[#5577c2]";
    if (normalized.includes("done") || normalized.includes("complete"))
      return "bg-[#eaf5ed] text-[#438759]";
    if (normalized.includes("pause")) return "bg-[#f8f0e4] text-[#ad8144]";
    if (normalized.includes("backlog")) return "bg-[#f3eafa] text-[#85579a]";
    return "bg-gray-100 text-gray-600";
  }, []);

  // Date navigation
  const changeScheduleDate = useCallback((amount: number) => {
    setScheduleDate((current) => {
      const date = new Date(current);
      date.setDate(date.getDate() + amount);
      return date;
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={30} className="animate-spin text-[#557bd2]" />
            <p className="text-[14px] font-semibold text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-[#DEDAD9]">
        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto text-red-500" size={34} />
            <h2 className="mt-4 text-[18px] font-bold text-gray-900">Unable to load dashboard</h2>
            <p className="mt-2 text-[13px] text-gray-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-6 rounded-xl bg-[#557bd2] px-6 py-3 text-[12px] font-bold text-white transition hover:bg-[#456bc2]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!dashboardData) return null;

  const {
    user,
    projects,
    tasks,
    teams,
    taskStats,
    activeProjects,
    domainStats,
    scheduleTasks,
    projectOverview,
    isProjectManager,
    isMember,
    roleDescription,
  } = dashboardData;

  const formattedScheduleDate = scheduleDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "long",
  });

  // Filter schedule tasks for selected date
  const filteredScheduleTasks = useMemo(() => {
    const selectedDate = scheduleDate.toISOString().split("T")[0];
    const filtered = scheduleTasks.filter((task) => {
      if (!task.due_date) return false;
      return task.due_date.split("T")[0] === selectedDate;
    });
    return filtered.length > 0 ? filtered.slice(0, 8) : scheduleTasks.slice(0, 8);
  }, [scheduleTasks, scheduleDate]);

  // Create team gradient
  const teamGradient = useMemo(() => {
    if (teams.total === 0) return "#e5e7eb";
    const total = teams.total;
    const developerDeg = (teams.developers / total) * 360;
    const designerDeg = developerDeg + (teams.designers / total) * 360;
    const managerDeg = designerDeg + (teams.managers / total) * 360;
    const qaDeg = managerDeg + (teams.qa / total) * 360;
    return `
      conic-gradient(
        #557bd2 0deg ${developerDeg}deg,
        #438d5d ${developerDeg}deg ${design
