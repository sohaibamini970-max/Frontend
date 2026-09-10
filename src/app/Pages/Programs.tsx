"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  X,
  Calendar,
  Users,
  Flag,
  UserPlus,
  Check,
  User,
  RefreshCw,
  ShieldCheck,
  Edit3,
  Eye,
  Trash2,
  CheckCircle2,
  ListTodo,
  AlertCircle,
  Circle,
  Clock3,
  Layers,
  FolderKanban,
  MoreVertical,
} from "lucide-react";

const API_BASE = "https://backend-five-swart-88.vercel.app";

/* =========================================================
   TYPES
========================================================= */

type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type ProgramPriority = "Low" | "Medium" | "High";
type ProgramStatus = "Active" | "Paused" | "Completed";

type Program = {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: ProgramPriority;
  status: ProgramStatus;
  created_by: string;
  created_by_name: string | null;
  project_count: number;
  completed_count: number;
  created_at: string;
};

type ProgramProjectStatus =
  | "Unassigned"
  | "Backlog"
  | "In Progress"
  | "Paused"
  | "Done";

type ProgramProject = {
  id: string;
  program_id: string;
  name: string;
  domain: string | null;
  about_title: string | null;
  about_description: string | null;
  status: ProgramProjectStatus;
  priority: ProgramPriority;
  start_date: string | null;
  deadline: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assigned_to_role: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type AssignableUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_title: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Not set";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Not set";
  }
};

const initialsOf = (name: string | null | undefined) => {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase();
};

/* =========================================================
   STYLES
========================================================= */

const projectStatusStyles: Record<string, string> = {
  Done: "border border-emerald-100 bg-emerald-50 text-emerald-600",
  "In Progress": "border border-blue-100 bg-blue-50 text-blue-600",
  Paused: "border border-orange-100 bg-orange-50 text-orange-600",
  Backlog: "border border-pink-100 bg-pink-50 text-pink-600",
  Unassigned: "border border-violet-100 bg-violet-50 text-violet-600",
};

const programStatusStyles: Record<string, string> = {
  Active: "border border-emerald-100 bg-emerald-50 text-emerald-600",
  Paused: "border border-orange-100 bg-orange-50 text-orange-600",
  Completed: "border border-blue-100 bg-blue-50 text-blue-600",
};

/* =========================================================
   PROGRESS BAR (same as projects.tsx)
========================================================= */

