"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Plus, Search, User, Pencil, Trash2, RotateCcw, Loader2, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { ChevronDown } from "lucide-react"
import { cn, extractNumericId } from "@/shared/utils/utils"
import type { TreeNode, NodeType } from "@/types"
import { api } from "@/lib/api"
import { getStoredAuthUser } from "@/lib/api/auth-config"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { PermissionGate } from "@/shared/components/permission-gate"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction, PermissionContext } from "@/shared/permissions/types"
import { getAllPermissionRoleNames, getMemberRoleConfig } from "@/shared/permissions/roles"

interface MembersProps {
  node: TreeNode
}

interface MemberUser {
  id: number
  account: string
  name: string
  belong: string
  relative: number
  auth: string
  permission: number
  old: boolean
  disabled: boolean
  // 扩展字段用于显示机构归属
  university?: string
  department?: string
  major?: string
  courseCount?: number
  courses?: string[]
}

interface OrganizationOption {
  nodeId: string
  nodeName: string
  nodeType: NodeType
  parentDepartmentNodeId?: string
}

interface CreatedUserFeedback {
  name: string
  account: string
  password: string
}

type MemberScope = Exclude<PermissionContext["scope"], "root" | undefined>
type MemberOperation = "create" | "edit" | "delete" | "toggle" | "resetPassword"

const UNIVERSITY_ROLE_PERMISSION_MAP: Record<string, number> = {
  校级管理员: 1,
  系部管理员: 1001,
  质量督导员: 1031,
  质量管理员: 1039,
  专业管理员: 2001,
  任课教师: 3001,
  高级管理员: 88,
}

const DEFAULT_RESET_PASSWORD = "111111"

type ResetPasswordStatus = "idle" | "loading" | "success"

const MEMBER_SCOPE_BY_NODE_TYPE: Partial<Record<NodeType, MemberScope>> = {
  university: "college",
  department: "department",
  major: "major",
  course: "course",
}

function getMemberAction(scope: MemberScope | undefined, operation: MemberOperation): PermissionAction | null {
  if (!scope) return null
  return `${scope}.member.${operation}` as PermissionAction
}

