"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  X,
  Calendar,
  Users,
  Flag,
  UserPlus,
  GripVertical,
  Check,
  User,
  RefreshCw,
  ShieldCheck,
  Edit3,
  Eye,
  Trash2,
  Circle,
  Clock3,
  CheckCircle2,
  ListTodo,
  AlertCircle,
} from "lucide-react";

const API_BASE = "https://backend-five-swart-88.vercel.app";

/* =========================================================
   TYPES
========================================================= */

type ProjectStatus =
  | "Unassigned"
  | "Backlog"
  | "In Progress"
  | "Paused"
  | "Done";

type ProjectPriority = "Low" | "Medium" | "High";

type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type ProjectManager = {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  email?: string;
};

type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Done"
  | "Backlog"
  | string;

type ProjectTask = {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
};

type Project = {
  id: string;
  name: string;
  domain: string;
  status: ProjectStatus;
  aboutTitle: string;
  aboutDescription: string;
  progress: number;
  members: string[];
  startDate?: string;
  deadline?: string;
  priority?: ProjectPriority;
  managerId?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  creatorId?: string;
  creatorName?: string;
  creatorRole?: string;

  tasks: ProjectTask[];
  completedTasks: number;
  totalTasks: number;
};

/* =========================================================
   STYLES
========================================================= */

const statusStyles: Record<ProjectStatus, string> = {
  Done: "border border-emerald-100 bg-emerald-50 text-emerald-600",
  "In Progress": "border border-blue-100 bg-blue-50 text-blue-600",
  Paused: "border border-orange-100 bg-orange-50 text-orange-600",
  Backlog: "border border-pink-100 bg-pink-50 text-pink-600",
  Unassigned: "border border-violet-100 bg-violet-50 text-violet-600",
};

const taskStatusStyles: Record<string, string> = {
  Done: "border border-emerald-100 bg-emerald-50 text-emerald-600",
  "In Progress": "border border-blue-100 bg-blue-50 text-blue-600",
  "To Do": "border border-gray-200 bg-gray-50 text-gray-600",
  Backlog: "border border-pink-100 bg-pink-50 text-pink-600",
};

const logoColors = [
  "bg-blue-100 text-blue-600",
  "bg-sky-100 text-sky-600",
  "bg-orange-100 text-orange-500",
  "bg-purple-100 text-purple-600",
  "bg-violet-100 text-violet-600",
  "bg-emerald-100 text-emerald-600",
  "bg-cyan-100 text-cyan-600",
];

const logoSymbols = ["P", "S", "L", "◆", "◆", "Q", "⚡"];

/* =========================================================
   HELPERS
========================================================= */

function ProjectLogo({ index }: { index: number }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        logoColors[index % logoColors.length]
      }`}
    >
      {logoSymbols[index % logoSymbols.length]}
    </div>
  );
}

function ManagerAvatar({
  manager,
  small = false,
}: {
  manager: ProjectManager;
  small?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        small ? "h-8 w-8 text-[9px]" : "h-10 w-10 text-[10px]"
      } ${manager.color}`}
    >
      {manager.initials}
    </div>
  );
}

function ProgressBar({
  progress,
  large = false,
}: {
  progress: number;
  large?: boolean;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  const progressColor =
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

        <span className="text-xs font-semibold text-gray-700">
          {safeProgress}%
        </span>
      </div>

      <div
        className={`w-full overflow-hidden rounded-full bg-gray-100 ${
          large ? "h-2.5" : "h-1.5"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const style =
    taskStatusStyles[status] ||
    "border border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${style}`}
    >
      {status === "Done" ? (
        <CheckCircle2 size={11} />
      ) : status === "In Progress" ? (
        <Clock3 size={11} />
      ) : (
        <Circle size={10} />
      )}

      {status}
    </span>
  );
}

