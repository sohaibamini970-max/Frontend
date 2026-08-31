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
    Image as ImageIcon,
    Paperclip,
    File,
    RefreshCw,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

type ReportFormat = "PDF" | "Word";

type TaskStatus =
    | "To Do"
    | "In Progress"
    | "Done";

type ProjectStatus =
    | "Unassigned"
    | "Backlog"
    | "In Progress"
    | "Paused"
    | "Done";

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

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api";

// =========================================================
// HELPERS
// =========================================================

const getToken = () => {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("token");
};

const formatDate = (date?: string) => {
    if (!date) return "N/A";

    try {
        return new Date(date).toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    } catch {
        return date;
    }
};

const normalizeProject = (
    project: any
): Project => {
    const tasks =
        Array.isArray(project.tasks)
            ? project.tasks
            : [];

    return {
        id: String(project.id),
        name: project.name || "Unnamed Project",

        domain: project.domain,
        aboutTitle: project.aboutTitle,
        aboutDescription:
            project.aboutDescription,

        status:
            project.status || "Unassigned",

        priority:
            project.priority || "Medium",

        manager:
            project.projectManager?.name ||
            project.manager ||
            project.projectManagerName ||
            "Unassigned",

        managerId:
            project.projectManager?.id ||
            project.managerId ||
            project.projectManagerId,

        startDate:
            project.startDate ||
            project.start_date,

        deadline:
            project.deadline,

        progress:
            Number(project.progress || 0),

        totalTasks:
            Number(
                project.totalTasks ??
                tasks.length ??
                0
            ),

        completedTasks:
            Number(
                project.completedTasks ??
                tasks.filter(
                    (task: any) =>
                        task.status === "Done"
                ).length ??
                0
            ),

        tasks: tasks.map(
            (task: any): Task => ({
                id: String(task.id),

                title:
                    task.title ||
                    task.name ||
                    "Untitled Task",

                status:
                    task.status || "To Do",

                priority:
                    task.priority || "Medium",

                dueDate:
                    task.dueDate ||
                    task.due_date ||
                    "N/A",

                assignee:
                    task.assignee ||
                    task.assigneeName ||
                    task.assignee_name ||
                    "Unassigned",

                assigneeId:
                    task.assigneeId ||
                    task.assignee_id,
            })
        ),

        report: project.report
            ? {
                  id: String(
                      project.report.id
                  ),

                  title:
                      project.report.title ||
                      "Project Report",

                  content:
                      project.report.content ||
                      "",

                  format:
                      project.report.format ===
                      "Word"
                          ? "Word"
                          : "PDF",

                  submittedBy:
                      project.report
                          .submittedBy,

                  submittedByName:
                      project.report
                          .submittedByName,

                  createdAt:
                      project.report.createdAt,

                  updatedAt:
                      project.report.updatedAt,
              }
            : null,

        reportStatus:
            project.reportStatus ||
            (project.report
                ? "Done"
                : "Pending"),

        files:
            project.files || [],
    };
};

// =========================================================
// COMPONENT
// =========================================================