export function Members({ node }: MembersProps) {
  // 使用兼容属性，确保 type 总是有值
  const nodeType = node.type ?? node.nodeType
  const memberScope = MEMBER_SCOPE_BY_NODE_TYPE[nodeType]
  const createMemberAction = getMemberAction(memberScope, "create")
  const editMemberAction = getMemberAction(memberScope, "edit")
  const deleteMemberAction = getMemberAction(memberScope, "delete")
  const toggleMemberAction = getMemberAction(memberScope, "toggle")
  const resetPasswordMemberAction = getMemberAction(memberScope, "resetPassword")
  const { can } = usePermission()
  const nodeId = node.id ?? node.nodeId
  const roleConfig = getMemberRoleConfig(nodeType)
  const availableRoles = nodeType === "university" ? getAllPermissionRoleNames() : roleConfig.roles
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [userRolePopoverOpen, setUserRolePopoverOpen] = useState(false)
  const [newUserAccount, setNewUserAccount] = useState("")
  const [accountFieldError, setAccountFieldError] = useState<string | null>(null)
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState(roleConfig.defaultRole)
  const [newUserUniversity, setNewUserUniversity] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserMajor, setNewUserMajor] = useState("")
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [users, setUsers] = useState<MemberUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("全部")
  const [departmentSearch, setDepartmentSearch] = useState("")
  const [majorSearch, setMajorSearch] = useState("")
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false)
  const [majorPopoverOpen, setMajorPopoverOpen] = useState(false)
  const [selectedDepartmentNodeId, setSelectedDepartmentNodeId] = useState<string | null>(null)
  const [selectedOrganizationNodeId, setSelectedOrganizationNodeId] = useState<string | null>(null)
  const [editingRelativeId, setEditingRelativeId] = useState<number | null>(null)
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationOption[]>([])
  const [resetPasswordStatusByUserId, setResetPasswordStatusByUserId] = useState<Record<number, ResetPasswordStatus>>({})
  const [toggleStatusLoadingByUserId, setToggleStatusLoadingByUserId] = useState<Record<number, boolean>>({})
  const [deleteLoadingByUserId, setDeleteLoadingByUserId] = useState<Record<number, boolean>>({})
  const [createdUserFeedback, setCreatedUserFeedback] = useState<CreatedUserFeedback | null>(null)
  const resetPasswordTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const canPerformMemberAction = (action: PermissionAction | null): boolean => {
    if (!action || !memberScope) return false
    return can(action, { scope: memberScope })
  }

  const canCreateMember = canPerformMemberAction(createMemberAction)
  const canEditMember = canPerformMemberAction(editMemberAction)
  const canDeleteMember = canPerformMemberAction(deleteMemberAction)
  const canToggleMember = canPerformMemberAction(toggleMemberAction)
  const canResetMemberPassword = canPerformMemberAction(resetPasswordMemberAction)

  const resetAddUserFormState = () => {
    setNewUserAccount("")
    setAccountFieldError(null)
    setNewUserName("")
    setNewUserRole(roleConfig.defaultRole)
    setNewUserUniversity("")
    setNewUserDepartment("")
    setNewUserMajor("")
    setEditingUserId(null)
    setDepartmentSearch("")
    setMajorSearch("")
    setDepartmentPopoverOpen(false)
    setMajorPopoverOpen(false)
    setSelectedDepartmentNodeId(null)
    setSelectedOrganizationNodeId(null)
    setEditingRelativeId(null)
    setCreatedUserFeedback(null)
  }

  const resetDialogForm = () => {
    setIsAddUserDialogOpen(false)
    resetAddUserFormState()
  }

  const handleAddUserDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetDialogForm()
      return
    }
    if (!editingUserId && !canCreateMember) {
      console.warn("[Members] open create member dialog blocked by whitelist")
      return
    }
    setIsAddUserDialogOpen(true)
  }

  useEffect(() => {
    if (!isAddUserDialogOpen || nodeType !== "university") return

    const collectOptions = (treeNode: TreeNode, currentDepartmentNodeId: string | null, result: OrganizationOption[]) => {
      let nextDepartmentNodeId = currentDepartmentNodeId

      if (treeNode.nodeType === "department") {
        nextDepartmentNodeId = treeNode.nodeId
        result.push({
          nodeId: treeNode.nodeId,
          nodeName: treeNode.nodeName,
          nodeType: treeNode.nodeType,
        })
      } else if (treeNode.nodeType === "major") {
        result.push({
          nodeId: treeNode.nodeId,
          nodeName: treeNode.nodeName,
          nodeType: treeNode.nodeType,
          parentDepartmentNodeId: nextDepartmentNodeId ?? undefined,
        })
      }

      treeNode.children?.forEach((child) => collectOptions(child, nextDepartmentNodeId, result))
    }

    const findNodeById = (treeNode: TreeNode, targetNodeId: string): TreeNode | null => {
      if (treeNode.nodeId === targetNodeId) return treeNode
      if (!treeNode.children) return null

      for (const child of treeNode.children) {
        const matched = findNodeById(child, targetNodeId)
        if (matched) return matched
      }

      return null
    }

    const findUniversityByNumericId = (treeNode: TreeNode, targetUniversityId: number): TreeNode | null => {
      if (treeNode.nodeType === "university" && extractNumericId(treeNode.nodeId) === targetUniversityId) {
        return treeNode
      }

      if (!treeNode.children) return null
      for (const child of treeNode.children) {
        const matched = findUniversityByNumericId(child, targetUniversityId)
        if (matched) return matched
      }

      return null
    }

    const loadOrganizationOptions = async () => {
      const treeResponse = await api.tree.getTree()
      if (treeResponse.error || !treeResponse.data) {
        setOrganizationOptions([])
        return
      }

      const targetUniversityId = extractNumericId(nodeId)
      const scopedRoot =
        findNodeById(treeResponse.data, node.nodeId) ??
        findUniversityByNumericId(treeResponse.data, targetUniversityId) ??
        treeResponse.data
      const nextOptions: OrganizationOption[] = []
      collectOptions(scopedRoot, null, nextOptions)
      setOrganizationOptions(nextOptions)
    }

    loadOrganizationOptions()
  }, [isAddUserDialogOpen, node.nodeId, nodeId, nodeType])

  useEffect(() => {
    setDepartmentSearch("")
    setMajorSearch("")
    setSelectedDepartmentNodeId(null)
    setSelectedOrganizationNodeId(null)
    setDepartmentPopoverOpen(false)
    setMajorPopoverOpen(false)
  }, [newUserRole])

  useEffect(() => {
    const timerMap = resetPasswordTimerRef.current

    return () => {
      Object.values(timerMap).forEach((timer) => {
        clearTimeout(timer)
      })
    }
  }, [])

  useEffect(() => {
    if (!isAddUserDialogOpen || nodeType !== "university" || !editingUserId || editingRelativeId === null) return

    if (newUserRole === "系部管理员") {
      const department = organizationOptions.find(
        (item) => item.nodeType === "department" && extractNumericId(item.nodeId) === editingRelativeId
      )
      if (department) {
        setSelectedDepartmentNodeId(department.nodeId)
        setDepartmentSearch(department.nodeName)
      }
      setEditingRelativeId(null)
      return
    }

    if (newUserRole === "专业管理员" || newUserRole === "任课教师") {
      const major = organizationOptions.find(
        (item) => item.nodeType === "major" && extractNumericId(item.nodeId) === editingRelativeId
      )
      if (major) {
        setSelectedOrganizationNodeId(major.nodeId)
        setMajorSearch(major.nodeName)
        if (major.parentDepartmentNodeId) {
          const department = organizationOptions.find(
            (item) => item.nodeType === "department" && item.nodeId === major.parentDepartmentNodeId
          )
          if (department) {
            setSelectedDepartmentNodeId(department.nodeId)
            setDepartmentSearch(department.nodeName)
          }
        }
      }
      setEditingRelativeId(null)
      return
    }

    setEditingRelativeId(null)
  }, [editingRelativeId, editingUserId, isAddUserDialogOpen, newUserRole, nodeType, organizationOptions])

  useEffect(() => {
    if (!node) return

    const loadUsers = async () => {
      setIsLoading(true)
      try {
        if (nodeType === "university") {
          const response = await api.tree.getUniversityUsers(nodeId)
          // 数据类型转换：将 API 返回的 UniversityMember[] 转换为 MemberUser[]
          const universityUsers: MemberUser[] = (response.data ?? []).map((user) => ({
            ...user,
            id: Number(user.id),
            university: undefined,
            department: undefined,
            major: undefined,
            courseCount: undefined,
            courses: undefined,
          }))
          setUsers(universityUsers)
        } else if (nodeType === "department") {
          const response = await api.tree.getDepartmentUsers(nodeId)
          // 数据类型转换：将 API 返回的 DepartmentMember[] 转换为 MemberUser[]
          const deptUsers: MemberUser[] = (response.data ?? []).map((user) => ({
            id: Number(user.id),
            account: user.account ?? "",
            name: user.name,
            belong: user.belong ?? "",
            relative: user.relative ?? 0,
            auth: user.auth,
            permission: user.permission ?? 0,
            old: user.old ?? false,
            disabled: user.disabled ?? false,
            university: undefined,
            department: undefined,
            major: undefined,
            courseCount: undefined,
            courses: undefined,
          }))
          setUsers(deptUsers)
        } else {
          setUsers([])
        }
      } catch (error) {
        console.error("[Members] 加载成员失败:", error)
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, nodeType])

  const refreshUniversityUsers = async (): Promise<boolean> => {
    const refreshResponse = await api.tree.getUniversityUsers(nodeId)
    if (refreshResponse.error) {
      console.error("[Members] refresh university users failed:", refreshResponse.error)
      return false
    }

    const universityUsers: MemberUser[] = (refreshResponse.data ?? []).map((user) => ({
      ...user,
      id: Number(user.id),
      university: undefined,
      department: undefined,
      major: undefined,
      courseCount: undefined,
      courses: undefined,
    }))

    setUsers(universityUsers)
    return true
  }

  const refreshDepartmentUsers = async (): Promise<boolean> => {
    const refreshResponse = await api.tree.getDepartmentUsers(nodeId)
    if (refreshResponse.error) {
      console.error("[Members] refresh department users failed:", refreshResponse.error)
      return false
    }

    const deptUsers: MemberUser[] = (refreshResponse.data ?? []).map((user) => ({
      id: Number(user.id),
      account: user.account ?? "",
      name: user.name,
      belong: user.belong ?? "",
      relative: user.relative ?? 0,
      auth: user.auth,
      permission: user.permission ?? 0,
      old: user.old ?? false,
      disabled: user.disabled ?? false,
      university: undefined,
      department: undefined,
      major: undefined,
      courseCount: undefined,
      courses: undefined,
    }))

    setUsers(deptUsers)
    return true
  }

  const handleSaveUser = async () => {
    if (!node || !newUserAccount || !newUserName) return

    if (!editingUserId && !canCreateMember) {
      console.warn("[Members] create member blocked by whitelist")
      return
    }

    if (editingUserId && !canEditMember) {
      console.warn("[Members] edit member blocked by whitelist")
      return
    }

    if (nodeType === "university" || nodeType === "department") {
      const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) : null
      const permissionId = UNIVERSITY_ROLE_PERMISSION_MAP[newUserRole] ?? editingUser?.permission
      const parsedCollegeId = extractNumericId(nodeId)
      const authUser = getStoredAuthUser()
      const collegeId =
        nodeType === "university"
          ? parsedCollegeId || Number(nodeId)
          : authUser?.collegeId ?? 0
      const selectedDepartment = organizationOptions.find(
        (item) => item.nodeType === "department" && item.nodeId === selectedDepartmentNodeId
      )
      const selectedMajor = organizationOptions.find(
        (item) => item.nodeType === "major" && item.nodeId === selectedOrganizationNodeId
      )
      const isDepartmentAdmin = newUserRole === "系部管理员"
      const isMajorAdmin = newUserRole === "专业管理员"
      const isCourseTeacher = newUserRole === "任课教师"
      const requiresRelativeNode = isDepartmentAdmin || isMajorAdmin || isCourseTeacher

      if (nodeType === "university") {
        if (isDepartmentAdmin && !selectedDepartment) {
          console.error("[Members] department selection is required")
          return
        }

        if ((isMajorAdmin || isCourseTeacher) && (!selectedDepartment || !selectedMajor)) {
          console.error("[Members] department and major selections are required")
          return
        }
      }

      const relativeId =
        nodeType === "department"
          ? extractNumericId(nodeId)
          : isDepartmentAdmin
            ? extractNumericId(selectedDepartment?.nodeId ?? "")
            : isMajorAdmin || isCourseTeacher
              ? extractNumericId(selectedMajor?.nodeId ?? "")
              : 0

      const shouldValidateRelativeId = nodeType === "department" || requiresRelativeNode

      if (!permissionId || Number.isNaN(collegeId) || collegeId <= 0 || (shouldValidateRelativeId && !relativeId)) {
        console.error("[Members] invalid university member payload", {
          editingUserId,
          newUserRole,
          permissionId,
          collegeId,
          relativeId,
        })
        return
      }

      if (!editingUserId) {
        const createResponse = await api.users.insertNewUser([
          {
            id: -1,
            collegeId,
            permissionId,
            relativeId,
            userName: newUserAccount,
            email: newUserAccount,
          },
        ])

        if (createResponse.error) {
          const errorMessage = createResponse.error || "新增失败，请检查账号是否重复"
          const normalizedErrorMessage = errorMessage.toLowerCase()
          const isBusinessValidationError =
            errorMessage.includes("已存在") ||
            errorMessage.includes("重复") ||
            errorMessage.includes("不合法") ||
            errorMessage.includes("无效")
          const isSystemError =
            normalizedErrorMessage.includes("failed to fetch") ||
            normalizedErrorMessage.includes("timeout") ||
            normalizedErrorMessage.includes("network") ||
            /http\s5\d\d/.test(normalizedErrorMessage)

          if (isSystemError) {
            console.error("[Members] create managed user failed:", errorMessage)
          } else if (!isBusinessValidationError) {
            console.warn("[Members] create managed user rejected:", errorMessage)
          }

          setAccountFieldError(errorMessage)
          return
        }

        const createdUser = createResponse.data?.[0]
        const createdUserName = createdUser?.userName ?? newUserName
        const createdUserAccount = createdUser?.email ?? newUserAccount
        const initialPassword = createdUser?.password ?? ""
        setCreatedUserFeedback({
          name: createdUserName,
          account: createdUserAccount,
          password: initialPassword,
        })
      } else {
        if (!editingUser) {
          console.error("[Members] editing user not found")
          return
        }

        const updateResponse = await api.users.updateManagedUser({
          id: editingUserId,
          account: newUserAccount,
          name: newUserName,
          auth: permissionId,
          relative: String(relativeId),
          status: !editingUser.disabled,
        })

        if (updateResponse.error) {
          console.error("[Members] update university user failed:", updateResponse.error)
          return
        }
      }

      const refreshed =
        nodeType === "university"
          ? await refreshUniversityUsers()
          : await refreshDepartmentUsers()
      if (!refreshed) {
        return
      }

      if (editingUserId) {
        resetDialogForm()
      }
      return
    }

    let updatedUsers: MemberUser[]

    if (editingUserId) {
      updatedUsers = users.map((user) =>
        user.id === editingUserId
          ? {
              ...user,
              name: newUserName,
              account: newUserAccount,
              auth: newUserRole,
              university: newUserUniversity || user.university,
              department: newUserDepartment || user.department,
              major: newUserMajor || user.major,
            }
          : user,
      )
    } else {
      const newUser: MemberUser = {
        id: Date.now(),
        account: newUserAccount,
        name: newUserName,
        belong: "无",
        relative: 0,
        auth: newUserRole,
        permission: 1,
        old: false,
        disabled: false,
        university: newUserUniversity || undefined,
        department: newUserDepartment || undefined,
        major: newUserMajor || undefined,
      }
      updatedUsers = [...users, newUser]
    }

    setUsers(updatedUsers)
    await api.users.updateUsers(nodeId, updatedUsers)
    resetDialogForm()
  }

  const handleToggleUserEnabled = async (userId: number) => {
    if (!node) return
    if (!canToggleMember) {
      console.warn("[Members] toggle member blocked by whitelist")
      return
    }

    if (nodeType === "university" || nodeType === "department") {
      const targetUser = users.find((user) => user.id === userId)
      if (!targetUser) return
      if (toggleStatusLoadingByUserId[userId]) return

      setToggleStatusLoadingByUserId((prev) => ({ ...prev, [userId]: true }))

      const nextStatus = targetUser.disabled
      const updateResponse = await api.users.updateManagedUserStatus({
        id: userId,
        status: nextStatus,
      })

      setToggleStatusLoadingByUserId((prev) => ({ ...prev, [userId]: false }))

      if (updateResponse.error) {
        console.error("[Members] toggle user status failed:", updateResponse.error)
        return
      }

      if (nodeType === "university") {
        await refreshUniversityUsers()
      } else {
        await refreshDepartmentUsers()
      }
      return
    }

    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, disabled: !user.disabled } : user))
    setUsers(updatedUsers)
    await api.users.updateUsers(nodeId, updatedUsers)
  }

  const handleEditUser = (user: MemberUser) => {
    if (!canEditMember) {
      console.warn("[Members] edit member dialog blocked by whitelist")
      return
    }

    setCreatedUserFeedback(null)
    setEditingUserId(user.id)
    setNewUserAccount(user.account)
    setNewUserName(user.name)
    setNewUserRole(user.auth)
    setNewUserUniversity(user.university || "")
    setNewUserDepartment(user.department || "")
    setNewUserMajor(user.major || "")
    setEditingRelativeId(user.relative || 0)
    setIsAddUserDialogOpen(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!node) return
    if (!canDeleteMember) {
      console.warn("[Members] delete member blocked by whitelist")
      return
    }

    if (nodeType === "university" || nodeType === "department") {
      if (deleteLoadingByUserId[userId]) return

      setDeleteLoadingByUserId((prev) => ({ ...prev, [userId]: true }))

      const deleteResponse = await api.users.deleteManagedUser({ id: userId })

      setDeleteLoadingByUserId((prev) => ({ ...prev, [userId]: false }))

      if (deleteResponse.error) {
        console.error("[Members] delete user failed:", deleteResponse.error)
        return
      }

      if (nodeType === "university") {
        await refreshUniversityUsers()
      } else {
        await refreshDepartmentUsers()
      }
      return
    }

    const updatedUsers = users.filter((user) => user.id !== userId)
    setUsers(updatedUsers)
    await api.users.updateUsers(nodeId, updatedUsers)
  }

  const handleResetPassword = async (userId: number) => {
    if (!canResetMemberPassword) {
      console.warn("[Members] reset password blocked by whitelist")
      return
    }

    if (resetPasswordStatusByUserId[userId] === "loading") return

    const existingTimer = resetPasswordTimerRef.current[userId]
    if (existingTimer) {
      clearTimeout(existingTimer)
      delete resetPasswordTimerRef.current[userId]
    }

    setResetPasswordStatusByUserId((prev) => ({
      ...prev,
      [userId]: "loading",
    }))

    const resetResponse = await api.users.resetPassword({
      id: userId,
      password: DEFAULT_RESET_PASSWORD,
    })

    if (resetResponse.error) {
      console.error("[Members] reset password failed:", resetResponse.error)
      setResetPasswordStatusByUserId((prev) => ({
        ...prev,
        [userId]: "idle",
      }))
      return
    }

    setResetPasswordStatusByUserId((prev) => ({
      ...prev,
      [userId]: "success",
    }))

    resetPasswordTimerRef.current[userId] = setTimeout(() => {
      setResetPasswordStatusByUserId((prev) => ({
        ...prev,
        [userId]: "idle",
      }))
      delete resetPasswordTimerRef.current[userId]
    }, 1200)

    console.log("[Members] reset password success", { userId })
  }

  // 从用户数据中提取唯一的角色列表
  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map((user) => user.auth))
    return ["全部", ...Array.from(roles)]
  }, [users])

  // 当用户数据变化时，如果当前选中的角色不在列表中，重置为"全部"
  useEffect(() => {
    if (selectedRoleFilter !== "全部" && !uniqueRoles.includes(selectedRoleFilter)) {
      setSelectedRoleFilter("全部")
    }
  }, [uniqueRoles, selectedRoleFilter])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.account.toLowerCase().includes(userSearchQuery.toLowerCase())
    const matchesRole = selectedRoleFilter === "全部" || user.auth === selectedRoleFilter
    return matchesSearch && matchesRole
  })

  const isDepartmentAdmin = newUserRole === "系部管理员"
  const isMajorAdmin = newUserRole === "专业管理员"
  const isCourseTeacher = newUserRole === "任课教师"
  const shouldRequireOrganization = nodeType === "university" && (isDepartmentAdmin || isMajorAdmin || isCourseTeacher)

  const departmentOptions = organizationOptions.filter((item) => item.nodeType === "department")
  const filteredDepartmentOptions = departmentOptions.filter((item) => item.nodeName.includes(departmentSearch.trim()))
  const selectedDepartmentOption =
    selectedDepartmentNodeId === null
      ? null
      : departmentOptions.find((item) => item.nodeId === selectedDepartmentNodeId) ?? null

  const majorOptionsByDepartment =
    selectedDepartmentNodeId === null
      ? []
      : organizationOptions.filter(
          (item) => item.nodeType === "major" && item.parentDepartmentNodeId === selectedDepartmentNodeId
        )
  const filteredMajorOptions = majorOptionsByDepartment.filter((item) => item.nodeName.includes(majorSearch.trim()))
  const selectedMajorOption =
    selectedOrganizationNodeId === null
      ? null
      : majorOptionsByDepartment.find((item) => item.nodeId === selectedOrganizationNodeId) ?? null

  const requiresDepartmentSelection = shouldRequireOrganization
  const requiresMajorSelection = shouldRequireOrganization && (isMajorAdmin || isCourseTeacher)
  const hasDepartmentResult = !requiresDepartmentSelection || filteredDepartmentOptions.length > 0
  const hasMajorResult = !requiresMajorSelection || filteredMajorOptions.length > 0
  const canSubmit =
    Boolean(newUserAccount && newUserName) &&
    (!requiresDepartmentSelection || Boolean(selectedDepartmentOption)) &&
    (!requiresMajorSelection || (Boolean(selectedDepartmentOption) && Boolean(selectedMajorOption))) &&
    hasDepartmentResult &&
    hasMajorResult &&
    (editingUserId ? canEditMember : canCreateMember)
  const canSaveCurrentForm = editingUserId ? canEditMember : canCreateMember
  const editingResetPasswordStatus = editingUserId ? resetPasswordStatusByUserId[editingUserId] ?? "idle" : "idle"
  const isCreateSuccessView = Boolean(createdUserFeedback && !editingUserId)

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayedUsers = filteredUsers.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或账号..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            {/* 角色快速筛选按钮组 */}
            {uniqueRoles.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                {uniqueRoles.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={selectedRoleFilter === role ? "default" : "outline"}
                    onClick={() => {
                      setSelectedRoleFilter(role)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "h-8 px-3 text-xs",
                      selectedRoleFilter === role
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {createMemberAction && memberScope && (
            <PermissionGate action={createMemberAction} context={{ scope: memberScope }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetAddUserFormState()
                  setIsAddUserDialogOpen(true)
                }}
                className="gap-2 hover:bg-primary/10 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">新增成员</span>
              </Button>
            </PermissionGate>
          )}
        </div>
        <div className="rounded-lg border border-border overflow-hidden bg-white/50">
          {isLoading ? (
            // 加载状态：显示骨架屏
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center p-3 gap-3",
                    index % 2 === 0 ? "bg-white/30" : "bg-white/50",
                    index !== 4 && "border-b border-border"
                  )}
                >
                  {/* 头像骨架 */}
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

                  {/* 名称和账号骨架 */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>

                  {/* 角色骨架 */}
                  <Skeleton className="h-6 w-20 rounded flex-shrink-0" />

                  {/* 操作按钮骨架 */}
                  <div className="flex gap-2">
                    <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                    <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedUsers.length === 0 ? (
            // 空状态
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">暂无成员数据</div>
              </div>
            </div>
          ) : (
            // 数据列表
            displayedUsers.map((user, index) => {
            const resetPasswordStatus = resetPasswordStatusByUserId[user.id] ?? "idle"
            const isToggleStatusLoading = toggleStatusLoadingByUserId[user.id] ?? false
            const isDeleteLoading = deleteLoadingByUserId[user.id] ?? false
            // 根据节点类型和角色显示对应的机构归属标签
            let affiliationTag = null

            if (nodeType === "university" || nodeType === "department") {
              // 学校级与院系级：显示所属单位（使用与角色标签相同的样式）
              if (user.belong) {
                affiliationTag = (
                  <span className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-xs font-medium text-primary whitespace-nowrap">
                    {user.belong}
                  </span>
                )
              }
            } else {
              // 其他级别：根据角色显示机构归属
              if (user.auth === "校级管理员" && user.university) {
                affiliationTag = (
                  <span className="px-2 py-1 rounded bg-blue-100 border border-blue-200 text-xs font-medium text-blue-700 whitespace-nowrap">
                    {user.university}
                  </span>
                )
              } else if (user.auth === "系部管理员" && user.department) {
                affiliationTag = (
                  <span className="px-2 py-1 rounded bg-green-100 border border-green-200 text-xs font-medium text-green-700 whitespace-nowrap">
                    {user.department}
                  </span>
                )
              } else if (user.auth === "专业管理员" && user.major) {
                affiliationTag = (
                  <span className="px-2 py-1 rounded bg-purple-100 border border-purple-200 text-xs font-medium text-purple-700 whitespace-nowrap">
                    {user.major}
                  </span>
                )
              } else if (user.auth === "任课教师" && user.courseCount !== undefined) {
                affiliationTag = (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-2 py-1 rounded bg-orange-100 border border-orange-200 text-xs font-medium text-orange-700 whitespace-nowrap cursor-help">
                        {user.courseCount} 门课程
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-medium text-xs mb-1">课程列表：</div>
                        {user.courses?.map((course, idx) => (
                          <div key={idx} className="text-xs">• {course}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              }
            }

            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center p-3 transition-colors",
                  index % 2 === 0 ? "bg-white/30" : "bg-white/50",
                  "hover:bg-primary/5",
                  index !== displayedUsers.length - 1 && "border-b border-border"
                )}
              >
                {/* 名称列 */}
                <div className="flex items-center gap-3 w-64 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.account}</div>
                  </div>
                </div>

                {/* 角色列 */}
                <div className="w-32 flex-shrink-0">
                  <span className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-xs font-medium text-primary whitespace-nowrap">
                    {roleConfig.labels[user.auth] || user.auth}
                  </span>
                </div>

                {/* 机构归属列 */}
                <div className="flex-1 min-w-0 px-4">
                  {affiliationTag || null}
                </div>

                {/* 操作列 */}
                {memberScope && (
                  <div className="flex items-center gap-3">
                    {toggleMemberAction && (
                      <PermissionGate action={toggleMemberAction} context={{ scope: memberScope }}>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", !user.disabled ? "text-muted-foreground" : "text-red-600")}>
                            禁用
                          </span>
                          <Switch
                            checked={!user.disabled}
                            onCheckedChange={() => void handleToggleUserEnabled(user.id)}
                            className="cursor-pointer"
                            disabled={isToggleStatusLoading}
                          />
                          <span
                            className={cn("text-xs font-medium", !user.disabled ? "text-green-600" : "text-muted-foreground")}
                          >
                            启用
                          </span>
                        </div>
                      </PermissionGate>
                    )}
                    {editMemberAction && (
                      <PermissionGate action={editMemberAction} context={{ scope: memberScope }}>
                        <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} className="gap-2">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </PermissionGate>
                    )}
                    {resetPasswordMemberAction && (
                      <PermissionGate action={resetPasswordMemberAction} context={{ scope: memberScope }}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "gap-2",
                                resetPasswordStatus === "success"
                                  ? "text-green-600 hover:text-white"
                                  : "text-orange-600 hover:text-white"
                              )}
                              disabled={resetPasswordStatus === "loading"}
                            >
                              {resetPasswordStatus === "loading" ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : resetPasswordStatus === "success" ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认重置密码</AlertDialogTitle>
                              <AlertDialogDescription>
                                确认要重置用户 {user.name} 的密码？默认密码为6个1。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleResetPassword(user.id)}
                                disabled={resetPasswordStatus === "loading"}
                              >
                                确认重置
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </PermissionGate>
                    )}
                    {deleteMemberAction && (
                      <PermissionGate action={deleteMemberAction} context={{ scope: memberScope }}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-2 text-destructive hover:text-white"
                              disabled={isDeleteLoading}
                            >
                              {isDeleteLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                              <AlertDialogDescription>确认要删除用户 {user.name}？此操作无法撤销。</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleDeleteUser(user.id)}
                                disabled={isDeleteLoading}
                              >
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </PermissionGate>
                    )}
                  </div>
                )}
            </div>
            )
            })
          )}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {filteredUsers.length} 条记录，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                末页
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isAddUserDialogOpen} onOpenChange={handleAddUserDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreateSuccessView ? "添加成功" : editingUserId ? "编辑用户" : "添加用户"}</DialogTitle>
            <DialogDescription>
              {isCreateSuccessView ? "请在弹窗内确认并保存新增用户信息" : "填写用户信息"}
            </DialogDescription>
          </DialogHeader>
          {isCreateSuccessView ? (
            <div className="space-y-2 rounded-md border border-primary/30 bg-primary/20 p-4 text-[1.05rem] text-primary">
              <div>用户姓名：{createdUserFeedback?.name}</div>
              <div>登录账号：{createdUserFeedback?.account}</div>
              {createdUserFeedback?.password ? <div>初始密码：{createdUserFeedback.password}</div> : null}
            </div>
          ) : (
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-account">登录账号</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    id="user-account"
                    value={newUserAccount}
                    onChange={(e) => {
                      setNewUserAccount(e.target.value)
                      if (accountFieldError) {
                        setAccountFieldError(null)
                      }
                    }}
                    placeholder="请输入账号"
                    readOnly={Boolean(editingUserId)}
                    maxLength={32}
                    className={cn(accountFieldError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {accountFieldError && <div className="text-xs text-destructive text-right mt-1">{accountFieldError}</div>}
                </div>
                {editingUserId && resetPasswordMemberAction && memberScope && (
                  <PermissionGate action={resetPasswordMemberAction} context={{ scope: memberScope }}>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "shrink-0 mt-0.5",
                        editingResetPasswordStatus === "success"
                          ? "text-green-600 hover:text-white"
                          : "text-orange-600 hover:text-white"
                      )}
                      disabled={!editingUserId || editingResetPasswordStatus === "loading"}
                      onClick={() => {
                        if (!editingUserId) return
                        void handleResetPassword(editingUserId)
                      }}
                      aria-label="重置密码"
                    >
                      {editingResetPasswordStatus === "loading" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingResetPasswordStatus === "success" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </Button>
                  </PermissionGate>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">姓名</Label>
              <Input
                id="user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="请输入姓名"
                autoFocus={Boolean(editingUserId)}
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">角色</Label>
              <Popover open={userRolePopoverOpen} onOpenChange={setUserRolePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-transparent">
                    <span className="truncate">{newUserRole || "请选择角色"}</span>
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          setNewUserRole(role)
                          setUserRolePopoverOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent hover:text-white ${
                          newUserRole === role ? "bg-[var(--naive-primary)] text-white" : ""
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {shouldRequireOrganization && (
              <div className="space-y-2">
                <Label htmlFor="user-department-search">院系</Label>
                <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-transparent">
                      <span className="truncate">
                        {selectedDepartmentOption?.nodeName || "请选择院系"}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                    <div className="space-y-2">
                      <Input
                        id="user-department-search"
                        value={departmentSearch}
                        onChange={(e) => {
                          setDepartmentSearch(e.target.value)
                          setSelectedDepartmentNodeId(null)
                          setSelectedOrganizationNodeId(null)
                          setMajorSearch("")
                        }}
                        placeholder="请输入院系关键字"
                      />
                      <div className="max-h-[220px] overflow-y-auto rounded border border-border">
                        {filteredDepartmentOptions.length > 0 ? (
                          filteredDepartmentOptions.map((item) => (
                            <button
                              key={item.nodeId}
                              type="button"
                              onClick={() => {
                                setSelectedDepartmentNodeId(item.nodeId)
                                setDepartmentSearch(item.nodeName)
                                setSelectedOrganizationNodeId(null)
                                setMajorSearch("")
                                setDepartmentPopoverOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-white",
                                selectedDepartmentNodeId === item.nodeId && "bg-[var(--naive-primary)] text-white"
                              )}
                            >
                              {item.nodeName}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-destructive">无匹配结果，请更换关键字</div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {!selectedDepartmentOption && (
                  <div className="text-xs text-destructive">必须从筛选结果中选择院系后才能提交</div>
                )}
              </div>
            )}

            {(isMajorAdmin || isCourseTeacher) && shouldRequireOrganization && (
              <div className="space-y-2">
                <Label htmlFor="user-major-search">专业</Label>
                <Popover open={majorPopoverOpen} onOpenChange={setMajorPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-transparent" disabled={!selectedDepartmentOption}>
                      <span className="truncate">{selectedMajorOption?.nodeName || "请选择专业"}</span>
                      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                    <div className="space-y-2">
                      <Input
                        id="user-major-search"
                        value={majorSearch}
                        onChange={(e) => {
                          setMajorSearch(e.target.value)
                          setSelectedOrganizationNodeId(null)
                        }}
                        placeholder="请输入专业关键字"
                        disabled={!selectedDepartmentOption}
                      />
                      <div className="max-h-[220px] overflow-y-auto rounded border border-border">
                        {filteredMajorOptions.length > 0 ? (
                          filteredMajorOptions.map((item) => (
                            <button
                              key={item.nodeId}
                              type="button"
                              onClick={() => {
                                setSelectedOrganizationNodeId(item.nodeId)
                                setMajorSearch(item.nodeName)
                                setMajorPopoverOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-white",
                                selectedOrganizationNodeId === item.nodeId && "bg-[var(--naive-primary)] text-white"
                              )}
                            >
                              {item.nodeName}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-destructive">
                            {!selectedDepartmentOption ? "请先选择院系" : "无匹配结果，请更换关键字"}
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {!selectedMajorOption && (
                  <div className="text-xs text-destructive">必须在已选院系下选择专业后才能提交</div>
                )}
              </div>
            )}
            </div>
          )}
          <DialogFooter>
            {isCreateSuccessView ? (
              <>
                {createMemberAction && memberScope && (
                  <PermissionGate action={createMemberAction} context={{ scope: memberScope }}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!canCreateMember) {
                          console.warn("[Members] continue create member blocked by whitelist")
                          return
                        }
                        resetAddUserFormState()
                        setIsAddUserDialogOpen(true)
                      }}
                    >
                      继续添加
                    </Button>
                  </PermissionGate>
                )}
                <Button
                  onClick={() => {
                    if (createdUserFeedback) {
                      const copyText = [
                        `用户姓名：${createdUserFeedback.name}`,
                        `登录账号：${createdUserFeedback.account}`,
                        `初始密码：${createdUserFeedback.password || "无"}`,
                      ].join("\n")
                      void navigator.clipboard.writeText(copyText)
                    }
                    resetDialogForm()
                  }}
                >
                  复制关闭
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={resetDialogForm}>
                  取消
                </Button>
                {canSaveCurrentForm && (
                  <Button onClick={handleSaveUser} disabled={!canSubmit}>
                    确认
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
