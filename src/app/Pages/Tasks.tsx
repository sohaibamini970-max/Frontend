"use client";

import { useEffect, useMemo, useState } from "react";
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
  Check,
  Circle,
  Clock3,
  ListTodo,
  FolderKanban,
  Trash2,
  Download,
  File,
  FileText,
} from "lucide-react";

type ProjectStatus =
  | "Unassigned"
  | "Backlog"
  | "In Progress"
  | "Paused"
  | "Done";

type ProjectPriority = "Low" | "Medium" | "High";

type TaskStatus = "To Do" | "In Progress" | "Done";

type TaskPriority = "Low" | "Medium" | "High";

type ProjectMember = {
  user_id: string;
  full_name: string;
};

type Project = {
  id: string;
  name: string;
  domain?: string;
  status?: ProjectStatus;
  about_title?: string;
  about_description?: string;
  progress?: number;
  members?: ProjectMember[];
  start_date?: string;
  deadline?: string;
  priority?: ProjectPriority;
};

type Task = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  assignee_name?: string;
  assignee_email?: string;
  start_date?: string;
  due_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

type User = {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
};

type TaskChallenge = {
  id: string;
  task_id: string;
  user_id: string;
  challenge: string;
  author_name?: string;
  author_email?: string;
  created_at?: string;
  updated_at?: string;
};

type Attachment = {
  id: string;
  task_id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  uploader_name?: string;
  created_at: string;
};

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}

function getCurrentUser() {
  if (typeof window === "undefined") return null;

  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

function formatDate(date?: string) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateOnly(date?: string) {
  if (!date) return "";

  // Handles:
  // 2026-09-10
  // 2026-09-10T00:00:00.000Z
  // 2026-09-10 00:00:00
  return date.substring(0, 10);
}

function normalizeProject(project: any): Project {
  return {
    id: String(project.id),
    name: project.name || project.project_name || "Untitled Project",
    domain: project.domain || "",
    status: project.status || "Unassigned",
    about_title: project.about_title || project.aboutTitle || "",
    about_description:
      project.about_description ||
      project.aboutDescription ||
      project.description ||
      "",
    progress: Number(project.progress || 0),
    members: project.members || [],
    start_date: getDateOnly(
    project.start_date || project.startDate || ""
    ),
    deadline:
      project.deadline ||
      project.due_date ||
      project.dueDate ||
      "",
    priority: project.priority || "Medium",
  };
}

function normalizeTask(task: any): Task {
  const taskId =
    task?.id ??
    task?.task_id ??
    task?._id ??
    "";

  const projectId =
    task?.project_id ??
    task?.projectId ??
    task?.project?.id ??
    task?.project?.project_id ??
    "";

  return {
    id: String(taskId),
    project_id: String(projectId),
    name:
      task?.name ??
      task?.title ??
      "Untitled Task",
    description: task?.description ?? "",
    status: task?.status ?? "To Do",
    priority: task?.priority ?? "Medium",
    assignee_id:
      task?.assignee_id ??
      task?.assigneeId ??
      task?.assignee?.id ??
      "",
    assignee_name:
      task?.assignee_name ??
      task?.assigneeName ??
      task?.assignee?.full_name ??
      task?.assignee?.fullName ??
      "",
    assignee_email:
      task?.assignee_email ??
      task?.assigneeEmail ??
      task?.assignee?.email ??
      "",
    start_date:
      task?.start_date ??
      task?.startDate ??
      "",
    due_date:
      task?.due_date ??
      task?.dueDate ??
      "",
    created_by:
      task?.created_by ??
      task?.createdBy ??
      "",
    created_at:
      task?.created_at ??
      task?.createdAt ??
      "",
    updated_at:
      task?.updated_at ??
      task?.updatedAt ??
      "",
  };
}

function ProjectLogo({ index }: { index: number }) {
  const logos = [
    "bg-blue-100 text-blue-700",
    "bg-sky-100 text-sky-700",
    "bg-orange-100 text-orange-600",
    "bg-purple-100 text-purple-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
  ];

  const symbols = ["P", "S", "E", "◆", "M", "Q"];

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${logos[index % logos.length]
        }`}
    >
      {symbols[index % symbols.length]}
    </div>
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<TaskStatus, string> = {
    "To Do": "border border-gray-400 bg-gray-100 text-gray-900",
    "In Progress": "border border-blue-300 bg-blue-100 text-blue-800",
    Done: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  };

  const icons: Record<TaskStatus, React.ReactNode> = {
    "To Do": <Circle size={10} />,
    "In Progress": <Clock3 size={10} />,
    Done: <Check size={10} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-bold ${styles[status]}`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    Low: "text-gray-700",
    Medium: "text-amber-800",
    High: "text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${styles[priority]}`}
    >
      <Flag size={11} />
      {priority}
    </span>
  );
}

function StatusSummary({ tasks }: { tasks: Task[] }) {
  const todo = tasks.filter((task) => task.status === "To Do").length;
  const progress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;
  const done = tasks.filter((task) => task.status === "Done").length;

  return (
    <div className="grid grid-cols-3 gap-2 border-t border-gray-300 pt-3">
      <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Circle size={11} className="text-gray-600" />
          <span className="text-[10px] font-bold text-gray-700">
            To Do
          </span>
        </div>
        <p className="mt-1 text-base font-bold text-gray-950">
          {todo}
        </p>
      </div>

      <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Clock3 size={11} className="text-blue-700" />
          <span className="text-[10px] font-bold text-blue-800">
            In Progress
          </span>
        </div>
        <p className="mt-1 text-base font-bold text-blue-900">
          {progress}
        </p>
      </div>

      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Check size={11} className="text-emerald-700" />
          <span className="text-[10px] font-bold text-emerald-800">
            Done
          </span>
        </div>
        <p className="mt-1 text-base font-bold text-emerald-900">
          {done}
        </p>
      </div>
    </div>
  );
}

export default function Tasks() {

// ✅ CORRECT - runs only on client
const [currentUser, setCurrentUser] = useState<any>(null);
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  setCurrentUser(user);

  setTaskAssignee(user?.id || "");
  
  const isAdminUser =
    user?.role === "System Administrator" ||
    user?.role === "Executive Manager" ||
    user?.role === "Project Manager";
  
  setIsAdmin(isAdminUser);
}, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<
    TaskStatus | "All"
  >("All");

  const [expandedProjects, setExpandedProjects] = useState<string[]>(
    []
  );

  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(
    null
  );

  const [openTaskMenu, setOpenTaskMenu] = useState<string | null>(
    null
  );

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<
    string | null
  >(null);

  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] =
    useState<TaskPriority>("Medium");
  const [taskStatus, setTaskStatus] =
    useState<TaskStatus>("To Do");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [challengeModalOpen, setChallengeModalOpen] =
  useState(false);

