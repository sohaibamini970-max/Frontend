"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, SlidersHorizontal, ChevronDown, MoreVertical, ChevronLeft, ChevronRight, X, Calendar, Users, Flag, UserPlus, GripVertical, Check, User, RefreshCw, ShieldCheck,Edit3,Eye,Trash2, } from "lucide-react";

const API_BASE = "https://backend-five-swart-88.vercel.app";

type ProjectStatus = "Unassigned" | "Backlog" | "In Progress" | "Paused" | "Done";
type ProjectPriority = "Low" | "Medium" | "High";

type CurrentUser = { id: string; email: string; full_name: string; role: string };
type ProjectManager = { id: string; name: string; initials: string; role: string; color: string; email?: string };
type Project = {
  id: string; name: string; domain: string; status: ProjectStatus; aboutTitle: string;
  aboutDescription: string; progress: number; members: string[]; startDate?: string;
  deadline?: string; priority?: ProjectPriority; managerId?: string | null;
  managerName?: string | null; managerEmail?: string | null; creatorId?: string;
  creatorName?: string; creatorRole?: string;
};

const statusStyles: Record<ProjectStatus, string> = {
  Done: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  "In Progress": "bg-blue-50 text-blue-600 border border-blue-100",
  Paused: "bg-orange-50 text-orange-600 border border-orange-100",
  Backlog: "bg-pink-50 text-pink-600 border border-pink-100",
  Unassigned: "bg-violet-50 text-violet-600 border border-violet-100",
};

const logoColors = ["bg-blue-100 text-blue-600", "bg-sky-100 text-sky-600", "bg-orange-100 text-orange-500", "bg-purple-100 text-purple-600", "bg-violet-100 text-violet-600", "bg-emerald-100 text-emerald-600", "bg-cyan-100 text-cyan-600"];
const logoSymbols = ["P", "S", "L", "◆", "◆", "Q", "⚡"];