/* =========================================================
   MAIN
========================================================= */

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

  const [activeView, setActiveView] = useState<"table" | "assignment">(
    "table"
  );

  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<
    ProjectStatus | "All"
  >("All");

  /* =========================================================
     CREATE PROJECT
  ========================================================= */

  const [modalOpen, setModalOpen] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutDescription, setAboutDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [dateError, setDateError] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");

  /* =========================================================
     ASSIGNMENT
  ========================================================= */

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(
    null
  );

  const dragScrollInterval = useRef<number | null>(null);

  const [openProjectMenu, setOpenProjectMenu] = useState<string | null>(null);
  const [dragOverManagerId, setDragOverManagerId] = useState<string | null>(
    null
  );

  /* =========================================================
     EDIT / DEADLINE / DELETE
  ========================================================= */

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(
    null
  );

  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDomain, setEditProjectDomain] = useState("");
  const [editAboutTitle, setEditAboutTitle] = useState("");
  const [editAboutDescription, setEditAboutDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] =
    useState<ProjectPriority>("Medium");

  const [editDateError, setEditDateError] = useState("");

  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  /* =========================================================
     VIEW PROJECT
  ========================================================= */

  const [viewModalOpen, setViewModalOpen] = useState(false);

  /* =========================================================
     STATUS
  ========================================================= */

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] =
    useState<ProjectStatus>("Backlog");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  /* =========================================================
     ROLE PERMISSIONS
  ========================================================= */

  const isExecutiveManager = currentUser?.role === "Executive Manager";

  const isSystemAdministrator =
    currentUser?.role === "System Administrator";

  const isProjectManager = currentUser?.role === "Project Manager";

  const isMember = currentUser?.role === "Member";

  const canAccessAssignmentBoard =
    isExecutiveManager || isSystemAdministrator;

  const canManageProjects =
    isExecutiveManager || isSystemAdministrator;

  const canCreateProjects = isExecutiveManager;

  /* =========================================================
     DATE
  ========================================================= */

  const getTodayDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  /* =========================================================
     CURRENT USER
  ========================================================= */

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);

      setCurrentUser(user);
    } catch (error) {
      console.error("Unable to read stored user:", error);
    }
  }, []);

  /* =========================================================
     AUTH HEADERS
  ========================================================= */

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  /* =========================================================
     FETCH TASKS FOR PROJECT
  ========================================================= */

  const fetchProjectTasks = async (
    projectId: string
  ): Promise<ProjectTask[]> => {
    try {
      const response = await fetch(
        `${API_BASE}/api/tasks/project/${projectId}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      const rawTasks = Array.isArray(data)
        ? data
        : data.tasks || [];

      return rawTasks.map((task: any) => ({
        id: String(task.id),

        name:
          task.name ||
          task.title ||
          task.task_name ||
          "Untitled Task",

        description: task.description || "",

        status: task.status || "To Do",

        priority: task.priority || "Medium",

        assigneeId:
          task.assignee_id != null
            ? String(task.assignee_id)
            : task.assigneeId != null
            ? String(task.assigneeId)
            : null,

        assigneeName:
          task.assignee_name ||
          task.assignee_full_name ||
          task.assigneeName ||
          task.assignee?.full_name ||
          task.assignee?.name ||
          null,

        assigneeEmail:
          task.assignee_email ||
          task.assigneeEmail ||
          task.assignee?.email ||
          null,

        startDate:
          task.start_date ||
          task.startDate ||
          null,

        dueDate:
          task.due_date ||
          task.dueDate ||
          task.deadline ||
          null,
      }));
    } catch (error) {
      console.error(
        `Unable to load tasks for project ${projectId}:`,
        error
      );

      return [];
    }
  };

  /* =========================================================
     FETCH PROJECTS + TASKS
  ========================================================= */

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/projects`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const contentType = response.headers.get("content-type");
      const isJson =
        contentType && contentType.includes("application/json");

      if (!response.ok) {
        throw new Error(
          isJson
            ? (await response.json()).message ||
                `Error ${response.status}`
            : `Server error ${response.status}`
        );
      }

      if (!isJson) {
        throw new Error(
          "Expected JSON response from projects API."
        );
      }

      const data = await response.json();

      const rawProjects = data.projects || [];

      const formattedProjects: Project[] = await Promise.all(
        rawProjects.map(async (project: any) => {
          const projectId = String(project.id);

          const tasks = await fetchProjectTasks(projectId);

          const completedTasks = tasks.filter(
            (task) =>
              String(task.status).toLowerCase() === "done"
          ).length;

          const totalTasks = tasks.length;

          const calculatedProgress =
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;

          return {
            id: projectId,

            name:
              project.name ||
              "Untitled Project",

            domain:
              project.domain ||
              "No domain",

            status:
              project.status ||
              "Unassigned",

            aboutTitle:
              project.about_title ||
              "Project",

            aboutDescription:
              project.about_description ||
              "",

            progress: calculatedProgress,

            members: [],

            startDate:
              project.start_date ||
              "",

            deadline:
              project.deadline ||
              "",

            priority:
              project.priority ||
              "Medium",

            managerId:
              project.manager_id
                ? String(project.manager_id)
                : null,

            managerName:
              project.manager_name ||
              null,

            managerEmail:
              project.manager_email ||
              null,

            creatorId:
              project.creator_id
                ? String(project.creator_id)
                : undefined,

            creatorName:
              project.creator_name ||
              undefined,

            creatorRole:
              project.creator_role ||
              undefined,

            tasks,

            completedTasks,

            totalTasks,
          };
        })
      );

      setProjects(formattedProjects);
    } catch (error: any) {
      setError(
        error.message ||
          "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH PROJECT MANAGERS
  ========================================================= */

  const fetchProjectManagers = async () => {
    try {
      setLoadingManagers(true);

      const response = await fetch(
        `${API_BASE}/api/projects/managers`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load managers"
        );
      }

      const colors = [
        "bg-blue-100 text-blue-600",
        "bg-purple-100 text-purple-600",
        "bg-emerald-100 text-emerald-600",
        "bg-orange-100 text-orange-600",
        "bg-cyan-100 text-cyan-600",
        "bg-violet-100 text-violet-600",
      ];

      const managers: ProjectManager[] =
        (data.managers || []).map(
          (manager: any, index: number) => {
            const fullName =
              manager.full_name ||
              "Project Manager";

            const initials = fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part: string) =>
                part.charAt(0)
              )
              .join("")
              .toUpperCase() || "PM";

            return {
              id: String(manager.id),

              name: fullName,

              initials,

              role:
                manager.role ||
                "Project Manager",

              email:
                manager.email,

              color:
                colors[index % colors.length],
            };
          }
        );

      setProjectManagers(managers);
    } catch (error) {
      console.error(
        "Fetch managers error:",
        error
      );
    } finally {
      setLoadingManagers(false);
    }
  };

  /* =========================================================
     INITIAL DATA
  ========================================================= */

  useEffect(() => {
    fetchProjects();
    fetchProjectManagers();
  }, []);

  /* =========================================================
     ROLE-BASED PROJECT FILTERING
  ========================================================= */

  const roleFilteredProjects = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    /*
     * Executive Manager + System Administrator
     * can see all projects.
     */
    if (
      isExecutiveManager ||
      isSystemAdministrator
    ) {
      return projects;
    }

    /*
     * Project Manager:
     * only projects assigned to this manager.
     */
    if (isProjectManager) {
      return projects.filter(
        (project) =>
          project.managerId ===
          String(currentUser.id)
      );
    }

    /*
     * Member:
     * only projects where at least one task
     * is assigned to this member.
     */
    if (isMember) {
      return projects.filter((project) =>
        project.tasks.some(
          (task) =>
            task.assigneeId ===
            String(currentUser.id)
        )
      );
    }

    return [];
  }, [
    projects,
    currentUser,
    isExecutiveManager,
    isSystemAdministrator,
    isProjectManager,
    isMember,
  ]);

  /* =========================================================
     SEARCH + STATUS FILTER
  ========================================================= */

  const filteredProjects = useMemo(() => {
    return roleFilteredProjects.filter(
      (project) => {
        const query =
          search.toLowerCase().trim();

        const matchesSearch =
          !query ||
          [
            project.name,
            project.domain,
            project.aboutTitle,
            project.aboutDescription,
            project.managerName || "",
          ].some((field) =>
            field
              .toLowerCase()
              .includes(query)
          );

        const matchesStatus =
          selectedStatus === "All" ||
          project.status ===
            selectedStatus;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    roleFilteredProjects,
    search,
    selectedStatus,
  ]);

  /* =========================================================
     RESET CREATE FORM
  ========================================================= */

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

  /* =========================================================
     CREATE PROJECT
  ========================================================= */

  const handleSaveProject = async () => {
    if (
      !canCreateProjects ||
      !projectName.trim()
    ) {
      return;
    }

    const today =
      getTodayDate();

    if (
      startDate &&
      startDate < today
    ) {
      setDateError(
        "Start date must be today or a future date."
      );
      return;
    }

    if (
      deadline &&
      deadline < today
    ) {
      setDateError(
        "Deadline cannot be before today."
      );
      return;
    }

    if (
      startDate &&
      deadline &&
      deadline < startDate
    ) {
      setDateError(
        "Deadline must be greater than or equal to the start date."
      );
      return;
    }

    try {
      setSavingProject(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/projects`,
        {
          method: "POST",
          headers: getAuthHeaders(),

          body: JSON.stringify({
            name:
              projectName.trim(),

            domain:
              projectDomain.trim(),

            aboutTitle:
              aboutTitle.trim(),

            aboutDescription:
              aboutDescription.trim(),

            startDate:
              startDate || null,

            deadline:
              deadline || null,

            priority,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to create project"
        );
      }

      resetForm();
      setModalOpen(false);

      await fetchProjects();
    } catch (error: any) {
      setError(
        error.message ||
          "Unable to create project"
      );
    } finally {
      setSavingProject(false);
    }
  };

  /* =========================================================
     DRAG AUTO SCROLL
  ========================================================= */

  const stopDragAutoScroll = () => {
    if (
      dragScrollInterval.current !==
      null
    ) {
      window.clearInterval(
        dragScrollInterval.current
      );

      dragScrollInterval.current =
        null;
    }
  };

  const handleDragAutoScroll = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    if (!canAccessAssignmentBoard)
      return;

    const mouseY =
      event.clientY;

    const viewportHeight =
      window.innerHeight;

    const scrollZone = 120;
    const maxScrollSpeed = 15;

    let scrollSpeed = 0;

    if (
      mouseY < scrollZone
    ) {
      const intensity =
        (scrollZone - mouseY) /
        scrollZone;

      scrollSpeed = -Math.max(
        4,
        Math.min(
          maxScrollSpeed,
          intensity *
            maxScrollSpeed
        )
      );
    } else if (
      mouseY >
      viewportHeight -
        scrollZone
    ) {
      const intensity =
        (mouseY -
          (viewportHeight -
            scrollZone)) /
        scrollZone;

      scrollSpeed = Math.max(
        4,
        Math.min(
          maxScrollSpeed,
          intensity *
            maxScrollSpeed
        )
      );
    }

    if (scrollSpeed === 0) {
      stopDragAutoScroll();
      return;
    }

    if (
      dragScrollInterval.current !==
      null
    ) {
      return;
    }

    dragScrollInterval.current =
      window.setInterval(() => {
        window.scrollBy({
          top: scrollSpeed,
          behavior: "auto",
        });
      }, 16);
  };

  /* =========================================================
     DRAG START
  ========================================================= */

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    projectId: string
  ) => {
    if (!canAccessAssignmentBoard) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData(
      "projectId",
      projectId
    );

    event.dataTransfer.effectAllowed =
      "move";
  };

  /* =========================================================
     ASSIGN PROJECT
  ========================================================= */

  const assignProject = async (
    projectId: string,
    managerId: string
  ) => {
    if (!canAccessAssignmentBoard) {
      return false;
    }

    try {
      setAssigningProject(true);
      setError("");

      const response =
        await fetch(
          `${API_BASE}/api/projects/${projectId}/assign`,
          {
            method: "PATCH",
            headers:
              getAuthHeaders(),

            body: JSON.stringify({
              managerId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to assign project"
        );
      }

      await fetchProjects();

      return true;
    } catch (error: any) {
      setError(
        error.message ||
          "Unable to assign project"
      );

      return false;
    } finally {
      setAssigningProject(false);
    }
  };

  /* =========================================================
     DROP PROJECT
  ========================================================= */

  const handleDropOnManager = async (
    event: React.DragEvent<HTMLDivElement>,
    managerId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    stopDragAutoScroll();
    setDragOverManagerId(null);

    if (!canAccessAssignmentBoard) {
      return;
    }

    const projectId =
      event.dataTransfer.getData(
        "projectId"
      );

    if (!projectId) {
      return;
    }

    await assignProject(
      projectId,
      managerId
    );
  };

  /* =========================================================
     UNASSIGN
  ========================================================= */

  const handleUnassignProject = async (
    projectId: string
  ) => {
    if (!canAccessAssignmentBoard) {
      return;
    }

    try {
      setAssigningProject(true);
      setError("");

      const response =
        await fetch(
          `${API_BASE}/api/projects/${projectId}/unassign`,
          {
            method: "PATCH",
            headers:
              getAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to unassign"
        );
      }

      await fetchProjects();
    } catch (error: any) {
      setError(
        error.message ||
          "Unable to unassign"
      );
    } finally {
      setAssigningProject(false);
    }
  };

  /* =========================================================
     MANUAL ASSIGN
  ========================================================= */

  const openManualAssign = (
    projectId: string
  ) => {
    if (!canAccessAssignmentBoard)
      return;

    setSelectedProjectId(
      projectId
    );

    setSelectedManagerId(null);
    setAssignModalOpen(true);
  };

  const handleManualAssign =
    async () => {
      if (
        !selectedProjectId ||
        !selectedManagerId
      ) {
        return;
      }

      const success =
        await assignProject(
          selectedProjectId,
          selectedManagerId
        );

      if (success) {
        setAssignModalOpen(false);
        setSelectedProjectId(null);
        setSelectedManagerId(null);
      }
    };

  /* =========================================================
     UNASSIGNED
  ========================================================= */

  const unassignedProjects =
    filteredProjects.filter(
      (project) =>
        project.status ===
          "Unassigned" ||
        !project.managerId
    );

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = async () => {
    await fetchProjects();

    if (canAccessAssignmentBoard) {
      await fetchProjectManagers();
    }
  };

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () =>
      stopDragAutoScroll();
  }, []);

  /* =========================================================
     EDIT PROJECT
  ========================================================= */

  const openEditProject = (
    project: Project
  ) => {
    if (!canManageProjects)
      return;

    setSelectedProject(project);

    setEditProjectName(
      project.name || ""
    );

    setEditProjectDomain(
      project.domain || ""
    );

    setEditAboutTitle(
      project.aboutTitle || ""
    );

    setEditAboutDescription(
      project.aboutDescription ||
        ""
    );

    setEditStartDate(
      project.startDate || ""
    );

    setEditDeadline(
      project.deadline || ""
    );

    setEditPriority(
      project.priority || "Medium"
    );

    setEditDateError("");
    setOpenProjectMenu(null);
    setEditModalOpen(true);
  };

  /* =========================================================
     UPDATE PROJECT
  ========================================================= */

  const handleUpdateProject =
    async () => {
      if (
        !selectedProject ||
        !canManageProjects
      ) {
        return;
      }

      if (!editProjectName.trim()) {
        setEditDateError(
          "Project name is required."
        );
        return;
      }

      if (
        editStartDate &&
        editDeadline &&
        editDeadline <
          editStartDate
      ) {
        setEditDateError(
          "Deadline must be greater than or equal to the start date."
        );
        return;
      }

      try {
        setSavingEdit(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE}/api/projects/${selectedProject.id}`,
            {
              method: "PATCH",
              headers:
                getAuthHeaders(),

              body: JSON.stringify({
                name:
                  editProjectName.trim(),

                domain:
                  editProjectDomain.trim(),

                aboutTitle:
                  editAboutTitle.trim(),

                aboutDescription:
                  editAboutDescription.trim(),

                startDate:
                  editStartDate || null,

                deadline:
                  editDeadline || null,

                priority:
                  editPriority,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to update project."
          );
        }

        setEditModalOpen(false);
        setSelectedProject(null);

        await fetchProjects();
      } catch (error: any) {
        setError(
          error.message ||
            "Unable to update project."
        );
      } finally {
        setSavingEdit(false);
      }
    };

  /* =========================================================
     DEADLINE
  ========================================================= */

  const openDeadlineModal = (
    project: Project
  ) => {
    if (!canManageProjects)
      return;

    setSelectedProject(project);

    setEditDeadline(
      project.deadline || ""
    );

    setEditDateError("");
    setOpenProjectMenu(null);
    setDeadlineModalOpen(true);
  };

  const handleUpdateDeadline =
    async () => {
      if (
        !selectedProject ||
        !canManageProjects
      ) {
        return;
      }

      if (
        selectedProject.startDate &&
        editDeadline &&
        editDeadline <
          selectedProject.startDate
      ) {
        setEditDateError(
          "Deadline must be greater than or equal to the start date."
        );
        return;
      }

      try {
        setSavingDeadline(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE}/api/projects/${selectedProject.id}/deadline`,
            {
              method: "PATCH",
              headers:
                getAuthHeaders(),

              body: JSON.stringify({
                deadline:
                  editDeadline ||
                  null,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to update deadline."
          );
        }

        setDeadlineModalOpen(false);
        setSelectedProject(null);

        await fetchProjects();
      } catch (error: any) {
        setError(
          error.message ||
            "Unable to update deadline."
        );
      } finally {
        setSavingDeadline(false);
      }
    };

  /* =========================================================
     DELETE
  ========================================================= */

  const openDeleteProject = (
    project: Project
  ) => {
    if (!canManageProjects)
      return;

    setSelectedProject(project);
    setOpenProjectMenu(null);
    setDeleteModalOpen(true);
  };

  const handleDeleteProject =
    async () => {
      if (
        !selectedProject ||
        !canManageProjects
      ) {
        return;
      }

      try {
        setDeletingProject(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE}/api/projects/${selectedProject.id}`,
            {
              method: "DELETE",
              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to delete project."
          );
        }

        setDeleteModalOpen(false);
        setSelectedProject(null);

        await fetchProjects();
      } catch (error: any) {
        setError(
          error.message ||
            "Unable to delete project."
        );
      } finally {
        setDeletingProject(false);
      }
    };

  /* =========================================================
     VIEW PROJECT
  ========================================================= */

  const openViewProject = (
    project: Project
  ) => {
    setSelectedProject(project);
    setOpenProjectMenu(null);
    setViewModalOpen(true);
  };

  /* =========================================================
     STATUS MODAL
  ========================================================= */

const openStatusModal = (project: Project) => {
  setSelectedProject(project);
  setSelectedNewStatus(project.status === "Done" ? "Done" : "Backlog");
  setStatusError("");
  setOpenProjectMenu(null);
  setStatusModalOpen(true);
};

  /* =========================================================
     CHANGE PROJECT STATUS
  ========================================================= */

  const handleChangeProjectStatus =
    async () => {
      if (
        !selectedProject ||
        !canManageProjects
      ) {
        return;
      }

      setStatusError("");

      /*
       * Done validation:
       *
       * Every task must be Done.
       * A project with zero tasks cannot
       * be marked Done.
       */
      if (
        selectedNewStatus === "Done"
      ) {
        const totalTasks =
          selectedProject.tasks.length;

        const completedTasks =
          selectedProject.tasks.filter(
            (task) =>
              String(
                task.status
              ).toLowerCase() ===
              "done"
          ).length;

        if (
          totalTasks === 0
        ) {
          setStatusError(
            "This project cannot be marked Done because it has no tasks."
          );
          return;
        }

        if (
          completedTasks !==
          totalTasks
        ) {
          setStatusError(
            `Project cannot be marked Done. ${completedTasks} of ${totalTasks} tasks are completed. All tasks must be Done first.`
          );
          return;
        }
      }

      try {
        setSavingStatus(true);

        const response =
          await fetch(
            `${API_BASE}/api/projects/${selectedProject.id}/status`,
            {
              method: "PATCH",
              headers:
                getAuthHeaders(),

              body: JSON.stringify({
                status:
                  selectedNewStatus,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to update project status."
          );
        }

        setStatusModalOpen(false);
        setSelectedProject(null);

        await fetchProjects();
      } catch (error: any) {
        setStatusError(
          error.message ||
            "Unable to update project status."
        );
      } finally {
        setSavingStatus(false);
      }
    };

  /* =========================================================
     ROLE LABEL
  ========================================================= */

  const roleDescription =
    isExecutiveManager
      ? "Full project management and assignment access."
      : isSystemAdministrator
      ? "Project administration and assignment access."
      : isProjectManager
      ? "Showing projects assigned to you."
      : isMember
      ? "Showing projects containing your assigned tasks."
      : "Project access.";

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <>
      <main className="min-h-[calc(100vh-72px)] bg-[#fafafa] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1440px]">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-[28px] font-semibold tracking-[-0.8px] text-gray-900 sm:text-[32px]">
                  Projects
                </h1>

                {currentUser && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600">
                    <ShieldCheck size={12} />
                    {currentUser.role}
                  </span>
                )}

              </div>

              <p className="mt-1 text-sm text-gray-500">
                Manage projects, tasks, progress and assignments.
              </p>

              {currentUser && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {roleDescription}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              {canCreateProjects && (
                <button
                  type="button"
                  onClick={() =>
                    setModalOpen(true)
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#111c2c]"
                >
                  <Plus size={17} />
                  Add project
                </button>
              )}

            </div>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div>
                <p className="font-semibold">
                  Something went wrong
                </p>

                <p className="mt-0.5 text-xs">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* =================================================
              TABS + SEARCH
          ================================================= */}

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div className="flex items-center gap-7">

              <button
                type="button"
                onClick={() =>
                  setActiveView("table")
                }
                className={`relative pb-3 text-sm font-medium ${
                  activeView === "table"
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Table View

                {activeView === "table" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                )}
              </button>

              {canAccessAssignmentBoard && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveView(
                      "assignment"
                    )
                  }
                  className={`relative pb-3 text-sm font-medium ${
                    activeView ===
                    "assignment"
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Assignment Board

                  {activeView ===
                    "assignment" && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                  )}
                </button>
              )}

            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

              <div className="relative w-full sm:w-[320px]">

                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search for projects"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setFilterOpen(
                      !filterOpen
                    )
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                >
                  <SlidersHorizontal size={16} />
                  Filters

                  <ChevronDown
                    size={14}
                    className={
                      filterOpen
                        ? "rotate-180"
                        : ""
                    }
                  />
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">

                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Project Status
                    </p>

                    {[
                      "All",
                      "Unassigned",
                      "Backlog",
                      "In Progress",
                      "Paused",
                      "Done",
                    ].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(
                            status as
                              | ProjectStatus
                              | "All"
                          );

                          setFilterOpen(
                            false
                          );
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                          selectedStatus ===
                          status
                            ? "bg-gray-100 font-medium text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}

                  </div>
                )}

              </div>
            </div>
          </div>

          {/* =================================================
              TABLE / CARD VIEW
          ================================================= */}

          {activeView === "table" && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">

              {/* CARD HEADER */}

              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {isMember
                      ? "My Project Tasks"
                      : isProjectManager
                      ? "My Projects"
                      : "All Projects"}
                  </h2>

                  <p className="mt-1 text-[11px] text-gray-400">
                    {filteredProjects.length}{" "}
                    project
                    {filteredProjects.length !==
                    1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">

                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-medium text-gray-500">
                    {filteredProjects.reduce(
                      (sum, project) =>
                        sum +
                        project.totalTasks,
                      0
                    )}{" "}
                    tasks
                  </span>

                  {canManageProjects && (
                    <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-medium text-gray-500 sm:inline-flex">
                      Management access
                    </span>
                  )}

                </div>
              </div>

              {/* LOADING */}

              {loading ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center">
                  <RefreshCw
                    size={24}
                    className="animate-spin text-gray-400"
                  />

                  <p className="mt-3 text-sm font-medium text-gray-600">
                    Loading projects...
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Fetching projects and tasks from PostgreSQL
                  </p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="px-6 py-20 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <FolderEmptyIcon />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    No projects found
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                    {isMember
                      ? "You do not have any projects with tasks assigned to you."
                      : isProjectManager
                      ? "No projects are currently assigned to you."
                      : projects.length ===
                        0
                      ? canCreateProjects
                        ? "Create a project to get started."
                        : "No projects have been created yet."
                      : "Try changing your search or filter."}
                  </p>

                </div>
              ) : (
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2 xl:grid-cols-3">

                  {filteredProjects.map(
                    (
                      project,
                      index
                    ) => {
                      const manager =
                        project.managerId
                          ? projectManagers.find(
                              (item) =>
                                item.id ===
                                project.managerId
                            )
                          : undefined;

                      const allTasksDone =
                        project.totalTasks >
                          0 &&
                        project.completedTasks ===
                          project.totalTasks;

                      return (
                        <div
                          key={
                            project.id
                          }
                          className="group relative overflow-visible rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]"
                        >

                          {/* TOP */}

                          <div className="flex items-start gap-3">

                            <ProjectLogo
                              index={
                                index
                              }
                            />

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0 pr-5">

                                  <h3 className="truncate text-sm font-semibold text-gray-900">
                                    {
                                      project.name
                                    }
                                  </h3>

                                  <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                    {
                                      project.domain
                                    }
                                  </p>

                                </div>

                                {/* THREE DOTS */}

                                <div className="absolute right-3 top-3">

                                  <button
                                    type="button"
                                    onClick={(
                                      e
                                    ) => {
                                      e.stopPropagation();

                                      setOpenProjectMenu(
                                        openProjectMenu ===
                                          project.id
                                          ? null
                                          : project.id
                                      );
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <MoreVertical
                                      size={
                                        17
                                      }
                                    />
                                  </button>

                                  {openProjectMenu ===
                                    project.id && (
                                    <div
                                      className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                                      onClick={(
                                        e
                                      ) =>
                                        e.stopPropagation()
                                      }
                                    >

                                      {/* MANAGEMENT OPTIONS */}

                                      {canManageProjects && (
  <>
    <button
      type="button"
      onClick={() =>
        openEditProject(project)
      }
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
      <Edit3
        size={16}
        className="text-gray-500"
      />
      Update Project
    </button>

    <button
      type="button"
      onClick={() =>
        openDeadlineModal(project)
      }
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
      <Calendar
        size={16}
        className="text-gray-500"
      />
      Update Deadline
    </button>
  </>
)}

{/* PROJECT MANAGER STATUS OPTION */}

{isProjectManager && (
  <>
    <button
      type="button"
      onClick={() => {
        openStatusModal(project);
        setOpenProjectMenu(null);
      }}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
    >
      <CheckCircle2
        size={16}
        className="text-gray-500"
      />
      Change Status
    </button>

    <div className="my-1 border-t border-gray-100" />
  </>
)}

                                      {/* EVERY ROLE CAN VIEW */}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openViewProject(
                                            project
                                          )
                                        }
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <Eye
                                          size={
                                            16
                                          }
                                          className="text-gray-500"
                                        />
                                        View Project
                                      </button>

                                      {/* DELETE */}

                                      {canManageProjects && (
                                        <>
                                          <div className="my-1 border-t border-gray-100" />

                                          <button
                                            type="button"
                                            onClick={() =>
                                              openDeleteProject(
                                                project
                                              )
                                            }
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2
                                              size={
                                                16
                                              }
                                            />
                                            Delete Project
                                          </button>
                                        </>
                                      )}

                                    </div>
                                  )}

                                </div>

                              </div>

                            </div>
                          </div>

                          {/* OBJECTIVE */}

                          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">

                            <p className="text-xs font-semibold text-gray-800">
                              {
                                project.aboutTitle
                              }
                            </p>

                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                              {project.aboutDescription ||
                                "No project description provided."}
                            </p>

                          </div>

                          {/* STATUS / PRIORITY */}

                          <div className="mt-4 flex flex-wrap items-center gap-2">

                            <span
                              className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-medium ${
                                statusStyles[
                                  project.status
                                ]
                              }`}
                            >
                              {
                                project.status
                              }
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-500">
                              <Flag
                                size={
                                  10
                                }
                              />
                              {project.priority ||
                                "Medium"}
                            </span>

                            {allTasksDone && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-600">
                                <CheckCircle2
                                  size={
                                    10
                                  }
                                />
                                All tasks done
                              </span>
                            )}

                          </div>

                          {/* MANAGER */}

                          <div className="mt-4 flex items-center justify-between">

                            <div className="flex min-w-0 items-center gap-2">

                              {manager ? (
                                <>
                                  <ManagerAvatar
                                    manager={
                                      manager
                                    }
                                    small
                                  />

                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-semibold text-gray-700">
                                      {
                                        project.managerName ||
                                        manager.name
                                      }
                                    </p>

                                    <p className="text-[9px] text-gray-400">
                                      Project Manager
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                                    <User
                                      size={
                                        14
                                      }
                                    />
                                  </div>

                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-600">
                                      Unassigned
                                    </p>

                                    <p className="text-[9px] text-gray-400">
                                      No manager
                                    </p>
                                  </div>
                                </div>
                              )}

                            </div>

                            <div className="text-right">
                              <p className="text-[10px] text-gray-400">
                                Tasks
                              </p>

                              <p className="text-xs font-semibold text-gray-700">
                                {
                                  project.completedTasks
                                }
                                /
                                {
                                  project.totalTasks
                                }
                              </p>
                            </div>

                          </div>

                          {/* PROGRESS */}

                          <div className="mt-4">
                            <ProgressBar
                              progress={
                                project.progress
                              }
                            />
                          </div>

                          {/* DATES */}

                          <div className="mt-4 grid grid-cols-2 gap-2">

                            <div className="rounded-lg border border-gray-100 bg-white p-2.5">

                              <div className="flex items-center gap-1.5">
                                <Calendar
                                  size={
                                    12
                                  }
                                  className="text-gray-400"
                                />

                                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                  Start
                                </span>
                              </div>

                              <p className="mt-1 text-[10px] font-medium text-gray-700">
                                {project.startDate ||
                                  "Not set"}
                              </p>

                            </div>

                            <div className="rounded-lg border border-gray-100 bg-white p-2.5">

                              <div className="flex items-center gap-1.5">
                                <Calendar
                                  size={
                                    12
                                  }
                                  className="text-gray-400"
                                />

                                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                  Deadline
                                </span>
                              </div>

                              <p className="mt-1 text-[10px] font-medium text-gray-700">
                                {project.deadline ||
                                  "Not set"}
                              </p>

                            </div>

                          </div>

                          {/* DARK DETAILS BUTTON */}

                          <button
                            type="button"
                            onClick={() =>
                              openViewProject(
                                project
                              )
                            }
                            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#07111f] text-xs font-medium text-white transition hover:bg-[#111c2c]"
                          >
                            <Eye
                              size={
                                14
                              }
                            />
                            View Project Details
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

              {/* FOOTER */}

              {!loading &&
                filteredProjects.length >
                  0 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">

                    <p className="text-xs text-gray-500">
                      Showing{" "}
                      {
                        filteredProjects.length
                      }{" "}
                      of{" "}
                      {
                        filteredProjects.length
                      }{" "}
                      projects
                    </p>

                    <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] text-gray-500">
                      <ListTodo
                        size={
                          12
                        }
                      />

                      Tasks calculated from project tasks
                    </div>

                  </div>
                )}

            </div>
          )}

          {/* =================================================
              ASSIGNMENT BOARD
          ================================================= */}

          {activeView ===
            "assignment" &&
            canAccessAssignmentBoard && (
              <div className="mt-6">

                <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#07111f] text-white">
                          <UserPlus
                            size={
                              17
                            }
                          />
                        </div>

                        <h2 className="text-sm font-semibold text-gray-900">
                          Project Assignment
                        </h2>

                      </div>

                      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">
                        Assign projects to Project Managers by dragging an unassigned project onto a manager, or use manual assignment.
                      </p>

                    </div>

                    <div className="rounded-lg bg-violet-50 px-3 py-2">

                      <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                        Awaiting assignment
                      </p>

                      <p className="mt-0.5 text-lg font-semibold text-violet-700">
                        {
                          unassignedProjects.length
                        }
                      </p>

                    </div>

                  </div>

                </div>

                <div className="mt-5 overflow-x-auto pb-4">

                  <div className="grid min-w-[1150px] grid-cols-[360px_minmax(750px,1fr)] gap-5">

                    {/* UNASSIGNED */}

                    <div className="rounded-xl border border-gray-200 bg-white">

                      <div className="border-b border-gray-100 px-5 py-4">

                        <div className="flex items-center justify-between">

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              Unassigned Projects
                            </h3>

                            <p className="mt-1 text-[11px] text-gray-400">
                              Drag a project to a manager
                            </p>
                          </div>

                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">
                            {
                              unassignedProjects.length
                            }
                          </span>

                        </div>

                      </div>

                      <div className="max-h-[650px] space-y-3 overflow-y-auto p-4">

                        {unassignedProjects.length >
                        0 ? (
                          unassignedProjects.map(
                            (
                              project,
                              index
                            ) => (
                              <div
                                key={
                                  project.id
                                }
                                draggable
                                onDragStart={(
                                  e
                                ) =>
                                  handleDragStart(
                                    e,
                                    project.id
                                  )
                                }
                                onDragEnd={() =>
                                  stopDragAutoScroll()
                                }
                                onDrag={(
                                  e
                                ) =>
                                  handleDragAutoScroll(
                                    e
                                  )
                                }
                                className="group cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md active:cursor-grabbing"
                              >

                                <div className="flex items-start gap-3">

                                  <div className="mt-1 shrink-0 text-gray-300 group-hover:text-gray-500">
                                    <GripVertical
                                      size={
                                        17
                                      }
                                    />
                                  </div>

                                  <ProjectLogo
                                    index={
                                      index
                                    }
                                  />

                                  <div className="min-w-0 flex-1">

                                    <div className="flex items-start justify-between gap-2">

                                      <div className="min-w-0">

                                        <p className="truncate text-sm font-semibold text-gray-900">
                                          {
                                            project.name
                                          }
                                        </p>

                                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                          {
                                            project.domain
                                          }
                                        </p>

                                      </div>

                                      <span className="shrink-0 rounded-md bg-violet-50 px-2 py-1 text-[9px] font-medium text-violet-600">
                                        New
                                      </span>

                                    </div>

                                    <p className="mt-3 text-xs font-medium text-gray-700">
                                      {
                                        project.aboutTitle
                                      }
                                    </p>

                                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
                                      {
                                        project.aboutDescription
                                      }
                                    </p>

                                    <div className="mt-3">
                                      <ProgressBar
                                        progress={
                                          project.progress
                                        }
                                      />
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">

                                      <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <GripVertical
                                          size={
                                            12
                                          }
                                        />
                                        Drag to assign
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openManualAssign(
                                            project.id
                                          )
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                                      >
                                        <UserPlus
                                          size={
                                            12
                                          }
                                        />
                                        Assign manually
                                      </button>

                                    </div>

                                  </div>

                                </div>

                              </div>
                            )
                          )
                        ) : (
                          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-5 text-center">

                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                              <Check
                                size={
                                  21
                                }
                              />
                            </div>

                            <p className="mt-4 text-sm font-semibold text-gray-800">
                              All projects assigned
                            </p>

                            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-gray-400">
                              There are currently no projects waiting for a project manager.
                            </p>

                          </div>
                        )}

                      </div>
                    </div>

                    {/* MANAGERS */}

                    <div className="min-w-0">

                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Project Managers
                        </h3>

                        <p className="mt-1 text-[11px] text-gray-400">
                          Drop projects onto a manager to assign them.
                        </p>
                      </div>

                      {loadingManagers ? (
                        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-white">

                          <div className="text-center">

                            <RefreshCw
                              size={
                                22
                              }
                              className="mx-auto animate-spin text-gray-400"
                            />

                            <p className="mt-3 text-xs text-gray-500">
                              Loading project managers...
                            </p>

                          </div>

                        </div>
                      ) : projectManagers.length ===
                        0 ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center">

                          <Users
                            size={
                              25
                            }
                            className="text-gray-300"
                          />

                          <p className="mt-3 text-sm font-semibold text-gray-700">
                            No project managers found
                          </p>

                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">

                          {projectManagers.map(
                            (
                              manager
                            ) => {
                              const managerProjects =
                                filteredProjects.filter(
                                  (
                                    project
                                  ) =>
                                    project.managerId ===
                                    manager.id
                                );

                              const isDragOver =
                                dragOverManagerId ===
                                manager.id;

                              return (
                                <div
                                  key={
                                    manager.id
                                  }
                                  onDragOver={(
                                    e
                                  ) => {
                                    e.preventDefault();

                                    e.dataTransfer.dropEffect =
                                      "move";

                                    setDragOverManagerId(
                                      manager.id
                                    );
                                  }}
                                  onDragLeave={() =>
                                    setDragOverManagerId(
                                      null
                                    )
                                  }
                                  onDrop={(
                                    e
                                  ) =>
                                    handleDropOnManager(
                                      e,
                                      manager.id
                                    )
                                  }
                                  className={`min-h-[280px] rounded-xl border-2 bg-[#f7f7f8] p-3 transition ${
                                    isDragOver
                                      ? "border-gray-900 bg-gray-50"
                                      : "border-gray-200"
                                  }`}
                                >

                                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

                                    <div className="flex items-center justify-between">

                                      <div className="flex min-w-0 items-center gap-3">

                                        <ManagerAvatar
                                          manager={
                                            manager
                                          }
                                        />

                                        <div className="min-w-0">

                                          <p className="truncate text-sm font-semibold text-gray-900">
                                            {
                                              manager.name
                                            }
                                          </p>

                                          <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                            {
                                              manager.role
                                            }
                                          </p>

                                        </div>

                                      </div>

                                      <div className="shrink-0 text-right">

                                        <p className="text-lg font-semibold text-gray-900">
                                          {
                                            managerProjects.length
                                          }
                                        </p>

                                        <p className="text-[9px] uppercase tracking-wide text-gray-400">
                                          Projects
                                        </p>

                                      </div>

                                    </div>

                                  </div>

                                  <div className="mt-3 space-y-3">

                                    {managerProjects.length >
                                    0 ? (
                                      managerProjects.map(
                                        (
                                          project,
                                          index
                                        ) => (
                                          <div
                                            key={
                                              project.id
                                            }
                                            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                                          >

                                            <div className="flex items-center gap-2.5">

                                              <ProjectLogo
                                                index={
                                                  index
                                                }
                                              />

                                              <div className="min-w-0 flex-1">

                                                <p className="truncate text-xs font-semibold text-gray-900">
                                                  {
                                                    project.name
                                                  }
                                                </p>

                                                <p className="truncate text-[10px] text-gray-400">
                                                  {
                                                    project.aboutTitle
                                                  }
                                                </p>

                                              </div>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleUnassignProject(
                                                    project.id
                                                  )
                                                }
                                                disabled={
                                                  assigningProject
                                                }
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                                              >
                                                <X
                                                  size={
                                                    14
                                                  }
                                                />
                                              </button>

                                            </div>

                                            <div className="mt-3">
                                              <ProgressBar
                                                progress={
                                                  project.progress
                                                }
                                              />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">

                                              <span
                                                className={`inline-flex rounded-md px-2 py-1 text-[9px] font-medium ${
                                                  statusStyles[
                                                    project.status
                                                  ]
                                                }`}
                                              >
                                                {
                                                  project.status
                                                }
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  openManualAssign(
                                                    project.id
                                                  )
                                                }
                                                className="text-[10px] font-medium text-gray-500 hover:text-gray-900"
                                              >
                                                Reassign
                                              </button>

                                            </div>

                                          </div>
                                        )
                                      )
                                    ) : (
                                      <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 text-center">

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                          <User
                                            size={
                                              17
                                            }
                                          />
                                        </div>

                                        <p className="mt-2 text-xs font-medium text-gray-500">
                                          Drop project here
                                        </p>

                                        <p className="mt-1 text-[10px] text-gray-400">
                                          Projects assigned to{" "}
                                          {
                                            manager.name.split(
                                              " "
                                            )[0]
                                          }{" "}
                                          appear here.
                                        </p>

                                      </div>
                                    )}

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>
                      )}

                    </div>

                  </div>

                </div>

              </div>
            )}

        </div>
      </main>

      {/* =====================================================
          CREATE PROJECT MODAL
      ===================================================== */}

      {modalOpen &&
        canCreateProjects && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">

            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div>

                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <Plus
                      size={
                        19
                      }
                    />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Create a new project
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Add the essential details to create your project.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X
                    size={
                      19
                    }
                  />
                </button>

              </div>

              <div className="overflow-y-auto px-6 py-6">

                <div className="grid gap-5 sm:grid-cols-2">

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project name *
                    </label>

                    <input
                      value={
                        projectName
                      }
                      onChange={(e) =>
                        setProjectName(
                          e.target.value
                        )
                      }
                      placeholder="e.g. ARG Intelligence Platform"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project domain
                    </label>

                    <input
                      value={
                        projectDomain
                      }
                      onChange={(e) =>
                        setProjectDomain(
                          e.target.value
                        )
                      }
                      placeholder="e.g. arg.com"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Priority
                    </label>

                    <select
                      value={
                        priority
                      }
                      onChange={(e) =>
                        setPriority(
                          e.target.value as ProjectPriority
                        )
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                    >
                      <option value="Low">
                        Low
                      </option>

                      <option value="Medium">
                        Medium
                      </option>

                      <option value="High">
                        High
                      </option>
                    </select>

                  </div>

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project objective
                    </label>

                    <input
                      value={
                        aboutTitle
                      }
                      onChange={(e) =>
                        setAboutTitle(
                          e.target.value
                        )
                      }
                      placeholder="e.g. Build internal project management system"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                    />

                  </div>

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Description
                    </label>

                    <textarea
                      value={
                        aboutDescription
                      }
                      onChange={(e) =>
                        setAboutDescription(
                          e.target.value
                        )
                      }
                      placeholder="Describe what this project is about..."
                      rows={4}
                      className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Start date
                    </label>

                    <input
                      type="date"
                      value={
                        startDate
                      }
                      min={
                        getTodayDate()
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value;

                        setDateError("");

                        if (
                          deadline &&
                          value &&
                          deadline <
                            value
                        ) {
                          setDeadline(
                            ""
                          );
                        }

                        setStartDate(
                          value
                        );
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Deadline
                    </label>

                    <input
                      type="date"
                      value={
                        deadline
                      }
                      min={
                        startDate ||
                        getTodayDate()
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value;

                        setDateError("");

                        if (
                          startDate &&
                          value <
                            startDate
                        ) {
                          setDateError(
                            "Deadline must be greater than or equal to the start date."
                          );

                          return;
                        }

                        setDeadline(
                          value
                        );
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                </div>

                {dateError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-red-600">
                      {dateError}
                    </p>
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/60 p-4">

                  <div className="flex gap-3">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                      <Users
                        size={
                          15
                        }
                      />
                    </div>

                    <div>

                      <p className="text-xs font-semibold text-gray-800">
                        Project manager assignment
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                        New projects start as Unassigned. Executive Managers and System Administrators can assign the project from the Assignment Board.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveProject
                  }
                  disabled={
                    !projectName.trim() ||
                    savingProject
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingProject ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={
                          15
                        }
                      />
                      Save project
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          EDIT PROJECT MODAL
      ===================================================== */}

      {editModalOpen &&
        canManageProjects &&
        selectedProject && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">

            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div>

                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <Edit3
                      size={
                        18
                      }
                    />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Update project
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Update project information and dates.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X
                    size={
                      19
                    }
                  />
                </button>

              </div>

              <div className="overflow-y-auto px-6 py-6">

                <div className="grid gap-5 sm:grid-cols-2">

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project name *
                    </label>

                    <input
                      value={
                        editProjectName
                      }
                      onChange={(e) =>
                        setEditProjectName(
                          e.target.value
                        )
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project domain
                    </label>

                    <input
                      value={
                        editProjectDomain
                      }
                      onChange={(e) =>
                        setEditProjectDomain(
                          e.target.value
                        )
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Priority
                    </label>

                    <select
                      value={
                        editPriority
                      }
                      onChange={(e) =>
                        setEditPriority(
                          e.target.value as ProjectPriority
                        )
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                    >
                      <option value="Low">
                        Low
                      </option>
                      <option value="Medium">
                        Medium
                      </option>
                      <option value="High">
                        High
                      </option>
                    </select>

                  </div>

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Project objective
                    </label>

                    <input
                      value={
                        editAboutTitle
                      }
                      onChange={(e) =>
                        setEditAboutTitle(
                          e.target.value
                        )
                      }
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Description
                    </label>

                    <textarea
                      value={
                        editAboutDescription
                      }
                      onChange={(e) =>
                        setEditAboutDescription(
                          e.target.value
                        )
                      }
                      rows={4}
                      className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Start date
                    </label>

                    <input
                      type="date"
                      value={
                        editStartDate
                      }
                      onChange={(e) => {
                        const value =
                          e.target.value;

                        if (
                          editDeadline &&
                          value &&
                          editDeadline <
                            value
                        ) {
                          setEditDeadline(
                            ""
                          );
                        }

                        setEditStartDate(
                          value
                        );

                        setEditDateError(
                          ""
                        );
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Deadline
                    </label>

                    <input
                      type="date"
                      value={
                        editDeadline
                      }
                      min={
                        editStartDate ||
                        undefined
                      }
                      onChange={(e) => {
                        setEditDeadline(
                          e.target.value
                        );

                        setEditDateError(
                          ""
                        );
                      }}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                    />

                  </div>

                </div>

                {editDateError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-red-600">
                      {editDateError}
                    </p>
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">

                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleUpdateProject
                  }
                  disabled={
                    !editProjectName.trim() ||
                    savingEdit
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check
                        size={
                          15
                        }
                      />
                      Update project
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          DEADLINE MODAL
      ===================================================== */}

      {deadlineModalOpen &&
        canManageProjects &&
        selectedProject && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">

            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div>

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <Calendar
                      size={
                        18
                      }
                    />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Update deadline
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Update the deadline for{" "}
                    <span className="font-medium text-gray-700">
                      {
                        selectedProject.name
                      }
                    </span>
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeadlineModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>

              </div>

              <div className="px-6 py-6">

                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  Deadline
                </label>

                <input
                  type="date"
                  value={
                    editDeadline
                  }
                  min={
                    selectedProject.startDate ||
                    getTodayDate()
                  }
                  onChange={(e) => {
                    setEditDeadline(
                      e.target.value
                    );
                    setEditDateError(
                      ""
                    );
                  }}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-black outline-none focus:border-gray-500"
                />

                {editDateError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-red-600">
                      {editDateError}
                    </p>
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">

                <button
                  type="button"
                  onClick={() => {
                    setDeadlineModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleUpdateDeadline
                  }
                  disabled={
                    savingDeadline
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {savingDeadline ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check
                        size={
                          15
                        }
                      />
                      Update deadline
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          STATUS MODAL
      ===================================================== */}

      {statusModalOpen &&
        isProjectManager &&
        selectedProject && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">

            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div>

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <CheckCircle2
                      size={
                        18
                      }
                    />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Change project status
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Update the status for{" "}
                    <span className="font-semibold text-gray-700">
                      {
                        selectedProject.name
                      }
                    </span>
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStatusModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>

              </div>

              <div className="px-6 py-6">

                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNewStatus(
                        "Backlog"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedNewStatus ===
                      "Backlog"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center gap-2">

                      <Circle
                        size={
                          15
                        }
                        className="text-pink-500"
                      />

                      <span className="text-sm font-semibold text-gray-800">
                        Backlog
                      </span>

                    </div>

                    <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
                      Project is active but not completed.
                    </p>

                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNewStatus(
                        "Done"
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedNewStatus ===
                      "Done"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center gap-2">

                      <CheckCircle2
                        size={
                          15
                        }
                        className="text-emerald-500"
                      />

                      <span className="text-sm font-semibold text-gray-800">
                        Done
                      </span>

                    </div>

                    <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
                      All project tasks must be completed.
                    </p>

                  </button>

                </div>

                {/* TASK CHECK */}

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <ListTodo
                        size={
                          16
                        }
                        className="text-gray-400"
                      />

                      <span className="text-xs font-semibold text-gray-700">
                        Task completion
                      </span>

                    </div>

                    <span className="text-xs font-semibold text-gray-800">
                      {
                        selectedProject.completedTasks
                      }
                      /
                      {
                        selectedProject.totalTasks
                      }
                    </span>

                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      progress={
                        selectedProject.progress
                      }
                    />
                  </div>

                </div>

                {selectedNewStatus ===
                  "Done" &&
                  selectedProject.completedTasks !==
                    selectedProject.totalTasks && (
                    <div className="mt-4 flex gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">

                      <AlertCircle
                        size={
                          17
                        }
                        className="mt-0.5 shrink-0 text-orange-500"
                      />

                      <p className="text-xs leading-relaxed text-orange-700">
                        The project cannot be marked Done until every task is completed.
                      </p>

                    </div>
                  )}

                {statusError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">

                    <p className="text-xs font-medium leading-relaxed text-red-700">
                      {statusError}
                    </p>

                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">

                <button
                  type="button"
                  onClick={() => {
                    setStatusModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleChangeProjectStatus
                  }
                  disabled={
                    savingStatus
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {savingStatus ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check
                        size={
                          15
                        }
                      />
                      Save status
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {deleteModalOpen &&
        canManageProjects &&
        selectedProject && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">

            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="px-6 py-6">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <Trash2
                    size={
                      21
                    }
                    className="text-red-600"
                  />
                </div>

                <h2 className="mt-5 text-lg font-semibold text-gray-900">
                  Delete project?
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-gray-800">
                    {
                      selectedProject.name
                    }
                  </span>
                  ?
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
                    setDeleteModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  disabled={
                    deletingProject
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteProject
                  }
                  disabled={
                    deletingProject
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingProject ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2
                        size={
                          15
                        }
                      />
                      Delete Project
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          VIEW PROJECT DETAILS
      ===================================================== */}

      {viewModalOpen &&
        selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]">

            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div className="flex min-w-0 items-center gap-3">

                  <ProjectLogo
                    index={Math.max(
                      0,
                      projects.findIndex(
                        (p) =>
                          p.id ===
                          selectedProject.id
                      )
                    )}
                  />

                  <div className="min-w-0">

                    <h2 className="truncate text-lg font-semibold text-gray-900">
                      {
                        selectedProject.name
                      }
                    </h2>

                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {
                        selectedProject.domain
                      }
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X
                    size={
                      19
                    }
                  />
                </button>

              </div>

              {/* BODY */}

              <div className="overflow-y-auto px-6 py-6">

                {/* TOP STATS */}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Status
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-[10px] font-medium ${
                        statusStyles[
                          selectedProject.status
                        ]
                      }`}
                    >
                      {
                        selectedProject.status
                      }
                    </span>

                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Priority
                    </p>

                    <div className="mt-2 flex items-center gap-2">

                      <Flag
                        size={
                          13
                        }
                        className="text-gray-400"
                      />

                      <p className="text-sm font-semibold text-gray-800">
                        {
                          selectedProject.priority
                        }
                      </p>

                    </div>

                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Tasks
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      {
                        selectedProject.completedTasks
                      }
                      /
                      {
                        selectedProject.totalTasks
                      }{" "}
                      completed
                    </p>

                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Progress
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      {
                        selectedProject.progress
                      }
                      %
                    </p>

                  </div>

                </div>

                {/* PROJECT INFORMATION */}

                <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <p className="text-xs font-semibold text-gray-800">
                        {
                          selectedProject.aboutTitle
                        }
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        {selectedProject.aboutDescription ||
                          "No project description provided."}
                      </p>

                    </div>

                  </div>

                </div>

                {/* PROGRESS */}

                <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">

                  <div className="mb-3 flex items-center justify-between">

                    <div>
                      <p className="text-xs font-semibold text-gray-800">
                        Project Progress
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        Calculated from completed project tasks
                      </p>
                    </div>

                    <span className="text-lg font-semibold text-gray-900">
                      {
                        selectedProject.progress
                      }
                      %
                    </span>

                  </div>

                  <ProgressBar
                    progress={
                      selectedProject.progress
                    }
                    large
                  />

                  <div className="mt-3 flex justify-between text-[10px] text-gray-400">

                    <span>
                      {
                        selectedProject.completedTasks
                      }{" "}
                      completed
                    </span>

                    <span>
                      {
                        selectedProject.totalTasks
                      }{" "}
                      total tasks
                    </span>

                  </div>

                </div>

                {/* DATE + MANAGER */}

                <div className="mt-5 grid gap-4 sm:grid-cols-3">

                  <div className="rounded-xl border border-gray-200 p-4">

                    <div className="flex items-center gap-2">
                      <Calendar
                        size={
                          15
                        }
                        className="text-gray-400"
                      />

                      <p className="text-xs font-semibold text-gray-700">
                        Start Date
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {
                        selectedProject.startDate ||
                        "No start date"
                      }
                    </p>

                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">

                    <div className="flex items-center gap-2">
                      <Calendar
                        size={
                          15
                        }
                        className="text-gray-400"
                      />

                      <p className="text-xs font-semibold text-gray-700">
                        Deadline
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {
                        selectedProject.deadline ||
                        "No deadline"
                      }
                    </p>

                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">

                    <div className="flex items-center gap-2">
                      <Users
                        size={
                          15
                        }
                        className="text-gray-400"
                      />

                      <p className="text-xs font-semibold text-gray-700">
                        Project Manager
                      </p>
                    </div>

                    <p className="mt-2 truncate text-sm text-gray-500">
                      {
                        selectedProject.managerName ||
                        "Unassigned"
                      }
                    </p>

                  </div>

                </div>

                {/* TASKS */}

                <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">

                  <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <ListTodo
                          size={
                            16
                          }
                          className="text-gray-500"
                        />

                        <h3 className="text-sm font-semibold text-gray-900">
                          Project Tasks
                        </h3>

                      </div>

                      <p className="mt-1 text-[10px] text-gray-400">
                        Tasks, assignees and completion status
                      </p>

                    </div>

                    <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-medium text-gray-500">
                      {
                        selectedProject.totalTasks
                      }{" "}
                      tasks
                    </span>

                  </div>

                  {selectedProject.tasks.length ===
                  0 ? (
                    <div className="px-5 py-12 text-center">

                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <ListTodo
                          size={
                            20
                          }
                          className="text-gray-400"
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-gray-700">
                        No tasks yet
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Tasks created for this project will appear here.
                      </p>

                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {selectedProject.tasks.map(
                        (
                          task,
                          index
                        ) => (
                          <div
                            key={
                              task.id
                            }
                            className="p-4 transition hover:bg-gray-50/60 sm:px-5"
                          >

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                              <div className="flex min-w-0 flex-1 items-start gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-semibold text-gray-500">
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </div>

                                <div className="min-w-0">

                                  <p className="text-xs font-semibold text-gray-800">
                                    {
                                      task.name
                                    }
                                  </p>

                                  {task.description && (
                                    <p className="mt-1 line-clamp-1 text-[10px] text-gray-400">
                                      {
                                        task.description
                                      }
                                    </p>
                                  )}

                                  <div className="mt-2 flex flex-wrap items-center gap-2">

                                    <TaskStatusBadge
                                      status={
                                        task.status
                                      }
                                    />

                                    {task.priority && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                        <Flag
                                          size={
                                            10
                                          }
                                        />
                                        {
                                          task.priority
                                        }
                                      </span>
                                    )}

                                    {task.dueDate && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                        <Calendar
                                          size={
                                            10
                                          }
                                        />
                                        {
                                          task.dueDate
                                        }
                                      </span>
                                    )}

                                  </div>

                                </div>

                              </div>

                              {/* ASSIGNEE */}

                              <div className="flex shrink-0 items-center gap-2 sm:w-[180px]">

                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">
                                  {task.assigneeName
                                    ? task.assigneeName
                                        .split(
                                          " "
                                        )
                                        .filter(
                                          Boolean
                                        )
                                        .slice(
                                          0,
                                          2
                                        )
                                        .map(
                                          (
                                            name
                                          ) =>
                                            name.charAt(
                                              0
                                            )
                                        )
                                        .join(
                                          ""
                                        )
                                        .toUpperCase()
                                    : "—"}
                                </div>

                                <div className="min-w-0">

                                  <p className="truncate text-[10px] font-medium text-gray-700">
                                    {task.assigneeName ||
                                      "Unassigned"}
                                  </p>

                                  <p className="text-[9px] text-gray-400">
                                    Assignee
                                  </p>

                                </div>

                              </div>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex justify-end border-t border-gray-100 bg-gray-50/70 px-6 py-4">

                <button
                  type="button"
                  onClick={() => {
                    setViewModalOpen(
                      false
                    );
                    setSelectedProject(
                      null
                    );
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          ASSIGN MODAL
      ===================================================== */}

      {assignModalOpen &&
        canAccessAssignmentBoard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">

            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">

                <div>

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white">
                    <UserPlus
                      size={
                        18
                      }
                    />
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900">
                    Assign project
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Select a Project Manager for this project.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAssignModalOpen(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>

              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto px-6 py-5">

                {projectManagers.map(
                  (manager) => {
                    const selected =
                      selectedManagerId ===
                      manager.id;

                    return (
                      <button
                        key={
                          manager.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedManagerId(
                            manager.id
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >

                        <ManagerAvatar
                          manager={
                            manager
                          }
                        />

                        <div className="flex-1">

                          <p className="text-sm font-semibold text-gray-900">
                            {
                              manager.name
                            }
                          </p>

                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {
                              manager.role
                            }
                          </p>

                        </div>

                        {selected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#07111f] text-white">
                            <Check
                              size={
                                13
                              }
                            />
                          </div>
                        )}

                      </button>
                    );
                  }
                )}

              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4">

                <button
                  type="button"
                  onClick={() =>
                    setAssignModalOpen(
                      false
                    )
                  }
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleManualAssign
                  }
                  disabled={
                    !selectedManagerId ||
                    assigningProject
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {assigningProject ? (
                    <>
                      <RefreshCw
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus
                        size={
                          15
                        }
                      />
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

/* =========================================================
   EMPTY PROJECT ICON
========================================================= */

function FolderEmptyIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
      <path d="M8 13h8" />
    </svg>
  );
}