const [selectedChallengeTask, setSelectedChallengeTask] =
  useState<Task | null>(null);

const [challenges, setChallenges] =
  useState<TaskChallenge[]>([]);

const [challengeText, setChallengeText] =
  useState("");

const [loadingChallenges, setLoadingChallenges] =
  useState(false);

const [savingChallenge, setSavingChallenge] =
  useState(false);

const [deletingChallenge, setDeletingChallenge] =
  useState<string | null>(null);

const [challengeCounts, setChallengeCounts] =
  useState<Record<string, number>>({});

// ====================================
// FILE ATTACHMENT STATE
// ====================================
const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [uploadingAttachment, setUploadingAttachment] = useState(false);
const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
const [selectedTaskForAttachment, setSelectedTaskForAttachment] = useState<Task | null>(null);
const [previewModalOpen, setPreviewModalOpen] = useState(false);
const [selectedAttachmentForPreview, setSelectedAttachmentForPreview] = useState<Attachment | null>(null);
const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);
const [loadingAttachments, setLoadingAttachments] = useState(false);

  const isManagementRole =
  currentUser?.role === "System Administrator" ||
  currentUser?.role === "Executive Manager" ||
  currentUser?.role === "Project Manager";

  const isMember =
  currentUser?.role === "Member";

  const canWriteChallenge = (task: Task) => {
  return (
    isMember &&
    String(task.assignee_id || "") ===
      String(currentUser?.id || "")
  );
};

const canReadChallenge = (task: Task) => {
  return (
    isManagementRole ||
    (
      isMember &&
      String(task.assignee_id || "") ===
        String(currentUser?.id || "")
    )
  );
};

// ====================================
// FILE ATTACHMENT HELPERS
// ====================================
const canReadAttachments = (task: Task): boolean => {
  return (
    isManagementRole ||
    (String(task.assignee_id || "") === String(currentUser?.id || ""))
  );
};