function ProjectLogo({ index }: { index: number }) {
  return <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${logoColors[index % logoColors.length]}`}>{logoSymbols[index % logoSymbols.length]}</div>;
}

function ProgressBar({ progress }: { progress: number }) {
  const progressColor = progress === 0 ? "bg-pink-500" : progress <= 50 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex min-w-[130px] items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-medium text-gray-700">{progress}%</span>
    </div>
  );
}

function ManagerAvatar({ manager, small = false }: { manager: ProjectManager; small?: boolean }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-full font-bold ${small ? "h-8 w-8 text-[9px]" : "h-10 w-10 text-[10px]"} ${manager.color}`}>{manager.initials}</div>;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [assigningProject, setAssigningProject] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"table" | "assignment">("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutDescription, setAboutDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [dateError, setDateError] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const dragScrollInterval = useRef<number | null>(null);
  const [openProjectMenu, setOpenProjectMenu] = useState<string | number | null>(null);
  const [dragOverManagerId, setDragOverManagerId] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDomain, setEditProjectDomain] = useState("");
  const [editAboutTitle, setEditAboutTitle] = useState("");
  const [editAboutDescription, setEditAboutDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("Medium");

  const [editDateError, setEditDateError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isExecutiveManager = currentUser?.role === "Executive Manager";
  const isProjectManager = currentUser?.role === "Project Manager";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      setCurrentUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Unable to read stored user:", error);
    }
  }, []);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/api/projects`, { method: "GET", headers: getAuthHeaders() });
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      if (!response.ok) {
        throw new Error(isJson ? (await response.json()).message || `Error ${response.status}` : `Server error ${response.status}`);
      }
      if (!isJson) throw new Error("Expected JSON response");
      const data = await response.json();
      const formattedProjects: Project[] = (data.projects || []).map((project: any) => ({
        id: String(project.id), name: project.name || "Untitled Project", domain: project.domain || "No domain",
        status: project.status || "Unassigned", aboutTitle: project.about_title || "Project",
        aboutDescription: project.about_description || "", progress: Number(project.progress || 0),
        members: [], startDate: project.start_date || "", deadline: project.deadline || "",
        priority: project.priority || "Medium", managerId: project.manager_id ? String(project.manager_id) : null,
        managerName: project.manager_name || null, managerEmail: project.manager_email || null,
        creatorId: project.creator_id ? String(project.creator_id) : undefined,
        creatorName: project.creator_name || undefined, creatorRole: project.creator_role || undefined,
      }));
      setProjects(formattedProjects);
    } catch (error: any) {
      setError(error.message || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await fetch(`${API_BASE}/api/projects/managers`, { method: "GET", headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load managers");
      const colors = ["bg-blue-100 text-blue-600", "bg-purple-100 text-purple-600", "bg-emerald-100 text-emerald-600", "bg-orange-100 text-orange-600", "bg-cyan-100 text-cyan-600", "bg-violet-100 text-violet-600"];
      const managers: ProjectManager[] = (data.managers || []).map((manager: any, index: number) => {
        const fullName = manager.full_name || "Project Manager";
        const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map((part: string) => part.charAt(0)).join("").toUpperCase() || "PM";
        return { id: String(manager.id), name: fullName, initials, role: manager.role || "Project Manager", email: manager.email, color: colors[index % colors.length] };
      });
      setProjectManagers(managers);
    } catch (error) {
      console.error("Fetch managers error:", error);
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchProjectManagers();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || [project.name, project.domain, project.aboutTitle, project.aboutDescription, project.managerName || ""].some((field) => field.toLowerCase().includes(query));
      const matchesStatus = selectedStatus === "All" || project.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, selectedStatus]);

  const resetForm = () => {
    setProjectName("");
    setProjectDomain("");
    setAboutTitle("");
    setAboutDescription("");
    setStartDate("");
    setDeadline("");
    setDateError("");
    setPriority("Medium");
  };

  const handleSaveProject = async () => {
    if (!isExecutiveManager || !projectName.trim()) return;

    const today = getTodayDate();

    if (startDate && startDate < today) {
      setDateError("Start date must be today or a future date.");
      return;
    }

    if (deadline && deadline < today) {
      setDateError("Deadline cannot be before today.");
      return;
    }

    if (startDate && deadline && deadline < startDate) {
      setDateError("Deadline must be greater than or equal to the start date.");
      return;
    }

    setDateError("");

    try {
      setSavingProject(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: projectName.trim(),
          domain: projectDomain.trim(),
          aboutTitle: aboutTitle.trim(),
          aboutDescription: aboutDescription.trim(),
          startDate: startDate || null,
          deadline: deadline || null,
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create project");
      }

      const project = data.project;

      const newProject: Project = {
        id: String(project.id),
        name: project.name,
        domain: project.domain || "No domain",
        status: project.status || "Unassigned",
        aboutTitle: project.about_title || "Project",
        aboutDescription: project.about_description || "",
        progress: Number(project.progress || 0),
        members: [],
        startDate: project.start_date || "",
        deadline: project.deadline || "",
        priority: project.priority || "Medium",
        managerId: null,
        managerName: null,
        managerEmail: null,
        creatorId: project.created_by ? String(project.created_by) : undefined,
      };

      setProjects((prev) => [newProject, ...prev]);

      resetForm();
      setModalOpen(false);
    } catch (error: any) {
      setError(error.message || "Unable to create project");
    } finally {
      setSavingProject(false);
    }
  };

  const stopDragAutoScroll = () => {
    if (dragScrollInterval.current !== null) {
      window.clearInterval(dragScrollInterval.current);
      dragScrollInterval.current = null;
    }
  };

  const handleDragAutoScroll = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isProjectManager) return;
    const mouseY = event.clientY;
    const viewportHeight = window.innerHeight;
    const scrollZone = 120;
    const maxScrollSpeed = 15;
    let scrollSpeed = 0;
    if (mouseY < scrollZone) {
      const intensity = (scrollZone - mouseY) / scrollZone;
      scrollSpeed = -Math.max(4, Math.min(maxScrollSpeed, intensity * maxScrollSpeed));
    } else if (mouseY > viewportHeight - scrollZone) {
      const intensity = (mouseY - (viewportHeight - scrollZone)) / scrollZone;
      scrollSpeed = Math.max(4, Math.min(maxScrollSpeed, intensity * maxScrollSpeed));
    }
    if (scrollSpeed === 0) {
      stopDragAutoScroll();
      return;
    }
    if (dragScrollInterval.current !== null) return;
    dragScrollInterval.current = window.setInterval(() => window.scrollBy({ top: scrollSpeed, behavior: "auto" }), 16);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, projectId: string) => {
    if (!isProjectManager) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("projectId", projectId);
    event.dataTransfer.effectAllowed = "move";
  };

  const assignProject = async (projectId: string, managerId: string) => {
    if (!isProjectManager) return false;
    try {
      setAssigningProject(true);
      setError("");
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/assign`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ managerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to assign project");
      const updated = data.project;
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? { ...project, managerId: updated.project_manager_id ? String(updated.project_manager_id) : null, status: updated.status || "Backlog", managerName: data.manager?.full_name || null, managerEmail: data.manager?.email || null }
            : project
        )
      );
      return true;
    } catch (error: any) {
      setError(error.message || "Unable to assign project");
      return false;
    } finally {
      setAssigningProject(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDropOnManager = async (event: React.DragEvent<HTMLDivElement>, managerId: string) => {
    event.preventDefault();
    event.stopPropagation();
    stopDragAutoScroll();
    setDragOverManagerId(null);
    if (!isProjectManager) return;
    const projectId = event.dataTransfer.getData("projectId");
    if (!projectId) return;
    await assignProject(projectId, managerId);
  };

  const handleUnassignProject = async (projectId: string) => {
    if (!isProjectManager) return;
    try {
      setAssigningProject(true);
      setError("");
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/unassign`, { method: "PATCH", headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to unassign");
      setProjects((prev) => prev.map((project) => (project.id === projectId ? { ...project, managerId: null, managerName: null, managerEmail: null, status: "Unassigned" } : project)));
    } catch (error: any) {
      setError(error.message || "Unable to unassign");
    } finally {
      setAssigningProject(false);
    }
  };

  const openManualAssign = (projectId: string) => {
    if (!isProjectManager) return;
    setSelectedProjectId(projectId);
    setSelectedManagerId(null);
    setAssignModalOpen(true);
  };

  const handleManualAssign = async () => {
    if (!selectedProjectId || !selectedManagerId) return;
    const success = await assignProject(selectedProjectId, selectedManagerId);
    if (success) {
      setAssignModalOpen(false);
      setSelectedProjectId(null);
      setSelectedManagerId(null);
    }
  };

  const unassignedProjects = filteredProjects.filter((project) => project.status === "Unassigned" || !project.managerId);

  const handleRefresh = async () => {
    await fetchProjects();
    await fetchProjectManagers();
  };

  useEffect(() => {
    return () => stopDragAutoScroll();
  }, []);

  const openEditProject = (project: Project) => {
    if (!isExecutiveManager) return;

    setSelectedProject(project);

    setEditProjectName(project.name || "");
    setEditProjectDomain(project.domain || "");
    setEditAboutTitle(project.aboutTitle || "");
    setEditAboutDescription(project.aboutDescription || "");
    setEditStartDate(project.startDate || "");
    setEditDeadline(project.deadline || "");
    setEditPriority(project.priority || "Medium");

    setEditDateError("");
    setOpenProjectMenu(null);
    setEditModalOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !isExecutiveManager) return;

    if (!editProjectName.trim()) {
      setEditDateError("Project name is required.");
      return;
    }

    if (editStartDate && editDeadline && editDeadline < editStartDate) {
      setEditDateError("Deadline must be greater than or equal to the start date.");
      return;
    }

    setEditDateError("");

    try {
      setSavingEdit(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editProjectName.trim(),
          domain: editProjectDomain.trim(),
          aboutTitle: editAboutTitle.trim(),
          aboutDescription: editAboutDescription.trim(),
          startDate: editStartDate || null,
          deadline: editDeadline || null,
          priority: editPriority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update project.");
      }

      const updated = data.project;

      setProjects((prev) =>
        prev.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                name: updated.name,
                domain: updated.domain || "No domain",
                aboutTitle: updated.about_title || "Project",
                aboutDescription: updated.about_description || "",
                startDate: updated.start_date || "",
                deadline: updated.deadline || "",
                priority: updated.priority || "Medium",
              }
            : project
        )
      );

      setEditModalOpen(false);
      setSelectedProject(null);
    } catch (error: any) {
      setError(error.message || "Unable to update project.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeadlineModal = (project: Project) => {
    if (!isExecutiveManager) return;

    setSelectedProject(project);
    setEditDeadline(project.deadline || "");
    setEditDateError("");
    setOpenProjectMenu(null);
    setDeadlineModalOpen(true);
  };

  const handleUpdateDeadline = async () => {
    if (!selectedProject || !isExecutiveManager) return;

    if (selectedProject.startDate && editDeadline && editDeadline < selectedProject.startDate) {
      setEditDateError("Deadline must be greater than or equal to the start date.");
      return;
    }

    try {
      setSavingDeadline(true);
      setError("");
      setEditDateError("");

      const response = await fetch(`${API_BASE}/api/projects/${selectedProject.id}/deadline`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          deadline: editDeadline || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update deadline.");
      }

      const updated = data.project;

      setProjects((prev) =>
        prev.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                deadline: updated.deadline || "",
              }
            : project
        )
      );

      setDeadlineModalOpen(false);
      setSelectedProject(null);
    } catch (error: any) {
      setError(error.message || "Unable to update deadline.");
    } finally {
      setSavingDeadline(false);
    }
  };

  const openDeleteProject = (project: Project) => {
    if (!isExecutiveManager) return;

    setSelectedProject(project);
    setOpenProjectMenu(null);
    setDeleteModalOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !isExecutiveManager) return;

    try {
      setDeletingProject(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/projects/${selectedProject.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete project.");
      }

      setProjects((prev) =>
        prev.filter((project) => project.id !== selectedProject.id)
      );

      setDeleteModalOpen(false);
      setSelectedProject(null);
    } catch (error: any) {
      setError(error.message || "Unable to delete project.");
    } finally {
      setDeletingProject(false);
    }
  };

  return (
    <>
      <main className="min-h-[calc(100vh-72px)] bg-[#fafafa] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[28px] font-semibold tracking-[-0.8px] text-gray-900 sm:text-[32px]">Projects</h1>
                {currentUser && <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600"><ShieldCheck size={12} />{currentUser.role}</span>}
              </div>
              <p className="mt-1 text-sm text-gray-500">Create, organize and assign your team projects.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleRefresh} disabled={loading} className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              {isExecutiveManager && (
                <button type="button" onClick={() => setModalOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#111c2c] active:scale-[0.98]">
                  <Plus size={17} />
                  Add project
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div>
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
              <button type="button" onClick={() => setError("")} className="rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-700">
                <X size={15} />
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-7">
              <button type="button" onClick={() => setActiveView("table")} className={`relative pb-3 text-sm font-medium ${activeView === "table" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}>
                Table View
                {activeView === "table" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />}
              </button>
              <button type="button" onClick={() => setActiveView("assignment")} className={`relative pb-3 text-sm font-medium ${activeView === "assignment" ? "text-gray-900" : "text-gray-500 hover:text-gray-800"}`}>
                Assignment Board
                {activeView === "assignment" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />}
              </button>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-[320px]">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for projects"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                />
              </div>
              <div className="relative">
                <button type="button" onClick={() => setFilterOpen(!filterOpen)} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto">
                  <SlidersHorizontal size={16} />
                  Filters
                  <ChevronDown size={14} className={filterOpen ? "rotate-180" : ""} />
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Project Status</p>
                    {["All", "Unassigned", "Backlog", "In Progress", "Paused", "Done"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(status as ProjectStatus | "All");
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${selectedStatus === status ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeView === "table" && (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">All Projects</h2>
                  <p className="mt-0.5 text-[11px] text-gray-400">{filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}</p>
                </div>
                {isExecutiveManager && <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-medium text-gray-500 sm:inline-flex">You can create projects</span>}
              </div>

              {loading ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center">
                  <RefreshCw size={24} className="animate-spin text-gray-400" />
                  <p className="mt-3 text-sm font-medium text-gray-600">Loading projects...</p>
                  <p className="mt-1 text-xs text-gray-400">Fetching projects from PostgreSQL</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#fcfcfc]">
                        <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Name</th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Status</th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">About</th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Manager</th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Progress</th>
                        <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">Deadline</th>
                        <th className="w-12 px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project, index) => {
                        const manager = project.managerId ? projectManagers.find((item) => item.id === project.managerId) : undefined;
                        return (
                          <tr key={project.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <ProjectLogo index={index} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{project.name}</p>
                                  <p className="mt-0.5 text-xs text-gray-400">{project.domain}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-medium ${statusStyles[project.status]}`}>{project.status}</span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-gray-800">{project.aboutTitle}</p>
                              <p className="mt-0.5 max-w-[280px] truncate text-xs text-gray-400">{project.aboutDescription}</p>
                            </td>
                            <td className="px-5 py-4">
                              {manager ? (
                                <div className="flex items-center gap-2">
                                  <ManagerAvatar manager={manager} small />
                                  <div>
                                    <p className="text-xs font-medium text-gray-800">{project.managerName || manager.name}</p>
                                    <p className="text-[10px] text-gray-400">{manager.role}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-600">Unassigned</span>
                                  {isProjectManager && (
                                    <button type="button" onClick={() => openManualAssign(project.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">
                                      <UserPlus size={12} />
                                      Assign
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <ProgressBar progress={project.progress} />
                            </td>
                            <td className="px-5 py-4">
                              {project.deadline ? (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Calendar size={13} className="text-gray-400" />
                                  {project.deadline}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No deadline</span>
                              )}
                            </td>
                            <td className="px-3 py-4">
                              <div className="relative">
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

                                {openProjectMenu === project.id && isExecutiveManager && (
                                  <div
                                    className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isExecutiveManager && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditProject(project)}
                                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                          <Edit3 size={16} className="text-gray-500" />
                                          Update Project
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => openDeadlineModal(project)}
                                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                          <Calendar size={16} className="text-gray-500" />
                                          Update Deadline
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenProjectMenu(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Eye size={16} className="text-gray-500" />
                                      View Project
                                    </button>

                                    {isExecutiveManager && (
                                      <>
                                        <div className="my-1 border-t border-gray-100" />

                                        <button
                                          type="button"
                                          onClick={() => openDeleteProject(project)}
                                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 size={16} />
                                          Delete Project
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filteredProjects.length === 0 && (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Search size={21} className="text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">No projects found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {projects.length === 0 ? (isExecutiveManager ? "Create a project to get started." : "No projects have been created yet.") : "Try changing your search or filter."}
                  </p>
                </div>
              )}

              {!loading && filteredProjects.length > 0 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
                  <p className="text-xs text-gray-500">
                    1-{filteredProjects.length} of {filteredProjects.length}
                  </p>
                  <div className="flex gap-1">
                    <button disabled className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-300">
                      <ChevronLeft size={15} />
                    </button>
                    <button disabled className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-300">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === "assignment" && (
            <div className="mt-6">
              <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#07111f] text-white">
                        <UserPlus size={17} />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">Project Assignment</h2>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">
                      {isProjectManager ? "Assign projects to project managers by dragging an unassigned project onto a manager. You can also assign projects manually." : "Project assignment is restricted to Project Managers. You can view the assignment status but cannot change it."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isProjectManager && <div className="hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:block">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">Access</p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-700">View Only</p>
                    </div>}
                    <div className="rounded-lg bg-violet-50 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">Awaiting assignment</p>
                      <p className="mt-0.5 text-lg font-semibold text-violet-700">{unassignedProjects.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto pb-4">
                <div className="grid min-w-[1150px] grid-cols-[360px_minmax(750px,1fr)] gap-5">
                  <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Unassigned Projects</h3>
                          <p className="mt-1 text-[11px] text-gray-400">{isProjectManager ? "Drag a project to a manager" : "Projects waiting for assignment"}</p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">{unassignedProjects.length}</span>
                      </div>
                    </div>
                    <div className="max-h-[650px] space-y-3 overflow-y-auto p-4">
                      {unassignedProjects.length > 0 ? (
                        unassignedProjects.map((project, index) => (
                          <div
                            key={project.id}
                            draggable={isProjectManager}
                            onDragStart={(e) => handleDragStart(e, project.id)}
                            onDragEnd={() => stopDragAutoScroll()}
                            onDrag={(e) => handleDragAutoScroll(e)}
                            className={`group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition ${isProjectManager ? "cursor-grab hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md active:cursor-grabbing" : "cursor-default"}`}
                          >
                            <div className="flex items-start gap-3">
                              {isProjectManager && <div className="mt-1 shrink-0 text-gray-300 transition group-hover:text-gray-500"><GripVertical size={17} /></div>}
                              <ProjectLogo index={index} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-gray-400">{project.domain}</p>
                                  </div>
                                  <span className="shrink-0 rounded-md bg-violet-50 px-2 py-1 text-[9px] font-medium text-violet-600">New</span>
                                </div>
                                <p className="mt-3 text-xs font-medium text-gray-700">{project.aboutTitle}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">{project.aboutDescription}</p>
                                <div className="mt-3 flex items-center gap-3">
                                  {project.priority && (
                                    <div className="flex items-center gap-1">
                                      <Flag size={11} className="text-gray-400" />
                                      <span className="text-[10px] text-gray-500">{project.priority}</span>
                                    </div>
                                  )}
                                  {project.deadline && (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={11} className="text-gray-400" />
                                      <span className="text-[10px] text-gray-500">{project.deadline}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                    {isProjectManager && <GripVertical size={12} />}
                                    {isProjectManager ? "Drag to assign" : "Awaiting manager"}
                                  </span>
                                  {isProjectManager && (
                                    <button type="button" onClick={() => openManualAssign(project.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-gray-600 transition hover:bg-gray-50">
                                      <UserPlus size={12} />
                                      Assign manually
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-5 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                            <Check size={21} />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-gray-800">All projects assigned</p>
                          <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-gray-400">Great! There are currently no projects waiting for a project manager.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Project Managers</h3>
                      <p className="mt-1 text-[11px] text-gray-400">{isProjectManager ? "Drop projects onto a manager to assign them." : "Current project manager assignments."}</p>
                    </div>

                    {loadingManagers ? (
                      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                        <div className="text-center">
                          <RefreshCw size={22} className="mx-auto animate-spin text-gray-400" />
                          <p className="mt-3 text-xs text-gray-500">Loading project managers...</p>
                        </div>
                      </div>
                    ) : projectManagers.length === 0 ? (
                      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center">
                        <Users size={25} className="text-gray-300" />
                        <p className="mt-3 text-sm font-semibold text-gray-700">No project managers found</p>
                        <p className="mt-1 max-w-[280px] text-xs text-gray-400">Create an active user with the Project Manager role in PostgreSQL.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {projectManagers.map((manager) => {
                          const managerProjects = filteredProjects.filter((project) => project.managerId === manager.id);
                          const isDragOver = dragOverManagerId === manager.id;
                          return (
                            <div
                              key={manager.id}
                              onDragOver={(e) => {
                                if (isProjectManager) {
                                  e.preventDefault();
                                  setDragOverManagerId(manager.id);
                                }
                              }}
                              onDragLeave={() => setDragOverManagerId(null)}
                              onDrop={(e) => handleDropOnManager(e, manager.id)}
                              className={`min-h-[280px] rounded-xl border-2 bg-[#f7f7f8] p-3 transition ${isDragOver ? "border-gray-900 bg-gray-50" : "border-gray-200"} ${isProjectManager ? "hover:border-gray-300" : ""}`}
                            >
                              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <ManagerAvatar manager={manager} />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-gray-900">{manager.name}</p>
                                      <p className="mt-0.5 truncate text-[10px] text-gray-400">{manager.role}</p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-lg font-semibold text-gray-900">{managerProjects.length}</p>
                                    <p className="text-[9px] uppercase tracking-wide text-gray-400">Projects</p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 space-y-3">
                                {managerProjects.length > 0 ? (
                                  managerProjects.map((project, index) => (
                                    <div key={project.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                      <div className="flex items-center gap-2.5">
                                        <ProjectLogo index={index} />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs font-semibold text-gray-900">{project.name}</p>
                                          <p className="truncate text-[10px] text-gray-400">{project.aboutTitle}</p>
                                        </div>
                                        {isProjectManager && (
                                          <button
                                            type="button"
                                            onClick={() => handleUnassignProject(project.id)}
                                            disabled={assigningProject}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                                          >
                                            <X size={14} />
                                          </button>
                                        )}
                                      </div>
                                      <div className="mt-3">
                                        <ProgressBar progress={project.progress} />
                                      </div>
                                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                        <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-medium ${statusStyles[project.status]}`}>{project.status}</span>
                                        {isProjectManager && (
                                          <button type="button" onClick={() => openManualAssign(project.id)} className="text-[10px] font-medium text-gray-500 hover:text-gray-900">
                                            Reassign
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                      <User size={17} />
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-gray-500">{isProjectManager ? "Drop project here" : "No projects assigned"}</p>
                                    <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                                      {isProjectManager
                                        ? `Projects assigned to ${manager.name.split(" ")[0]} appear here.`
                                        : `No project is currently assigned to ${manager.name}.`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE PROJECT MODAL */}
      {modalOpen && isExecutiveManager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                  <Plus size={19} />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Create a new project</h2>
                <p className="mt-1 text-xs text-gray-500">Add the essential details to create your project.</p>
              </div>
              <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Project name
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. ARG Intelligence Platform"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Project domain</label>
                  <input
                    type="text"
                    value={projectDomain}
                    onChange={(e) => setProjectDomain(e.target.value)}
                    placeholder="e.g. arg.com"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Project objective</label>
                  <input
                    type="text"
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    placeholder="e.g. Build internal project management system"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Description</label>
                  <textarea
                    value={aboutDescription}
                    onChange={(e) => setAboutDescription(e.target.value)}
                    placeholder="Describe what this project is about..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Start date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      min={getTodayDate()}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDateError("");
                        if (value && value < getTodayDate()) {
                          setDateError("Start date must be today or a future date.");
                          return;
                        }
                        if (deadline && value && deadline < value) {
                          setDeadline("");
                        }
                        setStartDate(value);
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Deadline</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={deadline}
                      min={startDate || getTodayDate()}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDateError("");
                        if (value && value < getTodayDate()) {
                          setDateError("Deadline cannot be before today.");
                          return;
                        }
                        if (startDate && value && value < startDate) {
                          setDateError("Deadline must be greater than or equal to the start date.");
                          return;
                        }
                        setDeadline(value);
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                </div>
              </div>
              {dateError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-red-600">{dateError}</p>
                </div>
              )}
              <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                    <Users size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Project manager assignment</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Every newly created project starts as Unassigned. A Project Manager can assign the project from the Assignment Board.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={!projectName.trim() || savingProject}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* EDIT PROJECT MODAL */}
      {editModalOpen && isExecutiveManager && selectedProject && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditModalOpen(false);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                  <Edit3 size={18} />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Update project</h2>
                <p className="mt-1 text-xs text-gray-500">Update the project information and dates.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedProject(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Project name<span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Project domain</label>
                  <input
                    type="text"
                    value={editProjectDomain}
                    onChange={(e) => setEditProjectDomain(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as ProjectPriority)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Project objective</label>
                  <input
                    type="text"
                    value={editAboutTitle}
                    onChange={(e) => setEditAboutTitle(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Description</label>
                  <textarea
                    value={editAboutDescription}
                    onChange={(e) => setEditAboutDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Start date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditDateError("");
                        if (editDeadline && value && editDeadline < value) {
                          setEditDeadline("");
                        }
                        setEditStartDate(value);
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Deadline</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={editDeadline}
                      min={editStartDate || undefined}
                      onChange={(e) => {
                        setEditDeadline(e.target.value);
                        setEditDateError("");
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />
                  </div>
                </div>
              </div>

              {editDateError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-red-600">{editDateError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedProject(null);
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateProject}
                disabled={!editProjectName.trim() || savingEdit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Update project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEADLINE MODAL */}
      {deadlineModalOpen && isExecutiveManager && selectedProject && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDeadlineModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                  <Calendar size={18} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Update deadline</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Update the deadline for <span className="font-medium text-gray-700">{selectedProject.name}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeadlineModalOpen(false);
                  setSelectedProject(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <label className="mb-2 block text-xs font-semibold text-gray-700">Deadline</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={editDeadline}
                  min={selectedProject.startDate || getTodayDate()}
                  onChange={(e) => {
                    setEditDeadline(e.target.value);
                    setEditDateError("");
                  }}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-black outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                />
              </div>

              {editDateError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-red-600">{editDateError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDeadlineModalOpen(false);
                  setSelectedProject(null);
                }}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateDeadline}
                disabled={savingDeadline}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingDeadline ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Update deadline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && isExecutiveManager && selectedProject && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 size={21} className="text-red-600" />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-900">Delete project?</h2>

              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedProject.name}</span>?
              </p>

              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                <p className="text-xs font-medium leading-relaxed text-red-700">
                  This action will permanently delete the project and all tasks associated with it. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedProject(null);
                }}
                disabled={deletingProject}
                className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProject}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingProject ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assignModalOpen && isProjectManager && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAssignModalOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                  <UserPlus size={18} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Assign project</h2>
                <p className="mt-1 text-xs text-gray-500">Select a Project Manager for this project.</p>
              </div>
              <button type="button" onClick={() => setAssignModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto px-6 py-5">
              {projectManagers.map((manager) => {
                const selected = selectedManagerId === manager.id;
                return (
                  <button
                    key={manager.id}
                    type="button"
                    onClick={() => setSelectedManagerId(manager.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <ManagerAvatar manager={manager} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{manager.name}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{manager.role}</p>
                    </div>
                    {selected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07111f] text-white">
                        <Check size={13} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button type="button" onClick={() => setAssignModalOpen(false)} className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualAssign}
                disabled={!selectedManagerId || assigningProject}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {assigningProject ? (
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
    </>
  );
}
