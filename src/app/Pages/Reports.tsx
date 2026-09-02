"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    FileText,
    FileType,
    Plus,
    Search,
    Download,
    Eye,
    X,
    Calendar,
    User,
    CheckCircle2,
    Clock3,
    Circle,
    FolderKanban,
    ClipboardList,
    BarChart3,
    Sparkles,
    Upload,
    Paperclip,
    File,
    RefreshCw,
    AlertCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

type ReportFormat = "PDF" | "Word";

type TaskStatus = "To Do" | "In Progress" | "Done";

type ProjectStatus = "Unassigned" | "Backlog" | "In Progress" | "Paused" | "Done";

type Task = {
    id: string;
    title: string;
    status: TaskStatus;
    priority: "Low" | "Medium" | "High";
    dueDate: string;
    assignee: string;
    assigneeId?: string;
};

type ReportFile = {
    id?: string;
    originalName: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    url: string;
};

type ProjectReport = {
    id: string;
    title: string;
    content: string;
    format: ReportFormat;
    submittedBy?: string;
    submittedByName?: string;
    createdAt?: string;
    updatedAt?: string;
};

type Project = {
    id: string;
    name: string;
    domain?: string;
    aboutTitle?: string;
    aboutDescription?: string;
    status: ProjectStatus;
    priority: "Low" | "Medium" | "High";
    manager?: string;
    managerId?: string;
    startDate?: string;
    deadline?: string;
    progress: number;
    totalTasks: number;
    completedTasks: number;
    tasks: Task[];
    report: ProjectReport | null;
    reportStatus: "Done" | "Pending";
    files?: ReportFile[];
};

type CreatedReport = {
    id: string;
    title: string;
    targetName: string;
    targetType: "Project" | "Task";
    format: ReportFormat;
    content: string;
    createdAt: string;
    projectId: string;
};

type Permissions = {
    canCreateReport: boolean;
    canEditReport: boolean;
    canDeleteReport: boolean;
    canDownloadReport: boolean;
};

type ReportOverviewResponse = {
    success: boolean;
    message?: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    permissions: Permissions;
    summary: {
        totalProjects: number;
        completedReports: number;
        pendingReports: number;
    };
    completedReports: Project[];
    pendingReports: Project[];
    projects: Project[];
};

// =========================================================
// API
// =========================================================

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

// =========================================================
// HELPERS
// =========================================================

const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
};

const formatDate = (date?: string) => {
    if (!date) return "N/A";
    try {
        return new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return date;
    }
};

