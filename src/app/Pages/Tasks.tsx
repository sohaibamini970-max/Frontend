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
  Eye,
  CheckCircle2,
    Target,
} from "lucide-react";

type ProjectStatus =
  | "Unassigned"
  | "Backlog"
  | "In Progress"
  | "Paused"
  | "Done";

type ProjectPriority = "Low" | "Medium" | "High";

type TaskStatus = "To Do" | "In Progress" | "Done" | "Completed";

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
  project_manager_id?: string;
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

// Add to your existing type definitions
type TaskSubmission = {
    id: string;
    task_id: string;
    user_id: string;
    link: string;
    description?: string;
    version: number;
    created_at: string;
    updated_at: string;
    submitter_name?: string;
    submitter_email?: string;
};

type WorkPartStatus = "To Do" | "Pending" | "Done";

type WorkPart = {
    id: string;
    task_id: string;
    created_by: string;
    title: string;
    description?: string;
    status: WorkPartStatus;
    creator_name?: string;
    creator_email?: string;
    creator_role?: string;
    created_at?: string;
    updated_at?: string;
};
type ProgramTask = Task & {
  program_project_id: string;
  program_project_name?: string;
  program_project_domain?: string;
  program_project_manager_id?: string;
  program_name?: string;
  objectives?: string;
};


const API_BASE = "https://backend-five-swart-88.vercel.app/api";
const PROGRAM_API = `${API_BASE}/program-tasks`;
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
    project_manager_id: String(
      project.project_manager_id ??
      project.projectManagerId ??
      project.manager_id ??
      project.managerId ??
      ""
    ),
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
    "Completed": "border border-amber-300 bg-amber-100 text-amber-800",
    Done: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  };

  const icons: Record<TaskStatus, React.ReactNode> = {
    "To Do": <Circle size={10} />,
    "In Progress": <Clock3 size={10} />,
    "Completed": <CheckCircle2 size={10} />,
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
  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;
  const done = tasks.filter((task) => task.status === "Done").length;

  return (
    <div className="grid grid-cols-4 gap-2 border-t border-gray-300 pt-3">
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

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className="text-amber-700" />
          <span className="text-[10px] font-bold text-amber-800">
            Completed
          </span>
        </div>
        <p className="mt-1 text-base font-bold text-amber-900">
          {completed}
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
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);

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
const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
const [previewLoading, setPreviewLoading] = useState(false);
// SUBMISSION STATE
// ====================================
const [submissions, setSubmissions] = useState<Record<string, TaskSubmission[]>>({});
const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<Task | null>(null);
const [submissionLink, setSubmissionLink] = useState("");
const [submissionDescription, setSubmissionDescription] = useState("");
const [savingSubmission, setSavingSubmission] = useState(false);
const [loadingSubmissions, setLoadingSubmissions] = useState(false);
const [deletingSubmission, setDeletingSubmission] = useState<string | null>(null);

const [workParts, setWorkParts] = useState<Record<string, WorkPart[]>>({});
const [loadingWorkParts, setLoadingWorkParts] = useState(false);
const [newPartTitle, setNewPartTitle] = useState("");
const [newPartDescription, setNewPartDescription] = useState("");
const [newPartStatus, setNewPartStatus] = useState<WorkPartStatus>("To Do");
const [savingWorkPart, setSavingWorkPart] = useState(false);
const [deletingWorkPart, setDeletingWorkPart] = useState<string | null>(null);
  
const [programTasks, setProgramTasks] = useState<ProgramTask[]>([]);
const [programTaskInstructions, setProgramTaskInstructions] =
  useState<Record<string, any[]>>({});

const [loadingInstructions, setLoadingInstructions] = useState(false);
const [instructionPreview, setInstructionPreview] = useState<{
  url: string | null;
  file: any | null;
} | null>(null);


  const isManagementRole =
  currentUser?.role === "System Administrator" ||
  currentUser?.role === "Executive Manager" ||
  currentUser?.role === "Project Manager";

  const isMember =
  currentUser?.role === "Member";

  // Task Work Submission
  // ====================================
// ====================================
// SUBMISSION HELPERS
// ====================================
const canSubmitWork = (task: Task): boolean => {
    return (
        isMember &&
        String(task.assignee_id || "") === String(currentUser?.id || "") &&
        task.status !== "Done"
    );
};

const canViewSubmissions = (task: Task): boolean => {
    return (
        isManagementRole ||
        String(task.assignee_id || "") === String(currentUser?.id || "")
    );
};

const canDeleteSubmission = (submission: TaskSubmission): boolean => {
    return (
        isManagementRole ||
        String(submission.user_id) === String(currentUser?.id)
    );
};

// =========================================================
// Check whether a task has enough evidence to be completed/done
// Rule: at least one work part exists AND
//       (at least one work part is Done OR at least one link exists)
// =========================================================
const taskHasCompletionEvidence = (taskId: string): {
    ok: boolean;
    reason?: string;
} => {
    const parts = workParts[taskId] || [];
    const subs = submissions[taskId] || [];

    if (parts.length === 0) {
        return {
            ok: false,
            reason:
                "At least one work part must be added before this task can be completed.",
        };
    }

    const hasDonePart = parts.some((p) => p.status === "Done");
    const hasLink = subs.some(
        (s) => s.link && String(s.link).trim() !== ""
    );

    if (!hasDonePart && !hasLink) {
        return {
            ok: false,
            reason:
                "At least one work part must be marked Done, or at least one work link must be submitted before this task can be completed.",
        };
    }

    return { ok: true };
};

const hasSubmissions = (taskId: string): boolean => {
    return (submissions[taskId]?.length || 0) > 0;
};

// ====================================
// SUBMISSION API FUNCTIONS
// ====================================

const fetchTaskSubmissions = async (taskId: string) => {
    try {
        setLoadingSubmissions(true);
        const response = await fetch(
            `${API_BASE}/tasks/${taskId}/submissions`,
            { headers: authHeaders() }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || "Failed to load submissions");
        }
        
        setSubmissions(prev => ({
            ...prev,
            [taskId]: data.submissions || []
        }));
    } catch (error) {
        console.error("Fetch submissions error:", error);
        setSubmissions(prev => ({
            ...prev,
            [taskId]: []
        }));
    } finally {
        setLoadingSubmissions(false);
    }
};

const handleAddSubmission = async (taskId: string) => {
    // =========================================================
    // Require at least one work part (backend also enforces this)
    // =========================================================
    const parts = workParts[taskId] || [];
    if (parts.length === 0) {
        alert(
            "Please add at least one work part before submitting. Work parts describe what you did."
        );
        return;
    }

    try {
        setSavingSubmission(true);

        const response = await fetch(
            `${API_BASE}/tasks/${taskId}/submissions`,
            {
                method: "POST",
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    link: submissionLink.trim() || null,
                    description: submissionDescription.trim() || null,
                }),
            }
        );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to submit work");
        }

        await fetchTaskSubmissions(taskId);
        await fetchProjectsAndTasks();

        setSubmissionLink("");
        setSubmissionDescription("");
        alert("Work submitted successfully!");
    } catch (error) {
        console.error("Submit work error:", error);
        alert(error instanceof Error ? error.message : "Failed to submit work");
    } finally {
        setSavingSubmission(false);
    }
};
  
const handleDeleteSubmission = async (submissionId: string) => {
    const confirmed = window.confirm(
        "Are you sure you want to delete this submission?"
    );
    
    if (!confirmed) return;
    
    try {
        setDeletingSubmission(submissionId);
        
        const response = await fetch(
            `${API_BASE}/submissions/${submissionId}`,
            {
                method: "DELETE",
                headers: authHeaders(),
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || "Failed to delete submission");
        }
        
        // Refresh submissions for the current task
        if (selectedTaskForSubmission) {
            await fetchTaskSubmissions(selectedTaskForSubmission.id);
        }
        
        alert("Submission deleted successfully");
    } catch (error) {
        console.error("Delete submission error:", error);
        alert(error instanceof Error ? error.message : "Failed to delete submission");
    } finally {
        setDeletingSubmission(null);
    }
};

