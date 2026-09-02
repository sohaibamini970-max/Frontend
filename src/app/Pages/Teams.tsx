"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  Users,
  UserPlus,
  FolderKanban,
  GripVertical,
  Check,
  Clock3,
  Circle,
  X,
  UserCheck,
  RefreshCw,
  ArrowRight,
  UserRound,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type TaskStatus = "To Do" | "In Progress" | "Done";

type UserRole =
  | "Member"
  | "Project Manager"
  | "Executive Manager"
  | "System Administrator";

type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole | string;
  team_id?: string | null;
  team_name?: string | null;
};

type Task = {
  id: string;
  project_id: string;
  name: string;
  status: TaskStatus;
  assignee_id?: string | null;
};

type Project = {
  id: string;
  name: string;
  domain: string;
};

type Team = {
  id: string;
  name: string;
  description: string;
  member_count: number;
};

type TeamWithMembers = Team & {
  members: TeamMember[];
};

/* =========================================================
   API
========================================================= */

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

/* =========================================================
   AUTH
========================================================= */

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

/* =========================================================
   RESPONSE HELPER
========================================================= */

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json();

    return data?.message || data?.error || fallback;
  } catch {
    return fallback;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function normalizeStatus(status: string): TaskStatus {
  const normalized = String(status)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (
    normalized === "done" ||
    normalized === "completed" ||
    normalized === "complete"
  ) {
    return "Done";
  }

  if (
    normalized === "in_progress" ||
    normalized === "inprogress" ||
    normalized === "progress"
  ) {
    return "In Progress";
  }

  return "To Do";
}

function extractRows(data: any, key: string) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

/* =========================================================
   FETCH PROJECTS
========================================================= */

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Unable to load projects."
      )
    );
  }

  const data = await response.json();

  const rows = extractRows(data, "projects");

  return rows.map((project: any) => ({
    id: String(project.id),
    name:
      project.name ||
      project.title ||
      "Untitled Project",
    domain:
      project.domain ||
      project.company_domain ||
      "",
  }));
}

/* =========================================================
   FETCH TASKS
========================================================= */

