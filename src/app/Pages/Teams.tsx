"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  ChevronDown,
  Copy,
  FileJson,
  FolderKanban,
  GripVertical,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
  Check,
  Circle,
  Clock3,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ============================================================
// TYPES
// ============================================================

type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Done";

type FilterType =
  | "All"
  | "Assigned"
  | "Unassigned";

type Project = {
  id: string;
  name: string;
  domain?: string;
  status?: string;
  created_by?: string;
  created_at?: string;
};

type Task = {
  id: string;
  name: string;
  project_id: string;
  assignee_id?: string;
  status: TaskStatus;
  priority?: string;
  created_at?: string;
  updated_at?: string;
};

type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar?: string;
  team_id?: string;
  team_name?: string;
};

type Team = {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at?: string;
};

// ============================================================
// COMPONENT
// ============================================================

const API_BASE =
  "http://localhost:5000/api";

export default function TeamsPage() {
  const router = useRouter();

  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState("");

  const [projects, setProjects] =
    useState<Project[]>([]);
  const [tasks, setTasks] =
    useState<Task[]>([]);
  const [teams, setTeams] =
    useState<Team[]>([]);
  const [allMembers, setAllMembers] =
    useState<TeamMember[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState("");
  const [currentUserRole, setCurrentUserRole] =
    useState("");
  const [currentUserTeam, setCurrentUserTeam] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<"teams" | "members">(
      "teams"
    );
  const [expandedTeams, setExpandedTeams] =
    useState<string[]>([]);
  const [expandedProjects, setExpandedProjects] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<FilterType>("All");
  const [filterOpen, setFilterOpen] =
    useState(false);

  const [draggedTask, setDraggedTask] =
    useState<string | null>(null);
  const [draggedMember, setDraggedMember] =
    useState<string | null>(null);

  const [taskMenuOpen, setTaskMenuOpen] =
    useState<string | null>(null);
  const [teamMenuOpen, setTeamMenuOpen] =
    useState<string | null>(null);
  const [memberMenuOpen, setMemberMenuOpen] =
    useState<string | null>(null);

  const [manualAssignTask, setManualAssignTask] =
    useState<Task | null>(null);
  const [manualAssignTeam, setManualAssignTeam] =
    useState<Team | null>(null);

  const [createTeamOpen, setCreateTeamOpen] =
    useState(false);
  const [addMemberOpen, setAddMemberOpen] =
    useState(false);
  const [newTeamName, setNewTeamName] =
    useState("");
  const [newTeamDescription, setNewTeamDescription] =
    useState("");
  const [selectedMemberToAdd, setSelectedMemberToAdd] =
    useState<TeamMember | null>(null);
  const [selectedTeamToAdd, setSelectedTeamToAdd] =
    useState<Team | null>(null);

  const projectScrollRef =
    useRef<HTMLDivElement>(null);
  const teamScrollRef =
    useRef<HTMLDivElement>(null);

  // ============================================================
  // PERMISSIONS
  // ============================================================

  const canManageTeams = useMemo(
    () =>
      currentUserRole ===
        "Project Manager" ||
      currentUserRole ===
        "Executive Manager" ||
      currentUserRole ===
        "System Administrator",
    [currentUserRole]
  );

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    try {
      setError("");
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      if (!token) {
        router.push("/login");
        return;
      }

      const userStr =
        typeof window !== "undefined"
          ? localStorage.getItem("user")
          : null;

      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || "");
        setCurrentUserRole(
          user.role || ""
        );
        setCurrentUserTeam(
          user.team_id || ""
        );
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      };

      // Load Projects
      const projectsRes = await fetch(
        `${API_BASE}/projects`,
        { headers }
      );

      if (projectsRes.ok) {
        const data =
          await projectsRes.json();
        const loadedProjects =
          data?.projects ||
          data?.data ||
          data ||
          [];

        setProjects(
          Array.isArray(loadedProjects)
            ? loadedProjects
            : []
        );
      }

      // Load Tasks
      const tasksRes = await fetch(
        `${API_BASE}/tasks`,
        { headers }
      );

      if (tasksRes.ok) {
        const data =
          await tasksRes.json();
        const loadedTasks =
          data?.tasks ||
          data?.data ||
          data ||
          [];

        setTasks(
          Array.isArray(loadedTasks)
            ? loadedTasks
            : []
        );
      }

      // Load Teams
      const teamsRes = await fetch(
        `${API_BASE}/teams`,
        { headers }
      );

      if (teamsRes.ok) {
        const data =
          await teamsRes.json();
        const loadedTeams =
          data?.teams ||
          data?.data ||
          data ||
          [];

        setTeams(
          Array.isArray(loadedTeams)
            ? loadedTeams
            : []
        );
      }

      // Load Members
      const membersRes = await fetch(
        `${API_BASE}/teams/members`,
        { headers }
      );

      if (membersRes.ok) {
        const data =
          await membersRes.json();
        const loadedMembers =
          data?.members ||
          data?.data ||
          data ||
          [];

        setAllMembers(
          Array.isArray(loadedMembers)
            ? loadedMembers
            : []
        );
      }
    } catch (err) {
      console.error(
        "Error loading data:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load teams"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // VISIBLE TEAMS - Role based
  // ============================================================

  const visibleTeams = useMemo(() => {
    if (canManageTeams) {
      return teams;
    }

    // Members see only their own team
    return teams.filter(
      (team) =>
        team.id === currentUserTeam
    );
  }, [
    teams,
    canManageTeams,
    currentUserTeam,
  ]);

  // ============================================================
  // VISIBLE PROJECTS
  // ============================================================

  const visibleProjects = useMemo(() => {
    return projects.filter(
      (project) => {
        if (
          search.trim() === ""
        ) {
          return true;
        }

        return (
          project.name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          (project.domain || "")
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
        );
      }
    );
  }, [projects, search]);

  // ============================================================
  // MEMBER VISIBLE PROJECTS - Members see only their assigned tasks
  // ============================================================

  const memberVisibleProjects =
    useMemo(() => {
      if (canManageTeams) {
        return visibleProjects;
      }

      // Members see only projects
      // where they have tasks
      return visibleProjects.filter(
        (project) => {
          const projectTasks =
            tasks.filter(
              (task) =>
                String(
                  task.project_id
                ) ===
                String(project.id)
            );

          // Show if task is assigned
          // to member
          return projectTasks.some(
            (task) =>
              String(
                task.assignee_id
              ) ===
              String(currentUserId)
          );
        }
      );
    }, [
      visibleProjects,
      canManageTeams,
      tasks,
      currentUserId,
    ]);

  // ============================================================
  // FILTERED TASKS
  // ============================================================

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (task) => {
        if (
          selectedFilter ===
          "Assigned"
        ) {
          return !!task.assignee_id;
        }

        if (
          selectedFilter ===
          "Unassigned"
        ) {
          return !task.assignee_id;
        }

        return true;
      }
    );
  }, [tasks, selectedFilter]);

  // ============================================================
  // VISIBLE MEMBERS - Role based
  // ============================================================

  const visibleMembers = useMemo(
    () =>
      allMembers.filter(
        (member) => {
          if (canManageTeams) {
            return true;
          }

          // Members see only their
          // team's members
          return (
            member.team_id ===
            currentUserTeam
          );
        }
      ),
    [
      allMembers,
      canManageTeams,
      currentUserTeam,
    ]
  );

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((current) =>
      current.includes(teamId)
        ? current.filter(
            (id) => id !== teamId
          )
        : [...current, teamId]
    );
  };

  const toggleProject = (
    projectId: string
  ) => {
    setExpandedProjects(
      (current) =>
        current.includes(projectId)
          ? current.filter(
              (id) =>
                id !== projectId
            )
          : [
              ...current,
              projectId,
            ]
    );
  };

  const handleTaskDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    if (!canManageTeams) {
      event.preventDefault();
      return;
    }

    setDraggedTask(taskId);
    event.dataTransfer.effectAllowed =
      "move";
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  const handleTaskDropOnMember = async (
    event: React.DragEvent<HTMLDivElement>,
    memberId: string
  ) => {
    if (!canManageTeams) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    if (!draggedTask) {
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/tasks/${draggedTask}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            assignee_id: memberId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to assign task"
        );
      }

      await loadData();
    } catch (err) {
      console.error(
        "Error assigning task:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign task"
      );
    } finally {
      setDraggedTask(null);
    }
  };

  const handleMemberDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    memberId: string
  ) => {
    if (!canManageTeams) {
      event.preventDefault();
      return;
    }

    setDraggedMember(memberId);
    event.dataTransfer.effectAllowed =
      "move";
  };

  const handleMemberDragEnd = () => {
    setDraggedMember(null);
  };

  const handleMemberDropOnTeam = async (
    event: React.DragEvent<HTMLDivElement>,
    teamId: string
  ) => {
    if (!canManageTeams) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    if (!draggedMember) {
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/teams/${teamId}/members/${draggedMember}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to add member to team"
        );
      }

      await loadData();
    } catch (err) {
      console.error(
        "Error adding member to team:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add member to team"
      );
    } finally {
      setDraggedMember(null);
    }
  };

  const changeTaskStatus = async (
    taskId: string,
    status: TaskStatus
  ) => {
    if (!canManageTeams) {
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update task"
        );
      }

      await loadData();
    } catch (err) {
      console.error(
        "Error updating task:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update task"
      );
    } finally {
      setTaskMenuOpen(null);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      setError(
        "Team name is required"
      );
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/teams`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: newTeamName,
            description:
              newTeamDescription,
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ||
            "Failed to create team"
        );
      }

      setNewTeamName("");
      setNewTeamDescription("");
      setCreateTeamOpen(false);
      await loadData();
    } catch (err) {
      console.error(
        "Error creating team:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create team"
      );
    }
  };

  const addMemberToTeam = async () => {
    if (
      !selectedMemberToAdd ||
      !selectedTeamToAdd
    ) {
      setError(
        "Please select member and team"
      );
      return;
    }

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/teams/${selectedTeamToAdd.id}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            member_id:
              selectedMemberToAdd.id,
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ||
            "Failed to add member"
        );
      }

      setSelectedMemberToAdd(null);
      setSelectedTeamToAdd(null);
      setAddMemberOpen(false);
      await loadData();
    } catch (err) {
      console.error(
        "Error adding member:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add member"
      );
    }
  };

  const assignTaskToMember = async (
    taskId: string,
    memberId: string
  ) => {
    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            assignee_id: memberId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to assign task"
        );
      }

      setManualAssignTask(null);
      await loadData();
    } catch (err) {
      console.error(
        "Error assigning task:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign task"
      );
    }
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f8f7f5] to-[#ede8e3]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <RefreshCw
              size={32}
              className="mx-auto animate-spin text-[#07111f]"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              Loading teams...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8f7f5] to-[#ede8e3] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">

          <div>
            <h1 className="text-3xl font-bold text-[#07111f]">
              Teams Workspace
            </h1>

            <p className="mt-1 text-base text-gray-600">
              {canManageTeams
                ? "Manage teams, assign tasks & members"
                : "View your team and assigned tasks"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {canManageTeams && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setAddMemberOpen(true)
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <UserPlus size={17} />
                  Add Member
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCreateTeamOpen(true)
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#07111f] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111d2d]"
                >
                  <Plus size={17} />
                  Add Team
                </button>
              </>
            )}

            {!canManageTeams &&
              currentUserRole ===
                "Member" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                  <p className="text-xs font-medium text-blue-700">
                    👁️ Viewing your team
                    only
                  </p>
                </div>
              )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>

        </div>

        {/* =================================================
            ERROR DISPLAY
        ================================================= */}

        {error && (
          <div className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {error}
            </p>

            <button
              onClick={() =>
                setError("")
              }
              className="mt-2 text-xs text-red-600 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =================================================
            TABS
        ================================================= */}

        <div className="mb-6 flex gap-2 border-b border-gray-300">

          <button
            type="button"
            onClick={() =>
              setActiveTab("teams")
            }
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === "teams"
                ? "border-b-2 border-[#07111f] text-[#07111f]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Teams
          </button>

          {canManageTeams && (
            <button
              type="button"
              onClick={() =>
                setActiveTab("members")
              }
              className={`px-4 py-3 text-sm font-semibold transition ${
                activeTab ===
                "members"
                  ? "border-b-2 border-[#07111f] text-[#07111f]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Members
            </button>
          )}

        </div>

        {/* =================================================
            TEAMS TAB
        ================================================= */}

        {activeTab === "teams" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">

            {/* =========== TEAM PANEL =========== */}

            <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-gray-300 bg-[#07111f] px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Users size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Teams
                    </h3>

                    <p className="text-[10px] text-gray-400">
                      Manage team
                      organization
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-semibold text-gray-300">
                  {visibleTeams.length}{" "}
                  Teams
                </span>
              </div>

              <div
                ref={teamScrollRef}
                className="h-[650px] overflow-y-auto border-t border-gray-200 p-4 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400"
              >
                <div className="space-y-3">

                  {visibleTeams.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-[#fafafa] px-4 py-8 text-center">
                      <Users
                        size={24}
                        className="mx-auto text-gray-400"
                      />

                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        No teams
                      </p>

                      <p className="mt-1 text-[9px] text-gray-500">
                        {canManageTeams
                          ? "Create a new team to get started"
                          : "You are not assigned to any team"}
                      </p>
                    </div>
                  ) : (
                    visibleTeams.map(
                      (team) => {
                        const teamMembers =
                          visibleMembers.filter(
                            (member) =>
                              member.team_id ===
                              team.id
                          );

                        const expanded =
                          expandedTeams.includes(
                            team.id
                          );

                        return (
                          <div
                            key={team.id}
                            className="overflow-visible rounded-xl border border-gray-300 bg-white"
                          >

                            {/* TEAM HEADER */}

                            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-4">

                              <div className="flex min-w-0 items-center gap-3">

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleTeam(
                                      team.id
                                    )
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-100"
                                >
                                  <ChevronDown
                                    size={15}
                                    className={
                                      expanded
                                        ? "rotate-180 transition"
                                        : "transition"
                                    }
                                  />
                                </button>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#07111f] text-white">
                                  <Users
                                    size={15}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <h4 className="truncate text-xs font-bold text-gray-900">
                                    {
                                      team.name
                                    }
                                  </h4>

                                  <p className="mt-0.5 text-[9px] text-gray-400">
                                    {
                                      team.description
                                    }
                                  </p>
                                </div>
                              </div>

                              <span className="shrink-0 rounded-md border border-gray-300 bg-gray-200 px-2 py-1 text-[9px] font-bold text-gray-600">
                                {
                                  teamMembers.length
                                }{" "}
                                members
                              </span>

                              {canManageTeams && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTeamMenuOpen(
                                        teamMenuOpen ===
                                          team.id
                                          ? null
                                          : team.id
                                      )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <MoreVertical
                                      size={15}
                                    />
                                  </button>

                                  {teamMenuOpen ===
                                    team.id && (
                                    <div className="absolute right-0 top-9 z-50 w-40 rounded-xl border border-gray-300 bg-white p-1.5 shadow-xl">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTeamToAdd(
                                            team
                                          );

                                          setTeamMenuOpen(
                                            null
                                          );
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] text-gray-700 hover:bg-gray-100"
                                      >
                                        <UserPlus
                                          size={12}
                                        />
                                        Add
                                        Member
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTeamMenuOpen(
                                            null
                                          );
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2
                                          size={12}
                                        />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* TEAM MEMBERS */}

                            {expanded && (
                              <div className="space-y-2 border-t border-gray-200 bg-[#fafafa] p-3">

                                {teamMembers.length ===
                                0 ? (
                                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
                                    <User
                                      size={20}
                                      className="mx-auto text-gray-300"
                                    />

                                    <p className="mt-2 text-xs font-semibold text-gray-500">
                                      No members
                                    </p>

                                    <p className="mt-1 text-[9px] text-gray-400">
                                      Drag members
                                      here or add
                                      manually
                                    </p>
                                  </div>
                                ) : (
                                  teamMembers.map(
                                    (member) => (
                                      <div
                                        key={
                                          member.id
                                        }
                                        onDragOver={(
                                          e
                                        ) =>
                                          e.preventDefault()
                                        }
                                        onDrop={(
                                          e
                                        ) =>
                                          handleMemberDropOnTeam(
                                            e,
                                            team.id
                                          )
                                        }
                                        className={`group flex items-center gap-3 rounded-xl border bg-white p-3 transition ${
                                          draggedMember
                                            ? "border-[#07111f] shadow-lg"
                                            : "border-gray-300 hover:border-gray-400 hover:shadow-sm"
                                        }`}
                                      >

                                        <MemberAvatar
                                          member={
                                            member
                                          }
                                        />

                                        <div className="min-w-0 flex-1">

                                          <p className="truncate text-xs font-semibold text-gray-900">
                                            {
                                              member.full_name
                                            }
                                          </p>

                                          <p className="mt-0.5 truncate text-[9px] text-gray-500">
                                            {
                                              member.email
                                            }
                                          </p>
                                        </div>

                                        <span className="shrink-0 rounded-md border border-gray-300 bg-gray-100 px-2 py-1 text-[8px] font-bold uppercase text-gray-600">
                                          {
                                            member.role
                                          }
                                        </span>

                                        {canManageTeams && (
                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setMemberMenuOpen(
                                                  memberMenuOpen ===
                                                    member.id
                                                    ? null
                                                    : member.id
                                                )
                                              }
                                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                            >
                                              <MoreVertical
                                                size={15}
                                              />
                                            </button>

                                            {memberMenuOpen ===
                                              member.id && (
                                              <div className="absolute right-0 top-9 z-50 w-40 rounded-xl border border-gray-300 bg-white p-1.5 shadow-xl">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setMemberMenuOpen(
                                                      null
                                                    );
                                                  }}
                                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] text-red-600 hover:bg-red-50"
                                                >
                                                  <Trash2
                                                    size={12}
                                                  />
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            </section>

            {/* =========== PROJECT PANEL =========== */}

            <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">

              {/* TOOLBAR */}

              {canManageTeams && (
                <div className="border-b border-gray-300 bg-white px-5 py-4">

                  <div className="mb-3 flex items-center justify-between">

                    <div>
                      <h3 className="text-sm font-bold text-[#07111f]">
                        Assignment
                        Workspace
                      </h3>

                      <p className="mt-1 text-[10px] text-gray-500">
                        Drag tasks → members
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">

                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        value={search}
                        onChange={(e) =>
                          setSearch(
                            e.target
                              .value
                          )
                        }
                        placeholder="Search projects or tasks"
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
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
                        className="flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <SlidersHorizontal
                          size={13}
                        />
                        Filters
                        <ChevronDown
                          size={13}
                        />
                      </button>

                      {filterOpen && (
                        <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-gray-300 bg-white p-1.5 shadow-xl">
                          {[
                            "All",
                            "Assigned",
                            "Unassigned",
                          ].map(
                            (filter) => (
                              <button
                                key={
                                  filter
                                }
                                type="button"
                                onClick={() => {
                                  setSelectedFilter(
                                    filter as FilterType
                                  );

                                  setFilterOpen(
                                    false
                                  );
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                                  selectedFilter ===
                                  filter
                                    ? "bg-gray-100 font-bold text-[#07111f]"
                                    : "text-gray-700"
                                }`}
                              >
                                {filter}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!canManageTeams && (
                <div className="border-b border-gray-300 bg-white px-5 py-4">

                  <h3 className="text-sm font-bold text-[#07111f]">
                    My Tasks & Team
                  </h3>

                  <p className="mt-1 text-[10px] text-gray-500">
                    {visibleTeams.length >
                    0
                      ? `You are part of: ${visibleTeams[0]?.name}`
                      : "You are not assigned to any team yet."}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-gray-300 bg-[#07111f] px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <FolderKanban
                      size={17}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {canManageTeams
                        ? "Projects & Tasks"
                        : "Your Tasks"}
                    </h3>

                    <p className="text-[10px] text-gray-400">
                      {canManageTeams
                        ? "Drag tasks → members"
                        : "Tasks assigned to you"}
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-semibold text-gray-300">
                  {
                    memberVisibleProjects.length
                  }{" "}
                  Projects
                </span>
              </div>

              <div
                ref={projectScrollRef}
                className="h-[650px] overflow-y-auto border-t border-gray-200 p-4 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400"
              >
                <div className="space-y-3">

                  {memberVisibleProjects.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-[#fafafa] px-4 py-8 text-center">
                      <FolderKanban
                        size={24}
                        className="mx-auto text-gray-400"
                      />

                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        No projects
                      </p>

                      <p className="mt-1 text-[9px] text-gray-500">
                        {canManageTeams
                          ? "Projects with tasks will appear here"
                          : "No tasks assigned to you yet"}
                      </p>
                    </div>
                  ) : (
                    memberVisibleProjects.map(
                      (project) => {
                        const projectTasks =
                          filteredTasks.filter(
                            (task) =>
                              String(
                                task.project_id
                              ) ===
                              String(
                                project.id
                              )
                          );

                        const expanded =
                          expandedProjects.includes(
                            project.id
                          );

                        return (
                          <div
                            key={project.id}
                            className="overflow-visible rounded-xl border border-gray-300 bg-white"
                          >

                            {/* PROJECT HEADER */}

                            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 p-4">

                              <div className="flex min-w-0 items-center gap-3">

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleProject(
                                      project.id
                                    )
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-100"
                                >
                                  <ChevronDown
                                    size={15}
                                    className={
                                      expanded
                                        ? "rotate-180 transition"
                                        : "transition"
                                    }
                                  />
                                </button>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#07111f] text-white">
                                  <FolderKanban
                                    size={15}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <h4 className="truncate text-xs font-bold text-gray-900">
                                    {
                                      project.name
                                    }
                                  </h4>

                                  <p className="mt-0.5 text-[9px] text-gray-400">
                                    {
                                      project.domain
                                    }
                                  </p>
                                </div>
                              </div>

                              <span className="shrink-0 rounded-md border border-gray-300 bg-gray-200 px-2 py-1 text-[9px] font-bold text-gray-600">
                                {
                                  projectTasks.length
                                }{" "}
                                tasks
                              </span>
                            </div>

                            {/* TASKS */}

                            {expanded && (
                              <div className="space-y-2 border-t border-gray-200 bg-[#fafafa] p-3">

                                {projectTasks.length ===
                                0 ? (
                                  <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                                    <p className="text-xs font-semibold text-gray-500">
                                      No tasks
                                    </p>

                                    <p className="mt-1 text-[9px] text-gray-400">
                                      No tasks
                                      have been
                                      created
                                      for this
                                      project
                                      yet.
                                    </p>
                                  </div>
                                ) : (
                                  projectTasks.map(
                                    (task) => {
                                      const assignee =
                                        visibleMembers.find(
                                          (
                                            member
                                          ) =>
                                            String(
                                              member.id
                                            ) ===
                                            String(
                                              task.assignee_id
                                            )
                                        );

                                      return (
                                        <div
                                          key={
                                            task.id
                                          }
                                          draggable={
                                            canManageTeams
                                          }
                                          onDragStart={(
                                            e
                                          ) =>
                                            handleTaskDragStart(
                                              e,
                                              task.id
                                            )
                                          }
                                          onDragEnd={
                                            handleTaskDragEnd
                                          }
                                          className={`group flex items-center gap-3 rounded-xl border bg-white p-3 transition ${
                                            draggedTask ===
                                            task.id
                                              ? "border-[#07111f] shadow-lg"
                                              : "border-gray-300 hover:border-gray-400 hover:shadow-sm"
                                          } ${
                                            canManageTeams
                                              ? "cursor-grab active:cursor-grabbing"
                                              : ""
                                          }`}
                                        >

                                          {canManageTeams && (
                                            <GripVertical
                                              size={
                                                16
                                              }
                                              className="shrink-0 text-gray-300 group-hover:text-gray-500"
                                            />
                                          )}

                                          <div className="min-w-0 flex-1">

                                            <div className="flex items-center gap-2">

                                              {task.status ===
                                              "Done" ? (
                                                <Check
                                                  size={
                                                    13
                                                  }
                                                  className="text-emerald-600"
                                                />
                                              ) : (
                                                <Circle
                                                  size={
                                                    13
                                                  }
                                                  className="text-gray-300"
                                                />
                                              )}

                                              <p
                                                className={`truncate text-xs font-semibold ${
                                                  task.status ===
                                                  "Done"
                                                    ? "text-gray-400 line-through"
                                                    : "text-gray-800"
                                                }`}
                                              >
                                                {
                                                  task.name
                                                }
                                              </p>
                                            </div>

                                            <p className="mt-1 pl-5 text-[9px] text-gray-400">
                                              Task
                                              #{
                                                task.id
                                              }
                                            </p>
                                          </div>

                                          <StatusBadge
                                            status={
                                              task.status
                                            }
                                          />

                                          {assignee ? (
                                            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 sm:flex">
                                              <MemberAvatar
                                                member={
                                                  assignee
                                                }
                                                small
                                              />

                                              <span className="text-[9px] font-semibold text-gray-600">
                                                {getInitials(
                                                  assignee.full_name
                                                )}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="hidden rounded-md border border-dashed border-gray-300 px-2 py-1 text-[9px] text-gray-400 sm:block">
                                              Unassigned
                                            </span>
                                          )}

                                          {/* MANUAL ASSIGN */}

                                          {canManageTeams && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setManualAssignTask(
                                                  task
                                                )
                                              }
                                              title="Assign task"
                                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                            >
                                              <UserPlus
                                                size={
                                                  14
                                                }
                                              />
                                            </button>
                                          )}

                                          {/* TASK MENU */}

                                          {canManageTeams && (
                                            <div className="relative">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setTaskMenuOpen(
                                                    taskMenuOpen ===
                                                      task.id
                                                      ? null
                                                      : task.id
                                                  )
                                                }
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                              >
                                                <MoreVertical
                                                  size={
                                                    15
                                                  }
                                                />
                                              </button>

                                              {taskMenuOpen ===
                                                task.id && (
                                                <div className="absolute right-0 top-9 z-50 w-40 rounded-xl border border-gray-300 bg-white p-1.5 shadow-xl">

                                                  <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                                                    Change
                                                    Status
                                                  </p>

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
                                                        type="button"
                                                        onClick={() =>
                                                          changeTaskStatus(
                                                            task.id,
                                                            status as TaskStatus
                                                          )
                                                        }
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] text-gray-700 hover:bg-gray-100"
                                                      >
                                                        {status ===
                                                        "Done" ? (
                                                          <Check
                                                            size={
                                                              12
                                                            }
                                                          />
                                                        ) : status ===
                                                          "In Progress" ? (
                                                          <Clock3
                                                            size={
                                                              12
                                                            }
                                                          />
                                                        ) : (
                                                          <Circle
                                                            size={
                                                              12
                                                            }
                                                          />
                                                        )}

                                                        {
                                                          status
                                                        }
                                                      </button>
                                                    )
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================
            MEMBERS TAB
        ================================================= */}

        {activeTab ===
          "members" &&
          canManageTeams && (
            <section className="rounded-2xl border border-gray-300 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-gray-300 bg-[#07111f] px-5 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <User size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      All Members
                    </h3>

                    <p className="text-[10px] text-gray-400">
                      Drag members to
                      teams
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-semibold text-gray-300">
                  {visibleMembers.length}{" "}
                  Members
                </span>
              </div>

              <div className="max-h-[700px] overflow-y-auto border-t border-gray-200 p-4 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400">

                <div className="space-y-2">

                  {visibleMembers.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-[#fafafa] px-4 py-8 text-center">
                      <User
                        size={24}
                        className="mx-auto text-gray-400"
                      />

                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        No members
                      </p>

                      <p className="mt-1 text-[9px] text-gray-500">
                        Add members to get
                        started
                      </p>
                    </div>
                  ) : (
                    visibleMembers.map(
                      (member) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(
                            e
                          ) =>
                            handleMemberDragStart(
                              e,
                              member.id
                            )
                          }
                          onDragEnd={
                            handleMemberDragEnd
                          }
                          className={`group flex items-center gap-3 rounded-xl border bg-white p-3 transition ${
                            draggedMember ===
                            member.id
                              ? "border-[#07111f] shadow-lg"
                              : "border-gray-300 hover:border-gray-400 hover:shadow-sm"
                          } cursor-grab active:cursor-grabbing`}
                        >

                          <GripVertical
                            size={16}
                            className="shrink-0 text-gray-300 group-hover:text-gray-500"
                          />

                          <MemberAvatar
                            member={
                              member
                            }
                          />

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-xs font-semibold text-gray-900">
                              {
                                member.full_name
                              }
                            </p>

                            <p className="mt-0.5 truncate text-[9px] text-gray-500">
                              {
                                member.email
                              }
                            </p>
                          </div>

                          <span className="shrink-0 rounded-md border border-gray-300 bg-gray-100 px-2 py-1 text-[8px] font-bold uppercase text-gray-600">
                            {member.role}
                          </span>

                          {member.team_name ? (
                            <span className="shrink-0 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">
                              {
                                member.team_name
                              }
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-md border border-dashed border-gray-300 px-2 py-1 text-[8px] text-gray-400">
                              Unassigned
                            </span>
                          )}
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </section>
          )}

        {/* =================================================
            MODALS
        ================================================= */}

        {/* CREATE TEAM MODAL */}

        {createTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-xl">

              <div className="mb-4 flex items-center justify-between">

                <h2 className="text-base font-bold text-[#07111f]">
                  Create Team
                </h2>

                <button
                  onClick={() => {
                    setCreateTeamOpen(
                      false
                    );

                    setNewTeamName("");
                    setNewTeamDescription(
                      ""
                    );
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) =>
                  setNewTeamName(
                    e.target.value
                  )
                }
                className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
              />

              <textarea
                placeholder="Team description (optional)"
                value={newTeamDescription}
                onChange={(e) =>
                  setNewTeamDescription(
                    e.target.value
                  )
                }
                rows={3}
                className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
              />

              <div className="flex gap-2">

                <button
                  onClick={() => {
                    setCreateTeamOpen(
                      false
                    );

                    setNewTeamName("");
                    setNewTeamDescription(
                      ""
                    );
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={createTeam}
                  className="flex-1 rounded-lg bg-[#07111f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111d2d]"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD MEMBER MODAL */}

        {addMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-xl">

              <div className="mb-4 flex items-center justify-between">

                <h2 className="text-base font-bold text-[#07111f]">
                  Add Member to Team
                </h2>

                <button
                  onClick={() => {
                    setAddMemberOpen(
                      false
                    );

                    setSelectedMemberToAdd(
                      null
                    );

                    setSelectedTeamToAdd(
                      null
                    );
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">

                <label className="text-xs font-semibold text-gray-700">
                  Select Member
                </label>

                <select
                  value={
                    selectedMemberToAdd
                      ?.id || ""
                  }
                  onChange={(e) => {
                    const member =
                      visibleMembers.find(
                        (m) =>
                          m.id ===
                          e.target.value
                      );

                    setSelectedMemberToAdd(
                      member || null
                    );
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                >

                  <option value="">
                    Choose a member...
                  </option>

                  {visibleMembers.map(
                    (member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {
                          member.full_name
                        }{" "}
                        ({member.email})
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mb-4">

                <label className="text-xs font-semibold text-gray-700">
                  Select Team
                </label>

                <select
                  value={
                    selectedTeamToAdd?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const team =
                      visibleTeams.find(
                        (t) =>
                          t.id ===
                          e.target.value
                      );

                    setSelectedTeamToAdd(
                      team || null
                    );
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                >

                  <option value="">
                    Choose a team...
                  </option>

                  {visibleTeams.map(
                    (team) => (
                      <option
                        key={team.id}
                        value={team.id}
                      >
                        {team.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => {
                    setAddMemberOpen(
                      false
                    );

                    setSelectedMemberToAdd(
                      null
                    );

                    setSelectedTeamToAdd(
                      null
                    );
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={addMemberToTeam}
                  className="flex-1 rounded-lg bg-[#07111f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111d2d]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANUAL ASSIGN TASK MODAL */}

        {manualAssignTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-xl">

              <div className="mb-4">

                <h2 className="text-base font-bold text-[#07111f]">
                  Assign Task
                </h2>

                <p className="mt-1 text-xs text-gray-600">
                  {manualAssignTask.name}
                </p>
              </div>

              <div className="mb-4 max-h-[400px] overflow-y-auto">

                <label className="text-xs font-semibold text-gray-700">
                  Select Member
                </label>

                <div className="mt-2 space-y-2">

                  {visibleMembers.map(
                    (member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          assignTaskToMember(
                            manualAssignTask.id,
                            member.id
                          )
                        }
                        className="w-full flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-left text-xs transition hover:border-[#07111f] hover:bg-gray-50"
                      >

                        <MemberAvatar
                          member={member}
                          small
                        />

                        <div className="flex-1">

                          <p className="font-semibold text-gray-900">
                            {
                              member.full_name
                            }
                          </p>

                          <p className="text-[9px] text-gray-500">
                            {
                              member.email
                            }
                          </p>
                        </div>

                        <span className="text-[8px] font-bold uppercase text-gray-600">
                          {member.role}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  setManualAssignTask(
                    null
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function MemberAvatar({
  member,
  small,
}: {
  member: TeamMember;
  small?: boolean;
}) {
  const initials = getInitials(
    member.full_name
  );

  const sizeClass = small
    ? "h-5 w-5 text-[8px]"
    : "h-8 w-8 text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#07111f] to-[#1a2a3a] font-bold text-white ${sizeClass}`}
    >
      {initials}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: TaskStatus;
}) {
  let className =
    "bg-yellow-100 text-yellow-700";

  if (
    status === "To Do"
  ) {
    className =
      "bg-gray-100 text-gray-700";
  } else if (
    status === "In Progress"
  ) {
    className =
      "bg-blue-100 text-blue-700";
  } else if (
    status === "Done"
  ) {
    className =
      "bg-emerald-100 text-emerald-700";
  }

  return (
    <span
      className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-bold uppercase ${className}`}
    >
      {status}
    </span>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function getInitials(
  name: string
): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}