export default function Reports() {
    // -----------------------------------------------------
    // DATA
    // -----------------------------------------------------

    const [projects, setProjects] =
        useState<Project[]>([]);

    const [reports, setReports] =
        useState<CreatedReport[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    // -----------------------------------------------------
    // USER / PERMISSIONS
    // -----------------------------------------------------

    const [currentUser, setCurrentUser] =
        useState<{
            id: string;
            name: string;
            email: string;
            role: string;
        } | null>(null);

    const [permissions, setPermissions] =
        useState<Permissions>({
            canCreateReport: false,
            canEditReport: false,
            canDeleteReport: false,
            canDownloadReport: false,
        });

    // -----------------------------------------------------
    // UI
    // -----------------------------------------------------

    const [expandedProjects, setExpandedProjects] =
        useState<string[]>([]);

    const [search, setSearch] =
        useState("");

    // -----------------------------------------------------
    // SELECTED TARGET
    // -----------------------------------------------------

    const [selectedTarget, setSelectedTarget] =
        useState<{
            type: "Project" | "Task";
            id: string;
            name: string;
            projectId?: string;
        } | null>(null);

    // -----------------------------------------------------
    // REPORT EDITOR
    // -----------------------------------------------------

    const [reportTitle, setReportTitle] =
        useState("");

    const [reportContent, setReportContent] =
        useState("");

    const [reportFormat, setReportFormat] =
        useState<ReportFormat>("PDF");

    const [savingReport, setSavingReport] =
        useState(false);

    // -----------------------------------------------------
    // PREVIEW
    // -----------------------------------------------------

    const [previewReport, setPreviewReport] =
        useState<CreatedReport | null>(null);

    const [showPreview, setShowPreview] =
        useState(false);

    // -----------------------------------------------------
    // FILE UPLOAD
    // -----------------------------------------------------

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [uploadingFile, setUploadingFile] =
        useState(false);

    const [uploadedFile, setUploadedFile] =
        useState<ReportFile | null>(null);

    const [uploadError, setUploadError] =
        useState("");

    const fileInputRef =
        useRef<HTMLInputElement | null>(null);

    // =====================================================
    // LOAD REPORTS
    // =====================================================

    const fetchReports = async (
        showRefresh = false
    ) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Authentication token not found. Please login again."
                );
            }

            const response = await fetch(
                `${API_BASE}/reports`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json",
                    },

                    cache: "no-store",
                }
            );

            let data: ReportOverviewResponse;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    `Server returned invalid response (${response.status})`
                );
            }

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    `Failed to load reports (${response.status})`
                );
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

            const normalizedProjects =
                (data.projects || []).map(
                    normalizeProject
                );

            setProjects(
                normalizedProjects
            );

            // Expand first two projects
            if (
                normalizedProjects.length > 0
            ) {
                setExpandedProjects(
                    normalizedProjects
                        .slice(0, 2)
                        .map(
                            (project) =>
                                project.id
                        )
                );
            }

            // Build Created Reports list
            const generatedReports: CreatedReport[] =
                normalizedProjects
                    .filter(
                        (project) =>
                            project.report
                    )
                    .map((project) => ({
                        id: String(
                            project.report!.id
                        ),

                        title:
                            project.report!.title,

                        targetName:
                            project.name,

                        targetType:
                            "Project",

                        format:
                            project.report!.format,

                        content:
                            project.report!.content,

                        createdAt:
                            project.report!
                                .createdAt ||
                            new Date()
                                .toISOString(),

                        projectId:
                            project.id,
                    }));

            setReports(
                generatedReports
            );
        } catch (err: any) {
            console.error(
                "fetchReports error:",
                err
            );

            setError(
                err.message ||
                "Failed to load reports"
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        fetchReports();
    }, []);

    // =====================================================
    // PROJECT TOGGLE
    // =====================================================

    const toggleProject = (
        id: string
    ) => {
        setExpandedProjects(
            (current) =>
                current.includes(id)
                    ? current.filter(
                          (projectId) =>
                              projectId !==
                              id
                      )
                    : [
                          ...current,
                          id,
                      ]
        );
    };

    // =====================================================
    // SELECT PROJECT
    // =====================================================

    const selectProject = (
        project: Project
    ) => {
        setSelectedTarget({
            type: "Project",
            id: project.id,
            name: project.name,
        });

        setReportTitle(
            project.report?.title ||
            `${project.name} - Project Report`
        );

        if (project.report?.content) {
            setReportContent(
                project.report.content
            );
        } else {
            setReportContent(
                `Project Report

Project: ${project.name}
Project Manager: ${project.manager || "Unassigned"}
Status: ${project.status}
Priority: ${project.priority}
Start Date: ${formatDate(project.startDate)}
Deadline: ${formatDate(project.deadline)}
Current Progress: ${project.progress}%

Project Overview:
Write a detailed overview of the project, current achievements, pending work, risks, blockers and next steps.

Team & Responsibilities:
Add team members and their responsibilities here.

Tasks:
${project.tasks
    .map(
        (task) =>
            `- ${task.title} | ${task.status} | ${task.priority} | Due: ${formatDate(task.dueDate)}`
    )
    .join("\n")}

Risks / Blockers:
Add project risks and blockers here.

Next Steps:
Add upcoming activities and planned work here.`
            );
        }

        setReportFormat(
            project.report?.format ||
            "PDF"
        );

        setUploadedFile(null);
        setSelectedFile(null);
        setUploadError("");

        setShowPreview(false);
        setPreviewReport(null);
    };

    // =====================================================
    // SELECT TASK
    // =====================================================

    const selectTask = (
        task: Task,
        project: Project
    ) => {
        setSelectedTarget({
            type: "Task",
            id: task.id,
            name: task.title,
            projectId: project.id,
        });

        setReportTitle(
            `${task.title} - Task Report`
        );

        setReportContent(
            `Task Report

Task: ${task.title}
Project: ${project.name}
Assigned To: ${task.assignee}
Status: ${task.status}
Priority: ${task.priority}
Due Date: ${formatDate(task.dueDate)}

Task Summary:
Write a detailed summary of this task.

Work Completed:
Describe the work completed so far.

Current Progress:
Describe the current progress and implementation status.

Issues / Blockers:
Add any issues or blockers related to this task.

Next Steps:
Describe the next steps required to complete the task.`
        );

        setReportFormat("PDF");

        setShowPreview(false);
        setPreviewReport(null);
    };

    // =====================================================
    // FILTER PROJECTS
    // =====================================================

    const filteredProjects =
        useMemo(() => {
            if (!search.trim()) {
                return projects;
            }

            const query =
                search
                    .toLowerCase()
                    .trim();

            return projects
                .map((project) => ({
                    ...project,

                    tasks:
                        project.tasks.filter(
                            (task) =>
                                task.title
                                    .toLowerCase()
                                    .includes(
                                        query
                                    ) ||
                                task.assignee
                                    .toLowerCase()
                                    .includes(
                                        query
                                    )
                        ),
                }))
                .filter(
                    (project) =>
                        project.name
                            .toLowerCase()
                            .includes(query) ||
                        project.manager
                            ?.toLowerCase()
                            .includes(query) ||
                        project.tasks
                            .length > 0
                );
        }, [projects, search]);

    // =====================================================
    // CREATE / UPDATE REPORT
    // =====================================================

    const createReport = async () => {
        if (!selectedTarget) {
            alert(
                "Please select a project first."
            );
            return;
        }

        if (
            selectedTarget.type !==
            "Project"
        ) {
            alert(
                "The backend currently supports project reports. Please select a project."
            );
            return;
        }

        if (!permissions.canCreateReport) {
            alert(
                "Only Project Managers can create or update reports."
            );
            return;
        }

        if (!reportTitle.trim()) {
            alert(
                "Please enter a report title."
            );
            return;
        }

        if (!reportContent.trim()) {
            alert(
                "Please enter report content."
            );
            return;
        }

        try {
            setSavingReport(true);

            const token = getToken();

            const response = await fetch(
                `${API_BASE}/reports/project/${selectedTarget.id}`,
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        title:
                            reportTitle.trim(),

                        content:
                            reportContent.trim(),

                        format:
                            reportFormat,
                    }),
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Failed to save report"
                );
            }

            const project =
                projects.find(
                    (item) =>
                        item.id ===
                        selectedTarget.id
                );

            const newReport: CreatedReport =
                {
                    id: String(
                        data.report?.id ||
                        Date.now()
                    ),

                    title:
                        data.report?.title ||
                        reportTitle,

                    targetName:
                        project?.name ||
                        selectedTarget.name,

                    targetType:
                        "Project",

                    format:
                        data.report?.format ||
                        reportFormat,

                    content:
                        data.report?.content ||
                        reportContent,

                    createdAt:
                        data.report?.created_at ||
                        new Date()
                            .toISOString(),

                    projectId:
                        selectedTarget.id,
                };

            setPreviewReport(
                newReport
            );

            setShowPreview(true);

            await fetchReports(
                true
            );

            alert(
                "Report saved successfully."
            );
        } catch (error: any) {
            console.error(
                "createReport error:",
                error
            );

            alert(
                error.message ||
                "Failed to save report"
            );
        } finally {
            setSavingReport(false);
        }
    };

    // =====================================================
    // DOWNLOAD REPORT
    // =====================================================

    const handleDownloadReport = async (
        projectId: string,
        format: "pdf" | "word"
    ) => {
        try {
            if (
                !permissions.canDownloadReport
            ) {
                alert(
                    "You do not have permission to download reports."
                );
                return;
            }

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Authentication token not found."
                );
            }

            const response = await fetch(
                `${API_BASE}/reports/project/${projectId}/download/${format}`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                let message =
                    "Failed to download report";

                try {
                    const data =
                        await response.json();

                    message =
                        data.message ||
                        message;
                } catch {
                    // Response is not JSON
                }

                throw new Error(
                    message
                );
            }

            const blob =
                await response.blob();

            if (
                !blob ||
                blob.size === 0
            ) {
                throw new Error(
                    "The server returned an empty file."
                );
            }

            const url =
                window.URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href = url;

            link.download =
                format === "pdf"
                    ? "project-report.pdf"
                    : "project-report.docx";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            window.URL.revokeObjectURL(
                url
            );
        } catch (error: any) {
            console.error(
                "Download report error:",
                error
            );

            alert(
                error.message ||
                "Failed to download report"
            );
        }
    };

    // =====================================================
    // PREVIEW CREATED REPORT
    // =====================================================

    const previewCreatedReport = (report: CreatedReport) => {
        console.log("Preview report:", report);

        setPreviewReport({
            ...report,
            title: report.title || "Untitled Report",
            content: report.content || "No report content available.",
        });

        setShowPreview(true);
    };

    // =====================================================
    // FILE SELECT
    // =====================================================

    const handleFileSelect = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploadError("");

        // 10 MB
        if (
            file.size >
            10 * 1024 * 1024
        ) {
            setUploadError(
                "File size must be less than 10 MB."
            );

            event.target.value = "";

            return;
        }

        setSelectedFile(file);
        setUploadedFile(null);
    };

    // =====================================================
    // UPLOAD FILE
    // =====================================================

    const handleFileUpload = async () => {
        if (!selectedTarget) {
            setUploadError("Please select a project first.");
            return;
        }

        if (selectedTarget.type !== "Project") {
            setUploadError(
                "Files can only be uploaded to a project."
            );
            return;
        }

        if (!permissions.canCreateReport) {
            setUploadError(
                "Only Project Managers can upload project files."
            );
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
                throw new Error(
                    "Authentication token not found. Please login again."
                );
            }

            const projectId = String(selectedTarget.id);

            const formData = new FormData();

            // FILE
            formData.append("file", selectedFile);

            // IMPORTANT:
            // Send the project ID with the file so the backend
            // permanently attaches the uploaded file to this project.
            formData.append("projectId", projectId);

            const response = await fetch(
                `${API_BASE}/reports/project/${projectId}/upload`,
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
                throw new Error(
                    `Server returned invalid response (${response.status})`
                );
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to upload file"
                );
            }

            const fileData: ReportFile = {
                id:
                    data.file?.id ||
                    data.file?.fileId,

                originalName:
                    data.file?.originalName ||
                    data.file?.original_name ||
                    selectedFile.name,

                fileName:
                    data.file?.fileName ||
                    data.file?.file_name,

                mimeType:
                    data.file?.mimeType ||
                    data.file?.mime_type ||
                    selectedFile.type,

                size:
                    data.file?.size ||
                    selectedFile.size,

                url:
                    data.file?.url ||
                    "",
            };

            setUploadedFile(fileData);
            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            /*
             * Refresh the projects so the uploaded file is loaded
             * again from the database and remains attached to
             * the selected project after page refresh.
             */
            await fetchReports(true);

            alert(
                "Project file uploaded and attached successfully."
            );
        } catch (error: any) {
            console.error(
                "File upload error:",
                error
            );

            setUploadError(
                error.message ||
                "Failed to upload file"
            );
        } finally {
            setUploadingFile(false);
        }
    };

    // =====================================================
    // CLEAR EDITOR
    // =====================================================

    const clearReportEditor = () => {
        setSelectedTarget(null);

        setReportTitle("");

        setReportContent("");

        setReportFormat("PDF");

        setPreviewReport(null);

        setShowPreview(false);

        setSelectedFile(null);

        setUploadedFile(null);

        setUploadError("");

        if (
            fileInputRef.current
        ) {
            fileInputRef.current.value =
                "";
        }
    };

    // =====================================================
    // UI HELPERS
    // =====================================================

    const getProgressColor = (
        progress: number
    ) => {
        if (progress >= 75)
            return "bg-green-500";

        if (progress >= 40)
            return "bg-blue-500";

        if (progress >= 20)
            return "bg-yellow-500";

        return "bg-red-500";
    };

    const getStatusClasses = (
        status: string
    ) => {
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

    const getPriorityClasses = (
        priority: string
    ) => {
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
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100 px-4 py-8 text-black">
                <div className="mx-auto flex min-h-[70vh] max-w-[1700px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw
                            size={30}
                            className="animate-spin text-gray-700"
                        />

                        <p className="text-sm font-semibold text-gray-700">
                            Loading reports...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // =====================================================
    // ERROR
    // =====================================================

    if (
        error &&
        projects.length === 0
    ) {
        return (
            <main className="min-h-screen bg-gray-100 px-4 py-8 text-black">
                <div className="mx-auto max-w-[1700px]">
                    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                        <FileText
                            size={42}
                            className="mx-auto mb-4 text-red-500"
                        />

                        <h2 className="text-lg font-bold text-black">
                            Failed to load reports
                        </h2>

                        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
                            {error}
                        </p>

                        <button
                            onClick={() =>
                                fetchReports()
                            }
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#07111f] px-5 py-2.5 text-sm font-bold text-white hover:bg-black"
                        >
                            <RefreshCw
                                size={16}
                            />
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // =====================================================
    // MAIN
    // =====================================================

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-5 text-black sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1700px]">

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <div className="mb-5 rounded-2xl border border-gray-300 bg-[#07111f] px-5 py-5 text-white shadow-sm sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <BarChart3
                                    size={22}
                                />

                                <h1 className="text-2xl font-bold">
                                    Reports
                                </h1>
                            </div>

                            <p className="text-sm text-gray-300">
                                View, create and download project reports.
                            </p>

                            {currentUser && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-md border border-gray-600 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-200">
                                        {currentUser.role}
                                    </span>

                                    <span className="text-xs text-gray-400">
                                        {currentUser.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                            <div className="relative w-full lg:w-[330px]">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search projects or tasks..."
                                    className="w-full rounded-xl border border-gray-500 bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-gray-500 outline-none focus:border-white focus:ring-2 focus:ring-gray-300"
                                />
                            </div>

                            <button
                                onClick={() =>
                                    fetchReports(
                                        true
                                    )
                                }
                                disabled={
                                    refreshing
                                }
                                className="flex items-center justify-center gap-2 rounded-xl border border-gray-500 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={16}
                                    className={
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* ERROR BANNER */}

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                )}

                {/* =================================================
                    TOP ROW
                ================================================= */}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">

                    {/* =================================================
                        LEFT - PROJECTS & TASKS
                    ================================================= */}

                    <section className="rounded-2xl border border-gray-300 bg-white shadow-sm">

                        <div className="border-b border-gray-300 px-5 py-4">
                            <div className="flex items-center justify-between gap-3">

                                <div>
                                    <h2 className="text-lg font-bold text-black">
                                        Projects & Tasks
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-600">
                                        Select a project to create or view its report.
                                    </p>
                                </div>

                                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                    {projects.length} Projects
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[650px] overflow-y-auto p-4">

                            {filteredProjects.length === 0 ? (
                                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center">
                                    <FolderKanban
                                        size={40}
                                        className="mb-3 text-gray-400"
                                    />

                                    <h3 className="font-bold text-black">
                                        No projects found
                                    </h3>

                                    <p className="mt-1 text-xs text-gray-600">
                                        No projects match your search or access permissions.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">

                                    {filteredProjects.map(
                                        (project) => {
                                            const expanded =
                                                expandedProjects.includes(
                                                    project.id
                                                );

                                            return (
                                                <div
                                                    key={
                                                        project.id
                                                    }
                                                    className="overflow-hidden rounded-xl border border-gray-300 bg-white"
                                                >

                                                    {/* PROJECT */}

                                                    <div className="bg-gray-50 p-4">

                                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                                                            <div className="flex min-w-0 items-start gap-3">

                                                                <button
                                                                    onClick={() =>
                                                                        toggleProject(
                                                                            project.id
                                                                        )
                                                                    }
                                                                    className="mt-1 rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-100"
                                                                >
                                                                    {expanded ? (
                                                                        <ChevronDown
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <ChevronRight
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    )}
                                                                </button>

                                                                <div className="min-w-0">

                                                                    <div className="flex items-center gap-2">
                                                                        <FolderKanban
                                                                            size={
                                                                                18
                                                                            }
                                                                            className="shrink-0 text-gray-700"
                                                                        />

                                                                        <h3 className="truncate text-sm font-bold text-black sm:text-base">
                                                                            {
                                                                                project.name
                                                                            }
                                                                        </h3>
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-2">

                                                                        <span
                                                                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(
                                                                                project.status
                                                                            )}`}
                                                                        >
                                                                            {
                                                                                project.status
                                                                            }
                                                                        </span>

                                                                        <span
                                                                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${getPriorityClasses(
                                                                                project.priority
                                                                            )}`}
                                                                        >
                                                                            {
                                                                                project.priority
                                                                            }
                                                                        </span>

                                                                        <span className="text-xs text-gray-600">
                                                                            Manager:{" "}
                                                                            {
                                                                                project.manager
                                                                            }
                                                                        </span>

                                                                        <span
                                                                            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                                                project.reportStatus ===
                                                                                "Done"
                                                                                    ? "border-green-200 bg-green-50 text-green-700"
                                                                                    : "border-orange-200 bg-orange-50 text-orange-700"
                                                                            }`}
                                                                        >
                                                                            Report:{" "}
                                                                            {
                                                                                project.reportStatus
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-2">

                                                                <button
                                                                    onClick={() =>
                                                                        selectProject(
                                                                            project
                                                                        )
                                                                    }
                                                                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-gray-100"
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            15
                                                                        }
                                                                    />

                                                                    View
                                                                </button>

                                                                {permissions.canDownloadReport &&
                                                                    project.report && (
                                                                        <>
                                                                            <button
                                                                                onClick={() =>
                                                                                    handleDownloadReport(
                                                                                        project.id,
                                                                                        "pdf"
                                                                                    )
                                                                                }
                                                                                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                                                                            >
                                                                                <FileText
                                                                                    size={
                                                                                        15
                                                                                    }
                                                                                />

                                                                                PDF
                                                                            </button>

                                                                            <button
                                                                                onClick={() =>
                                                                                    handleDownloadReport(
                                                                                        project.id,
                                                                                        "word"
                                                                                    )
                                                                                }
                                                                                className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                                                                            >
                                                                                <FileType
                                                                                    size={
                                                                                        15
                                                                                    }
                                                                                />

                                                                                Word
                                                                            </button>
                                                                        </>
                                                                    )}
                                                            </div>
                                                        </div>

                                                        {/* PROGRESS */}

                                                        <div className="mt-4">
                                                            <div className="mb-1 flex items-center justify-between text-xs">
                                                                <span className="font-medium text-gray-600">
                                                                    Project Progress
                                                                </span>

                                                                <span className="font-bold text-black">
                                                                    {
                                                                        project.progress
                                                                    }
                                                                    %
                                                                </span>
                                                            </div>

                                                            <div className="h-2 overflow-hidden rounded-full border border-gray-200 bg-gray-200">
                                                                <div
                                                                    className={`h-full rounded-full ${getProgressColor(
                                                                        project.progress
                                                                    )}`}
                                                                    style={{
                                                                        width: `${project.progress}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* TASKS */}

                                                    {expanded && (
                                                        <div className="border-t border-gray-300 bg-white p-3">

                                                            <div className="mb-2 flex items-center gap-2 px-2">
                                                                <ClipboardList
                                                                    size={
                                                                        15
                                                                    }
                                                                    className="text-gray-600"
                                                                />

                                                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                                                                    Tasks
                                                                </span>

                                                                <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                                                    {
                                                                        project.tasks.length
                                                                    }
                                                                </span>
                                                            </div>

                                                            <div className="space-y-2">

                                                                {project.tasks.map(
                                                                    (
                                                                        task
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                task.id
                                                                            }
                                                                            className="rounded-lg border border-gray-300 bg-white p-3 transition hover:border-gray-400 hover:shadow-sm"
                                                                        >

                                                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                                                                                <div className="min-w-0">

                                                                                    <div className="flex items-start gap-2">

                                                                                        {task.status ===
                                                                                        "Done" ? (
                                                                                            <CheckCircle2
                                                                                                size={
                                                                                                    17
                                                                                                }
                                                                                                className="mt-0.5 shrink-0 text-green-600"
                                                                                            />
                                                                                        ) : task.status ===
                                                                                          "In Progress" ? (
                                                                                            <Clock3
                                                                                                size={
                                                                                                    17
                                                                                                }
                                                                                                className="mt-0.5 shrink-0 text-blue-600"
                                                                                            />
                                                                                        ) : (
                                                                                            <Circle
                                                                                                size={
                                                                                                    17
                                                                                                }
                                                                                                className="mt-0.5 shrink-0 text-gray-500"
                                                                                            />
                                                                                        )}

                                                                                        <div className="min-w-0">

                                                                                            <p className="text-sm font-semibold text-black">
                                                                                                {
                                                                                                    task.title
                                                                                                }
                                                                                            </p>

                                                                                            <div className="mt-2 flex flex-wrap items-center gap-2">

                                                                                                <span
                                                                                                    className={`rounded-md border px-2 py-1 text-[10px] font-bold ${getStatusClasses(
                                                                                                        task.status
                                                                                                    )}`}
                                                                                                >
                                                                                                    {
                                                                                                        task.status
                                                                                                    }
                                                                                                </span>

                                                                                                <span
                                                                                                    className={`rounded-md border px-2 py-1 text-[10px] font-bold ${getPriorityClasses(
                                                                                                        task.priority
                                                                                                    )}`}
                                                                                                >
                                                                                                    {
                                                                                                        task.priority
                                                                                                    }
                                                                                                </span>

                                                                                                <span className="flex items-center gap-1 text-[11px] text-gray-600">
                                                                                                    <User
                                                                                                        size={
                                                                                                            12
                                                                                                        }
                                                                                                    />

                                                                                                    {
                                                                                                        task.assignee
                                                                                                    }
                                                                                                </span>

                                                                                                <span className="flex items-center gap-1 text-[11px] text-gray-600">
                                                                                                    <Calendar
                                                                                                        size={
                                                                                                            12
                                                                                                        }
                                                                                                    />

                                                                                                    {formatDate(
                                                                                                        task.dueDate
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex shrink-0 gap-2">

                                                                                    <button
                                                                                        onClick={() =>
                                                                                            selectTask(
                                                                                                task,
                                                                                                project
                                                                                            )
                                                                                        }
                                                                                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-black hover:bg-gray-50"
                                                                                    >
                                                                                        <Eye
                                                                                            size={
                                                                                                14
                                                                                            }
                                                                                        />

                                                                                        View
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                )}

                                                                {project.tasks.length ===
                                                                    0 && (
                                                                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
                                                                        No tasks available for this project.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* =================================================
                        RIGHT - CREATED REPORTS
                    ================================================= */}

                    <section className="rounded-2xl border border-gray-300 bg-white shadow-sm">

                        <div className="border-b border-gray-300 px-5 py-4">
                            <div className="flex items-center justify-between">

                                <div>
                                    <h2 className="text-lg font-bold text-black">
                                        Created Reports
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-600">
                                        Reports submitted for your accessible projects.
                                    </p>
                                </div>

                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-gray-50">
                                    <FileText
                                        size={
                                            17
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[650px] overflow-y-auto p-4">

                            {reports.length ===
                            0 ? (
                                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-400 bg-gray-50 p-6 text-center">

                                    <FileText
                                        size={
                                            40
                                        }
                                        className="mb-3 text-gray-400"
                                    />

                                    <h3 className="font-bold text-black">
                                        No reports created
                                    </h3>

                                    <p className="mt-1 max-w-sm text-xs text-gray-600">
                                        Reports submitted by Project Managers will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">

                                    {reports.map(
                                        (
                                            report
                                        ) => (
                                            <div
                                                key={
                                                    report.id
                                                }
                                                className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm transition hover:border-gray-400 hover:shadow-md"
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div className="flex min-w-0 gap-3">

                                                        <div
                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                                                                report.format ===
                                                                "PDF"
                                                                    ? "border-red-200 bg-red-50 text-red-600"
                                                                    : "border-blue-200 bg-blue-50 text-blue-600"
                                                            }`}
                                                        >
                                                            {report.format ===
                                                            "PDF" ? (
                                                                <FileText
                                                                    size={
                                                                        19
                                                                    }
                                                                />
                                                            ) : (
                                                                <FileType
                                                                    size={
                                                                        19
                                                                    }
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0">

                                                            <h3 className="truncate text-sm font-bold text-black">
                                                                {
                                                                    report.title
                                                                }
                                                            </h3>

                                                            <p className="mt-1 text-xs text-gray-600">
                                                                Project:{" "}
                                                                {
                                                                    report.targetName
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                            report.format ===
                                                            "PDF"
                                                                ? "border-red-200 bg-red-50 text-red-700"
                                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                                        }`}
                                                    >
                                                        {
                                                            report.format
                                                        }
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center gap-1 text-[11px] text-gray-500">
                                                    <Calendar
                                                        size={
                                                            12
                                                        }
                                                    />

                                                    Created{" "}
                                                    {formatDate(
                                                        report.createdAt
                                                    )}
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3">

                                                    <button
                                                        onClick={() =>
                                                            previewCreatedReport(
                                                                report
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-black hover:bg-gray-50"
                                                    >
                                                        <Eye
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Preview
                                                    </button>

                                                    {permissions.canDownloadReport && (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    handleDownloadReport(
                                                                        report.projectId,
                                                                        "pdf"
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                                                            >
                                                                <Download
                                                                    size={
                                                                        14
                                                                    }
                                                                />

                                                                PDF
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    handleDownloadReport(
                                                                        report.projectId,
                                                                        "word"
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <Download
                                                                    size={
                                                                        14
                                                                    }
                                                                />

                                                                Word
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* =================================================
                    CREATE / EDIT REPORT
                ================================================= */}

                {permissions.canCreateReport && (
                    <section className="mt-5 rounded-2xl border border-gray-300 bg-white shadow-sm">

                        <div className="border-b border-gray-300 bg-gray-50 px-5 py-4">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div>
                                    <h2 className="text-lg font-bold text-black">
                                        Create Report
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-600">
                                        Create or update a report for a project assigned to you.
                                    </p>
                                </div>

                                {selectedTarget && (
                                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">

                                        {selectedTarget.type ===
                                        "Project" ? (
                                            <FolderKanban
                                                size={
                                                    15
                                                }
                                            />
                                        ) : (
                                            <ClipboardList
                                                size={
                                                    15
                                                }
                                            />
                                        )}

                                        <span className="text-xs font-bold text-black">
                                            {
                                                selectedTarget.name
                                            }
                                        </span>

                                        <button
                                            onClick={
                                                clearReportEditor
                                            }
                                            className="ml-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
                                        >
                                            <X
                                                size={
                                                    14
                                                }
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-2">

                            {/* =================================================
                                EDITOR
                            ================================================= */}

                            <div className="rounded-xl border border-gray-300 bg-white">

                                <div className="border-b border-gray-300 px-4 py-3">
                                    <h3 className="text-sm font-bold text-black">
                                        Report Details
                                    </h3>
                                </div>

                                <div className="space-y-4 p-4">

                                    {/* TITLE */}

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-black">
                                            Report Title
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                reportTitle
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setReportTitle(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter report title..."
                                            className="w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-sm font-medium text-black placeholder:text-gray-500 outline-none focus:border-[#07111f] focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>

                                    {/* CONTENT */}

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-black">
                                            Report Content
                                        </label>

                                        <textarea
                                            value={
                                                reportContent
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setReportContent(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Write your complete project report here..."
                                            className="min-h-[380px] w-full resize-y rounded-xl border border-gray-400 bg-white px-4 py-4 text-sm leading-6 text-black placeholder:text-gray-500 outline-none focus:border-[#07111f] focus:ring-2 focus:ring-gray-200"
                                        />
                                    </div>

                                    {/* FORMAT */}

                                    <div>
                                        <label className="mb-2 block text-xs font-bold text-black">
                                            Report Format
                                        </label>

                                        <div className="grid grid-cols-2 gap-3">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReportFormat(
                                                        "PDF"
                                                    )
                                                }
                                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                                    reportFormat ===
                                                    "PDF"
                                                        ? "border-red-500 bg-red-50 text-red-700"
                                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                }`}
                                            >
                                                <FileText
                                                    size={
                                                        18
                                                    }
                                                />

                                                PDF
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReportFormat(
                                                        "Word"
                                                    )
                                                }
                                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                                    reportFormat ===
                                                    "Word"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                }`}
                                            >
                                                <FileType
                                                    size={
                                                        18
                                                    }
                                                />

                                                Word
                                            </button>
                                        </div>
                                    </div>

                                    {/* =================================================
                                        FILE UPLOAD
                                    ================================================= */}

                                    <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">

                                        <div className="mb-3 flex items-center justify-between gap-2">

                                            <div>
                                                <label className="block text-xs font-bold text-black">
                                                    Project Attachment
                                                </label>

                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Upload an image, PDF, Word, Excel or text file.
                                                </p>
                                            </div>

                                            <span className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] font-bold text-gray-600">
                                                Max 10 MB
                                            </span>
                                        </div>

                                        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-5">

                                            <div className="flex flex-col items-center justify-center text-center">

                                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                                                    <Paperclip
                                                        size={
                                                            21
                                                        }
                                                        className="text-gray-600"
                                                    />
                                                </div>

                                                <p className="text-sm font-semibold text-gray-800">
                                                    Upload project file
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Choose a file from your computer or gallery.
                                                </p>

                                                <label className="mt-4 cursor-pointer">

                                                    <div className="inline-flex items-center gap-2 rounded-lg bg-[#07111f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black">
                                                        <Upload
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Choose File
                                                    </div>

                                                    <input
                                                        ref={
                                                            fileInputRef
                                                        }
                                                        type="file"
                                                        className="hidden"
                                                        accept="
                                                            image/jpeg,
                                                            image/png,
                                                            image/webp,
                                                            application/pdf,
                                                            application/msword,
                                                            application/vnd.openxmlformats-officedocument.wordprocessingml.document,
                                                            application/vnd.ms-excel,
                                                            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                                                            text/plain
                                                        "
                                                        onChange={
                                                            handleFileSelect
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* SELECTED FILE */}

                                        {selectedFile && (
                                            <div className="mt-3 rounded-lg border border-gray-300 bg-white p-3">

                                                <div className="flex items-center justify-between gap-3">

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        {selectedFile.type.startsWith(
                                                            "image/"
                                                        ) ? (
                                                            <ImageIcon
                                                                size={
                                                                    20
                                                                }
                                                                className="shrink-0 text-gray-600"
                                                            />
                                                        ) : (
                                                            <File
                                                                size={
                                                                    20
                                                                }
                                                                className="shrink-0 text-gray-600"
                                                            />
                                                        )}

                                                        <div className="min-w-0">

                                                            <p className="truncate text-sm font-semibold text-black">
                                                                {
                                                                    selectedFile.name
                                                                }
                                                            </p>

                                                            <p className="mt-0.5 text-[11px] text-gray-500">
                                                                {(
                                                                    selectedFile.size /
                                                                    1024 /
                                                                    1024
                                                                ).toFixed(
                                                                    2
                                                                )}{" "}
                                                                MB
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFile(
                                                                null
                                                            );

                                                            if (
                                                                fileInputRef.current
                                                            ) {
                                                                fileInputRef.current.value =
                                                                    "";
                                                            }
                                                        }}
                                                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black"
                                                    >
                                                        <X
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleFileUpload
                                                    }
                                                    disabled={
                                                        uploadingFile
                                                    }
                                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#07111f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {uploadingFile ? (
                                                        <>
                                                            <RefreshCw
                                                                size={
                                                                    15
                                                                }
                                                                className="animate-spin"
                                                            />

                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload
                                                                size={
                                                                    15
                                                                }
                                                            />

                                                            Upload Project File
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* UPLOAD SUCCESS */}

                                        {uploadedFile && (
                                            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">

                                                <div className="flex items-start gap-3">

                                                    <CheckCircle2
                                                        size={
                                                            19
                                                        }
                                                        className="mt-0.5 shrink-0 text-green-600"
                                                    />

                                                    <div className="min-w-0">

                                                        <p className="text-sm font-bold text-green-800">
                                                            File uploaded successfully
                                                        </p>

                                                        <p className="mt-1 truncate text-xs text-green-700">
                                                            {
                                                                uploadedFile.originalName
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ERROR */}

                                        {uploadError && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {
                                                    uploadError
                                                }
                                            </p>
                                        )}
                                    </div>

                                    {/* CREATE BUTTON */}

                                    <button
                                        type="button"
                                        onClick={
                                            createReport
                                        }
                                        disabled={
                                            savingReport ||
                                            !selectedTarget
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#07111f] bg-[#07111f] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {savingReport ? (
                                            <>
                                                <RefreshCw
                                                    size={
                                                        18
                                                    }
                                                    className="animate-spin"
                                                />

                                                Saving Report...
                                            </>
                                        ) : (
                                            <>
                                                <Plus
                                                    size={
                                                        18
                                                    }
                                                />

                                                Save{" "}
                                                {
                                                    reportFormat
                                                }{" "}
                                                Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* =================================================
                                PREVIEW
                            ================================================= */}

                            <div className="rounded-xl border border-gray-300 bg-gray-50">

                                <div className="flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3">

                                    <div>
                                        <h3 className="text-sm font-bold text-black">
                                            Report Preview
                                        </h3>

                                        <p className="mt-1 text-[11px] text-gray-500">
                                            Live preview of the report.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5">

                                        {reportFormat ===
                                        "PDF" ? (
                                            <FileText
                                                size={
                                                    14
                                                }
                                                className="text-red-600"
                                            />
                                        ) : (
                                            <FileType
                                                size={
                                                    14
                                                }
                                                className="text-blue-600"
                                            />
                                        )}

                                        <span className="text-[11px] font-bold text-black">
                                            {
                                                reportFormat
                                            }
                                        </span>
                                    </div>
                                </div>

                                <div className="min-h-[500px] p-5">

                                    {showPreview &&
                                    previewReport ? (
                                        <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">

                                            <div className="border-b border-gray-300 pb-4">

                                                <div className="flex items-start justify-between gap-3">

                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                            Project
                                                            Report
                                                        </p>

                                                        <h2 className="mt-1 text-xl font-bold text-black">
                                                            {
                                                                previewReport.title
                                                            }
                                                        </h2>
                                                    </div>

                                                    <span
                                                        className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                                                            previewReport.format ===
                                                            "PDF"
                                                                ? "border-red-200 bg-red-50 text-red-700"
                                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                                        }`}
                                                    >
                                                        {
                                                            previewReport.format
                                                        }
                                                    </span>
                                                </div>

                                                <p className="mt-2 text-xs text-gray-500">
                                                    Generated on{" "}
                                                    {formatDate(
                                                        previewReport.createdAt
                                                    )}
                                                </p>
                                            </div>

                                            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                                                {
                                                    previewReport.content
                                                }
                                            </div>
                                        </div>
                                    ) : reportContent ? (
                                        <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">

                                            <div className="border-b border-gray-300 pb-4">

                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                    {selectedTarget?.type ||
                                                        "Report"}
                                                </p>

                                                <h2 className="mt-1 text-xl font-bold text-black">
                                                    {reportTitle ||
                                                        "Untitled Report"}
                                                </h2>

                                                <p className="mt-2 text-xs text-gray-500">
                                                    Preview ·{" "}
                                                    {
                                                        reportFormat
                                                    }
                                                </p>
                                            </div>

                                            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                                                {
                                                    reportContent
                                                }
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex min-h-[450px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-400 bg-white p-8 text-center">

                                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-300 bg-gray-50">
                                                <Sparkles
                                                    size={
                                                        25
                                                    }
                                                    className="text-gray-500"
                                                />
                                            </div>

                                            <h3 className="text-base font-bold text-black">
                                                Report Preview
                                            </h3>

                                            <p className="mt-2 max-w-sm text-xs leading-5 text-gray-600">
                                                Select a project and start writing your report. Your content will appear here.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* =================================================
                    READ ONLY MESSAGE
                ================================================= */}

                {!permissions.canCreateReport && (
                    <section className="mt-5 rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">

                        <div className="flex items-start gap-3">

                            <Eye
                                size={
                                    20
                                }
                                className="mt-0.5 shrink-0 text-gray-600"
                            />

                            <div>
                                <h3 className="text-sm font-bold text-black">
                                    Read-only report access
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-gray-600">
                                    You can view reports for the projects available to your role.
                                    {permissions.canDownloadReport &&
                                        " You can also download available reports."}
                                    {" "}
                                    Report creation and file uploading are restricted to Project Managers.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* =================================================
                    FOOTER INFO
                ================================================= */}

                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">

                    <span>
                        {currentUser?.role ===
                        "Member"
                            ? "You can view reports for projects where you have assigned tasks."
                            : "Reports are controlled by project and role permissions."}
                    </span>

                    <span className="font-semibold text-black">
                        {reports.length}{" "}
                        reports available
                    </span>
                </div>
            </div>

            {/* =================================================
    REPORT PREVIEW MODAL
================================================= */}

            {showPreview && previewReport && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-center justify-between border-b border-gray-300 bg-[#07111f] px-5 py-4 text-white">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                                    <Eye size={20} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Report Preview
                                    </p>

                                    <h2 className="truncate text-lg font-bold text-white">
                                        {previewReport.title}
                                    </h2>

                                    <p className="mt-0.5 text-xs text-gray-400">
                                        {previewReport.targetType}:{" "}
                                        {previewReport.targetName}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowPreview(false);
                                    setPreviewReport(null);
                                }}
                                className="rounded-lg p-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
                                aria-label="Close preview"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* REPORT META */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3">
                            <span
                                className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${previewReport.format === "PDF"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-blue-200 bg-blue-50 text-blue-700"
                                    }`}
                            >
                                {previewReport.format}
                            </span>

                            <span className="text-xs text-gray-500">
                                Created{" "}
                                {formatDate(previewReport.createdAt)}
                            </span>
                        </div>

                        {/* REPORT CONTENT */}
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6">
                            <div className="mx-auto min-h-[500px] max-w-3xl rounded-xl border border-gray-300 bg-white p-6 shadow-sm sm:p-8">

                                {/* REPORT TITLE */}
                                <div className="border-b border-gray-300 pb-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                                        {previewReport.targetType} Report
                                    </p>

                                    <h1 className="mt-2 text-2xl font-bold text-black">
                                        {previewReport.title}
                                    </h1>

                                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                        <span>
                                            <strong className="text-gray-700">
                                                Project:
                                            </strong>{" "}
                                            {previewReport.targetName}
                                        </span>

                                        <span>
                                            <strong className="text-gray-700">
                                                Format:
                                            </strong>{" "}
                                            {previewReport.format}
                                        </span>

                                        <span>
                                            <strong className="text-gray-700">
                                                Created:
                                            </strong>{" "}
                                            {formatDate(
                                                previewReport.createdAt
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* ACTUAL REPORT CONTENT */}
                                <div className="mt-6">
                                    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">
                                        {previewReport.content?.trim()
                                            ? previewReport.content
                                            : "No report content available."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}
                        <div className="flex items-center justify-between gap-3 border-t border-gray-300 bg-white px-5 py-3">
                            <p className="text-xs text-gray-500">
                                Previewing the saved report content.
                            </p>

                            <div className="flex gap-2">
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
                                            className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
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
                                            className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                        >
                                            <Download size={14} />
                                            Word
                                        </button>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setPreviewReport(null);
                                    }}
                                    className="rounded-lg bg-[#07111f] px-4 py-2 text-xs font-bold text-white hover:bg-black"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}