async function fetchTasks(
  projectList: Project[]
): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const project of projectList) {
    try {
      const response = await fetch(
        `${API_BASE}/tasks/project/${project.id}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        console.error(
          `Unable to load tasks for project ${project.id}`
        );

        continue;
      }

      const data = await response.json();

      const rows = extractRows(data, "tasks");

      const projectTasks: Task[] = rows.map(
        (task: any) => ({
          id: String(task.id),

          project_id: String(
            task.project_id ??
              task.projectId ??
              task.project?.id ??
              project.id
          ),

          name:
            task.name ||
            task.title ||
            task.task_name ||
            "Untitled Task",

          status: normalizeStatus(
            task.status || "To Do"
          ),

          assignee_id:
            task.assignee_id ??
            task.assigneeId ??
            task.assigned_to ??
            null,
        })
      );

      allTasks.push(...projectTasks);
    } catch (error) {
      console.error(
        `Failed to load tasks for project ${project.id}:`,
        error
      );
    }
  }

  return allTasks;
}

/* =========================================================
   FETCH USERS
========================================================= */

async function fetchAllUsers(): Promise<TeamMember[]> {
  const response = await fetch(
    `${API_BASE}/users`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Unable to load users."
      )
    );
  }

  const data = await response.json();

  const rows = extractRows(data, "users");

  return rows.map((user: any) => ({
    id: String(user.id),
    email: user.email || "",
    full_name:
      user.full_name ||
      user.fullName ||
      user.name ||
      "Unknown User",
    role: user.role || "Member",
    team_id: user.team_id
      ? String(user.team_id)
      : null,
    team_name:
      user.team_name || null,
  }));
}

/* =========================================================
   FETCH TEAMS + MEMBERS
========================================================= */

async function fetchTeamsWithMembers(): Promise<
  TeamWithMembers[]
> {
  const teamsResponse = await fetch(
    `${API_BASE}/teams`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  if (!teamsResponse.ok) {
    throw new Error(
      await getErrorMessage(
        teamsResponse,
        "Unable to load teams."
      )
    );
  }

  const membersResponse = await fetch(
    `${API_BASE}/teams/members`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  if (!membersResponse.ok) {
    throw new Error(
      await getErrorMessage(
        membersResponse,
        "Unable to load team members."
      )
    );
  }

  const teamsData = await teamsResponse.json();
  const membersData = await membersResponse.json();

  const teamRows = extractRows(
    teamsData,
    "teams"
  );

  const memberRows = extractRows(
    membersData,
    "members"
  );

  const members: TeamMember[] =
    memberRows.map((member: any) => ({
      id: String(member.id),
      email: member.email || "",
      full_name:
        member.full_name ||
        member.fullName ||
        "Unknown User",
      role: member.role || "Member",
      team_id: member.team_id
        ? String(member.team_id)
        : null,
      team_name:
        member.team_name || null,
    }));

  return teamRows.map((team: any) => {
    const teamId = String(team.id);

    const teamMembers = members.filter(
      (member) =>
        String(member.team_id) === teamId
    );

    return {
      id: teamId,
      name: team.name || "Unnamed Team",
      description: team.description || "",
      member_count:
        Number(team.member_count) ||
        teamMembers.length,
      members: teamMembers,
    };
  });
}

/* =========================================================
   FETCH AVAILABLE MEMBERS
========================================================= */

async function fetchUnassignedMembers(): Promise<
  TeamMember[]
> {
  const response = await fetch(
    `${API_BASE}/teams/available-members`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Unable to load available members."
      )
    );
  }

  const data = await response.json();

  const rows = extractRows(
    data,
    "available_members"
  );

  return rows.map((user: any) => ({
    id: String(user.id),
    email: user.email || "",
    full_name:
      user.full_name ||
      user.fullName ||
      "Unknown User",
    role: user.role || "Member",
    team_id: null,
    team_name: null,
  }));
}

/* =========================================================
   AVATAR
========================================================= */

function MemberAvatar({
  member,
  small = false,
}: {
  member: TeamMember;
  small?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 font-bold text-gray-700 ${
        small
          ? "h-8 w-8 text-[9px]"
          : "h-10 w-10 text-[10px]"
      }`}
    >
      {getInitials(member.full_name)}
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: TaskStatus;
}) {
  if (status === "Done") {
    return (
      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
        Complete
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-700">
        In Progress
      </span>
    );
  }

  return (
    <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[8px] font-bold text-gray-500">
      To Do
    </span>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function Teams() {
  const [allMembers, setAllMembers] =
    useState<TeamMember[]>([]);

  const [teams, setTeams] =
    useState<TeamWithMembers[]>([]);

  const [unassignedMembers, setUnassignedMembers] =
    useState<TeamMember[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filterOpen, setFilterOpen] =
    useState(false);

  type FilterType =
    | "All"
    | "Assigned"
    | "Unassigned";

  const [selectedFilter, setSelectedFilter] =
    useState<FilterType>("All");

  const [expandedProjects, setExpandedProjects] =
    useState<string[]>([]);

  const [teamMemberView, setTeamMemberView] =
    useState<"teams" | "members">("teams");

  const [createTeamOpen, setCreateTeamOpen] =
    useState(false);

  const [addMemberOpen, setAddMemberOpen] =
    useState(false);

  const [manualAssignTask, setManualAssignTask] =
    useState<Task | null>(null);

  const [taskMenuOpen, setTaskMenuOpen] =
    useState<string | null>(null);

  const [draggedTask, setDraggedTask] =
    useState<string | null>(null);

  const [draggedMember, setDraggedMember] =
    useState<string | null>(null);

  const [dragOverTeam, setDragOverTeam] =
    useState<string | null>(null);

  const [assigningMember, setAssigningMember] =
    useState<string | null>(null);

  const projectScrollRef =
    useRef<HTMLDivElement | null>(null);

  const memberScrollRef =
    useRef<HTMLDivElement | null>(null);

  /* =========================================================
     CURRENT USER
  ========================================================= */

  const [currentUserRole, setCurrentUserRole] =
    useState<UserRole | string>("Member");

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        const parsed = JSON.parse(
          storedUser
        );

        /*
          Supports both:
          
          {
            id: "...",
            role: "Member"
          }

          and:

          {
            user: {
              id: "...",
              role: "Member"
            }
          }
        */

        const userData =
          parsed?.user || parsed;

        setCurrentUserRole(
          userData?.role || "Member"
        );

        setCurrentUserId(
          userData?.id
            ? String(userData.id)
            : null
        );
      }
    } catch {
      setCurrentUserRole("Member");
      setCurrentUserId(null);
    }
  }, []);

  /* =========================================================
     MANAGEMENT PERMISSION
     
     KEEPING EXISTING BEHAVIOR
  ========================================================= */

  const canManageTeams =
    currentUserRole ===
      "Project Manager" ||
    currentUserRole ===
      "Executive Manager" ||
    currentUserRole ===
      "System Administrator";

  /* =========================================================
     MEMBER-ONLY TEAM FILTER
     
     MANAGEMENT ROLES:
       -> See all teams

     MEMBER:
       -> See only own team
  ========================================================= */

  const visibleTeams = useMemo(() => {
    /*
      Management users keep the exact existing behavior.
    */
    if (canManageTeams) {
      return teams;
    }

    /*
      Members only see the team that contains
      their own user ID.
    */
    if (
      currentUserRole === "Member" &&
      currentUserId
    ) {
      return teams.filter((team) =>
        team.members.some(
          (member) =>
            String(member.id) ===
            String(currentUserId)
        )
      );
    }

    return [];
  }, [
    teams,
    currentUserRole,
    currentUserId,
    canManageTeams,
  ]);

  /* =========================================================
     FORM STATES
  ========================================================= */

  const [newTeamName, setNewTeamName] =
    useState("");

  const [newTeamDescription, setNewTeamDescription] =
    useState("");

  const [newMemberName, setNewMemberName] =
    useState("");

  const [newMemberRole, setNewMemberRole] =
    useState("");

  const [newMemberEmail, setNewMemberEmail] =
    useState("");

  const [selectedTeamForMember, setSelectedTeamForMember] =
    useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadData = async () => {
    try {
      setRefreshing(true);
      setError("");

      const projectData =
        await fetchProjects();

      setProjects(projectData);

      setExpandedProjects(
        projectData.map(
          (project) => project.id
        )
      );

      const [
        taskData,
        allUsersData,
        teamsData,
        unassignedData,
      ] = await Promise.all([
        fetchTasks(projectData),
        fetchAllUsers(),
        fetchTeamsWithMembers(),
        fetchUnassignedMembers(),
      ]);

      setTasks(taskData);
      setAllMembers(allUsersData);
      setTeams(teamsData);

      setUnassignedMembers(
        unassignedData
      );
    } catch (err: any) {
      console.error(
        "Teams workspace error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load workspace data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     PROJECT FILTER
  ========================================================= */

  const visibleProjects =
    useMemo(() => {
      const query =
        search.toLowerCase().trim();

      return projects.filter(
        (project) => {
          const projectTasks =
            tasks.filter(
              (task) =>
                String(task.project_id) ===
                String(project.id)
            );

          const matchesSearch =
            !query ||
            project.name
              .toLowerCase()
              .includes(query) ||
            project.domain
              .toLowerCase()
              .includes(query) ||
            projectTasks.some((task) =>
              task.name
                .toLowerCase()
                .includes(query)
            );

          if (!matchesSearch) {
            return false;
          }

          if (
            selectedFilter ===
            "Assigned"
          ) {
            return projectTasks.some(
              (task) =>
                Boolean(task.assignee_id)
            );
          }

          if (
            selectedFilter ===
            "Unassigned"
          ) {
            return projectTasks.some(
              (task) =>
                !task.assignee_id
            );
          }

          return true;
        }
      );
    }, [
      search,
      projects,
      tasks,
      selectedFilter,
    ]);

  /* =========================================================
     PROJECT TOGGLE
  ========================================================= */

  const toggleProject = (
    projectId: string
  ) => {
    setExpandedProjects(
      (previous) =>
        previous.includes(projectId)
          ? previous.filter(
              (id) =>
                id !== projectId
            )
          : [
              ...previous,
              projectId,
            ]
    );
  };

  /* =========================================================
     CHANGE TASK STATUS
  ========================================================= */

  const changeTaskStatus = async (
    taskId: string,
    status: TaskStatus
  ) => {
    try {
      const response =
        await fetch(
          `${API_BASE}/tasks/${taskId}/status`,
          {
            method: "PATCH",
            headers:
              getAuthHeaders(),
            body: JSON.stringify({
              status,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Unable to update task status."
          )
        );
      }

      setTasks(
        (previous) =>
          previous.map(
            (task) =>
              task.id === taskId
                ? {
                    ...task,
                    status,
                  }
                : task
          )
      );

      setTaskMenuOpen(null);
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to update task status."
      );
    }
  };

  /* =========================================================
     ASSIGN TASK API
  ========================================================= */

  const assignTask = async (
    taskId: string,
    assigneeId: string
  ) => {
    try {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        throw new Error(
          "Authentication token is missing."
        );
      }

      console.log(
        "Assigning task:",
        {
          taskId,
          assigneeId,
        }
      );

      const response =
        await fetch(
          `${API_BASE}/tasks/${taskId}/assign`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              assigneeId,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      console.log(
        "Assign task response:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to assign task."
        );
      }

      return data;
    } catch (error) {
      console.error(
        "Assign task error:",
        error
      );

      throw error;
    }
  };

  /* =========================================================
     TASK DRAG START
  ========================================================= */

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

    event.dataTransfer.setData(
      "application/x-arg-task",
      taskId
    );

    event.dataTransfer.setData(
      "text/plain",
      taskId
    );
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  /* =========================================================
     TASK DROP ON MEMBER
  ========================================================= */

  const handleMemberDragOverTask = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    if (
      draggedTask &&
      canManageTeams
    ) {
      event.preventDefault();

      event.dataTransfer.dropEffect =
        "move";
    }
  };

  const handleDropTaskOnMember =
    async (
      event: React.DragEvent<HTMLDivElement>,
      memberId: string
    ) => {
      event.preventDefault();

      if (
        !canManageTeams ||
        !draggedTask
      ) {
        return;
      }

      const taskId =
        event.dataTransfer.getData(
          "application/x-arg-task"
        ) ||
        draggedTask;

      setDraggedTask(null);

      try {
        await assignTask(
          taskId,
          memberId
        );

        setTasks(
          (previous) =>
            previous.map(
              (task) =>
                task.id === taskId
                  ? {
                      ...task,
                      assignee_id:
                        memberId,
                    }
                  : task
            )
        );

        await loadData();
      } catch (error) {
        console.error(
          "Failed to assign task:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to assign task to member."
        );
      }
    };

  /* =========================================================
     MEMBER DRAG START
  ========================================================= */

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

    event.dataTransfer.setData(
      "application/x-arg-member",
      memberId
    );

    event.dataTransfer.setData(
      "text/plain",
      memberId
    );
  };

  const handleMemberDragEnd = () => {
    setDraggedMember(null);
    setDragOverTeam(null);
  };

  /* =========================================================
     MANUAL TASK ASSIGN
  ========================================================= */

  const handleManualTaskAssign =
    async (
      memberId: string
    ) => {
      if (!manualAssignTask) {
        return;
      }

      try {
        await assignTask(
          manualAssignTask.id,
          memberId
        );

        setTasks(
          (previous) =>
            previous.map(
              (task) =>
                task.id ===
                manualAssignTask.id
                  ? {
                      ...task,
                      assignee_id:
                        memberId,
                    }
                  : task
            )
        );

        setManualAssignTask(null);
        setTaskMenuOpen(null);
      } catch (error) {
        console.error(
          "Assignment error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to assign task."
        );
      }
    };

  /* =========================================================
     TEAM DRAG OVER
  ========================================================= */

  const handleTeamDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    teamId: string
  ) => {
    if (
      !draggedMember ||
      !canManageTeams
    ) {
      return;
    }

    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    setDragOverTeam(teamId);
  };

  const handleTeamDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
    teamId: string
  ) => {
    const currentTarget =
      event.currentTarget;

    const relatedTarget =
      event.relatedTarget as
        | Node
        | null;

    if (
      relatedTarget &&
      currentTarget.contains(
        relatedTarget
      )
    ) {
      return;
    }

    if (
      dragOverTeam === teamId
    ) {
      setDragOverTeam(null);
    }
  };

  /* =========================================================
     ASSIGN MEMBER TO TEAM
  ========================================================= */

  const assignMemberToTeam =
    async (
      memberId: string,
      teamId: string
    ) => {
      if (!canManageTeams) {
        alert(
          "Only management can assign members to teams."
        );

        return;
      }

      const member =
        allMembers.find(
          (item) =>
            String(item.id) ===
            String(memberId)
        );

      const team =
        teams.find(
          (item) =>
            String(item.id) ===
            String(teamId)
        );

      if (!member || !team) {
        return;
      }

      const existingTeam =
        teams.find((item) =>
          item.members.some(
            (itemMember) =>
              String(
                itemMember.id
              ) ===
              String(memberId)
          )
        );

      if (existingTeam) {
        alert(
          `${member.full_name} already belongs to ${existingTeam.name}.`
        );

        return;
      }

      try {
        setAssigningMember(
          memberId
        );

        const response =
          await fetch(
            `${API_BASE}/teams/assign-member`,
            {
              method: "POST",
              headers:
                getAuthHeaders(),
              body: JSON.stringify({
                teamId,
                userId:
                  memberId,
              }),
            }
          );

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(
              response,
              "Unable to assign member to team."
            )
          );
        }

        const updatedMember: TeamMember =
          {
            ...member,
            team_id: teamId,
            team_name:
              team.name,
          };

        setTeams(
          (previous) =>
            previous.map(
              (currentTeam) => {
                if (
                  String(
                    currentTeam.id
                  ) !==
                  String(teamId)
                ) {
                  return currentTeam;
                }

                const alreadyExists =
                  currentTeam.members.some(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(memberId)
                  );

                if (
                  alreadyExists
                ) {
                  return currentTeam;
                }

                return {
                  ...currentTeam,
                  member_count:
                    currentTeam.member_count +
                    1,
                  members: [
                    ...currentTeam.members,
                    updatedMember,
                  ],
                };
              }
            )
        );

        setUnassignedMembers(
          (previous) =>
            previous.filter(
              (item) =>
                String(item.id) !==
                String(memberId)
            )
        );

        setAllMembers(
          (previous) =>
            previous.map(
              (item) =>
                String(item.id) ===
                String(memberId)
                  ? updatedMember
                  : item
            )
        );
      } catch (err) {
        console.error(
          "Member assignment error:",
          err
        );

        alert(
          err instanceof Error
            ? err.message
            : "Unable to assign member to team."
        );
      } finally {
        setAssigningMember(null);
        setDraggedMember(null);
        setDragOverTeam(null);
      }
    };

  /* =========================================================
     DROP MEMBER ON TEAM
  ========================================================= */

  const handleDropMemberOnTeam =
    async (
      event: React.DragEvent<HTMLDivElement>,
      teamId: string
    ) => {
      event.preventDefault();

      if (
        !canManageTeams ||
        !draggedMember
      ) {
        return;
      }

      const memberId =
        event.dataTransfer.getData(
          "application/x-arg-member"
        ) ||
        draggedMember;

      await assignMemberToTeam(
        memberId,
        teamId
      );
    };

  /* =========================================================
     CREATE TEAM
  ========================================================= */

  const createTeam = async () => {
    if (
      !newTeamName.trim() ||
      !canManageTeams
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_BASE}/teams`,
          {
            method: "POST",
            headers:
              getAuthHeaders(),
            body: JSON.stringify({
              name:
                newTeamName.trim(),
              description:
                newTeamDescription.trim() ||
                "New team",
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Unable to create team."
          )
        );
      }

      const data =
        await response.json();

      const created =
        data.team || data;

      const newTeam: TeamWithMembers =
        {
          id: String(
            created.id
          ),
          name:
            created.name ||
            newTeamName.trim(),
          description:
            created.description ||
            newTeamDescription.trim(),
          member_count: 0,
          members: [],
        };

      setTeams(
        (previous) => [
          ...previous,
          newTeam,
        ]
      );

      setNewTeamName("");
      setNewTeamDescription("");
      setCreateTeamOpen(false);
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to create team."
      );
    }
  };

  /* =========================================================
     ADD NEW MEMBER
  ========================================================= */

  const addNewMember = async () => {
    if (
      !newMemberName.trim() ||
      !newMemberRole.trim() ||
      !newMemberEmail.trim()
    ) {
      return;
    }

    try {
      const payload = {
        full_name:
          newMemberName.trim(),
        role:
          newMemberRole.trim(),
        email:
          newMemberEmail.trim(),
      };

      let response =
        await fetch(
          `${API_BASE}/users`,
          {
            method: "POST",
            headers:
              getAuthHeaders(),
            body: JSON.stringify(
              payload
            ),
          }
        );

      if (!response.ok) {
        response =
          await fetch(
            `${API_BASE}/users`,
            {
              method: "POST",
              headers:
                getAuthHeaders(),
              body: JSON.stringify({
                fullName:
                  newMemberName.trim(),
                job_title:
                  newMemberRole.trim(),
                email:
                  newMemberEmail.trim(),
              }),
            }
          );
      }

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Unable to create member."
          )
        );
      }

      const data =
        await response.json();

      const created =
        data.user || data;

      const createdMemberId =
        String(created.id);

      if (
        selectedTeamForMember
      ) {
        const assignResponse =
          await fetch(
            `${API_BASE}/teams/assign-member`,
            {
              method: "POST",
              headers:
                getAuthHeaders(),
              body: JSON.stringify({
                teamId:
                  selectedTeamForMember,
                userId:
                  createdMemberId,
              }),
            }
          );

        if (!assignResponse.ok) {
          console.warn(
            "Member created but team assignment failed:",
            await assignResponse.text()
          );
        }
      }

      setNewMemberName("");
      setNewMemberRole("");
      setNewMemberEmail("");
      setSelectedTeamForMember("");
      setAddMemberOpen(false);

      await loadData();

      alert(
        "Member created successfully!"
      );
    } catch (err) {
      console.error(
        "Failed to create member:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Unable to create member."
      );
    }
  };

  /* =========================================================
     MEMBER TASK STATS
  ========================================================= */

  const getMemberStats = (
    memberId: string
  ) => {
    const memberTasks =
      tasks.filter(
        (task) =>
          String(
            task.assignee_id
          ) ===
          String(memberId)
      );

    return {
      total:
        memberTasks.length,

      done:
        memberTasks.filter(
          (task) =>
            task.status ===
            "Done"
        ).length,

      pending:
        memberTasks.filter(
          (task) =>
            task.status !==
            "Done"
        ).length,

      progress:
        memberTasks.filter(
          (task) =>
            task.status ===
            "In Progress"
        ).length,
    };
  };

  /* =========================================================
     AUTO SCROLL WHILE DRAGGING
  ========================================================= */

  useEffect(() => {
    const handleDragOver = (
      event: DragEvent
    ) => {
      if (
        !draggedTask &&
        !draggedMember
      ) {
        return;
      }

      const threshold = 110;
      const speed = 14;
      const y = event.clientY;

      const containers = [
        projectScrollRef.current,
        memberScrollRef.current,
      ];

      containers.forEach(
        (container) => {
          if (!container) {
            return;
          }

          const rect =
            container.getBoundingClientRect();

          if (
            y >= rect.top &&
            y <= rect.bottom
          ) {
            if (
              y <
              rect.top +
                threshold
            ) {
              container.scrollTop -=
                speed;
            }

            if (
              y >
              rect.bottom -
                threshold
            ) {
              container.scrollTop +=
                speed;
            }
          }
        }
      );
    };

    window.addEventListener(
      "dragover",
      handleDragOver
    );

    return () => {
      window.removeEventListener(
        "dragover",
        handleDragOver
      );
    };
  }, [
    draggedTask,
    draggedMember,
  ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#07111f]" />

          <p className="mt-4 text-sm font-semibold text-gray-700">
            Loading teams workspace...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Loading projects, tasks and team
            members from database.
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <main className="bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[#07111f]">
              Teams
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage teams, projects, tasks and
              individual responsibilities from one
              workspace.
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

            <button
              type="button"
              onClick={loadData}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
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
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <div>
              <strong>
                Workspace error:
              </strong>{" "}
              {error}
            </div>

            <button
              type="button"
              onClick={loadData}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Projects
            </p>

            <p className="mt-1 text-2xl font-bold text-[#07111f]">
              {projects.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Teams
            </p>

            <p className="mt-1 text-2xl font-bold text-[#07111f]">
              {canManageTeams
                ? teams.length
                : visibleTeams.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Team Members
            </p>

            <p className="mt-1 text-2xl font-bold text-[#07111f]">
              {canManageTeams
                ? allMembers.length
                : visibleTeams.reduce(
                    (total, team) =>
                      total +
                      team.members.length,
                    0
                  )}
            </p>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Tasks
            </p>

            <p className="mt-1 text-2xl font-bold text-[#07111f]">
              {
                tasks.filter(
                  (task) =>
                    task.status !==
                    "Done"
                ).length
              }
            </p>
          </div>
        </div>

        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#07111f]">
              Assignment Workspace
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {canManageTeams
                ? "Drag tasks to members and available members to teams."
                : "View your team and the members assigned to it."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search projects or tasks"
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100 sm:w-[280px]"
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
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700"
              >
                <SlidersHorizontal
                  size={15}
                />
                Filters
                <ChevronDown size={13} />
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-11 z-40 w-44 rounded-xl border border-gray-300 bg-white p-1.5 shadow-xl">
                  {[
                    "All",
                    "Assigned",
                    "Unassigned",
                  ].map(
                    (filter) => (
                      <button
                        key={filter}
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

        {/* =================================================
            MAIN WORKSPACE
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(380px,0.9fr)]">

          {/* =================================================
              PROJECT PANEL
          ================================================= */}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-300 bg-[#07111f] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                  <FolderKanban size={17} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    Projects & Tasks
                  </h3>

                  <p className="text-[10px] text-gray-400">
                    Drag tasks → members
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-semibold text-gray-300">
                {projects.length} Projects
              </span>
            </div>

            <div
              ref={projectScrollRef}
              className="h-[650px] overflow-y-auto border-t border-gray-200 p-4 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400"
            >
              <div className="space-y-3">
                {visibleProjects.map(
                  (project) => {
                    const projectTasks =
                      tasks.filter(
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
                        {/* PROJECT */}

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
                              <FolderKanban size={15} />
                            </div>

                            <div className="min-w-0">
                              <h4 className="truncate text-xs font-bold text-gray-900">
                                {project.name}
                              </h4>

                              <p className="mt-0.5 text-[9px] text-gray-400">
                                {project.domain}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-md border border-gray-300 bg-gray-200 px-2 py-1 text-[9px] font-bold text-gray-600">
                            {projectTasks.length}{" "}
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
                                  No tasks have been
                                  created for this
                                  project yet.
                                </p>
                              </div> 
                            ) : (
                              projectTasks.map(
                                (task) => {
                                  const assignee =
                                    allMembers.find(
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
                                        event
                                      ) =>
                                        handleTaskDragStart(
                                          event,
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
                                      <GripVertical
                                        size={16}
                                        className="shrink-0 text-gray-300 group-hover:text-gray-500"
                                      />

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
                                          Task #
                                          {
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

                                      {/* MANUAL ASSIGN
                                          Management only */}

                                      {canManageTeams && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setManualAssignTask(
                                              task
                                            )
                                          }
                                          title="Assign task manually"
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
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              TEAM PANEL
          ================================================= */}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
            <div className="border-b border-gray-300 bg-[#07111f] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Users size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Team Members
                    </h3>

                    <p className="text-[10px] text-gray-400">
                      {canManageTeams
                        ? "Manage & assign members"
                        : "Your team members"}
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[9px] font-semibold text-gray-300">
                  {canManageTeams
                    ? allMembers.length
                    : visibleTeams.reduce(
                        (total, team) =>
                          total +
                          team.members.length,
                        0
                      )}{" "}
                  Members
                </span>
              </div>

              {/* =================================================
                  TABS
                  
                  Members role:
                    -> ONLY Teams tab

                  Management:
                    -> Teams + Members
              ================================================= */}

              <div className="mt-4 flex rounded-lg border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setTeamMemberView(
                      "teams"
                    )
                  }
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold transition ${
                    teamMemberView ===
                    "teams"
                      ? "bg-white text-[#07111f]"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <Users size={13} />
                  Teams
                </button>

                {canManageTeams && (
                  <button
                    type="button"
                    onClick={() =>
                      setTeamMemberView(
                        "members"
                      )
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold transition ${
                      teamMemberView ===
                      "members"
                        ? "bg-white text-[#07111f]"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <UserRound size={13} />
                    Members
                  </button>
                )}
              </div>
            </div>

            <div
              ref={memberScrollRef}
              className="h-[650px] overflow-y-auto border-t border-gray-200 p-4 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-400"
            >

              {/* =================================================
                  TEAMS VIEW
                  
                  Management:
                    -> all teams

                  Member:
                    -> own team only
              ================================================= */}

              {teamMemberView ===
                "teams" && (
                <div className="space-y-3">

                  {visibleTeams.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                      <Users
                        size={24}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-2 text-xs font-semibold text-gray-600">
                        {currentUserRole ===
                        "Member"
                          ? "You are not assigned to a team"
                          : "No teams created"}
                      </p>

                      <p className="mt-1 text-[9px] text-gray-400">
                        {currentUserRole ===
                        "Member"
                          ? "Your team will appear here once you are assigned."
                          : "Create a team to get started."}
                      </p>
                    </div>
                  ) : (
                    visibleTeams.map(
                      (team) => {
                        const isDropTarget =
                          dragOverTeam ===
                          team.id;

                        return (
                          <div
                            key={
                              team.id
                            }
                            onDragOver={
                              canManageTeams
                                ? (
                                    event
                                  ) =>
                                    handleTeamDragOver(
                                      event,
                                      team.id
                                    )
                                : undefined
                            }
                            onDragLeave={
                              canManageTeams
                                ? (
                                    event
                                  ) =>
                                    handleTeamDragLeave(
                                      event,
                                      team.id
                                    )
                                : undefined
                            }
                            onDrop={
                              canManageTeams
                                ? (
                                    event
                                  ) =>
                                    handleDropMemberOnTeam(
                                      event,
                                      team.id
                                    )
                                : undefined
                            }
                            className={`rounded-xl border bg-white p-4 transition-all ${
                              isDropTarget
                                ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-100"
                                : "border-gray-300"
                            }`}
                          >
                            {/* TEAM HEADER */}

                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                      isDropTarget
                                        ? "bg-blue-600"
                                        : "bg-[#07111f]"
                                    } text-white`}
                                  >
                                    {isDropTarget ? (
                                      <ArrowRight
                                        size={
                                          14
                                        }
                                      />
                                    ) : (
                                      <Users
                                        size={
                                          14
                                        }
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-gray-900">
                                      {
                                        team.name
                                      }
                                    </p>

                                    <p className="mt-0.5 truncate text-[9px] text-gray-400">
                                      {
                                        team.description
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <span className="shrink-0 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-[8px] font-bold text-gray-600">
                                {
                                  team.member_count
                                }{" "}
                                Members
                              </span>
                            </div>

                            {/* DROP INDICATOR
                                MANAGEMENT ONLY */}

                            {canManageTeams &&
                              isDropTarget && (
                                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-3">
                                  <UserPlus
                                    size={
                                      14
                                    }
                                    className="text-blue-600"
                                  />

                                  <span className="text-[10px] font-bold text-blue-700">
                                    Drop member
                                    here to
                                    assign to{" "}
                                    {
                                      team.name
                                    }
                                  </span>
                                </div>
                              )}

                            {/* TEAM MEMBERS */}

                            <div className="mt-4 border-t border-gray-200 pt-3">
                              {team.members
                                .length ===
                              0 ? (
                                <div
                                  className={`rounded-lg border border-dashed px-3 py-5 text-center transition ${
                                    isDropTarget
                                      ? "border-blue-300 bg-blue-50"
                                      : "border-gray-300 bg-gray-50"
                                  }`}
                                >
                                  <UserPlus
                                    size={
                                      18
                                    }
                                    className={`mx-auto ${
                                      isDropTarget
                                        ? "text-blue-500"
                                        : "text-gray-300"
                                    }`}
                                  />

                                  <p className="mt-2 text-[9px] font-semibold text-gray-500">
                                    {isDropTarget
                                      ? "Release to add member"
                                      : "No members in this team"}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {team.members.map(
                                    (
                                      member
                                    ) => {
                                      const stats =
                                        getMemberStats(
                                          member.id
                                        );

                                      return (
                                        <div
                                          key={
                                            member.id
                                          }
                                          onDragOver={
                                            canManageTeams
                                              ? handleMemberDragOverTask
                                              : undefined
                                          }
                                          onDrop={
                                            canManageTeams
                                              ? (
                                                  event
                                                ) =>
                                                  handleDropTaskOnMember(
                                                    event,
                                                    member.id
                                                  )
                                              : undefined
                                          }
                                          className={`flex items-center gap-3 rounded-xl border bg-white p-3 transition ${
                                            draggedTask &&
                                            canManageTeams
                                              ? "border-blue-300 bg-blue-50/40 ring-1 ring-blue-100"
                                              : "border-gray-200"
                                          }`}
                                        >
                                          <MemberAvatar
                                            member={
                                              member
                                            }
                                            small
                                          />

                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-bold text-gray-800">
                                              {
                                                member.full_name
                                              }
                                            </p>

                                            <p className="mt-0.5 truncate text-[9px] text-gray-400">
                                              {
                                                member.role
                                              }
                                            </p>

                                            {draggedTask &&
                                              canManageTeams && (
                                                <p className="mt-1 text-[8px] font-semibold text-blue-600">
                                                  Drop
                                                  task
                                                  here
                                                </p>
                                              )}
                                          </div>

                                          {/* TASK STATS */}

                                          <div className="hidden items-center gap-1 sm:flex">
                                            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[8px] font-bold text-gray-500">
                                              {
                                                stats.total
                                              }{" "}
                                              Tasks
                                            </span>

                                            <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600">
                                              {
                                                stats.done
                                              }{" "}
                                              Done
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              )}

              {/* =================================================
                  MEMBERS VIEW
                  
                  MANAGEMENT ROLES ONLY
                  
                  Member cannot access this section.
              ================================================= */}

              {teamMemberView ===
                "members" &&
                canManageTeams && (
                  <div className="space-y-4">

                    {/* AVAILABLE MEMBERS */}

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600">
                          <UserCheck
                            size={16}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-blue-800">
                            Available Members
                          </p>

                          <p className="mt-1 text-[9px] leading-4 text-blue-600">
                            Drag members to
                            assign them to
                            teams.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2">
                        <span className="text-[9px] font-bold text-blue-700">
                          {
                            unassignedMembers.length
                          }{" "}
                          Unassigned
                        </span>
                      </div>
                    </div>

                    {unassignedMembers.length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                        <UserCheck
                          size={26}
                          className="mx-auto text-emerald-400"
                        />

                        <p className="mt-3 text-xs font-bold text-gray-700">
                          All members
                          assigned
                        </p>

                        <p className="mt-1 text-[9px] text-gray-400">
                          No unassigned
                          members
                          available.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unassignedMembers.map(
                          (member) => {
                            const isDragging =
                              draggedMember ===
                              member.id;

                            return (
                              <div
                                key={
                                  member.id
                                }
                                draggable={
                                  canManageTeams
                                }
                                onDragStart={(
                                  event
                                ) =>
                                  handleMemberDragStart(
                                    event,
                                    member.id
                                  )
                                }
                                onDragEnd={
                                  handleMemberDragEnd
                                }
                                className={`rounded-xl border bg-white p-3 transition ${
                                  isDragging
                                    ? "border-[#07111f] bg-gray-50 shadow-lg ring-2 ring-gray-200"
                                    : "border-gray-300 hover:border-gray-400 hover:shadow-sm"
                                } cursor-grab active:cursor-grabbing`}
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical
                                    size={
                                      14
                                    }
                                    className="shrink-0 text-gray-300"
                                  />

                                  <MemberAvatar
                                    member={
                                      member
                                    }
                                    small
                                  />

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-gray-900">
                                      {
                                        member.full_name
                                      }
                                    </p>

                                    <p className="mt-0.5 truncate text-[9px] text-gray-500">
                                      {
                                        member.role
                                      }
                                    </p>

                                    {isDragging && (
                                      <p className="mt-1 text-[8px] font-bold text-blue-600">
                                        Drag to a
                                        team
                                        below →
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {/* TOTAL TEAMS */}

                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-white text-purple-600">
                            <Users size={16} />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-purple-800">
                              Total Teams
                            </p>

                            <p className="mt-1 text-[9px] leading-4 text-purple-600">
                              Drop unassigned
                              members here
                              to add to
                              teams.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-purple-200 bg-white px-3 py-2">
                          <span className="text-[9px] font-bold text-purple-700">
                            {teams.length}{" "}
                            Teams
                          </span>
                        </div>
                      </div>

                      {teams.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                          <Users
                            size={24}
                            className="mx-auto text-gray-300"
                          />

                          <p className="mt-2 text-xs font-semibold text-gray-600">
                            No teams
                            created yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {teams.map(
                            (team) => {
                              const isDropTarget =
                                dragOverTeam ===
                                team.id;

                              return (
                                <div
                                  key={
                                    team.id
                                  }
                                  onDragOver={(
                                    event
                                  ) =>
                                    handleTeamDragOver(
                                      event,
                                      team.id
                                    )
                                  }
                                  onDragLeave={(
                                    event
                                  ) =>
                                    handleTeamDragLeave(
                                      event,
                                      team.id
                                    )
                                  }
                                  onDrop={(
                                    event
                                  ) =>
                                    handleDropMemberOnTeam(
                                      event,
                                      team.id
                                    )
                                  }
                                  className={`rounded-xl border-2 p-3 transition-all ${
                                    isDropTarget
                                      ? "border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-100"
                                      : "border-gray-200 bg-white hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-white text-xs font-bold ${
                                            isDropTarget
                                              ? "bg-purple-600"
                                              : "bg-[#07111f]"
                                          }`}
                                        >
                                          {team.name
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase()}
                                        </div>

                                        <div className="min-w-0">
                                          <p className="truncate text-xs font-bold text-gray-900">
                                            {
                                              team.name
                                            }
                                          </p>

                                          <p className="text-[8px] text-gray-500">
                                            {
                                              team.member_count
                                            }{" "}
                                            members
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {isDropTarget && (
                                      <div className="shrink-0">
                                        <ArrowRight
                                          size={
                                            16
                                          }
                                          className="text-purple-600"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {isDropTarget && (
                                    <div className="mt-2 text-center">
                                      <p className="text-[8px] font-bold text-purple-600">
                                        Release
                                        to add
                                        member
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================
          ADD MEMBER MODAL
          
          MANAGEMENT ONLY
      ===================================================== */}

      {addMemberOpen &&
        canManageTeams && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#07111f]/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#07111f] px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Add New Member
                  </h2>

                  <p className="mt-1 text-[10px] text-gray-400">
                    Create a new member and
                    optionally assign to a team.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(
                      false
                    );

                    setNewMemberName("");
                    setNewMemberRole("");
                    setNewMemberEmail("");
                    setSelectedTeamForMember(
                      ""
                    );
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="p-5">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Full Name
                  </label>

                  <input
                    value={
                      newMemberName
                    }
                    onChange={(e) =>
                      setNewMemberName(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Ali Hassan"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Role
                  </label>

                  <input
                    value={
                      newMemberRole
                    }
                    onChange={(e) =>
                      setNewMemberRole(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Frontend Developer"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      newMemberEmail
                    }
                    onChange={(e) =>
                      setNewMemberEmail(
                        e.target.value
                      )
                    }
                    placeholder="e.g. ali@arg.com"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Assign to Team
                    (Optional)
                  </label>

                  <select
                    value={
                      selectedTeamForMember
                    }
                    onChange={(e) =>
                      setSelectedTeamForMember(
                        e.target.value
                      )
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  >
                    <option value="">
                      No team (unassigned)
                    </option>

                    {teams.map(
                      (team) => (
                        <option
                          key={
                            team.id
                          }
                          value={
                            team.id
                          }
                        >
                          {team.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(
                      false
                    );

                    setNewMemberName("");
                    setNewMemberRole("");
                    setNewMemberEmail("");
                    setSelectedTeamForMember(
                      ""
                    );
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    addNewMember
                  }
                  disabled={
                    !newMemberName.trim() ||
                    !newMemberRole.trim() ||
                    !newMemberEmail.trim()
                  }
                  className="rounded-lg bg-[#07111f] px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          CREATE TEAM MODAL
          
          MANAGEMENT ONLY
      ===================================================== */}

      {createTeamOpen &&
        canManageTeams && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111f]/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#07111f] px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Create New Team
                  </h2>

                  <p className="mt-1 text-[10px] text-gray-400">
                    Create a team and assign available
                    members using drag & drop.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCreateTeamOpen(
                      false
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="p-5">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Team Name
                  </label>

                  <input
                    value={
                      newTeamName
                    }
                    onChange={(e) =>
                      setNewTeamName(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Frontend Team"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Description
                  </label>

                  <textarea
                    value={
                      newTeamDescription
                    }
                    onChange={(e) =>
                      setNewTeamDescription(
                        e.target.value
                      )
                    }
                    placeholder="Describe this team's responsibilities..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#07111f] focus:ring-2 focus:ring-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setCreateTeamOpen(
                      false
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    createTeam
                  }
                  disabled={
                    !newTeamName.trim()
                  }
                  className="rounded-lg bg-[#07111f] px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create Team
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          MANUAL TASK ASSIGN MODAL
          
          MANAGEMENT ONLY
      ===================================================== */}

      {manualAssignTask &&
        canManageTeams && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07111f]/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 bg-[#07111f] px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Assign Task
                  </h2>

                  <p className="mt-1 text-[10px] text-gray-400">
                    Select a team member to assign this
                    task to.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setManualAssignTask(
                      null
                    )
                  }
                  className="text-gray-400 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="border-b border-gray-200 bg-gray-50 p-4">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  Task
                </p>

                <p className="mt-1 text-sm font-bold text-gray-800">
                  {
                    manualAssignTask.name
                  }
                </p>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-3">
                {allMembers.map(
                  (member) => {
                    const stats =
                      getMemberStats(
                        member.id
                      );

                    return (
                      <button
                        key={
                          member.id
                        }
                        type="button"
                        onClick={() =>
                          handleManualTaskAssign(
                            member.id
                          )
                        }
                        className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-gray-400 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            member={
                              member
                            }
                            small
                          />

                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              {
                                member.full_name
                              }
                            </p>

                            <p className="mt-0.5 text-[9px] text-gray-400">
                              {
                                member.role
                              }
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-bold text-gray-500">
                            {
                              stats.pending
                            }{" "}
                            pending
                          </p>

                          <p className="mt-0.5 text-[8px] text-gray-400">
                            {
                              stats.done
                            }{" "}
                            completed
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}