const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return <FileText className="text-red-600" size={16} />;
    case "docx":
    case "doc":
      return <FileText className="text-blue-600" size={16} />;
    case "txt":
      return <FileText className="text-gray-600" size={16} />;
    default:
      return <File className="text-gray-600" size={16} />;
  }
};

  useEffect(() => {
    fetchProjectsAndTasks();
    fetchUsers();
  }, []);

  const fetchProjectsAndTasks = async () => {
    try {
      setLoading(true);

      const currentUser = getCurrentUser();

      if (!currentUser?.id) {
        throw new Error("User information not found. Please login again.");
      }

      const userRole = currentUser.role;

      const managementRoles = [
        "System Administrator",
        "Executive Manager",
        "Project Manager",
      ];

      const isManagementUser = managementRoles.includes(userRole);

      /*
       * ============================================================
       * MANAGEMENT
       * ============================================================
       *
       * Admin / Executive Manager / Project Manager:
       * See all projects and all tasks.
       */
      if (isManagementUser) {
        const projectResponse = await fetch(
          `${API_BASE}/projects`,
          {
            headers: authHeaders(),
          }
        );

        if (!projectResponse.ok) {
          throw new Error("Failed to fetch projects");
        }

        const projectData = await projectResponse.json();

        const rawProjects =
          projectData.projects ||
          projectData.data ||
          (Array.isArray(projectData)
            ? projectData
            : []);

        const normalizedProjects =
          rawProjects.map(normalizeProject);

        setProjects(normalizedProjects);

        const taskResponses = await Promise.all(
          normalizedProjects.map(async (project: Project) => {
            try {
              const response = await fetch(
                `${API_BASE}/tasks/project/${project.id}`,
                {
                  headers: authHeaders(),
                }
              );

              if (!response.ok) {
                return [];
              }

              const data = await response.json();

              const rawTasks =
                data.tasks ||
                data.data ||
                (Array.isArray(data)
                  ? data
                  : []);

              return rawTasks.map((task: any) =>
                normalizeTask({
                  ...task,
                  project_id:
                    task.project_id ||
                    task.projectId ||
                    project.id,
                })
              );
            } catch (error) {
              console.error(
                `Failed to load tasks for project ${project.id}`,
                error
              );

              return [];
            }
          })
        );

        const allTasks = taskResponses.flat();

        setTasks(allTasks);

        const projectsWithTasks =
          normalizedProjects
            .filter((project: Project) =>
              allTasks.some(
                (task) =>
                  String(task.project_id) ===
                  String(project.id)
              )
            )
            .map((project: Project) => project.id);

        setExpandedProjects(projectsWithTasks);

        return;
      }

      /*
       * ============================================================
       * MEMBER
       * ============================================================
       *
       * Member should NEVER load all projects.
       *
       * Only:
       *
       *     logged-in member
       *             ↓
       *       assigned tasks
       *             ↓
       *       related projects
       *
       * Example:
       *
       * Member Ahmed
       *   ├── Project A
       *   │     ├── Task 1
       *   │     └── Task 2
       *   └── Project B
       *         └── Task 3
       *
       * Tasks assigned to other users are removed.
       */
      const myTasksResponse = await fetch(
        `${API_BASE}/tasks/my/tasks`,
        {
          headers: authHeaders(),
        }
      );

      if (!myTasksResponse.ok) {
        const errorData =
          await myTasksResponse
            .json()
            .catch(() => ({}));

        throw new Error(
          errorData.message ||
          errorData.error ||
          "Failed to fetch your tasks"
        );
      }

      const myTasksData =
        await myTasksResponse.json();

      const rawMyTasks =
        myTasksData.tasks ||
        myTasksData.data ||
        (Array.isArray(myTasksData)
          ? myTasksData
          : []);

      /*
       * Normalize tasks first.
       */
      const normalizedMyTasks: Task[] =
        rawMyTasks
          .map((task: any) =>
            normalizeTask(task)
          )
          .filter(
            (task: Task) =>
              task.id &&
              task.project_id
          );

      /*
       * IMPORTANT:
       *
       * Even if backend accidentally returns extra tasks,
       * filter them here using the logged-in user's ID.
       */
      const myUserId = String(currentUser.id);

      const onlyMyTasks =
        normalizedMyTasks.filter((task) => {
          return (
            String(task.assignee_id || "") ===
            myUserId
          );
        });

      console.log(
        "Logged-in member:",
        currentUser
      );

      console.log(
        "Tasks returned by backend:",
        normalizedMyTasks
      );

      console.log(
        "Tasks assigned to current member:",
        onlyMyTasks
      );

      setTasks(onlyMyTasks);

      /*
       * ============================================================
       * GET ONLY PROJECTS BELONGING TO MEMBER'S TASKS
       * ============================================================
       */

      const projectIds = [
        ...new Set(
          onlyMyTasks.map((task) =>
            String(task.project_id)
          )
        ),
      ];

      if (projectIds.length === 0) {
        setProjects([]);
        setExpandedProjects([]);
        return;
      }

      /*
       * Get projects visible to the member.
       *
       * We can use /projects because we only keep projects
       * whose IDs occur in the member's assigned tasks.
       */
      const projectResponse = await fetch(
        `${API_BASE}/projects`,
        {
          headers: authHeaders(),
        }
      );

      if (!projectResponse.ok) {
        throw new Error(
          "Failed to fetch projects"
        );
      }

      const projectData =
        await projectResponse.json();

      const rawProjects =
        projectData.projects ||
        projectData.data ||
        (Array.isArray(projectData)
          ? projectData
          : []);

      const allProjects =
        rawProjects.map(normalizeProject);

      /*
       * Keep ONLY projects for which the member
       * has at least one assigned task.
       */
      const myProjects =
        allProjects.filter((project: Project, projectIndex: number) =>
          projectIds.includes(
            String(project.id)
          )
        );

      setProjects(myProjects);

      /*
       * Automatically expand projects that contain
       * the member's tasks.
       */
      setExpandedProjects(
        myProjects.map(
          (project:Project) => project.id
        )
      );
    } catch (error) {
      console.error(
        "Loading projects/tasks error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  };


  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        console.error("Failed to fetch users");
        return;
      }

      const data = await response.json();

      const rawUsers =
        data?.users ??
        data?.data ??
        (Array.isArray(data) ? data : []);

      const normalizedUsers: User[] = rawUsers
        .map((user: any) => ({
          id: String(
            user?.id ??
            user?.user_id ??
            user?._id ??
            ""
          ),
          full_name:
            user?.full_name ??
            user?.fullName ??
            user?.name ??
            "Unknown User",
          email: user?.email ?? "",
          role: user?.role ?? "",
        }))
        .filter((user: User) => user.id !== "");

      setUsers(normalizedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  // ====================================
  // FILE ATTACHMENT FUNCTIONS
  // ====================================

  const handleUploadAttachment = async (taskId: string, file: File) => {
  try {
    setUploadingAttachment(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE}/tasks/${taskId}/attachments`,
      {
        method: "POST",
        headers: authHeaders(), // do NOT set Content-Type here, browser sets the multipart boundary
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Failed to upload file"
      );
    }

    return data;
  } catch (error) {
    console.error("Upload attachment error:", error);
    throw error;
  } finally {
    setUploadingAttachment(false);
  }
};

  const fetchTaskAttachments = async (taskId: string) => {
    try {
      setLoadingAttachments(true);

      const response = await fetch(
        `${API_BASE}/tasks/${taskId}/attachments`,
        {
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load attachments");
      }

      setAttachments((prev) => ({
        ...prev,
        [taskId]: data.attachments || [],
      }));
    } catch (error) {
      console.error("Fetch attachments error:", error);
      setAttachments((prev) => ({
        ...prev,
        [taskId]: [],
      }));
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      const response = await fetch(
        `${API_BASE}/attachments/${attachment.id}/download`,
        {
          headers: authHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(error instanceof Error ? error.message : "Failed to download file");
    }
  };

  const handlePreviewAttachment = async (attachment: Attachment) => {
    setSelectedAttachmentForPreview(attachment);
    setPreviewModalOpen(true);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this attachment?"
    );

    if (!confirmed) return;

    try {
      setDeletingAttachment(attachmentId);

      const response = await fetch(
        `${API_BASE}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete attachment");
      }

      if (selectedTaskForAttachment) {
        await fetchTaskAttachments(selectedTaskForAttachment.id);
      }

      alert("Attachment deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Failed to delete attachment");
    } finally {
      setDeletingAttachment(null);
    }
  };

  const openAttachmentModal = async (task: Task) => {
    setSelectedTaskForAttachment(task);
    setAttachmentModalOpen(true);
    await fetchTaskAttachments(task.id);
  };

  const closeAttachmentModal = () => {
    setAttachmentModalOpen(false);
    setSelectedTaskForAttachment(null);
    setSelectedFile(null);
  };

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim();

    return projects.filter((project) => {
      const projectTasks = tasks.filter(
        (task) => task.project_id === project.id
      );

      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.domain || "").toLowerCase().includes(query) ||
        (project.about_title || "")
          .toLowerCase()
          .includes(query) ||
        (project.about_description || "")
          .toLowerCase()
          .includes(query) ||
        projectTasks.some(
          (task) =>
            task.name.toLowerCase().includes(query) ||
            (task.description || "")
              .toLowerCase()
              .includes(query) ||
            (task.assignee_name || "")
              .toLowerCase()
              .includes(query)
        );

      const matchesStatus =
        selectedStatus === "All" ||
        projectTasks.some(
          (task) => task.status === selectedStatus
        );

      return matchesSearch && matchesStatus;
    });
  }, [projects, tasks, search, selectedStatus]);

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  const toggleProject = (projectId: string) => {
    setExpandedProjects((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    );
  };

  const openAddTask = (projectId?: string) => {
    setSelectedProjectId(projectId || null);
    setTaskMenuOpen(null);

    setTaskName("");
    setTaskDescription("");
    setTaskPriority("Medium");
    setTaskStatus("To Do"); 
    setSelectedFile(null);
    
     // Automatically use logged-in user's ID
     const storedUser = localStorage.getItem("user");
     const user = storedUser ? JSON.parse(storedUser) : null;
     setTaskAssignee(user?.id || "");
    
    setTaskStartDate("");
    setTaskDueDate("");

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedProjectId(null);

    setTaskName("");
    setTaskDescription("");
    setSelectedFile(null);
    setTaskPriority("Medium");
    setTaskStatus("To Do");
    setTaskAssignee("");
    setTaskStartDate("");
    setTaskDueDate("");
  };

const handleCreateTask = async () => {
  if (!taskName.trim()) {
    alert("Task name is required.");
    return;
  }

  if (!selectedProjectId) {
    alert("Please select a project.");
    return;
  }

  const selectedProject = projects.find(
  (project) => project.id === selectedProjectId
);

if (!selectedProject) {
  alert("Selected project not found.");
  return;
}


const projectStartDate = selectedProject.start_date;

  // Get logged-in user
  const storedUser = localStorage.getItem("user");
  const loggedInUser = storedUser
    ? JSON.parse(storedUser)
    : null;

  const isMemberOnly =
    loggedInUser?.role === "Member" ||
    !loggedInUser?.role;

  if (isMemberOnly) {
    alert("Only Project Managers and Admins can create tasks.");
    return;
  }

  // -----------------------------------------
  // DATE VALIDATION
  // -----------------------------------------

  const today = getTodayDate();

if (taskStartDate && taskStartDate < today) {
  alert("Task start date must be today or a future date.");
  return;
}

if (projectStartDate && taskStartDate && taskStartDate < projectStartDate) {
  alert(
    `Task start date cannot be before the project start date (${formatDate(
      projectStartDate
    )}).`
  );
  return;
}

if (taskStartDate && taskDueDate && taskDueDate <= taskStartDate) {
  alert("Due date must be greater than the task start date.");
  return;
}

  // -----------------------------------------
  // LOGIN USER / PROJECT MANAGER ID
  // -----------------------------------------

  const projectManagerId = loggedInUser?.id || null;

  try {
    setCreatingTask(true);

    const response = await fetch(
      `${API_BASE}/tasks/project/${selectedProjectId}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: taskName.trim(),
          description: taskDescription.trim() || null,
          status: taskStatus,
          priority: taskPriority,

          // Selected task assignee
          assigneeId: taskAssignee,

          // Logged-in Project Manager / creator ID
          projectManagerId,

          startDate: taskStartDate || null,
          dueDate: taskDueDate || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Failed to create task"
      );
    }

    const backendTask =
      data.task ||
      data.data ||
      data;

    const createdTask = normalizeTask({
      ...backendTask,
      project_id:
        backendTask.project_id ||
        backendTask.projectId ||
        selectedProjectId,
    });

    setTasks((previous) => [
      createdTask,
      ...previous,
    ]);

    setExpandedProjects((previous) =>
      previous.includes(selectedProjectId)
        ? previous
        : [...previous, selectedProjectId]
    );

    closeModal();

    if (selectedFile) {
  try {
    await handleUploadAttachment(createdTask.id, selectedFile);
  } catch (uploadError) {
    console.error("Task created but file upload failed:", uploadError);
    alert(
      "Task was created, but the file failed to upload. You can attach it later from the task's Files option."
    );
  }
}

  } catch (error: any) {
    console.error(
      "Create Task Error:",
      error
    );

    alert(
      error.message ||
      "Failed to create task"
    );

  } finally {
    setCreatingTask(false);
  }
};
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.name}"?\n\nThis task will be permanently removed from the database.`
    );

    if (!confirmed) return;

    try {
      setDeletingTask(taskId);

      const response = await fetch(
        `${API_BASE}/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Failed to delete task"
        );
      }

      setTasks((previous) =>
        previous.filter(
          (item) => item.id !== taskId
        )
      );

      setOpenTaskMenu(null);
    } catch (error: any) {
      console.error("Delete Task Error:", error);

      alert(
        error.message ||
        "Failed to delete task"
      );
    } finally {
      setDeletingTask(null);
    }
  };

const fetchTaskChallenges = async (task: Task) => {
  try {
    setLoadingChallenges(true);

    const response = await fetch(
      `${API_BASE}/challenges/task/${task.id}`,
      {
        headers: authHeaders(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Failed to load challenges"
      );
    }

    const loadedChallenges =
      Array.isArray(data.challenges)
        ? data.challenges
        : [];

    setChallenges(loadedChallenges);

    setChallengeCounts((previous) => ({
      ...previous,
      [task.id]: loadedChallenges.length,
    }));
  } catch (error: any) {
    console.error(
      "Fetch challenges error:",
      error
    );

    setChallenges([]);

    alert(
      error.message ||
      "Failed to load challenges"
    );
  } finally {
    setLoadingChallenges(false);
  }
};
  
  const openChallenges = async (task: Task) => {
  if (!canReadChallenge(task)) {
    alert(
      "You are not authorized to view challenges for this task."
    );
    return;
  }

  setSelectedChallengeTask(task);
  setChallengeText("");
  setChallenges([]);
  setChallengeModalOpen(true);
  setOpenTaskMenu(null);

  await fetchTaskChallenges(task);
};

  const closeChallenges = () => {
  if (savingChallenge) return;

  setChallengeModalOpen(false);
  setSelectedChallengeTask(null);
  setChallenges([]);
  setChallengeText("");
};

  const handleAddChallenge = async () => {
  if (!selectedChallengeTask) return;

  if (!canWriteChallenge(selectedChallengeTask)) {
    alert(
      "Only the Member assigned to this task can add challenges."
    );
    return;
  }

  if (!challengeText.trim()) {
    alert("Please write the problem or challenge.");
    return;
  }

  try {
    setSavingChallenge(true);

    const response = await fetch(
      `${API_BASE}/challenges/task/${selectedChallengeTask.id}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challenge: challengeText.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Failed to add challenge"
      );
    }

    if (data.challenge) {
      setChallenges((previous) => [
        ...previous,
        data.challenge,
      ]);
    } else {
      await fetchTaskChallenges(
        selectedChallengeTask
      );
    }

    setChallengeText("");
  } catch (error: any) {
    console.error(
      "Add challenge error:",
      error
    );

    alert(
      error.message ||
      "Failed to add challenge"
    );
  } finally {
    setSavingChallenge(false);
  }
};

  const handleDeleteChallenge = async (
  challengeId: string
) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this challenge?"
  );

  if (!confirmed) return;

  try {
    setDeletingChallenge(challengeId);

    const response = await fetch(
      `${API_BASE}/challenges/${challengeId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Failed to delete challenge"
      );
    }

    setChallenges((previous) =>
      previous.filter(
        (challenge) =>
          challenge.id !== challengeId
      )
    );
  } catch (error: any) {
    console.error(
      "Delete challenge error:",
      error
    );

    alert(
      error.message ||
      "Failed to delete challenge"
    );
  } finally {
    setDeletingChallenge(null);
  }
};

  const handleTaskStatusChange = async (
    taskId: string,
    status: TaskStatus
  ) => {
    try {
      const response = await fetch(
        `${API_BASE}/tasks/${taskId}/status`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "Failed to update status"
        );
      }

      const updatedTask = normalizeTask(data);

      setTasks((previous) =>
        previous.map((task) =>
          task.id === taskId
            ? {
              ...task,
              ...updatedTask,
            }
            : task
        )
      );

      setOpenTaskMenu(null);
    } catch (error: any) {
      console.error(error);

      alert(
        error.message ||
        "Failed to update task status"
      );
    }
  };

  const toggleTaskComplete = (
    taskId: string,
    currentStatus: TaskStatus
  ) => {
    const newStatus =
      currentStatus === "Done"
        ? "To Do"
        : "Done";

    handleTaskStatusChange(
      taskId,
      newStatus
    );
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#eef1f4] px-4 py-6">
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-gray-300 border-t-gray-900" />

          <p className="mt-4 text-sm font-medium text-gray-600">
            Loading projects and tasks...
          </p>
        </div>
      </main>
    );
  }

  

  return (
    <>
      <main className="min-h-[calc(100vh-72px)] bg-[#eef1f4] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.8px] text-gray-950 sm:text-[32px]">
                Tasks
              </h1>

              <p className="mt-1 max-w-xl text-sm font-medium text-gray-600">
                Create, organize and manage tasks across all your projects.
              </p>
            </div>

            <button
              onClick={() => openAddTask()}
              disabled={!isAdmin}
              title={!isAdmin ? "Only managers can create tasks" : ""}
              className={`inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg px-5 text-sm font-semibold shadow-md transition ${!isAdmin
                  ? "cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-400"
                  : "bg-[#07111f] text-white hover:bg-[#111c2c] active:scale-[0.98]"
                }`}
            >
              <Plus size={17} />
              Add task
            </button>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-400 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Projects
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {projects.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                  <FolderKanban size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-400 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Total Tasks
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {totalTasks}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                  <ListTodo size={18} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-400 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Completed
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {completedTasks}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Check size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-950">
                Project Tasks
              </h2>

              <p className="mt-1 text-xs font-medium text-gray-600">
                Select a project to view and manage its tasks.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-[320px]">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-700"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search projects or tasks"
                  className="h-11 w-full rounded-lg border-2 border-gray-400 bg-white pl-10 pr-4 text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-600 focus:border-gray-700 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() =>
                    setFilterOpen(!filterOpen)
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-400 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 sm:w-auto"
                >
                  <SlidersHorizontal size={16} />
                  Filters

                  <ChevronDown
                    size={14}
                    className={
                      filterOpen
                        ? "rotate-180 transition"
                        : "transition"
                    }
                  />
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border-2 border-gray-400 bg-white p-2 shadow-2xl">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                      Task Status
                    </p>

                    {[
                      "All",
                      "To Do",
                      "In Progress",
                      "Done",
                    ].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setSelectedStatus(
                            status as TaskStatus | "All"
                          );
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm ${selectedStatus === status
                          ? "bg-gray-900 font-bold text-white"
                          : "font-medium text-gray-800 hover:bg-gray-100"
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

          <div className="mt-5 space-y-5">
            {filteredProjects.map(
              (project, projectIndex) => {
                const projectTasks = tasks.filter(
                  (task) =>
                    String(task.project_id) ===
                    String(project.id)
                );

                const isExpanded =
                  expandedProjects.includes(
                    project.id
                  );

                const completedProjectTasks =
                  projectTasks.filter(
                    (task) =>
                      task.status === "Done"
                  ).length;

                const inProgressProjectTasks =
                  projectTasks.filter(
                    (task) =>
                      task.status === "In Progress"
                  ).length;

                const todoProjectTasks =
                  projectTasks.filter(
                    (task) =>
                      task.status === "To Do"
                  ).length;

                const taskProgress =
                  projectTasks.length === 0
                    ? 0
                    : Math.round(
                      (completedProjectTasks /
                        projectTasks.length) *
                      100
                    );

                return (
                  <div
                    key={project.id}
                    className="overflow-visible rounded-xl border-2 border-gray-400 bg-white shadow-md"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <ProjectLogo
                            index={projectIndex}
                          />

                          <div className="min-w-0">
                            <button
                              onClick={() =>
                                toggleProject(
                                  project.id
                                )
                              }
                              className="text-left"
                            >
                              <h3 className="truncate text-sm font-bold text-gray-950 hover:text-gray-700 sm:text-base">
                                {project.name}
                              </h3>
                            </button>

                            {project.domain && (
                              <p className="mt-0.5 truncate text-xs font-semibold text-gray-600">
                                {project.domain}
                              </p>
                            )}

                            {project.about_description && (
                              <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-gray-700">
                                {project.about_description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="hidden items-center gap-2 pr-2 sm:flex">
                            <div className="h-2 w-24 overflow-hidden rounded-full border border-gray-300 bg-gray-200">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{
                                  width: `${taskProgress}%`,
                                }}
                              />
                            </div>

                            <span className="text-[10px] font-bold text-gray-700">
                              {taskProgress}%
                            </span>
                          </div>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setTaskMenuOpen(
                                  taskMenuOpen ===
                                    project.id
                                    ? null
                                    : project.id
                                )
                              }
                              disabled={!isAdmin}
                              title={!isAdmin ? "Only managers can create tasks" : ""}
              className={`inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg px-5 text-sm font-semibold shadow-md transition ${!isAdmin
                  ? "cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-400"
                  : "bg-[#07111f] text-white hover:bg-[#111c2c] active:scale-[0.98]"
                }`}
      
                            >
                              <Plus size={14} />
                              Add task
                              <ChevronDown size={13} />
                            </button>

                            {taskMenuOpen ===
                              project.id && (
                                <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border-2 border-gray-400 bg-white p-1.5 shadow-2xl">
                                  <button
                                    onClick={() =>
                                      openAddTask(
                                        project.id
                                      )
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-gray-900 hover:bg-gray-100"
                                  >
                                    <Plus size={14} />
                                    New task
                                  </button>
                                </div>
                              )}
                          </div>

                          <button
                            onClick={() =>
                              toggleProject(
                                project.id
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-100"
                            title={
                              isExpanded
                                ? "Collapse"
                                : "View tasks"
                            }
                          >
                            <ChevronDown
                              size={16}
                              className={
                                isExpanded
                                  ? "rotate-180 transition"
                                  : "transition"
                              }
                            />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-gray-300 pt-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                          <ListTodo size={12} />
                          {projectTasks.length}
                          {projectTasks.length === 1
                            ? " Task"
                            : " Tasks"}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                          <Check
                            size={12}
                            className="text-emerald-700"
                          />
                          {completedProjectTasks}{" "}
                          Completed
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800">
                          <Clock3 size={12} />
                          {inProgressProjectTasks}{" "}
                          In Progress
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                          <Circle size={12} />
                          {todoProjectTasks} To Do
                        </div>

                        {project.deadline && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                            <Calendar size={12} />
                            Due{" "}
                            {formatDate(
                              project.deadline
                            )}
                          </div>
                        )}

                        {project.priority && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                            <Flag size={12} />
                            {project.priority} priority
                          </div>
                        )}
                      </div>

                      {projectTasks.length > 0 && (
                        <div className="mt-4">
                          <StatusSummary
                            tasks={projectTasks}
                          />
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t-2 border-gray-400 bg-[#e9edf1] p-4 sm:p-5">
                        {projectTasks.length > 0 ? (
                          <div className="space-y-3">
                            {projectTasks.map(
                              (task) => (
                                <div
                                  key={task.id}
                                  className={`rounded-xl border-2 bg-white p-4 shadow-sm transition ${task.status ===
                                    "Done"
                                    ? "border-emerald-400 bg-emerald-50/30"
                                    : task.status ===
                                      "In Progress"
                                      ? "border-blue-400"
                                      : "border-gray-400"
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() =>
                                        toggleTaskComplete(
                                          task.id,
                                          task.status
                                        )
                                      }
                                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${task.status ===
                                        "Done"
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : task.status ===
                                          "In Progress"
                                          ? "border-blue-500 bg-blue-50 text-blue-700"
                                          : "border-gray-500 bg-gray-100 text-gray-600 hover:border-gray-800 hover:text-gray-900"
                                        }`}
                                      title={
                                        task.status ===
                                          "Done"
                                          ? "Mark as To Do"
                                          : "Mark task as Done"
                                      }
                                    >
                                      {task.status ===
                                        "Done" && (
                                          <Check
                                            size={15}
                                          />
                                        )}

                                      {task.status ===
                                        "In Progress" && (
                                          <Clock3
                                            size={14}
                                          />
                                        )}

                                      {task.status ===
                                        "To Do" && (
                                          <Circle
                                            size={14}
                                          />
                                        )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p
                                              className={`text-sm font-bold ${task.status ===
                                                "Done"
                                                ? "text-gray-500 line-through"
                                                : "text-gray-950"
                                                }`}
                                            >
                                              {task.name}
                                            </p>

                                            <TaskStatusBadge
                                              status={
                                                task.status
                                              }
                                            />
                                          </div>

                                          {task.description ? (
                                            <p
                                              className={`mt-2 max-w-3xl text-xs font-medium leading-relaxed ${task.status ===
                                                "Done"
                                                ? "text-gray-500"
                                                : "text-gray-700"
                                                }`}
                                            >
                                              {
                                                task.description
                                              }
                                            </p>
                                          ) : (
                                            <p className="mt-2 text-xs italic text-gray-400">
                                              No description
                                              provided.
                                            </p>
                                          )}
                                        </div>

                                        <div className="relative flex shrink-0 items-center gap-2">

                                          {/* FILES BUTTON - Only show if attachments exist */}
                                          {canReadAttachments(task) && (attachments[task.id]?.length || 0) > 0 && (
                                            <button
                                              onClick={() => openAttachmentModal(task)}
                                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
                                              title="View task files"
                                            >
                                              <File size={13} />
                                              Files
                                              <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                                                {attachments[task.id]?.length || 0}
                                              </span>
                                            </button>
                                          )}

                                         {canReadChallenge(task) && (
                                          <button
                                            onClick={() => openChallenges(task)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 text-[10px] font-bold text-violet-800 hover:bg-violet-100"
                                            title="View task challenges"
                                          >
                                            <Flag size={13} />
                                        
                                            Challenges
                                        
                                            {challengeCounts[task.id] !== undefined && (
                                              <span className="rounded-full bg-violet-200 px-1.5 py-0.5 text-[9px] font-bold text-violet-900">
                                                {challengeCounts[task.id]}
                                              </span>
                                            )}
                                          </button>
                                        )}
                                          
                                          <button
                                            onClick={() =>
                                              setOpenTaskMenu(
                                                openTaskMenu ===
                                                  task.id
                                                  ? null
                                                  : task.id
                                              )
                                            }
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                                            title="Task options"
                                          >
                                            <MoreVertical
                                              size={16}
                                            />
                                          </button>

                                          {openTaskMenu ===
                                            task.id && (
                                              <div className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-xl border-2 border-gray-400 bg-white shadow-2xl">
                                                <div className="border-b border-gray-300 bg-gray-50 px-3 py-2.5">
                                                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
                                                    Task Options
                                                  </p>
                                                </div>

                                                <div className="p-1.5">
                                                  {[
                                                    "To Do",
                                                    "In Progress",
                                                    "Done",
                                                  ].map(
                                                    (
                                                      status
                                                    ) => (
                                                      <button
                                                        key={
                                                          status
                                                        }
                                                        onClick={() =>
                                                          handleTaskStatusChange(
                                                            task.id,
                                                            status as TaskStatus
                                                          )
                                                        }
                                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${task.status ===
                                                          status
                                                          ? status ===
                                                            "To Do"
                                                            ? "bg-gray-200 text-gray-950"
                                                            : status ===
                                                              "In Progress"
                                                              ? "bg-blue-100 text-blue-900"
                                                              : "bg-emerald-100 text-emerald-900"
                                                          : "text-gray-700 hover:bg-gray-100"
                                                          }`}
                                                      >
                                                        {status ===
                                                          "To Do" && (
                                                            <Circle
                                                              size={
                                                                13
                                                              }
                                                            />
                                                          )}

                                                        {status ===
                                                          "In Progress" && (
                                                            <Clock3
                                                              size={
                                                                13
                                                              }
                                                            />
                                                          )}

                                                        {status ===
                                                          "Done" && (
                                                            <Check
                                                              size={
                                                                13
                                                              }
                                                            />
                                                          )}

                                                        {status}

                                                        {task.status ===
                                                          status && (
                                                            <Check
                                                              size={
                                                                13
                                                              }
                                                              className="ml-auto"
                                                            />
                                                          )}
                                                      </button>
                                                    )
                                                  )}

                                                  <div className="my-1 border-t border-gray-200" />

                                                  <button
                                                    onClick={() =>
                                                      handleDeleteTask(
                                                        task.id
                                                      )
                                                    }
                                                    disabled={
                                                      deletingTask ===
                                                      task.id
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                  >
                                                    {deletingTask ===
                                                      task.id ? (
                                                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-700" />
                                                    ) : (
                                                      <Trash2
                                                        size={
                                                          13
                                                        }
                                                      />
                                                    )}

                                                    {deletingTask ===
                                                      task.id
                                                      ? "Deleting..."
                                                      : "Delete task"}
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-gray-200 pt-3">
                                        <PriorityBadge
                                          priority={
                                            task.priority
                                          }
                                        />

                                        {task.assignee_name ? (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                                            <Users
                                              size={
                                                11
                                              }
                                            />
                                            {
                                              task.assignee_name
                                            }
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                            <Users
                                              size={
                                                11
                                              }
                                            />
                                            Unassigned
                                          </div>
                                        )}

                                        {task.start_date && (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                                            <Clock3
                                              size={
                                                11
                                              }
                                            />
                                            Start{" "}
                                            {formatDate(
                                              task.start_date
                                            )}
                                          </div>
                                        )}

                                        {task.due_date && (
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                                            <Calendar
                                              size={
                                                11
                                              }
                                            />
                                            Due{" "}
                                            {formatDate(
                                              task.due_date
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-400 bg-white px-5 text-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                              <ListTodo size={19} />
                            </div>

                            <p className="mt-3 text-sm font-bold text-gray-950">
                              No tasks yet
                            </p>

                            <p className="mt-1 max-w-sm text-xs font-medium leading-relaxed text-gray-600">
                              Start breaking this project
                              into smaller, manageable
                              tasks.
                            </p>

                            <button
                              onClick={() =>
                                openAddTask(
                                  project.id
                                )
                              }
                              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-gray-400 bg-white px-3.5 text-xs font-bold text-gray-900 hover:bg-gray-100"
                            >
                              <Plus size={14} />
                              Add first task
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {filteredProjects.length === 0 && (
            <div className="mt-5 rounded-xl border-2 border-gray-400 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Search
                  size={21}
                  className="text-gray-600"
                />
              </div>

              <h3 className="mt-4 text-sm font-bold text-gray-950">
                No projects or tasks found
              </h3>

              <p className="mt-1 text-sm font-medium text-gray-600">
                Try changing your search or task filter.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Your existing modals (create task, challenges) remain unchanged */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-gray-500 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b-2 border-gray-300 bg-[#f7f8fa] px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-white shadow-sm">
                  <Plus size={19} />
                </div>

                <h2 className="text-lg font-bold tracking-tight text-gray-950">
                  Create a new task
                </h2>

                <p className="mt-1 text-xs font-medium text-gray-600">
                  Add the details needed to define this project task.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-950"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto bg-white px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Project{" "}
                    <span className="ml-1 text-red-700">
                      *
                    </span>
                  </label>

                  <select
                    value={
                      selectedProjectId || ""
                    }
                    onChange={(event) =>
                      setSelectedProjectId(
                        event.target.value ||
                        null
                      )
                    }
                    className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 px-3.5 text-sm font-semibold text-gray-950 outline-none transition focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">
                      Select project
                    </option>

                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Task name{" "}
                    <span className="ml-1 text-red-700">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={taskName}
                    onChange={(event) =>
                      setTaskName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Design login page"
                    className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 px-3.5 text-sm font-semibold text-gray-950 caret-gray-950 outline-none transition placeholder:text-gray-500 focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Description
                  </label>

                  <textarea
                    value={taskDescription}
                    onChange={(event) =>
                      setTaskDescription(
                        event.target.value
                      )
                    }
                    placeholder="Describe what needs to be completed..."
                    rows={4}
                    className="w-full resize-none rounded-lg border-2 border-gray-400 bg-gray-50 px-3.5 py-3 text-sm font-semibold text-gray-950 caret-gray-950 outline-none transition placeholder:text-gray-500 focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="sm:col-span-2">
  <label className="mb-2 block text-xs font-bold text-gray-950">
    Attach file (optional)
  </label>

  <input
    type="file"
    onChange={(event) =>
      setSelectedFile(event.target.files?.[0] || null)
    }
    className="block w-full text-sm font-medium text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"
  />

  {selectedFile && (
    <p className="mt-2 text-xs font-medium text-gray-600">
      Selected: {selectedFile.name} (
      {formatFileSize(selectedFile.size)})
    </p>
  )}
</div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Priority
                  </label>

                  <select
                    value={taskPriority}
                    onChange={(event) =>
                      setTaskPriority(
                        event.target
                          .value as TaskPriority
                      )
                    }
                    className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 px-3.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
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

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Task Status
                  </label>

                  <select
                    value={taskStatus}
                    onChange={(event) =>
                      setTaskStatus(
                        event.target
                          .value as TaskStatus
                      )
                    }
                    className={`h-11 w-full rounded-lg border-2 px-3.5 text-sm font-bold outline-none focus:ring-2 ${taskStatus === "To Do"
                      ? "border-gray-500 bg-gray-100 text-gray-950 focus:border-gray-800 focus:ring-gray-200"
                      : taskStatus ===
                        "In Progress"
                        ? "border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-600 focus:ring-blue-100"
                        : "border-emerald-400 bg-emerald-50 text-emerald-900 focus:border-emerald-600 focus:ring-emerald-100"
                      }`}
                  >
                    <option value="To Do">
                      To Do
                    </option>
                    <option value="In Progress">
                      In Progress
                    </option>
                    <option value="Done">
                      Done
                    </option>
                  </select>

                  <div
                    className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 ${taskStatus === "To Do"
                      ? "border-gray-300 bg-gray-100 text-gray-800"
                      : taskStatus ===
                        "In Progress"
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      }`}
                  >
                    {taskStatus ===
                      "To Do" && (
                        <Circle size={12} />
                      )}

                    {taskStatus ===
                      "In Progress" && (
                        <Clock3 size={12} />
                      )}

                    {taskStatus ===
                      "Done" && (
                        <Check size={12} />
                      )}

                    <span className="text-[10px] font-bold">
                      Current status:{" "}
                      {taskStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Assignee
                  </label>
                   <select
                    value={taskAssignee}
                    onChange={(event) =>
                      setTaskAssignee(
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 px-3.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">
                      Select team member
                    </option>

                    {users.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Start date
                  </label>

                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700"
                    />

                    <input
                      type="date"
                      value={taskStartDate}
                       min={(() => {
                          const today = getTodayDate();
                        
                          const selectedProject = projects.find(
                            (project) => project.id === selectedProjectId
                          );
                        
                          const projectStartDate = getDateOnly(
                            selectedProject?.start_date
                          );
                        
                          if (projectStartDate && projectStartDate > today) {
                            return projectStartDate;
                          }
                        
                          return today;
                        })()}
                        onChange={(event) =>
                          setTaskStartDate(event.target.value)
                        }
                      className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 pl-10 pr-3 text-sm font-semibold text-gray-950 outline-none focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-950">
                    Due date
                  </label>

                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700"
                    />

                    <input
                      type="date"
                      value={taskDueDate}
                      min={
                        taskStartDate
                          ? (() => {
                              const date = new Date(
                                `${taskStartDate}T00:00:00`
                              );
                    
                              date.setDate(date.getDate() + 1);
                    
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const day = String(
                                date.getDate()
                              ).padStart(2, "0");
                    
                              return `${year}-${month}-${day}`;
                            })()
                          : getTodayDate()
                      }
                      onChange={(event) =>
                        setTaskDueDate(event.target.value)
                      }
                      className="h-11 w-full rounded-lg border-2 border-gray-400 bg-gray-50 pl-10 pr-3 text-sm font-semibold text-gray-950 outline-none focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border-2 border-violet-300 bg-violet-50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-800 shadow-sm">
                    <ListTodo size={15} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-950">
                      Project task
                    </p>

                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-700">
                      This task will be created under the selected project and will immediately appear inside that project's task section.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t-2 border-gray-300 bg-[#f5f6f8] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={closeModal}
                disabled={creatingTask}
                className="h-10 rounded-lg border-2 border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateTask}
                disabled={
                  creatingTask ||
                  !taskName.trim() ||
                  !selectedProjectId
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#111c2c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creatingTask ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Add task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challenges Modal - Unchanged */}
      {challengeModalOpen && selectedChallengeTask && (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[2px]"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !savingChallenge
      ) {
        closeChallenges();
      }
    }}
  >
    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-gray-500 bg-white shadow-2xl">
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Flag size={16} className="text-violet-700" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-950">
                  Task Challenges
                </h2>
                <p className="truncate text-[11px] text-gray-500">
                  {selectedChallengeTask?.name}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeChallenges}
            disabled={savingChallenge}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close challenges"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto bg-[#eef1f4] px-6 py-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-950">
                Reported challenges
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-600">
                Challenges already reported for this task.
              </p>
            </div>
            <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">
              {challenges.length}{" "}
              {challenges.length === 1
                ? "Challenge"
                : "Challenges"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loadingChallenges ? (
              <div className="flex min-h-[130px] items-center justify-center rounded-xl border-2 border-gray-300 bg-white">
                <div className="text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                  <p className="mt-2 text-xs font-semibold text-gray-600">
                    Loading challenges...
                  </p>
                </div>
              </div>
            ) : challenges.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-400 bg-white px-5 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <Flag size={18} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-950">
                  No challenges reported
                </p>
                <p className="mt-1 text-xs font-medium text-gray-600">
                  No problems or challenges have been recorded for this task yet.
                </p>
              </div>
            ) : (
              challenges.map((challenge, index) => (
                <div
                  key={challenge.id}
                  className="rounded-xl border-2 border-gray-300 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-800">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            Reported by
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-gray-950">
                            {challenge.author_name ||
                              "Member"}
                          </p>
                        </div>
                        {(isManagementRole ||
                          String(challenge.user_id) ===
                            String(currentUser?.id)) && (
                          <button
                            onClick={() =>
                              handleDeleteChallenge(
                                challenge.id
                              )
                            }
                            disabled={
                              deletingChallenge ===
                              challenge.id
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            title="Delete challenge"
                          >
                            {deletingChallenge ===
                            challenge.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-3">
                        <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-gray-800">
                          {challenge.challenge}
                        </p>
                      </div>
                      {challenge.created_at && (
                        <p className="mt-2 text-[10px] font-medium text-gray-500">
                          {formatDate(
                            challenge.created_at
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {canWriteChallenge(selectedChallengeTask) && (
          <div className="mt-6 rounded-xl border-2 border-violet-300 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 shadow-sm">
                <Flag size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-950">
                  Report a problem or challenge
                </h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-gray-700">
                  Describe any problem, blocker, difficulty, or challenge you faced while performing this task.
                </p>
                <textarea
                  value={challengeText}
                  onChange={(event) =>
                    setChallengeText(
                      event.target.value
                    )
                  }
                  placeholder="Example: The API response was delayed and prevented me from completing the integration..."
                  rows={5}
                  className="mt-4 w-full resize-none rounded-lg border-2 border-gray-400 bg-white px-3.5 py-3 text-sm font-medium text-gray-950 caret-gray-950 outline-none placeholder:text-gray-500 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleAddChallenge}
                    disabled={
                      savingChallenge ||
                      !challengeText.trim()
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingChallenge ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        Add challenge
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isManagementRole && (
          <div className="mt-3 rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                <Users size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-950">
                  Management view
                </p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-700">
                  You can review the challenges reported by the member assigned to this task. Only the assigned Member can submit new challenges.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t-2 border-gray-300 bg-[#f5f6f8] px-6 py-4">
        <button
          onClick={closeChallenges}
          disabled={savingChallenge}
          className="h-10 rounded-lg border-2 border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* FILE ATTACHMENT MODAL */}
      {attachmentModalOpen && selectedTaskForAttachment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !uploadingAttachment) {
              closeAttachmentModal();
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-gray-500 bg-white shadow-2xl">
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                      <File size={16} className="text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-gray-950">
                        Task Files
                      </h2>
                      <p className="truncate text-[11px] text-gray-500">
                        {selectedTaskForAttachment?.name}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAttachmentModal}
                  disabled={uploadingAttachment}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto bg-[#eef1f4] px-6 py-6">
              {/* Files List */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950">
                      Files
                    </h3>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      All files attached to this task.
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                    {attachments[selectedTaskForAttachment.id]?.length || 0} File{(attachments[selectedTaskForAttachment.id]?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {loadingAttachments ? (
                    <div className="flex min-h-[130px] items-center justify-center rounded-xl border-2 border-gray-300 bg-white">
                      <div className="text-center">
                        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                        <p className="mt-2 text-xs font-semibold text-gray-600">
                          Loading files...
                        </p>
                      </div>
                    </div>
                  ) : (attachments[selectedTaskForAttachment.id]?.length || 0) === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-400 bg-white px-5 py-10 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <File size={18} />
                      </div>
                      <p className="mt-3 text-sm font-bold text-gray-950">
                        No files attached
                      </p>
                      <p className="mt-1 text-xs font-medium text-gray-600">
                        No attachments have been added to this task yet.
                      </p>
                    </div>
                  ) : (
                    (attachments[selectedTaskForAttachment.id] || []).map((attachment) => (
                      <div
                        key={attachment.id}
                        className="rounded-xl border-2 border-gray-300 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            {getFileIcon(attachment.file_type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-gray-950 break-words">
                                  {attachment.file_name}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-gray-600">
                                  {formatFileSize(attachment.file_size)} • Uploaded by {attachment.uploader_name || "User"}
                                </p>
                                <p className="mt-1 text-[10px] text-gray-500">
                                  {new Date(attachment.created_at).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  onClick={() => handlePreviewAttachment(attachment)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  title="Preview file"
                                >
                                  <FileText size={14} />
                                </button>

                                <button
                                  onClick={() => handleDownloadAttachment(attachment)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                                  title="Download file"
                                >
                                  <Download size={14} />
                                </button>

                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    disabled={deletingAttachment === attachment.id}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                    title="Delete file"
                                  >
                                    {deletingAttachment === attachment.id ? (
                                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t-2 border-gray-300 bg-[#f5f6f8] px-6 py-4">
              <button
                onClick={closeAttachmentModal}
                disabled={uploadingAttachment}
                className="h-10 rounded-lg border-2 border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE PREVIEW MODAL */}
      {previewModalOpen && selectedAttachmentForPreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewModalOpen(false);
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-gray-500 bg-white shadow-2xl">
            {/* Preview Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
              <div>
                <h2 className="text-base font-bold text-gray-950">
                  {selectedAttachmentForPreview.file_name}
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-600">
                  {formatFileSize(selectedAttachmentForPreview.file_size)}
                </p>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-6">
              {selectedAttachmentForPreview.file_type.toLowerCase() === "pdf" ? (
                <iframe
                  src={`${API_BASE}/attachments/${selectedAttachmentForPreview.id}/preview`}
                  className="h-full w-full rounded-lg border border-gray-300"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    {getFileIcon(selectedAttachmentForPreview.file_type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-950">
                      {selectedAttachmentForPreview.file_name}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      Preview not available for this file type.
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Please download to view the file.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="flex gap-2 border-t border-gray-200 bg-[#f5f6f8] px-6 py-4">
              <button
                onClick={() => handleDownloadAttachment(selectedAttachmentForPreview)}
                className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700"
              >
                <Download size={15} />
                Download
              </button>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="h-10 rounded-lg border-2 border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