const openSubmissionModal = async (task: Task) => {
    if (!canViewSubmissions(task)) {
        alert("You are not authorized to view submissions for this task.");
        return;
    }

    setSelectedTaskForSubmission(task);
    setSubmissionModalOpen(true);
    setSubmissionLink("");
    setSubmissionDescription("");
    setNewPartTitle("");
    setNewPartDescription("");
    setNewPartStatus("To Do");

    await Promise.all([
        fetchTaskSubmissions(task.id),
        fetchWorkParts(task.id),
    ]);
};

const closeSubmissionModal = () => {
    setSubmissionModalOpen(false);
    setSelectedTaskForSubmission(null);
    setSubmissionLink("");
    setSubmissionDescription("");
};

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
    setError("");

    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error("User information not found. Please login again.");
    }

    const role = user.role || "";

    // ============================================================
    // PROGRAM TASKS — fetch in parallel, works for every role
    // ============================================================
    const programPromise = (async (): Promise<ProgramTask[]> => {
      try {
        const url =
          role === "Member"
            ? `${PROGRAM_API}/my/tasks`
            : `${PROGRAM_API}/all`;

        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) return [];

        const data = await res.json();
        const list = data.tasks || [];
        return list.map((t: any) => ({
          ...normalizeTask(t),
          program_project_id: String(t.program_project_id || ""),
          program_project_name: t.program_project_name || "",
          program_project_domain: t.program_project_domain || "",
          program_project_manager_id: String(
            t.program_project_manager_id || ""
          ),
          program_name: t.program_name || "",
          objectives: t.objectives || "",
        }));
      } catch (e) {
        console.error("Program tasks fetch error:", e);
        return [];
      }
    })();

    // ============================================================
    // ROLE-SPECIFIC PROJECT + NORMAL TASK FETCH
    // ============================================================
    const rolePromise = (async () => {
      const canSeeEverything =
        role === "System Administrator" || role === "Executive Manager";
      const isProjectManager = role === "Project Manager";
      const isMemberRole = role === "Member";

      if (canSeeEverything) {
        const projectResponse = await fetch(`${API_BASE}/projects`, {
          headers: authHeaders(),
        });
        if (!projectResponse.ok) throw new Error("Failed to fetch projects");

        const projectData = await projectResponse.json();
        const rawProjects =
          projectData.projects ||
          projectData.data ||
          (Array.isArray(projectData) ? projectData : []);
        const visibleProjects = rawProjects.map(normalizeProject);

        const taskResponses = await Promise.all(
          visibleProjects.map(async (project: Project) => {
            try {
              const response = await fetch(
                `${API_BASE}/tasks/project/${project.id}`,
                { headers: authHeaders() }
              );
              if (!response.ok) return [];
              const data = await response.json();
              const rawTasks =
                data.tasks || data.data || (Array.isArray(data) ? data : []);
              return rawTasks.map((task: any) =>
                normalizeTask({
                  ...task,
                  project_id:
                    task.project_id || task.projectId || project.id,
                })
              );
            } catch {
              return [];
            }
          })
        );
        const allTasks = taskResponses.flat();
        return {
          projects: visibleProjects,
          tasks: allTasks,
          expanded: visibleProjects
            .filter((p: Project) =>
              allTasks.some((t) => String(t.project_id) === String(p.id))
            )
            .map((p: Project) => p.id),
        };
      }

      if (isProjectManager) {
        const projectResponse = await fetch(`${API_BASE}/projects`, {
          headers: authHeaders(),
        });
        if (!projectResponse.ok)
          throw new Error("Failed to fetch assigned projects");

        const projectData = await projectResponse.json();
        const rawProjects =
          projectData.projects ||
          projectData.data ||
          (Array.isArray(projectData) ? projectData : []);
        const allProjects = rawProjects.map(normalizeProject);
        const myUserId = String(user.id);

        const assignedProjects = allProjects.filter((project: Project) => {
          const isManager =
            String(project.project_manager_id || "") === myUserId;
          const isMember = (project.members || []).some(
            (m) => String(m.user_id) === myUserId
          );
          return isManager || isMember;
        });

        const taskResponses = await Promise.all(
          assignedProjects.map(async (project: Project) => {
            try {
              const response = await fetch(
                `${API_BASE}/tasks/project/${project.id}`,
                { headers: authHeaders() }
              );
              if (!response.ok) return [];
              const data = await response.json();
              const rawTasks =
                data.tasks || data.data || (Array.isArray(data) ? data : []);
              return rawTasks.map((task: any) =>
                normalizeTask({
                  ...task,
                  project_id:
                    task.project_id || task.projectId || project.id,
                })
              );
            } catch {
              return [];
            }
          })
        );
        const managerTasks = taskResponses.flat();
        return {
          projects: assignedProjects,
          tasks: managerTasks,
          expanded: assignedProjects.map((p: Project) => p.id),
        };
      }

      if (isMemberRole) {
        const myTasksResponse = await fetch(`${API_BASE}/tasks/my/tasks`, {
          headers: authHeaders(),
        });
        if (!myTasksResponse.ok) {
          const errorData = await myTasksResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error ||
              "Failed to fetch your tasks"
          );
        }
        const myTasksData = await myTasksResponse.json();
        const rawMyTasks =
          myTasksData.tasks ||
          myTasksData.data ||
          (Array.isArray(myTasksData) ? myTasksData : []);

        const myUserId = String(user.id);
        const onlyMyTasks = rawMyTasks
          .map((task: any) => normalizeTask(task))
          .filter(
            (task: Task) =>
              task.id &&
              task.project_id &&
              String(task.assignee_id || "") === myUserId
          );

        const projectIds = [
          ...new Set(onlyMyTasks.map((t: Task) => String(t.project_id))),
        ];

        if (projectIds.length === 0) {
          return { projects: [], tasks: onlyMyTasks, expanded: [] };
        }

        const projectResponse = await fetch(`${API_BASE}/projects`, {
          headers: authHeaders(),
        });
        if (!projectResponse.ok)
          throw new Error("Failed to fetch assigned projects");

        const projectData = await projectResponse.json();
        const rawProjects =
          projectData.projects ||
          projectData.data ||
          (Array.isArray(projectData) ? projectData : []);
        const myProjects = rawProjects
          .map(normalizeProject)
          .filter((p: Project) => projectIds.includes(String(p.id)));

        return {
          projects: myProjects,
          tasks: onlyMyTasks,
          expanded: myProjects.map((p: Project) => p.id),
        };
      }

      return { projects: [], tasks: [], expanded: [] };
    })();

    // ============================================================
    // AWAIT BOTH IN PARALLEL
    // ============================================================
    const [roleResult, programResult] = await Promise.all([
      rolePromise,
      programPromise,
    ]);

    setProjects(roleResult.projects);
    setTasks(roleResult.tasks);
    setExpandedProjects(roleResult.expanded);
    setProgramTasks(programResult);
  } catch (error) {
    console.error("Loading projects/tasks error:", error);
    setError(error instanceof Error ? error.message : "Failed to load tasks");
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
    setPreviewBlobUrl(null);
    setPreviewLoading(true);

    try {
        const response = await fetch(
            `${API_BASE}/attachments/${attachment.id}/preview`,
            {
                method: "GET",
                headers: {
                    ...authHeaders(),
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            const errorData = await response
                .json()
                .catch(() => ({}));

            throw new Error(
                errorData.message ||
                    `Preview failed (${response.status})`
            );
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("The server returned an empty file.");
        }

        console.log("Preview blob:", {
            type: blob.type,
            size: blob.size,
        });

        const url = window.URL.createObjectURL(blob);

        setPreviewBlobUrl(url);
    } catch (error) {
        console.error("Preview error:", error);

        setPreviewBlobUrl(null);

        alert(
            error instanceof Error
                ? error.message
                : "Failed to preview file."
        );
    } finally {
        setPreviewLoading(false);
    }
};

  const closePreviewModal = () => {
    if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
    }

    setPreviewBlobUrl(null);
    setPreviewModalOpen(false);
    setSelectedAttachmentForPreview(null);
    setPreviewLoading(false);
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

  const groupedProgramTasks = useMemo(() => {
  const map = new Map<
    string,
    {
      program_project_id: string;
      program_project_name: string;
      program_name: string;
      tasks: ProgramTask[];
    }
  >();

  programTasks.forEach((t) => {
    const key = t.program_project_id;
    if (!map.has(key)) {
      map.set(key, {
        program_project_id: key,
        program_project_name: t.program_project_name || "Program Project",
        program_name: t.program_name || "Program",
        tasks: [],
      });
    }
    map.get(key)!.tasks.push(t);
  });

  return Array.from(map.values());
}, [programTasks]);

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

  /* =========================================================
   PROGRAM TASK HANDLERS
========================================================= */

  const fetchProgramTaskInstructions = async (taskId: string) => {
  try {
    setLoadingInstructions(true);
    const res = await fetch(`${PROGRAM_API}/${taskId}/instructions`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      setProgramTaskInstructions((prev) => ({ ...prev, [taskId]: [] }));
      return;
    }
    const data = await res.json();
    setProgramTaskInstructions((prev) => ({
      ...prev,
      [taskId]: data.instructions || [],
    }));
  } catch (e) {
    console.error("Instructions fetch:", e);
    setProgramTaskInstructions((prev) => ({ ...prev, [taskId]: [] }));
  } finally {
    setLoadingInstructions(false);
  }
};

const handlePreviewInstruction = async (instruction: any) => {
  try {
    const res = await fetch(
      `${PROGRAM_API}/instructions/${instruction.id}/preview`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (!res.ok) throw new Error("Preview failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    setInstructionPreview({ url, file: instruction });
  } catch (e: any) {
    alert(e.message || "Failed to preview");
  }
};

const handleDownloadInstruction = async (instruction: any) => {
  try {
    const res = await fetch(
      `${PROGRAM_API}/instructions/${instruction.id}/download`,
      { headers: authHeaders() }
    );
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = instruction.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e.message || "Failed to download");
  }
};

const closeInstructionPreview = () => {
  if (instructionPreview?.url) {
    window.URL.revokeObjectURL(instructionPreview.url);
  }
  setInstructionPreview(null);
};



const handleProgramTaskStatusChange = async (
  taskId: string,
  status: TaskStatus
) => {
  try {
    const res = await fetch(`${PROGRAM_API}/${taskId}/status`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update status");
    }
    setProgramTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    setOpenTaskMenu(null);
  } catch (e: any) {
    alert(e.message || "Failed to update status");
  }
};

const handleDeleteProgramTask = async (taskId: string) => {
  if (!confirm("Delete this program task? This cannot be undone.")) return;
  try {
    const res = await fetch(`${PROGRAM_API}/${taskId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete");
    setProgramTasks((prev) => prev.filter((t) => t.id !== taskId));
  } catch (e: any) {
    alert(e.message || "Failed to delete");
  }
};

const openProgramTaskInstructions = async (task: ProgramTask) => {
  await fetchProgramTaskInstructions(task.id);
  setSelectedTaskForAttachment(task as any); // reuse the modal shell
  setAttachmentModalOpen(true);
};

/* ---- Challenges ---- */

const openProgramChallenges = async (task: ProgramTask) => {
  setSelectedChallengeTask(task as any);
  setChallengeModalOpen(true);
  // Adjust to program endpoint
  try {
    setLoadingChallenges(true);
    const res = await fetch(`${PROGRAM_API}/${task.id}/challenges`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    setChallenges(data.challenges || []);
  } finally {
    setLoadingChallenges(false);
  }
};

/* ---- Files ---- */

const openProgramAttachmentModal = async (task: ProgramTask) => {
  setSelectedTaskForAttachment(task as any);
  setAttachmentModalOpen(true);
  try {
    setLoadingAttachments(true);
    const res = await fetch(`${PROGRAM_API}/${task.id}/attachments`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    setAttachments((prev) => ({
      ...prev,
      [task.id]: data.attachments || [],
    }));
  } finally {
    setLoadingAttachments(false);
  }
};

/* ---- Submissions ---- */

const openProgramSubmissionModal = async (task: ProgramTask) => {
  setSelectedTaskForSubmission(task as any);
  setSubmissionModalOpen(true);
  try {
    const [subsRes, partsRes] = await Promise.all([
      fetch(`${PROGRAM_API}/${task.id}/submissions`, {
        headers: authHeaders(),
      }),
      fetch(`${PROGRAM_API}/${task.id}/work-parts`, {
        headers: authHeaders(),
      }),
    ]);
    const subs = await subsRes.json();
    const parts = await partsRes.json();
    setSubmissions((prev) => ({ ...prev, [task.id]: subs.submissions || [] }));
    setWorkParts((prev) => ({ ...prev, [task.id]: parts.workParts || [] }));
  } catch (e) {
    console.error(e);
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

  const openTaskDetails = (task: Task) => {
    setOpenTaskMenu(null);
    setSelectedTaskDetails(task);
  };

  const closeTaskDetails = () => {
    setSelectedTaskDetails(null);
  };

  // ====================================
// WORK PART API FUNCTIONS
// ====================================
const fetchWorkParts = async (taskId: string, basePath = API_BASE) => {
  try {
    setLoadingWorkParts(true);
    const url =
      basePath === PROGRAM_API
        ? `${PROGRAM_API}/${taskId}/work-parts`
        : `${API_BASE}/tasks/${taskId}/work-parts`;
    const response = await fetch(url, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to load work parts");
    }
    setWorkParts((prev) => ({ ...prev, [taskId]: data.workParts || [] }));
  } catch (error) {
    console.error("Fetch work parts error:", error);
    setWorkParts((prev) => ({ ...prev, [taskId]: [] }));
  } finally {
    setLoadingWorkParts(false);
  }
};

const handleAddWorkPart = async (taskId: string, basePath = API_BASE) => {
  if (!newPartTitle.trim()) {
    alert("Please provide a title for the work part.");
    return;
  }

  try {
    setSavingWorkPart(true);
    const url =
      basePath === PROGRAM_API
        ? `${PROGRAM_API}/${taskId}/work-parts`
        : `${API_BASE}/tasks/${taskId}/work-parts`;

    const response = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newPartTitle.trim(),
        description: newPartDescription.trim() || null,
        status: newPartStatus,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to create work part");
    }

    await fetchWorkParts(taskId, basePath);
    setNewPartTitle("");
    setNewPartDescription("");
    setNewPartStatus("To Do");
  } catch (error) {
    console.error("Add work part error:", error);
    alert(error instanceof Error ? error.message : "Failed to add work part");
  } finally {
    setSavingWorkPart(false);
  }
};

const handleUpdateWorkPartStatus = async (
    workPartId: string,
    newStatus: WorkPartStatus,
    taskId: string
) => {
    try {
        const response = await fetch(
            `${API_BASE}/work-parts/${workPartId}/status`,
            {
                method: "PATCH",
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus }),
            }
        );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to update status");
        }

        setWorkParts(prev => ({
            ...prev,
            [taskId]: (prev[taskId] || []).map(part =>
                part.id === workPartId ? { ...part, status: newStatus } : part
            )
        }));
    } catch (error) {
        console.error("Update work part status error:", error);
        alert(error instanceof Error ? error.message : "Failed to update status");
    }
};

const handleDeleteWorkPart = async (workPartId: string, taskId: string) => {
    const confirmed = window.confirm("Delete this work part?");
    if (!confirmed) return;

    try {
        setDeletingWorkPart(workPartId);
        const response = await fetch(
            `${API_BASE}/work-parts/${workPartId}`,
            {
                method: "DELETE",
                headers: authHeaders(),
            }
        );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to delete work part");
        }

        setWorkParts(prev => ({
            ...prev,
            [taskId]: (prev[taskId] || []).filter(p => p.id !== workPartId)
        }));
    } catch (error) {
        console.error("Delete work part error:", error);
        alert(error instanceof Error ? error.message : "Failed to delete work part");
    } finally {
        setDeletingWorkPart(null);
    }
};

const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        // =========================================================
        // ROLE-BASED STATUS RULES
        // =========================================================

        // ---------------------------------------------------------
        // MEMBER: can only set "In Progress" or "Completed"
        // Cannot set "Done"
        // Cannot move Completed back to To Do
        // ---------------------------------------------------------
        if (isMember) {
            if (status === "Done") {
                alert(
                    "Members cannot mark tasks as Done. Please mark the task as Completed and the Project Manager will review it."
                );
                return;
            }

            if (status === "To Do" && task.status === "Completed") {
                alert(
                    "You cannot move a Completed task back to To Do. Please contact your Project Manager."
                );
                return;
            }
        }

        // ---------------------------------------------------------
        // MANAGER: can set "Done" only if task is "Completed"
        // ---------------------------------------------------------
        if (isManagementRole) {
            if (status === "Done" && task.status !== "Completed") {
                alert(
                    "This task cannot be marked as Done yet. The assigned Member must first mark it as Completed."
                );
                return;
            }
        }

        // =========================================================
        // COMPLETED → requires: ≥1 work part AND (a Done part OR a link)
        // =========================================================
        if (status === "Completed") {
            // Ensure work parts + submissions are loaded for this task
            if (
                workParts[taskId] === undefined ||
                submissions[taskId] === undefined
            ) {
                await Promise.all([
                    fetchWorkParts(taskId),
                    fetchTaskSubmissions(taskId),
                ]);
            }

            const evidence = taskHasCompletionEvidence(taskId);
            if (!evidence.ok) {
                alert(evidence.reason || "Task cannot be marked as Completed yet.");
                return;
            }
        }

        // =========================================================
        // DONE → goes through the dedicated /mark-done endpoint
        // Backend enforces: task must be Completed, ≥1 work part,
        // and (a Done part OR a link)
        // =========================================================
        if (status === "Done") {
            // Ensure parts + submissions are loaded so we can pre-check locally
            if (
                workParts[taskId] === undefined ||
                submissions[taskId] === undefined
            ) {
                await Promise.all([
                    fetchWorkParts(taskId),
                    fetchTaskSubmissions(taskId),
                ]);
            }

            // Refresh the local evidence check using the latest loaded state
            const evidence = taskHasCompletionEvidence(taskId);
            if (!evidence.ok) {
                alert(evidence.reason || "Task cannot be marked as Done yet.");
                return;
            }

            const response = await fetch(
                `${API_BASE}/tasks/${taskId}/mark-done`,
                {
                    method: "PATCH",
                    headers: {
                        ...authHeaders(),
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || data.message || "Failed to mark task as Done"
                );
            }

            await fetchProjectsAndTasks();
            setOpenTaskMenu(null);
            return;
        }

        // =========================================================
        // OTHER STATUS CHANGES (To Do, In Progress)
        // =========================================================
        const response = await fetch(
            `${API_BASE}/tasks/${taskId}/status`,
            {
                method: "PATCH",
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || data.message || "Failed to update status"
            );
        }

        const updatedTask = normalizeTask(data.task || data);
        setTasks((previous) =>
            previous.map((t) =>
                t.id === taskId ? { ...t, ...updatedTask } : t
            )
        );
        setOpenTaskMenu(null);
    } catch (error: any) {
        console.error(error);
        alert(error.message || "Failed to update task status");
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

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-[0_4px_16px_rgba(37,99,235,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Visible projects</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-blue-950">{projects.length}</p>
                  <p className="mt-1 text-[10px] font-semibold text-blue-700/70">
                    {currentUser?.role === "System Administrator" || currentUser?.role === "Executive Manager"
                      ? "All projects"
                      : "Projects assigned to you"}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
                  <FolderKanban size={19} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 shadow-[0_4px_16px_rgba(124,58,237,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">Visible tasks</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-violet-950">{totalTasks}</p>
                  <p className="mt-1 text-[10px] font-semibold text-violet-700/70">Tasks available in your view</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100">
                  <ListTodo size={19} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-[0_4px_16px_rgba(16,185,129,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Completed</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-950">{completedTasks}</p>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700/70">
                    {totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}% of visible tasks` : "No tasks completed yet"}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <CheckCircle2 size={19} />
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
                Projects are shown according to your role. Click any task to view complete details.
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

          {/* =========================================================
    PROGRAM PROJECT TASKS  (green header, program tag)
========================================================= */}
{groupedProgramTasks.length > 0 && (
  <section className="mt-7">
    <div className="mb-3 flex items-center gap-2">
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
        <FolderKanban size={12} />
        Program Project Tasks
      </span>
      <p className="text-xs font-medium text-gray-600">
        Special tasks under programs. Header is green so they're easy to spot.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {groupedProgramTasks.map((group) => {
        const groupTasks = group.tasks;

        const doneCount = groupTasks.filter(
          (t) => t.status === "Done"
        ).length;

        const completedCount = groupTasks.filter(
          (t) => t.status === "Completed"
        ).length;

        const inProgressCount = groupTasks.filter(
          (t) => t.status === "In Progress"
        ).length;

        const progress = groupTasks.length
          ? Math.round((doneCount / groupTasks.length) * 100)
          : 0;

        const projectStatus =
          groupTasks.length > 0 && doneCount === groupTasks.length
            ? "Completed"
            : inProgressCount > 0 || completedCount > 0
            ? "In Progress"
            : "To Do";

        return (
          <article
            key={group.program_project_id}
            className="group overflow-visible rounded-2xl border border-emerald-200 bg-white shadow-[0_5px_22px_rgba(16,185,129,0.10)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,185,129,0.16)]"
          >
            {/* ============ GREEN HEADER ============ */}
            <div className="rounded-t-2xl bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-4 text-white sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-sm">
                  <FolderKanban size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Program
                    </span>
                    <span className="truncate text-[11px] font-bold text-emerald-50">
                      {group.program_name}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-base font-bold tracking-[-0.2px] sm:text-lg">
                    {group.program_project_name}
                  </h3>
                </div>

                <div className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-100">
                    Tasks
                  </p>
                  <p className="text-sm font-bold text-white">
                    {doneCount}/{groupTasks.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {/* Summary strip */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold ${
                      projectStatus === "Completed"
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : projectStatus === "In Progress"
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {projectStatus === "Completed" ? (
                      <Check size={11} />
                    ) : projectStatus === "In Progress" ? (
                      <Clock3 size={11} />
                    ) : (
                      <Circle size={11} />
                    )}
                    {projectStatus}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                    <ListTodo size={11} />
                    {groupTasks.length}{" "}
                    {groupTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="min-w-[38px] text-right text-[10px] font-bold text-emerald-800">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Tasks list */}
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-950">
                    Program Tasks
                  </h4>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    {groupTasks.length}{" "}
                    {groupTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => openTaskDetails(task)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openTaskDetails(task);
                        }
                      }}
                      className="group/task cursor-pointer rounded-xl border border-emerald-200 bg-white p-3.5 transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            task.status === "Done"
                              ? "bg-emerald-600 text-white"
                              : task.status === "Completed"
                              ? "bg-amber-50 text-amber-600"
                              : task.status === "In Progress"
                              ? "bg-green-100 text-green-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {task.status === "Done" ? (
                            <Check size={15} />
                          ) : task.status === "Completed" ? (
                            <CheckCircle2 size={15} />
                          ) : task.status === "In Progress" ? (
                            <Clock3 size={15} />
                          ) : (
                            <Circle size={15} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-950">
                                {task.name}
                              </p>
                              <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">
                                {task.description || "No description provided."}
                              </p>
                            </div>

                            <div
                              className="relative shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenTaskMenu(
                                    openTaskMenu === task.id ? null : task.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openTaskMenu === task.id && (
                                <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_35px_rgba(15,23,42,0.16)]">
                                  <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    Change status
                                  </p>
                                  {(isMember
                                    ? (["To Do", "In Progress", "Completed"] as const)
                                    : (["To Do", "In Progress", "Completed", "Done"] as const)
                                  ).map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() =>
                                        handleProgramTaskStatusChange(task.id, s)
                                      }
                                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${
                                        task.status === s
                                          ? "bg-emerald-50 text-emerald-900"
                                          : "text-slate-600 hover:bg-emerald-50/60"
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                  {isAdmin && (
                                    <>
                                      <div className="my-1 border-t border-slate-100" />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteProgramTask(task.id)
                                        }
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={12} />
                                        Delete program task
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <TaskStatusBadge status={task.status} />
                            <PriorityBadge priority={task.priority} />

                            {task.assignee_name && (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                                <Users size={11} />
                                {task.assignee_name}
                              </span>
                            )}

                            {task.due_date && (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                <Calendar size={11} />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>

                          {/* Action row — 5 buttons */}
                          <div className="mt-3 grid grid-cols-5 gap-2 border-t border-emerald-100 pt-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskDetails(task);
                              }}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#07111f] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#172235]"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            {/* Instructions */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProgramTaskInstructions(task);
                              }}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-emerald-800"
                            >
                              <FileText size={13} />
                              <span>Guide</span>
                              {(programTaskInstructions[task.id]?.length || 0) > 0 && (
                                <span className="flex min-w-[17px] items-center justify-center rounded-full bg-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-950">
                                  {programTaskInstructions[task.id]?.length || 0}
                                </span>
                              )}
                            </button>

                            {/* Work submissions */}
                            {canViewSubmissions(task) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProgramSubmissionModal(task);
                                }}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1a4a3a] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#23634b]"
                              >
                                <CheckCircle2 size={13} />
                                <span>Work</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            {/* Challenges */}
                            {canReadChallenge(task) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProgramChallenges(task);
                                }}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#31204f] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#432968]"
                              >
                                <Flag size={13} />
                                <span>Issues</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            {/* Files */}
                            {canReadAttachments(task) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProgramAttachmentModal(task);
                                }}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#49351b] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#60451f]"
                              >
                                <File size={13} />
                                <span>Files</span>
                              </button>
                            ) : (
                              <div />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  </section>
)}

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredProjects.map((project, projectIndex) => {
              const projectTasks = tasks.filter(
                (task) => String(task.project_id) === String(project.id)
              );

              const completedProjectTasks = projectTasks.filter(
                (task) => task.status === "Done"
              ).length;
              const inProgressProjectTasks = projectTasks.filter(
                (task) => task.status === "In Progress"
              ).length;
              const todoProjectTasks = projectTasks.filter(
                (task) => task.status === "To Do"
              ).length;
              const taskProgress = projectTasks.length
                ? Math.round((completedProjectTasks / projectTasks.length) * 100)
                : 0;

              const projectStatus =
                projectTasks.length > 0 && completedProjectTasks === projectTasks.length
                  ? "Completed"
                  : inProgressProjectTasks > 0
                    ? "In Progress"
                    : "To Do";

              return (
                <article
                  key={project.id}
                  className="group overflow-visible rounded-2xl border border-[#dce2e8] bg-white shadow-[0_5px_22px_rgba(20,34,50,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,34,50,0.10)]"
                >
                  {/* Project header */}
                  <div className="rounded-t-2xl bg-[#07111f] px-5 py-4 text-white sm:px-6">
                    <div className="flex items-center gap-3">
                      <ProjectLogo index={projectIndex} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Project
                        </p>
                        <h3 className="mt-0.5 truncate text-base font-bold tracking-[-0.2px] sm:text-lg">
                          {project.name}
                        </h3>
                        {project.domain && (
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-300">
                            {project.domain}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Tasks
                        </p>
                        <p className="text-sm font-bold text-white">
                          {completedProjectTasks}/{projectTasks.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    {/* Brief project info */}
                    <div className="rounded-xl border border-[#e5e9ee] bg-[#f8fafb] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold ${
                            projectStatus === "Completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : projectStatus === "In Progress"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {projectStatus === "Completed" ? (
                            <Check size={11} />
                          ) : projectStatus === "In Progress" ? (
                            <Clock3 size={11} />
                          ) : (
                            <Circle size={11} />
                          )}
                          {projectStatus}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700">
                          <Flag size={11} />
                          {project.priority || "Medium"} priority
                        </span>

                        {project.deadline && (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
                            <Calendar size={11} />
                            Due {formatDate(project.deadline)}
                          </span>
                        )}
                      </div>

                      {project.about_description && (
                        <p className="mt-3 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">
                          {project.about_description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${taskProgress}%` }}
                          />
                        </div>
                        <span className="min-w-[38px] text-right text-[10px] font-bold text-slate-700">
                          {taskProgress}%
                        </span>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-950">Tasks</h4>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            Click a task to view its complete details.
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}
                        </span>
                      </div>

                      {projectTasks.length > 0 ? (
                        <div className="space-y-2.5">
                          {projectTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => openTaskDetails(task)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openTaskDetails(task);
                                }
                              }}
                              className="group/task cursor-pointer rounded-xl border border-[#e1e6eb] bg-white p-3.5 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                              <div
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                task.status === "Done"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : task.status === "Completed"
                                    ? "bg-amber-50 text-amber-600"
                                    : task.status === "In Progress"
                                      ? "bg-blue-50 text-blue-600"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {task.status === "Done" ? (
                                <Check size={15} />
                              ) : task.status === "Completed" ? (
                                <CheckCircle2 size={15} />
                              ) : task.status === "In Progress" ? (
                                <Clock3 size={15} />
                              ) : (
                                <Circle size={15} />
                              )}
                            </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold text-slate-950">
                                        {task.name}
                                      </p>
                                      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">
                                        {task.description || "No description provided."}
                                      </p>
                                    </div>

                                    <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenTaskMenu(
                                            openTaskMenu === task.id ? null : task.id
                                          )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                                        title="Change task status"
                                      >
                                        <MoreVertical size={16} />
                                      </button>

                                      {openTaskMenu === task.id && (
                                        <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_35px_rgba(15,23,42,0.16)]">
                                          <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                            Change status
                                          </p>
                                        {/* Status options depend on role */}
                                        {(() => {
                                          // Members: To Do, In Progress, Completed
                                          // Managers: To Do, In Progress, Completed, Done
                                          const availableStatuses: TaskStatus[] = isMember
                                            ? ["To Do", "In Progress", "Completed"]
                                            : ["To Do", "In Progress", "Completed", "Done"];
                                        
                                          return availableStatuses.map((status) => (
                                            <button
                                              key={status}
                                              type="button"
                                              onClick={() =>
                                                handleTaskStatusChange(task.id, status as TaskStatus)
                                              }
                                              disabled={
                                                // Managers can only pick "Done" if task is Completed
                                                status === "Done" &&
                                                isManagementRole &&
                                                task.status !== "Completed"
                                              }
                                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${
                                                task.status === status
                                                  ? "bg-slate-100 text-slate-950"
                                                  : "text-slate-600 hover:bg-slate-50"
                                              } disabled:cursor-not-allowed disabled:opacity-40`}
                                              title={
                                                status === "Done" &&
                                                isManagementRole &&
                                                task.status !== "Completed"
                                                  ? "Waiting for Member to complete the task first"
                                                  : ""
                                              }
                                            >
                                              {status === "To Do" ? (
                                                <Circle size={12} />
                                              ) : status === "In Progress" ? (
                                                <Clock3 size={12} />
                                              ) : status === "Completed" ? (
                                                <CheckCircle2 size={12} />
                                              ) : (
                                                <Check size={12} />
                                              )}
                                              {status}
                                              {task.status === status && (
                                                <Check size={12} className="ml-auto" />
                                              )}
                                            </button>
                                          ));
                                        })()}

                                          {isAdmin && (
                                            <>
                                              <div className="my-1 border-t border-slate-100" />
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteTask(task.id)}
                                                disabled={deletingTask === task.id}
                                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                              >
                                                <Trash2 size={12} />
                                                {deletingTask === task.id ? "Deleting..." : "Delete task"}
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <TaskStatusBadge status={task.status} />
                                    <PriorityBadge priority={task.priority} />

                                    {task.assignee_name && (
                                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                        <Users size={11} />
                                        {task.assignee_name}
                                      </span>
                                    )}

                                    {task.due_date && (
                                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                        <Calendar size={11} />
                                        {formatDate(task.due_date)}
                                      </span>
                                    )}
                                  </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-2.5">
    {/* View Task Details */}
    <button
        type="button"
        onClick={(event) => {
            event.stopPropagation();
            openTaskDetails(task);
        }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#07111f] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#172235]"
    >
        <Eye size={13} />
        <span>Details</span>
    </button>

    {/* Work Submissions */}
  {canViewSubmissions(task) ? (
    <button
        type="button"
        onClick={(event) => {
            event.stopPropagation();
            openSubmissionModal(task);
        }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1a4a3a] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#23634b]"
        title={
            canSubmitWork(task)
                ? hasSubmissions(task.id) ||
                  (workParts[task.id]?.length || 0) > 0
                    ? "You have submitted work — view or add another version"
                    : "Submit your work"
                : "View work submissions"
        }
    >
        <CheckCircle2 size={13} />
        <span>
            {canSubmitWork(task)
                ? hasSubmissions(task.id) ||
                  (workParts[task.id]?.length || 0) > 0
                    ? "Submitted Work"
                    : "Submit Work"
                : "Work"}
        </span>
        {(hasSubmissions(task.id) ||
            (workParts[task.id]?.length || 0) > 0) && (
            <span className="flex min-w-[17px] items-center justify-center rounded-full bg-emerald-300 px-1.5 py-0.5 text-[9px] font-bold text-emerald-950">
                {(submissions[task.id]?.length || 0) +
                    (workParts[task.id]?.length || 0)}
            </span>
        )}
    </button>
) : (
    <div />
)}
    {/* Challenges */}
    {canReadChallenge(task) ? (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                openChallenges(task);
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#31204f] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#432968]"
        >
            <Flag size={13} />
            <span>Challenges</span>
            {challengeCounts[task.id] !== undefined && (
                <span className="flex min-w-[17px] items-center justify-center rounded-full bg-violet-300 px-1.5 py-0.5 text-[9px] font-bold text-violet-950">
                    {challengeCounts[task.id]}
                </span>
            )}
        </button>
    ) : (
        <div />
    )}

    {/* Files */}
    {canReadAttachments(task) ? (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                openAttachmentModal(task);
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#49351b] px-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#60451f]"
        >
            <File size={13} />
            <span>Files</span>
            {(attachments[task.id]?.length || 0) > 0 && (
                <span className="flex min-w-[17px] items-center justify-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-950">
                    {attachments[task.id]?.length || 0}
                </span>
            )}
        </button>
    ) : (
        <div />
    )}
</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                            <ListTodo size={17} />
                          </div>
                          <p className="mt-3 text-sm font-bold text-slate-900">No tasks yet</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Add a task to start tracking work for this project.
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openAddTask(project.id)}
                              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07111f] px-3.5 text-xs font-bold text-white hover:bg-[#111c2c]"
                            >
                              <Plus size={13} />
                              Add task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
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
      {/* TASK + PROJECT DETAILS MODAL */}
   {selectedTaskDetails && (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-[3px]"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeTaskDetails();
    }}
  >
    {(() => {
      const task = selectedTaskDetails;
      const isProgramTask = Boolean((task as any).program_project_id);

      /* ============================================================
         PROGRAM TASK DETAILS — green header, objectives, instructions
      ============================================================ */
      if (isProgramTask) {
        const pTask = task as ProgramTask;
        const instructions = programTaskInstructions[pTask.id] || [];

        return (
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
            {/* GREEN HEADER */}
            <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Program
                    </span>
                    <span className="truncate text-[11px] font-bold text-emerald-50">
                      {pTask.program_name || "—"}
                    </span>
                  </div>
                  <h2 className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">
                    {pTask.name}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-50">
                    <FolderKanban size={13} />
                    <span className="truncate">
                      {pTask.program_project_name || "Program Project"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeTaskDetails}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/20"
                  aria-label="Close task details"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto bg-[#f4f6f8] p-5 sm:p-6">
              {/* Status / Priority / Assignee / Deadline */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="mt-2">
                    <TaskStatusBadge status={pTask.status} />
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Priority
                  </p>
                  <div className="mt-2">
                    <PriorityBadge priority={pTask.priority} />
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Assignee
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Users size={14} className="text-slate-500" />
                    {pTask.assignee_name || "Unassigned"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Deadline
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Calendar size={14} className="text-slate-500" />
                    {pTask.due_date ? formatDate(pTask.due_date) : "No deadline"}
                  </p>
                </div>
              </div>

              {/* DESCRIPTION */}
              <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <ListTodo size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Task description
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500">
                      What needs to be completed
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3.5">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                    {pTask.description || "No description provided for this task."}
                  </p>
                </div>
              </section>

              {/* OBJECTIVES */}
              {pTask.objectives && (
                <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Target size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Objectives
                      </h3>
                      <p className="text-[10px] font-medium text-slate-500">
                        What this task aims to achieve
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3.5">
                    <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                      {pTask.objectives}
                    </p>
                  </div>
                </section>
              )}

              {/* INSTRUCTION FILES */}
              <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Instruction files
                      </h3>
                      <p className="text-[10px] font-medium text-slate-500">
                        Guides and references provided by the manager
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                    {instructions.length} file{instructions.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {loadingInstructions ? (
                    <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-gray-200 bg-white">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-700" />
                    </div>
                  ) : instructions.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-center">
                      <p className="text-xs font-bold text-emerald-900">
                        No instruction files attached
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-emerald-700/80">
                        Managers have not uploaded any reference material yet.
                      </p>
                    </div>
                  ) : (
                    instructions.map((ins: any) => (
                      <div
                        key={ins.id}
                        className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-white p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          {getFileIcon(ins.file_type || "")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-950">
                            {ins.file_name}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                            {formatFileSize(ins.file_size || 0)}
                            {ins.created_at
                              ? ` • ${formatDate(ins.created_at)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePreviewInstruction(ins)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="Preview"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadInstruction(ins)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* PROGRAM PROJECT INFO */}
              <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FolderKanban size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Program project information
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500">
                      Where this task lives
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-emerald-50/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      Program
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {pTask.program_name || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50/40 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      Program project
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {pTask.program_project_name || "—"}
                    </p>
                  </div>
                  {pTask.program_project_domain && (
                    <div className="rounded-lg bg-emerald-50/40 p-3 sm:col-span-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                        Domain
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {pTask.program_project_domain}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* TIMELINE */}
              <section className="mt-4 rounded-xl border border-emerald-100 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-950">
                  Task timeline
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Calendar size={15} className="text-slate-500" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Start date
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                        {pTask.start_date
                          ? formatDate(pTask.start_date)
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Calendar size={15} className="text-slate-500" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Due date
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                        {pTask.due_date
                          ? formatDate(pTask.due_date)
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex justify-end border-t border-emerald-100 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeTaskDetails}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 px-5 text-sm font-bold text-white shadow-sm transition hover:from-emerald-700 hover:to-green-800"
              >
                <Eye size={15} />
                Close details
              </button>
            </div>
          </div>
        );
      }

      /* ============================================================
         REGULAR TASK DETAILS — original behavior
      ============================================================ */
      const project = projects.find(
        (item) => String(item.id) === String(task.project_id)
      );

      if (!project) return null;

      return (
        <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
          <div className="shrink-0 bg-[#07111f] px-5 py-5 text-white sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Task details
                </p>
                <h2 className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl">
                  {task.name}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-300">
                  <FolderKanban size={13} />
                  <span className="truncate">{project.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeTaskDetails}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
                aria-label="Close task details"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto bg-[#f4f6f8] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-2"><TaskStatusBadge status={task.status} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
                <div className="mt-2"><PriorityBadge priority={task.priority} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assignee</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Users size={14} className="text-slate-500" />
                  {task.assignee_name || "Unassigned"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Deadline</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Calendar size={14} className="text-slate-500" />
                  {task.due_date ? formatDate(task.due_date) : "No deadline"}
                </p>
              </div>
            </div>

            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <ListTodo size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Task description</h3>
                  <p className="text-[10px] font-medium text-slate-500">What needs to be completed</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
                <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                  {task.description || "No description provided for this task."}
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <FolderKanban size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Project information</h3>
                  <p className="text-[10px] font-medium text-slate-500">Project this task belongs to</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{project.name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project deadline</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {project.deadline ? formatDate(project.deadline) : "No deadline"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project priority</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{project.priority || "Medium"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project progress</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{project.progress ?? 0}%</p>
                </div>
              </div>

              {project.about_description && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">About project</p>
                  <p className="mt-1.5 text-xs font-medium leading-5 text-slate-600">
                    {project.about_description}
                  </p>
                </div>
              )}
            </section>

            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-950">Task timeline</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Calendar size={15} className="text-slate-500" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Start date</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-800">
                      {task.start_date ? formatDate(task.start_date) : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Calendar size={15} className="text-slate-500" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Due date</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-800">
                      {task.due_date ? formatDate(task.due_date) : "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={closeTaskDetails}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#111c2c]"
            >
              <Eye size={15} />
              Close details
            </button>
          </div>
        </div>
      );
    })()}
  </div>
)}

{/* INSTRUCTION PREVIEW MODAL */}
{instructionPreview && (
  <div
    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[2px]"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) closeInstructionPreview();
    }}
  >
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-3 text-white">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">
            {instructionPreview.file?.file_name}
          </h2>
          <p className="mt-0.5 text-[11px] text-emerald-50">
            {formatFileSize(instructionPreview.file?.file_size || 0)}
          </p>
        </div>
        <button
          onClick={closeInstructionPreview}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-gray-50 p-4 sm:p-6">
        {instructionPreview.file?.file_type === "pdf" ||
        instructionPreview.file?.file_type === "txt" ? (
          <iframe
            src={instructionPreview.url!}
            title={instructionPreview.file?.file_name}
            className="h-[65vh] min-h-[450px] w-full rounded-lg border-2 border-gray-300 bg-white"
          />
        ) : (
          <div className="flex min-h-[450px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <FileText size={24} className="text-emerald-700" />
            </div>
            <p className="mt-4 text-sm font-bold text-gray-950">
              Preview is not available
            </p>
            <p className="mt-2 max-w-md text-xs font-medium text-gray-600">
              {instructionPreview.file?.file_name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              DOC and DOCX files can be downloaded and opened in Word.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-emerald-100 bg-white px-5 py-4">
        <button
          onClick={() => {
            if (instructionPreview.file) {
              handleDownloadInstruction(instructionPreview.file);
            }
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
        >
          <Download size={15} />
          Download
        </button>
        <button
          onClick={closeInstructionPreview}
          className="h-10 rounded-lg border-2 border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

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

                  
                {/* ✅ FILTER TO SHOW ONLY MEMBERS */}
                {users
                  .filter((user) => user.role === "Member")
                  .map((user) => (
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

      {/* Task Submission Modal*/}
      {/* WORK SUBMISSION MODAL */}
{submissionModalOpen && selectedTaskForSubmission && (
    <div
        className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-[2px]"
        onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingSubmission) {
                closeSubmissionModal();
            }
        }}
    >
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-gray-500 bg-white shadow-2xl">
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                <CheckCircle2 size={16} className="text-emerald-700" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-bold text-gray-950">
                                    Task Submissions
                                </h2>
                                <p className="truncate text-[14px] text-gray-500">
                                    {selectedTaskForSubmission?.name}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeSubmissionModal}
                        disabled={savingSubmission}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

           <div className="overflow-y-auto bg-[#eef1f4] px-6 py-6">
    {/* ========================================================= */}
    {/* WORK PARTS SECTION                                        */}
    {/* ========================================================= */}
    <div>
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-bold text-gray-950">
                    Task Breakdown
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600">
                    Break down this task into parts. All parts are visible to managers for tracking.
                </p>
            </div>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[12px] font-bold text-slate-700">
                {(workParts[selectedTaskForSubmission.id]?.length || 0)} Part
                {(workParts[selectedTaskForSubmission.id]?.length || 0) !== 1 ? "s" : ""}
            </span>
        </div>

        <div className="mt-4 space-y-3">
            {loadingWorkParts ? (
                <div className="flex min-h-[100px] items-center justify-center rounded-xl border-2 border-gray-300 bg-white">
                    <div className="text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                        <p className="mt-2 text-xs font-semibold text-gray-600">
                            Loading task steps...
                        </p>
                    </div>
                </div>
            ) : (workParts[selectedTaskForSubmission.id]?.length || 0) === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-400 bg-white px-5 py-8 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <ListTodo size={18} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-gray-950">
                        No task parts yet
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                        Add at least one part below to describe what you did.
                    </p>
                </div>
            ) : (
                (workParts[selectedTaskForSubmission.id] || []).map((part, index) => (
                    <div
                        key={part.id}
                        className="rounded-xl border-2 border-gray-300 bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                                {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-950">
                                            {part.title}
                                        </p>
                                        {part.description && (
                                            <p className="mt-1 text-xs font-medium text-gray-700 whitespace-pre-wrap">
                                                {part.description}
                                            </p>
                                        )}
                                        <p className="mt-1.5 text-[10px] font-medium text-gray-500">
                                            By {part.creator_name || "User"}
                                            {part.creator_role ? ` (${part.creator_role})` : ""}
                                            {part.created_at ? ` • ${formatDate(part.created_at)}` : ""}
                                        </p>
                                    </div>

                                    {(String(part.created_by) === String(currentUser?.id) ||
                                        isManagementRole) && (
                                        <button
                                            onClick={() =>
                                                handleDeleteWorkPart(part.id, selectedTaskForSubmission.id)
                                            }
                                            disabled={deletingWorkPart === part.id}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                            title="Delete work part"
                                        >
                                            {deletingWorkPart === part.id ? (
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Status selector */}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {(["To Do", "Pending", "Done"] as WorkPartStatus[]).map((s) => {
                                        const isActive = part.status === s;
                                        const styleMap: Record<WorkPartStatus, string> = {
                                            "To Do": isActive
                                                ? "border-slate-500 bg-slate-900 text-white"
                                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                                            "Pending": isActive
                                                ? "border-amber-500 bg-amber-500 text-white"
                                                : "border-amber-300 bg-white text-amber-700 hover:bg-amber-50",
                                            "Done": isActive
                                                ? "border-emerald-500 bg-emerald-500 text-white"
                                                : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
                                        };
                                        const canEdit =
                                            String(part.created_by) === String(currentUser?.id) ||
                                            String(selectedTaskForSubmission.assignee_id) === String(currentUser?.id) ||
                                            isManagementRole;
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                disabled={!canEdit}
                                                onClick={() =>
                                                    handleUpdateWorkPartStatus(
                                                        part.id,
                                                        s,
                                                        selectedTaskForSubmission.id
                                                    )
                                                }
                                                className={`rounded-md border px-2.5 py-1 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${styleMap[s]}`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Add work part form */}
        {(canSubmitWork(selectedTaskForSubmission) || isManagementRole) && (
            <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                        <Plus size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-950">
                            Add a task work 
                        </h4>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-gray-700">
                            Break down the task into smaller pieces. Each part has its own status
                            that can be tracked by managers.
                        </p>
                        <div className="mt-3 space-y-2">
                            <input
                                type="text"
                                value={newPartTitle}
                                onChange={(e) => setNewPartTitle(e.target.value)}
                                placeholder="Part title (e.g., Implement login API)"
                                className="h-10 w-full rounded-lg border-2 border-gray-400 bg-white px-3 text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                            <textarea
                                value={newPartDescription}
                                onChange={(e) => setNewPartDescription(e.target.value)}
                                placeholder="Optional: Describe this part..."
                                rows={2}
                                className="w-full resize-none rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-950 outline-none placeholder:text-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                    Initial status:
                                </label>
                                <select
                                    value={newPartStatus}
                                    onChange={(e) =>
                                        setNewPartStatus(e.target.value as WorkPartStatus)
                                    }
                                    className="h-9 rounded-lg border-2 border-gray-400 bg-white px-2 text-xs font-bold text-gray-950 outline-none focus:border-blue-600"
                                >
                                    <option value="To Do">To Do</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Done">Done</option>
                                </select>
                                <div className="ml-auto">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleAddWorkPart(selectedTaskForSubmission.id)
                                        }
                                        disabled={savingWorkPart || !newPartTitle.trim()}
                                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {savingWorkPart ? (
                                            <>
                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={13} />
                                                Add part
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>

    {/* ========================================================= */}
    {/* SUBMISSIONS SECTION                                       */}
    {/* ========================================================= */}
    <div className="mt-6">
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-bold text-gray-950">
                    Submitted Links
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600">
                    Optional links and descriptions.
                </p>
            </div>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-800">
                {submissions[selectedTaskForSubmission.id]?.length || 0} Submission
                {(submissions[selectedTaskForSubmission.id]?.length || 0) !== 1 ? "s" : ""}
            </span>
        </div>

        <div className="mt-4 space-y-3">
            {loadingSubmissions ? (
                <div className="flex min-h-[100px] items-center justify-center rounded-xl border-2 border-gray-300 bg-white">
                    <div className="text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                        <p className="mt-2 text-xs font-semibold text-gray-600">
                            Loading submissions...
                        </p>
                    </div>
                </div>
            ) : (submissions[selectedTaskForSubmission.id]?.length || 0) === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-400 bg-white px-5 py-6 text-center">
                    <p className="text-sm font-bold text-gray-950">
                        No submissions yet
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                        {canSubmitWork(selectedTaskForSubmission)
                            ? "Add work parts above, then submit below."
                            : "The assignee has not submitted work yet."}
                    </p>
                </div>
            ) : (
                (submissions[selectedTaskForSubmission.id] || []).map((submission, index) => (
                    <div
                        key={submission.id}
                        className="rounded-xl border-2 border-gray-300 bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
                                #{index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {submission.link ? (
                                            <a
                                                href={submission.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline break-all"
                                            >
                                                {submission.link}
                                            </a>
                                        ) : (
                                            <p className="text-xs font-medium italic text-gray-500">
                                                No link provided — work parts above describe this submission.
                                            </p>
                                        )}
                                        {submission.description && (
                                            <p className="mt-1.5 text-sm font-medium text-gray-700">
                                                {submission.description}
                                            </p>
                                        )}
                                        <p className="mt-1.5 text-[12px] font-medium text-gray-500">
                                            Submitted by {submission.submitter_name || "User"} • Version {submission.version} • {formatDate(submission.created_at)}
                                        </p>
                                    </div>

                                    {canDeleteSubmission(submission) && (
                                        <button
                                            onClick={() => handleDeleteSubmission(submission.id)}
                                            disabled={deletingSubmission === submission.id}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                            title="Delete submission"
                                        >
                                            {deletingSubmission === submission.id ? (
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
                ))
            )}
        </div>
    </div>

    {/* ========================================================= */}
    {/* SUBMIT FORM (assignee Member only)                        */}
    {/* ========================================================= */}
    {canSubmitWork(selectedTaskForSubmission) && (
        <div className="mt-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                    <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-gray-950">
                        Submit Your Links
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-gray-700">
                        Add at least one work part above. Links below are optional but
                        helpful for managers to review your work.
                    </p>

                    {/* Warning if no work parts */}
                    {(workParts[selectedTaskForSubmission.id]?.length || 0) === 0 && (
                        <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2">
                            <p className="text-[11px] font-bold text-amber-900">
                                ⚠️ You must add at least one work part before submitting.
                            </p>
                        </div>
                    )}

                    <div className="mt-4 space-y-3">
                        <input
                            type="url"
                            value={submissionLink}
                            onChange={(event) => setSubmissionLink(event.target.value)}
                            placeholder="https://drive.google.com/... (optional)"
                            className="h-11 w-full rounded-lg border-2 border-gray-400 bg-white px-3.5 text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                        <textarea
                            value={submissionDescription}
                            onChange={(event) => setSubmissionDescription(event.target.value)}
                            placeholder="Optional: Describe what was completed or provide additional context..."
                            rows={2}
                            className="w-full resize-none rounded-lg border-2 border-gray-400 bg-white px-3.5 py-3 text-sm font-medium text-gray-950 outline-none placeholder:text-gray-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleAddSubmission(selectedTaskForSubmission.id)}
                                disabled={
                                    savingSubmission ||
                                    (workParts[selectedTaskForSubmission.id]?.length || 0) === 0
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {savingSubmission ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={15} />
                                        Submit Work
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )}

    {/* Management Info */}
    {isManagementRole && selectedTaskForSubmission && (
        <div className="mt-3 rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
            <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                    <Users size={15} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-950">
                        Management View
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-700">
                        {selectedTaskForSubmission.assignee_name || "The assignee"} has added{" "}
                        {(workParts[selectedTaskForSubmission.id]?.length || 0)} work part
                        {(workParts[selectedTaskForSubmission.id]?.length || 0) !== 1 ? "s" : ""} and{" "}
                        {(submissions[selectedTaskForSubmission.id]?.length || 0)} submission
                        {(submissions[selectedTaskForSubmission.id]?.length || 0) !== 1 ? "s" : ""}.
                        You can update any work part status and mark the task as Done once work meets requirements.
                    </p>
                </div>
            </div>
        </div>
    )}
</div>

            {/* Footer */}
            <div className="flex justify-end border-t-2 border-gray-300 bg-[#f5f6f8] px-6 py-4">
                <button
                    onClick={closeSubmissionModal}
                    disabled={savingSubmission}
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
         <div className="flex-1 min-h-0 overflow-auto bg-gray-50 p-4 sm:p-6">

    {previewLoading ? (

        <div className="flex min-h-[450px] items-center justify-center">

            <div className="text-center">

                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

                <p className="mt-3 text-xs font-semibold text-gray-600">

                    Loading file preview...

                </p>

            </div>

        </div>

    ) : previewBlobUrl ? (

        selectedAttachmentForPreview.file_type.toLowerCase() ===

            "pdf" ? (

            <iframe

                src={previewBlobUrl}

                title={selectedAttachmentForPreview.file_name}

                className="h-[65vh] min-h-[450px] w-full rounded-lg border-2 border-gray-300 bg-white"

            />

        ) : selectedAttachmentForPreview.file_type.toLowerCase() ===

              "txt" ? (

            <iframe

                src={previewBlobUrl}

                title={selectedAttachmentForPreview.file_name}

                className="h-[65vh] min-h-[450px] w-full rounded-lg border-2 border-gray-300 bg-white"

            />

        ) : (

            <div className="flex min-h-[450px] flex-col items-center justify-center text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">

                    {getFileIcon(

                        selectedAttachmentForPreview.file_type

                    )}

                </div>

                <p className="mt-4 text-sm font-bold text-gray-950">

                    Preview is not available

                </p>

                <p className="mt-2 max-w-md text-xs font-medium text-gray-600">

                    {selectedAttachmentForPreview.file_name}

                </p>

                <p className="mt-1 text-xs text-gray-500">

                    DOC and DOCX files can be downloaded and opened

                    in Microsoft Word.

                </p>

            </div>

        )

    ) : (

        <div className="flex min-h-[450px] flex-col items-center justify-center text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">

                <FileText size={24} className="text-red-700" />

            </div>

            <p className="mt-4 text-sm font-bold text-gray-950">

                Unable to load preview

            </p>

            <p className="mt-2 text-xs text-gray-600">

                The file could not be retrieved from the server.

            </p>

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