function ProgressBar({
  progress,
  large = false,
}: {
  progress: number;
  large?: boolean;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const color =
    safeProgress === 0
      ? "bg-gray-300"
      : safeProgress < 50
      ? "bg-amber-400"
      : safeProgress < 100
      ? "bg-blue-500"
      : "bg-emerald-500";

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
          Progress
        </span>
        <span className="text-xs font-semibold text-gray-700">{safeProgress}%</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${large ? "h-2.5" : "h-1.5"}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function Programs() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [programProjects, setProgramProjects] = useState<ProgramProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  /* Modals */
  const [createProgramModalOpen, setCreateProgramModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [viewProjectModalOpen, setViewProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProgramProject | null>(null);
  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);

  /* Create program form */
  const [pName, setPName] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pDomain, setPDomain] = useState("");
  const [pStartDate, setPStartDate] = useState("");
  const [pEndDate, setPEndDate] = useState("");
  const [pPriority, setPPriority] = useState<ProgramPriority>("Medium");
  const [savingProgram, setSavingProgram] = useState(false);

  /* Create project form */
  const [prName, setPrName] = useState("");
  const [prDomain, setPrDomain] = useState("");
  const [prAboutTitle, setPrAboutTitle] = useState("");
  const [prAboutDescription, setPrAboutDescription] = useState("");
  const [prStartDate, setPrStartDate] = useState("");
  const [prDeadline, setPrDeadline] = useState("");
  const [prPriority, setPrPriority] = useState<ProgramPriority>("Medium");
  const [prAssignedTo, setPrAssignedTo] = useState<string>("");
  const [savingProject, setSavingProject] = useState(false);

  /* Assign modal */
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const isAdminOrManager = useMemo(
    () =>
      currentUser?.role === "Executive Manager" ||
      currentUser?.role === "System Administrator" ||
      currentUser?.role === "Project Manager",
    [currentUser]
  );

  /* =======================================================
     AUTH
  ======================================================= */

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    try {
      setCurrentUser(JSON.parse(stored));
    } catch (err) {
      console.error("Failed to parse user:", err);
    }
  }, []);

  /* =======================================================
     FETCH PROGRAMS
  ======================================================= */

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/programs`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load programs");
      setPrograms(data.programs || []);
    } catch (err: any) {
      setError(err.message || "Unable to load programs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/programs/assignable-users`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) setAssignableUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load assignable users:", err);
    }
  };

  const fetchProgramDetails = async (programId: string) => {
    try {
      setLoadingProjects(true);
      const res = await fetch(`${API_BASE}/api/programs/${programId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load program");

      setActiveProgram(data.program);
      setProgramProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message || "Unable to load program details.");
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !isAdminOrManager) return;
    fetchPrograms();
    fetchAssignableUsers();
  }, [currentUser, isAdminOrManager]);

  /* =======================================================
     OPEN PROGRAM (drill-down)
  ======================================================= */

  const openProgram = (program: Program) => {
    setActiveProgramId(program.id);
    setActiveProgram(program);
    fetchProgramDetails(program.id);
  };

  const backToPrograms = () => {
    setActiveProgramId(null);
    setActiveProgram(null);
    setProgramProjects([]);
    setSearch("");
  };

  /* =======================================================
     CREATE PROGRAM
  ======================================================= */

  const resetProgramForm = () => {
    setPName("");
    setPDescription("");
    setPDomain("");
    setPStartDate("");
    setPEndDate("");
    setPPriority("Medium");
  };

  const handleCreateProgram = async () => {
    if (!pName.trim()) return;
    try {
      setSavingProgram(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/programs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: pName.trim(),
          description: pDescription.trim() || null,
          domain: pDomain.trim() || null,
          startDate: pStartDate || null,
          endDate: pEndDate || null,
          priority: pPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create program");

      resetProgramForm();
      setCreateProgramModalOpen(false);
      await fetchPrograms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProgram(false);
    }
  };

  /* =======================================================
     CREATE PROGRAM PROJECT
  ======================================================= */

  const resetProjectForm = () => {
    setPrName("");
    setPrDomain("");
    setPrAboutTitle("");
    setPrAboutDescription("");
    setPrStartDate("");
    setPrDeadline("");
    setPrPriority("Medium");
    setPrAssignedTo("");
  };

  const handleCreateProject = async () => {
    if (!activeProgramId || !prName.trim()) return;
    try {
      setSavingProject(true);
      setError("");
      const res = await fetch(
        `${API_BASE}/api/programs/${activeProgramId}/projects`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: prName.trim(),
            domain: prDomain.trim() || null,
            aboutTitle: prAboutTitle.trim() || null,
            aboutDescription: prAboutDescription.trim() || null,
            startDate: prStartDate || null,
            deadline: prDeadline || null,
            priority: prPriority,
            assignedTo: prAssignedTo || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create project");

      resetProjectForm();
      setCreateProjectModalOpen(false);
      if (activeProgramId) await fetchProgramDetails(activeProgramId);
      await fetchPrograms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  /* =======================================================
     ASSIGN PROJECT
  ======================================================= */

  const openAssignModal = (projectId: string, currentAssignee: string | null) => {
    setAssignProjectId(projectId);
    setAssignUserId(currentAssignee);
    setAssignModalOpen(true);
    setOpenProjectMenu(null);
  };

  const handleAssignProject = async () => {
    if (!activeProgramId || !assignProjectId || !assignUserId) return;
    try {
      setAssigning(true);
      setError("");
      const res = await fetch(
        `${API_BASE}/api/programs/${activeProgramId}/projects/${assignProjectId}/assign`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ assignedTo: assignUserId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign project");

      setAssignModalOpen(false);
      setAssignProjectId(null);
      setAssignUserId(null);
      await fetchProgramDetails(activeProgramId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredPrograms = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return programs;
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.domain || "").toLowerCase().includes(q)
    );
  }, [programs, search]);

  const filteredProgramProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return programProjects;
    return programProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.domain || "").toLowerCase().includes(q) ||
        (p.about_title || "").toLowerCase().includes(q) ||
        (p.assigned_to_name || "").toLowerCase().includes(q)
    );
  }, [programProjects, search]);

  /* =======================================================
     GUARD
  ======================================================= */

  if (currentUser && !isAdminOrManager) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <ShieldCheck size={32} className="mx-auto text-gray-400" />
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Access Restricted</h2>
          <p className="mt-1 text-sm text-gray-500">
            Programs are only accessible to Project Managers, Executive Managers, and System Administrators.
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1440px]">

        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-[-0.8px] text-gray-900 sm:text-[32px]">
                {activeProgram ? activeProgram.name : "Programs"}
              </h1>

              {activeProgram ? (
                <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium ${programStatusStyles[activeProgram.status]}`}>
                  {activeProgram.status}
                </span>
              ) : (
                currentUser && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600">
                    <ShieldCheck size={12} />
                    {currentUser.role}
                  </span>
                )
              )}
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {activeProgram
                ? activeProgram.description || "Projects grouped under this program."
                : "Group projects under long-running programs like Mentorship or Summer Internship."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeProgram ? (
              <button
                type="button"
                onClick={backToPrograms}
                className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Back to Programs
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  fetchPrograms();
                  fetchAssignableUsers();
                }}
                disabled={loading}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            )}

            {!activeProgram && (
              <button
                type="button"
                onClick={() => setCreateProgramModalOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-[#111c2c]"
              >
                <Plus size={17} />
                Add program
              </button>
            )}

            {activeProgram && (
              <button
                type="button"
                onClick={() => setCreateProjectModalOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Plus size={17} />
                Add project
              </button>
            )}
          </div>
        </div>

        {/* ===============================================
            ERROR
        =============================================== */}

        {error && (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ===============================================
            SEARCH
        =============================================== */}

        <div className="mt-6">
          <div className="relative w-full sm:w-[360px]">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeProgram ? "Search projects in this program" : "Search programs"}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            />
          </div>
        </div>

        {/* ===============================================
            PROGRAMS GRID
        =============================================== */}

        {!activeProgram && (
          <>
            {loading ? (
              <div className="mt-8 flex min-h-[400px] flex-col items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-600">Loading programs...</p>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
                <Layers size={40} className="mx-auto text-gray-300" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900">No programs yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                  Create your first program to group related projects.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPrograms.map((program) => {
                  const progress =
                    program.project_count > 0
                      ? Math.round((program.completed_count / program.project_count) * 100)
                      : 0;

                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => openProgram(program)}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_8px_25px_rgba(16,185,129,0.12)]"
                    >
                      {/* Colored top bar for programs */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />

                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Layers size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-semibold text-gray-900">
                            {program.name}
                          </h3>
                          <p className="mt-0.5 truncate text-[13px] text-gray-400">
                            {program.domain || "No domain"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 min-h-[36px] text-[13px] leading-relaxed text-gray-500">
                        {program.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-medium ${programStatusStyles[program.status]}`}>
                          {program.status}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-500">
                          <Flag size={10} />
                          {program.priority}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-[12px] text-gray-400">Projects</div>
                        <div className="text-lg font-semibold text-gray-700">
                          {program.completed_count}/{program.project_count}
                        </div>
                      </div>

                      <div className="mt-3">
                        <ProgressBar progress={progress} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-600" />
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600">
                              Start
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-gray-900">
                            {formatDate(program.start_date)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-600" />
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600">
                              End
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-gray-900">
                            {formatDate(program.end_date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-medium text-white transition group-hover:bg-emerald-700">
                        <Eye size={14} />
                        Open Program
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===============================================
            PROGRAM DETAIL (projects under program)
        =============================================== */}

        {activeProgram && (
          <>
            {loadingProjects ? (
              <div className="mt-8 flex min-h-[400px] flex-col items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-600">Loading projects...</p>
              </div>
            ) : filteredProgramProjects.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
                <FolderKanban size={40} className="mx-auto text-gray-300" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900">No projects yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                  Add the first project to this program.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProgramProjects.map((project) => {
                  const progress =
                    project.status === "Done" ? 100 : project.status === "In Progress" ? 50 : 0;

                  return (
                    <div
                      key={project.id}
                      className="group relative rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_8px_25px_rgba(16,185,129,0.12)]"
                    >
                      {/* Colored program name tag */}
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        <Layers size={11} />
                        {activeProgram.name}
                      </div>

                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {initialsOf(project.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 pr-5">
                              <h3 className="truncate text-lg font-semibold text-gray-900">
                                {project.name}
                              </h3>
                              <p className="mt-0.5 truncate text-[14px] text-gray-400">
                                {project.domain || "No domain"}
                              </p>
                            </div>

                            {/* Menu */}
                            <div className="absolute right-3 top-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenProjectMenu(
                                    openProjectMenu === project.id ? null : project.id
                                  );
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <MoreVertical size={17} />
                              </button>

                              {openProjectMenu === project.id && (
                                <div
                                  className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedProject(project);
                                      setOpenProjectMenu(null);
                                      setViewProjectModalOpen(true);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye size={16} className="text-gray-500" />
                                    View Project
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openAssignModal(project.id, project.assigned_to)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <UserPlus size={16} className="text-gray-500" />
                                    {project.assigned_to ? "Reassign" : "Assign"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Objective */}
                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {project.about_title || "Project"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-gray-500">
                          {project.about_description || "No description provided."}
                        </p>
                      </div>

                      {/* Status / Priority */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-medium ${projectStatusStyles[project.status]}`}>
                          {project.status}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-medium text-gray-500">
                          <Flag size={10} />
                          {project.priority}
                        </span>
                      </div>

                      {/* Assignee */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          {project.assigned_to_name ? (
                            <>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                                {initialsOf(project.assigned_to_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-gray-700">
                                  {project.assigned_to_name}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                  {project.assigned_to_role || "Assignee"}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                                <User size={14} />
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-gray-600">Unassigned</p>
                                <p className="text-[9px] text-gray-400">No assignee</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openAssignModal(project.id, project.assigned_to)}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {project.assigned_to ? "Reassign" : "Assign"}
                        </button>
                      </div>

                      {/* Progress */}
                      <div className="mt-4">
                        <ProgressBar progress={progress} />
                      </div>

                      {/* Dates */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-600" />
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600">
                              Start
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-gray-900">
                            {formatDate(project.start_date)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-600" />
                            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-600">
                              Deadline
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-gray-900">
                            {formatDate(project.deadline)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(project);
                          setViewProjectModalOpen(true);
                        }}
                        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-medium text-white transition hover:bg-emerald-700"
                      >
                        <Eye size={14} />
                        View Project Details
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* =====================================================
          CREATE PROGRAM MODAL
      ===================================================== */}

      {createProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Layers size={19} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Create a new program</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Group related projects under one program.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateProgramModalOpen(false);
                  resetProgramForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Program name *
                  </label>
                  <input
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Summer Internship Program"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Domain
                  </label>
                  <input
                    value={pDomain}
                    onChange={(e) => setPDomain(e.target.value)}
                    placeholder="e.g. internship.arg.com"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Priority
                  </label>
                  <select
                    value={pPriority}
                    onChange={(e) => setPPriority(e.target.value as ProgramPriority)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    rows={4}
                    placeholder="What is this program about?"
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={pStartDate}
                    onChange={(e) => setPStartDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    End date
                  </label>
                  <input
                    type="date"
                    value={pEndDate}
                    onChange={(e) => setPEndDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCreateProgramModalOpen(false);
                  resetProgramForm();
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProgram}
                disabled={!pName.trim() || savingProgram}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {savingProgram ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Save program
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CREATE PROGRAM PROJECT MODAL
      ===================================================== */}

      {createProjectModalOpen && activeProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <FolderKanban size={19} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Add project to program</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Under <span className="font-semibold text-emerald-700">{activeProgram.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateProjectModalOpen(false);
                  resetProjectForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Project name *
                  </label>
                  <input
                    value={prName}
                    onChange={(e) => setPrName(e.target.value)}
                    placeholder="e.g. Frontend Onboarding Project"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Domain</label>
                  <input
                    value={prDomain}
                    onChange={(e) => setPrDomain(e.target.value)}
                    placeholder="e.g. onboarding.arg.com"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Priority</label>
                  <select
                    value={prPriority}
                    onChange={(e) => setPrPriority(e.target.value as ProgramPriority)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Project objective
                  </label>
                  <input
                    value={prAboutTitle}
                    onChange={(e) => setPrAboutTitle(e.target.value)}
                    placeholder="e.g. Onboard interns into the platform"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={prAboutDescription}
                    onChange={(e) => setPrAboutDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the project..."
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={prStartDate}
                    onChange={(e) => setPrStartDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={prDeadline}
                    onChange={(e) => setPrDeadline(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Assign to (optional)
                  </label>
                  <select
                    value={prAssignedTo}
                    onChange={(e) => setPrAssignedTo(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                  >
                    <option value="">— Leave unassigned —</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCreateProjectModalOpen(false);
                  resetProjectForm();
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!prName.trim() || savingProject}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {savingProject ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Save project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ASSIGN MODAL
      ===================================================== */}

      {assignModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <UserPlus size={18} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Assign project</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Choose a Project Manager or admin to assign this project to.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto px-6 py-5">
              {assignableUsers.length === 0 ? (
                <p className="text-center text-sm text-gray-400">No assignable users found.</p>
              ) : (
                assignableUsers.map((u) => {
                  const selected = assignUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setAssignUserId(u.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                        {initialsOf(u.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {u.full_name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400 truncate">
                          {u.role}
                          {u.job_title ? ` · ${u.job_title}` : ""}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check size={13} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignProject}
                disabled={!assignUserId || assigning}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {assigning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Assign project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW PROJECT MODAL
      ===================================================== */}

      {viewProjectModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {initialsOf(selectedProject.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-gray-900">
                    {selectedProject.name}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    {selectedProject.domain || "No domain"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewProjectModalOpen(false);
                  setSelectedProject(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Layers size={12} />
                {activeProgram?.name}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-gray-800">
                    Status
                  </p>
                  <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-[13px] font-medium ${projectStatusStyles[selectedProject.status]}`}>
                    {selectedProject.status}
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-gray-800">
                    Priority
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Flag size={13} className="text-gray-600" />
                    <p className="text-lg font-semibold text-gray-800">
                      {selectedProject.priority}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-gray-800">
                    Assignee
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-800">
                    {selectedProject.assigned_to_name || "Unassigned"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-gray-800">
                    Assignee Role
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-800">
                    {selectedProject.assigned_to_role || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-lg font-semibold text-gray-800">
                  {selectedProject.about_title || "Project"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {selectedProject.about_description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-600" />
                    <p className="text-sm font-semibold text-gray-700">Start Date</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {formatDate(selectedProject.start_date)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-600" />
                    <p className="text-sm font-semibold text-gray-700">Deadline</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {formatDate(selectedProject.deadline)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setViewProjectModalOpen(false);
                  setSelectedProject(null);
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewProjectModalOpen(false);
                  openAssignModal(selectedProject.id, selectedProject.assigned_to);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <UserPlus size={15} />
                {selectedProject.assigned_to ? "Reassign" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