const normalizeProject = (project: any): Project => {
    const tasks = Array.isArray(project.tasks) ? project.tasks : [];

    return {
        id: String(project.id),
        name: project.name || "Unnamed Project",
        domain: project.domain,
        aboutTitle: project.aboutTitle,
        aboutDescription: project.aboutDescription,
        status: project.status || "Unassigned",
        priority: project.priority || "Medium",
        manager:
            project.projectManager?.name ||
            project.manager ||
            project.projectManagerName ||
            "Unassigned",
        managerId:
            project.projectManager?.id ||
            project.managerId ||
            project.projectManagerId,
        startDate: project.startDate || project.start_date,
        deadline: project.deadline,
        progress: Number(project.progress || 0),
        totalTasks: Number(project.totalTasks ?? tasks.length ?? 0),
        completedTasks: Number(
            project.completedTasks ??
            tasks.filter((task: any) => task.status === "Done").length ??
            0
        ),
        tasks: tasks.map(
            (task: any): Task => ({
                id: String(task.id),
                title: task.title || task.name || "Untitled Task",
                status: task.status || "To Do",
                priority: task.priority || "Medium",
                dueDate: task.dueDate || task.due_date || "N/A",
                assignee:
                    task.assignee ||
                    task.assigneeName ||
                    task.assignee_name ||
                    "Unassigned",
                assigneeId: task.assigneeId || task.assignee_id,
            })
        ),
        report: project.report
            ? {
                  id: String(project.report.id),
                  title: project.report.title || "Project Report",
                  content: project.report.content || "",
                  format: project.report.format === "Word" ? "Word" : "PDF",
                  submittedBy: project.report.submittedBy,
                  submittedByName: project.report.submittedByName,
                  createdAt: project.report.createdAt,
                  updatedAt: project.report.updatedAt,
              }
            : null,
        reportStatus: project.reportStatus || (project.report ? "Done" : "Pending"),
        files: project.files || [],
    };
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Reports() {
    // =====================================================
    // STATE
    // =====================================================

    const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
    const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [currentUser, setCurrentUser] = useState<{
        id: string;
        name: string;
        email: string;
        role: string;
    } | null>(null);

    const [permissions, setPermissions] = useState<Permissions>({
        canCreateReport: false,
        canEditReport: false,
        canDeleteReport: false,
        canDownloadReport: false,
    });

    const [search, setSearch] = useState("");
    const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

    // Report Editor State
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [reportTitle, setReportTitle] = useState("");
    const [reportContent, setReportContent] = useState("");
    const [reportFormat, setReportFormat] = useState<ReportFormat>("PDF");
    const [savingReport, setSavingReport] = useState(false);

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<ReportFile | null>(null);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Preview State
    const [previewReport, setPreviewReport] = useState<CreatedReport | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // =====================================================
    // FETCH REPORTS
    // =====================================================

    const fetchReports = async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");
            const token = getToken();

            if (!token) {
                throw new Error("Authentication token not found. Please login again.");
            }

            const response = await fetch(`${API_BASE}/reports`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            let data: ReportOverviewResponse;

            try {
                data = await response.json();
            } catch {
                throw new Error(`Server returned invalid response (${response.status})`);
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || `Failed to load reports (${response.status})`);
            }

            setCurrentUser(data.user);
            setPermissions(
                data.permissions || {
                    canCreateReport: false,
                    canEditReport: false,
                    canDeleteReport: false,
                    canDownloadReport: false,
                }
            );

            const allProjects = (data.projects || []).map(normalizeProject);

            // Split into pending and completed
            const pending = allProjects.filter((p) => p.reportStatus === "Pending");
            const completed = allProjects.filter((p) => p.reportStatus === "Done");

            setPendingProjects(pending);
            setCompletedProjects(completed);

            // Auto-expand first two pending projects for PM
            if (permissions.canCreateReport && pending.length > 0) {
                setExpandedProjects(pending.slice(0, 2).map((p) => p.id));
            }
        } catch (err: any) {
            console.error("fetchReports error:", err);
            setError(err.message || "Failed to load reports");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // =====================================================
    // FILTERS
    // =====================================================

    const filteredPendingProjects = useMemo(() => {
        if (!search.trim()) return pendingProjects;

        const query = search.toLowerCase().trim();
        return pendingProjects
            .map((project) => ({
                ...project,
                tasks: project.tasks.filter(
                    (task) =>
                        task.title.toLowerCase().includes(query) ||
                        task.assignee.toLowerCase().includes(query)
                ),
            }))
            .filter(
                (project) =>
                    project.name.toLowerCase().includes(query) ||
                    project.manager?.toLowerCase().includes(query) ||
                    project.tasks.length > 0
            );
    }, [pendingProjects, search]);

    const filteredCompletedProjects = useMemo(() => {
        if (!search.trim()) return completedProjects;

        const query = search.toLowerCase().trim();
        return completedProjects.filter(
            (project) =>
                project.name.toLowerCase().includes(query) ||
                project.manager?.toLowerCase().includes(query)
        );
    }, [completedProjects, search]);

    // =====================================================
    // HANDLERS
    // =====================================================

    const toggleProject = (id: string) => {
        setExpandedProjects((current) =>
            current.includes(id) ? current.filter((pid) => pid !== id) : [...current, id]
        );
    };

    const handleCreateReport = (project: Project) => {
        setSelectedProject(project);
        setReportTitle(`${project.name} - Report`);
        setReportContent(
            `Project Report

Project: ${project.name}
Manager: ${project.manager || "Unassigned"}
Status: ${project.status}
Priority: ${project.priority}
Progress: ${project.progress}%
Start Date: ${formatDate(project.startDate)}
Deadline: ${formatDate(project.deadline)}

Overview:
[Add project overview here]

Progress:
[Describe progress made]

Risks & Blockers:
[List any risks or blockers]

Next Steps:
[Outline next steps]`
        );
        setReportFormat("PDF");
        setUploadedFile(null);
        setSelectedFile(null);
        setUploadError("");
        setShowPreview(false);
        setPreviewReport(null);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadError("");

        // Check file type - only PDF and Word
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!allowedTypes.includes(file.type)) {
            setUploadError("Only PDF and Word documents are allowed.");
            event.target.value = "";
            return;
        }

        // Check file size - 10 MB max
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("File size must be less than 10 MB.");
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
        setUploadedFile(null);
    };

    const handleFileUpload = async () => {
        if (!selectedProject) {
            setUploadError("Please select a project first.");
            return;
        }

        if (!permissions.canCreateReport) {
            setUploadError("Only Project Managers can upload files.");
            return;
        }

        if (!selectedFile) {
            setUploadError("Please select a file first.");
            return;
        }

        try {
            setUploadingFile(true);
            setUploadError("");

            const token = getToken();
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("projectId", String(selectedProject.id));

            const response = await fetch(
                `${API_BASE}/reports/project/${selectedProject.id}/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            let data: any;
            try {
                data = await response.json();
            } catch {
                throw new Error(`Server returned invalid response (${response.status})`);
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to upload file");
            }

            const fileData: ReportFile = {
                id: data.file?.id || data.file?.fileId,
                originalName: data.file?.originalName || data.file?.original_name || selectedFile.name,
                fileName: data.file?.fileName || data.file?.file_name,
                mimeType: data.file?.mimeType || data.file?.mime_type || selectedFile.type,
                size: data.file?.size || selectedFile.size,
                url: data.file?.url || "",
            };

            setUploadedFile(fileData);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            alert("File uploaded successfully.");
        } catch (error: any) {
            console.error("File upload error:", error);
            setUploadError(error.message || "Failed to upload file");
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSaveReport = async () => {
        if (!selectedProject) {
            alert("Please select a project.");
            return;
        }

        if (!permissions.canCreateReport) {
            alert("Only Project Managers can create reports.");
            return;
        }

        if (!reportTitle.trim()) {
            alert("Please enter a report title.");
            return;
        }

        if (!reportContent.trim()) {
            alert("Please enter report content.");
            return;
        }

        try {
            setSavingReport(true);
            const token = getToken();

            const response = await fetch(
                `${API_BASE}/reports/project/${selectedProject.id}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: reportTitle.trim(),
                        content: reportContent.trim(),
                        format: reportFormat,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to save report");
            }

            const newReport: CreatedReport = {
                id: String(data.report?.id || Date.now()),
                title: data.report?.title || reportTitle,
                targetName: selectedProject.name,
                targetType: "Project",
                format: data.report?.format || reportFormat,
                content: data.report?.content || reportContent,
                createdAt: data.report?.created_at || new Date().toISOString(),
                projectId: selectedProject.id,
            };

            setPreviewReport(newReport);
            setShowPreview(true);

            await fetchReports(true);

            // Clear form
            setSelectedProject(null);
            setReportTitle("");
            setReportContent("");
            setReportFormat("PDF");
            setSelectedFile(null);
            setUploadedFile(null);
            setUploadError("");

            alert("Report saved successfully.");
        } catch (error: any) {
            console.error("Save report error:", error);
            alert(error.message || "Failed to save report");
        } finally {
            setSavingReport(false);
        }
    };

    const handleDownloadReport = async (projectId: string, format: "pdf" | "word") => {
        try {
            if (!permissions.canDownloadReport) {
                alert("You do not have permission to download reports.");
                return;
            }

            const token = getToken();
            if (!token) {
                throw new Error("Authentication token not found.");
            }

            const response = await fetch(
                `${API_BASE}/reports/project/${projectId}/download/${format}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                let message = "Failed to download report";
                try {
                    const data = await response.json();
                    message = data.message || message;
                } catch {}
                throw new Error(message);
            }

            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                throw new Error("The server returned an empty file.");
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download =
                format === "pdf" ? "project-report.pdf" : "project-report.docx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error("Download report error:", error);
            alert(error.message || "Failed to download report");
        }
    };

    const previewCreatedReport = (project: Project) => {
        if (!project.report) return;

        const report: CreatedReport = {
            id: project.report.id,
            title: project.report.title,
            targetName: project.name,
            targetType: "Project",
            format: project.report.format,
            content: project.report.content,
            createdAt: project.report.createdAt || new Date().toISOString(),
            projectId: project.id,
        };

        setPreviewReport(report);
        setShowPreview(true);
    };

    // =====================================================
    // UI HELPERS
    // =====================================================

    const getProgressColor = (progress: number) => {
        if (progress >= 75) return "bg-green-500";
        if (progress >= 40) return "bg-blue-500";
        if (progress >= 20) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "Done":
                return "border-green-200 bg-green-50 text-green-700";
            case "In Progress":
                return "border-blue-200 bg-blue-50 text-blue-700";
            case "To Do":
                return "border-gray-300 bg-gray-50 text-gray-700";
            case "Backlog":
                return "border-purple-200 bg-purple-50 text-purple-700";
            case "Paused":
                return "border-orange-200 bg-orange-50 text-orange-700";
            default:
                return "border-gray-300 bg-white text-gray-700";
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case "High":
                return "border-red-200 bg-red-50 text-red-700";
            case "Medium":
                return "border-yellow-200 bg-yellow-50 text-yellow-700";
            default:
                return "border-green-200 bg-green-50 text-green-700";
        }
    };

    // =====================================================
    // RENDER - LOADING
    // =====================================================

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 px-4 py-8 text-black">
                <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw size={32} className="animate-spin text-blue-600" />
                        <p className="text-sm font-semibold text-gray-600">
                            Loading reports...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // =====================================================
    // RENDER - ERROR
    // =====================================================

    if (error && pendingProjects.length === 0 && completedProjects.length === 0) {
        return (
            <main className="min-h-screen bg-gray-50 px-4 py-8 text-black">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                        <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
                        <h2 className="text-lg font-bold text-red-900">
                            Failed to load reports
                        </h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm text-red-700">{error}</p>
                        <button
                            onClick={() => fetchReports()}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // =====================================================
    // RENDER - MAIN
    // =====================================================

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-6 text-black">
            <div className="mx-auto max-w-7xl">
                {/* ============================================== */}
                {/* HEADER */}
                {/* ============================================== */}

                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 size={28} className="text-blue-600" />
                        <h1 className="text-3xl font-bold text-black">Reports</h1>
                    </div>

                    <p className="text-sm text-gray-600">
                        Manage and create project reports
                    </p>

                    {currentUser && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                {currentUser.role}
                            </span>
                            <span className="text-xs text-gray-600">{currentUser.name}</span>
                        </div>
                    )}
                </div>

                {/* ============================================== */}
                {/* SEARCH & REFRESH */}
                {/* ============================================== */}

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <button
                        onClick={() => fetchReports(true)}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>

                {/* ============================================== */}
                {/* ERROR BANNER */}
                {/* ============================================== */}

                {error && (
                    <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                        {error}
                    </div>
                )}

                {/* ============================================== */}
                {/* MAIN CONTENT - TWO COLUMN LAYOUT */}
                {/* ============================================== */}

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* ============================================== */}
                    {/* LEFT COLUMN - PENDING REPORTS */}
                    {/* ============================================== */}

                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-black">
                                    Create Reports
                                </h2>
                                <p className="mt-1 text-xs text-gray-600">
                                    Projects without reports
                                </p>
                            </div>
                            <div className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                {filteredPendingProjects.length}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredPendingProjects.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                                    <FolderKanban size={36} className="mx-auto mb-3 text-gray-400" />
                                    <h3 className="font-semibold text-gray-700">
                                        No projects found
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {search
                                            ? "No projects match your search"
                                            : "All projects have reports"}
                                    </p>
                                </div>
                            ) : (
                                filteredPendingProjects.map((project) => {
                                    const isExpanded = expandedProjects.includes(project.id);

                                    return (
                                        <div
                                            key={project.id}
                                            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            {/* PROJECT HEADER */}
                                            <div className="border-b border-gray-100 bg-gray-50 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="truncate text-sm font-bold text-black">
                                                                {project.name}
                                                            </h3>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span
                                                                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(
                                                                    project.status
                                                                )}`}
                                                            >
                                                                {project.status}
                                                            </span>
                                                            <span
                                                                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadgeClass(
                                                                    project.priority
                                                                )}`}
                                                            >
                                                                {project.priority}
                                                            </span>
                                                            <span className="text-[10px] text-gray-600">
                                                                Manager: {project.manager}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {permissions.canCreateReport && (
                                                        <button
                                                            onClick={() =>
                                                                handleCreateReport(project)
                                                            }
                                                            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 whitespace-nowrap"
                                                        >
                                                            <Plus size={14} />
                                                            Create
                                                        </button>
                                                    )}
                                                </div>

                                                {/* PROGRESS BAR */}
                                                <div className="mt-3">
                                                    <div className="mb-1 flex items-center justify-between text-[10px]">
                                                        <span className="font-medium text-gray-600">
                                                            Progress
                                                        </span>
                                                        <span className="font-bold text-gray-900">
                                                            {project.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full border border-gray-200 bg-gray-200">
                                                        <div
                                                            className={`h-full rounded-full ${getProgressColor(
                                                                project.progress
                                                            )}`}
                                                            style={{ width: `${project.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TASKS SECTION */}
                                            {permissions.canCreateReport && (
                                                <div className="bg-white p-4">
                                                    <button
                                                        onClick={() =>
                                                            toggleProject(project.id)
                                                        }
                                                        className="flex w-full items-center justify-between rounded-md hover:bg-gray-50 p-2 -m-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <ClipboardList
                                                                size={14}
                                                                className="text-gray-600"
                                                            />
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                Tasks ({project.tasks.length})
                                                            </span>
                                                        </div>
                                                        {isExpanded ? (
                                                            <ChevronDown size={16} />
                                                        ) : (
                                                            <ChevronRight size={16} />
                                                        )}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                                                            {project.tasks.length === 0 ? (
                                                                <p className="text-xs text-gray-500 py-2">
                                                                    No tasks
                                                                </p>
                                                            ) : (
                                                                project.tasks.map((task) => (
                                                                    <div
                                                                        key={task.id}
                                                                        className="rounded-md bg-gray-50 p-2 text-xs"
                                                                    >
                                                                        <div className="flex items-start gap-2">
                                                                            {task.status ===
                                                                            "Done" ? (
                                                                                <CheckCircle2
                                                                                    size={14}
                                                                                    className="shrink-0 text-green-600 mt-0.5"
                                                                                />
                                                                            ) : task.status ===
                                                                              "In Progress" ? (
                                                                                <Clock3
                                                                                    size={14}
                                                                                    className="shrink-0 text-blue-600 mt-0.5"
                                                                                />
                                                                            ) : (
                                                                                <Circle
                                                                                    size={14}
                                                                                    className="shrink-0 text-gray-400 mt-0.5"
                                                                                />
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-medium text-gray-900 truncate">
                                                                                    {task.title}
                                                                                </p>
                                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                                    <span
                                                                                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadgeClass(
                                                                                            task.status
                                                                                        )}`}
                                                                                    >
                                                                                        {task.status}
                                                                                    </span>
                                                                                    <span className="text-[9px] text-gray-600">
                                                                                        {task.assignee}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* ============================================== */}
                    {/* RIGHT COLUMN - CREATED REPORTS */}
                    {/* ============================================== */}

                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-black">
                                    Created Reports
                                </h2>
                                <p className="mt-1 text-xs text-gray-600">
                                    Submitted reports
                                </p>
                            </div>
                            <div className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                {filteredCompletedProjects.length}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredCompletedProjects.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                                    <FileText size={36} className="mx-auto mb-3 text-gray-400" />
                                    <h3 className="font-semibold text-gray-700">
                                        No reports yet
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Reports will appear here once created
                                    </p>
                                </div>
                            ) : (
                                filteredCompletedProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {project.report && (
                                            <>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            {project.report.format ===
                                                            "PDF" ? (
                                                                <FileText
                                                                    size={16}
                                                                    className="text-red-500"
                                                                />
                                                            ) : (
                                                                <FileType
                                                                    size={16}
                                                                    className="text-blue-500"
                                                                />
                                                            )}
                                                            <h3 className="truncate text-sm font-bold text-black">
                                                                {project.report.title}
                                                            </h3>
                                                        </div>
                                                        <p className="mt-1.5 text-xs text-gray-600">
                                                            Project: {project.name}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                                                            <Calendar size={11} />
                                                            Created{" "}
                                                            {formatDate(
                                                                project.report.createdAt
                                                            )}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                            project.report.format ===
                                                            "PDF"
                                                                ? "border-red-200 bg-red-50 text-red-700"
                                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                                        }`}
                                                    >
                                                        {project.report.format}
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                                                    <button
                                                        onClick={() =>
                                                            previewCreatedReport(project)
                                                        }
                                                        className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Eye size={14} />
                                                        Preview
                                                    </button>

                                                    {permissions.canDownloadReport && (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    handleDownloadReport(
                                                                        project.id,
                                                                        "pdf"
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                                            >
                                                                <Download size={14} />
                                                                PDF
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    handleDownloadReport(
                                                                        project.id,
                                                                        "word"
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                                            >
                                                                <Download size={14} />
                                                                Word
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* ============================================== */}
                {/* REPORT EDITOR - BOTTOM SECTION */}
                {/* ============================================== */}

                {permissions.canCreateReport && selectedProject && (
                    <section className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                        {/* HEADER */}
                        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-black">
                                    Create Report for {selectedProject.name}
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Fill in the details below and preview in real-time
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProject(null);
                                    setReportTitle("");
                                    setReportContent("");
                                    setReportFormat("PDF");
                                    setSelectedFile(null);
                                    setUploadedFile(null);
                                    setUploadError("");
                                }}
                                className="rounded-lg p-2 text-gray-500 hover:bg-white/50 hover:text-gray-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="grid gap-6 p-6 lg:grid-cols-2">
                            {/* LEFT - FORM */}
                            <div className="space-y-4">
                                {/* TITLE */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-black">
                                        Report Title
                                    </label>
                                    <input
                                        type="text"
                                        value={reportTitle}
                                        onChange={(e) => setReportTitle(e.target.value)}
                                        placeholder="Enter report title..."
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>

                                {/* CONTENT */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-black">
                                        Report Content
                                    </label>
                                    <textarea
                                        value={reportContent}
                                        onChange={(e) => setReportContent(e.target.value)}
                                        placeholder="Write your report here..."
                                        className="min-h-[300px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>

                                {/* FORMAT */}
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-black">
                                        Report Format
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setReportFormat("PDF")}
                                            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition ${
                                                reportFormat === "PDF"
                                                    ? "border-red-500 bg-red-50 text-red-700"
                                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            <FileText size={16} />
                                            PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReportFormat("Word")}
                                            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition ${
                                                reportFormat === "Word"
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            <FileType size={16} />
                                            Word
                                        </button>
                                    </div>
                                </div>

                                {/* FILE UPLOAD */}
                                <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
                                    <div className="mb-3">
                                        <label className="block text-sm font-bold text-black">
                                            Attach Document (Optional)
                                        </label>
                                        <p className="mt-0.5 text-xs text-gray-600">
                                            PDF or Word documents only, max 10 MB
                                        </p>
                                    </div>

                                    {!uploadedFile ? (
                                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-4">
                                            <div className="flex flex-col items-center text-center">
                                                <Paperclip
                                                    size={24}
                                                    className="mb-2 text-gray-400"
                                                />
                                                <p className="text-xs font-semibold text-gray-700">
                                                    Upload a document
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    PDF or Word only
                                                </p>

                                                <label className="mt-3 cursor-pointer">
                                                    <div className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                                                        Choose File
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                        onChange={handleFileSelect}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2
                                                        size={18}
                                                        className="text-green-600"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-green-900">
                                                            {selectedFile?.name ||
                                                                uploadedFile.originalName}
                                                        </p>
                                                        <p className="text-[11px] text-green-700">
                                                            {(
                                                                (selectedFile?.size ||
                                                                    uploadedFile.size ||
                                                                    0) /
                                                                1024 /
                                                                1024
                                                            ).toFixed(2)}{" "}
                                                            MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        setUploadedFile(null);
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = "";
                                                        }
                                                    }}
                                                    className="rounded-md p-1 text-green-600 hover:bg-green-100"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {uploadError && (
                                        <p className="mt-2 text-xs font-semibold text-red-600">
                                            {uploadError}
                                        </p>
                                    )}

                                    {selectedFile && !uploadedFile && (
                                        <button
                                            type="button"
                                            onClick={handleFileUpload}
                                            disabled={uploadingFile}
                                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {uploadingFile ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={14} />
                                                    Upload File
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* SAVE BUTTON */}
                                <button
                                    type="button"
                                    onClick={handleSaveReport}
                                    disabled={savingReport}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {savingReport ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Save Report
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* RIGHT - LIVE PREVIEW */}
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col">
                                <h3 className="mb-3 text-sm font-bold text-black">
                                    Live Preview
                                </h3>

                                <div className="flex-1 overflow-y-auto rounded-lg border border-gray-300 bg-white p-4">
                                    {reportTitle || reportContent ? (
                                        <div className="space-y-3">
                                            {reportTitle && (
                                                <>
                                                    <div className="border-b border-gray-200 pb-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                            Report
                                                        </p>
                                                        <h2 className="mt-1 text-lg font-bold text-black">
                                                            {reportTitle}
                                                        </h2>
                                                    </div>
                                                </>
                                            )}
                                            {reportContent && (
                                                <div className="whitespace-pre-wrap break-words text-xs leading-5 text-gray-700">
                                                    {reportContent}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-center">
                                            <div>
                                                <Sparkles
                                                    size={28}
                                                    className="mx-auto mb-2 text-gray-400"
                                                />
                                                <p className="text-xs font-semibold text-gray-600">
                                                    Start typing to see preview
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ============================================== */}
                {/* READ-ONLY MESSAGE */}
                {/* ============================================== */}

                {!permissions.canCreateReport && (
                    <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start gap-3">
                            <Eye size={18} className="mt-0.5 text-blue-600" />
                            <div>
                                <h3 className="font-bold text-blue-900">
                                    View-Only Access
                                </h3>
                                <p className="mt-1 text-sm text-blue-800">
                                    You can view reports for your projects. Report creation is
                                    restricted to Project Managers and System Administrators.
                                </p>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* ============================================== */}
            {/* REPORT PREVIEW MODAL */}
            {/* ============================================== */}

            {showPreview && previewReport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                                    Report Preview
                                </p>
                                <h2 className="mt-1 text-xl font-bold">
                                    {previewReport.title}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="rounded-lg p-2 hover:bg-white/20"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* REPORT METADATA */}
                        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex flex-wrap items-center gap-3">
                            <span
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${
                                    previewReport.format === "PDF"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-blue-200 bg-blue-50 text-blue-700"
                                }`}
                            >
                                {previewReport.format}
                            </span>
                            <span className="text-xs text-gray-600">
                                Project: {previewReport.targetName}
                            </span>
                            <span className="text-xs text-gray-600">
                                Created {formatDate(previewReport.createdAt)}
                            </span>
                        </div>

                        {/* REPORT CONTENT */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                            <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="border-b border-gray-200 pb-4 mb-6">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                        {previewReport.targetType} Report
                                    </p>
                                    <h1 className="mt-2 text-2xl font-bold text-black">
                                        {previewReport.title}
                                    </h1>
                                </div>

                                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                                    {previewReport.content ||
                                        "No report content available."}
                                </div>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}
                        <div className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-2">
                            {permissions.canDownloadReport && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDownloadReport(
                                                previewReport.projectId,
                                                "pdf"
                                            )
                                        }
                                        className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                    >
                                        <Download size={14} />
                                        PDF
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDownloadReport(
                                                previewReport.projectId,
                                                "word"
                                            )
                                        }
                                        className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                    >
                                        <Download size={14} />
                                        Word
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
