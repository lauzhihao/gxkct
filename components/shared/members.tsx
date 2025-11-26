"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, User, Pencil, Trash2, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode, NodeType } from "@/types"
import { api } from "@/lib/api"

interface MembersProps {
  node: TreeNode
}

interface User {
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

// 根据节点类型获取角色配置
const getRoleConfig = (nodeType: NodeType) => {
  const roleConfigs: Record<NodeType, { roles: string[]; defaultRole: string; labels: Record<string, string> }> = {
    university: {
      roles: ["管理员"],
      defaultRole: "管理员",
      labels: {
        管理员: "管理员",
      },
    },
    department: {
      roles: ["系部管理员", "专业管理员", "任课教师"],
      defaultRole: "系部管理员",
      labels: {
        系部管理员: "系部管理员",
        专业管理员: "专业管理员",
        任课教师: "任课教师",
      },
    },
    major: {
      roles: ["专业管理员", "授课教师"],
      defaultRole: "专业管理员",
      labels: {
        专业管理员: "专业管理员",
        授课教师: "授课教师",
      },
    },
    course: {
      roles: ["课程负责人", "主讲教师", "助教"],
      defaultRole: "课程负责人",
      labels: {
        课程负责人: "课程负责人",
        主讲教师: "主讲教师",
        助教: "助教",
      },
    },
    root: {
      roles: ["系统管理员"],
      defaultRole: "系统管理员",
      labels: {
        系统管理员: "系统管理员",
      },
    },
  }

  return roleConfigs[nodeType] || roleConfigs.major
}

// Mock数据生成函数 - 根据节点类型加载不同数据源
const generateMockUsers = (nodeType: NodeType): User[] => {
  if (nodeType === "university") {
    // 学校级：从users.json加载所有数据，按auth字段渲染
    const usersData = [
      { id: 4825, account: "2003001", name: "张静", auth: "管理员", permission: 1 },
      { id: 4827, account: "2015060", name: "李文禹", auth: "管理员", permission: 1 },
      { id: 4829, account: "2013026", name: "王可心", auth: "管理员", permission: 1 },
      { id: 4830, account: "2013003", name: "张洪岩", auth: "管理员", permission: 1 },
      { id: 4841, account: "2015034", name: "赵婷婷", auth: "管理员", permission: 1 },
      { id: 4844, account: "2018001", name: "逯娅娜", auth: "管理员", permission: 1 },
      { id: 4920, account: "2006009", name: "孟艳辉", auth: "管理员", permission: 1 },
      { id: 5069, account: "2016010", name: "郝丽娜", auth: "管理员", permission: 1 },
      { id: 5096, account: "2005013", name: "白雪", auth: "管理员", permission: 1 },
      { id: 5097, account: "2010020", name: "陈景鑫", auth: "管理员", permission: 1 },
      { id: 5098, account: "1997019", name: "曹然彬", auth: "管理员", permission: 1 },
      { id: 5100, account: "2022005", name: "郭伟东", auth: "管理员", permission: 1 },
      { id: 5101, account: "1997001", name: "曹勇安", auth: "管理员", permission: 1 },
      { id: 5103, account: "2000009", name: "张振笋", auth: "管理员", permission: 1 },
      { id: 5104, account: "1997015", name: "姜岩（财务）", auth: "管理员", permission: 1 },
      { id: 5424, account: "20180555", name: "朱欣", auth: "管理员", permission: 1 },
      { id: 5791, account: "2011001", name: "康静", auth: "管理员", permission: 1 },
      { id: 5996, account: "ysj@gxkct.com", name: "叶树江", auth: "管理员", permission: 1 },
      { id: 40, account: "pan@gxkct.com", name: "潘宇", auth: "管理员", permission: 88 },
      { id: 3, account: "admin@gxkct.com", name: "老刘", auth: "管理员", permission: 88 },
    ]

    return usersData.map((userData) => ({
      ...userData,
      belong: "无",
      relative: 0,
      old: false,
      disabled: false,
    }))
  } else if (nodeType === "department") {
    // 院系级：从deptUsers.json加载数据，显示belong字段
    const deptUsersData = [
      // guiders - 系部管理员
      { id: 4845, account: "2021017", name: "于骁晗", belong: "管理工程系", auth: "系部管理员", permission: 1001 },
      // users - 专业管理员和任课教师
      { id: 4847, account: "2017063", name: "赵靖宇", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 4848, account: "2006008", name: "徐一楠", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 4849, account: "2019017", name: "郭慧莹", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 4850, account: "2022076", name: "沈斯文", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 6884, account: "lauzhihao", name: "lauzhihao", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 6885, account: "lauzhihao@qq.com", name: "刘志昊", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
      { id: 4846, account: "2020045", name: "王微双", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5004, account: "2012025", name: "宋玉丽", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5005, account: "2009010", name: "孙玲", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5006, account: "2021066", name: "刘娓娓", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5007, account: "2023040", name: "杨玉洁", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5008, account: "2023041", name: "李晶", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5009, account: "2022115", name: "王玉洁", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5010, account: "2015088", name: "王文晶", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5011, account: "2008008", name: "于红岩", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5012, account: "2005006", name: "夏丹", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5013, account: "2010005", name: "张艳丽", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5014, account: "2021018", name: "张婷", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5015, account: "2022014", name: "马金英", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5016, account: "2016067", name: "刘程", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5017, account: "2023017", name: "宋晓莹", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5018, account: "2016046", name: "郑凤云", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5019, account: "2024004", name: "姚明超", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5236, account: "2015051", name: "王文娟", belong: "管理工程系", auth: "任课教师", permission: 3001 },
      { id: 5237, account: "2012062", name: "刘丽娜", belong: "管理工程系", auth: "任课教师", permission: 3001 },
    ]

    return deptUsersData.map((userData) => ({
      ...userData,
      relative: 264,
      old: false,
      disabled: false,
    }))
  } else if (nodeType === "major") {
    // 专业级：暂时返回空数组
    return []
  }

  return []
}

export function Members({ node }: MembersProps) {
  const roleConfig = getRoleConfig(node.type)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [userRolePopoverOpen, setUserRolePopoverOpen] = useState(false)
  const [newUserAccount, setNewUserAccount] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState(roleConfig.defaultRole)
  const [newUserUniversity, setNewUserUniversity] = useState("")
  const [newUserDepartment, setNewUserDepartment] = useState("")
  const [newUserMajor, setNewUserMajor] = useState("")
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>(generateMockUsers(node.type))

  useEffect(() => {
    if (node) {
      const config = getRoleConfig(node.type)
      const loadUsers = async () => {
        const response = await api.users.getUsers(node.id)
        if (response.data) {
          setUsers(response.data)
        } else {
          const initialUsers = generateMockUsers(node.type)
          setUsers(initialUsers)
          await api.users.updateUsers(node.id, initialUsers)
        }
      }
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, node.type])

  const handleSaveUser = async () => {
    if (!node || !newUserAccount || !newUserName) return

    let updatedUsers

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
      const newUser: User = {
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
    await api.users.updateUsers(node.id, updatedUsers)

    setIsAddUserDialogOpen(false)
    setNewUserAccount("")
    setNewUserName("")
    setNewUserRole(roleConfig.defaultRole)
    setNewUserUniversity("")
    setNewUserDepartment("")
    setNewUserMajor("")
    setEditingUserId(null)
  }

  const handleToggleUserEnabled = async (userId: number) => {
    if (!node) return

    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, disabled: !user.disabled } : user))
    setUsers(updatedUsers)
    await api.users.updateUsers(node.id, updatedUsers)
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setNewUserAccount(user.account)
    setNewUserName(user.name)
    setNewUserRole(user.auth)
    setNewUserUniversity(user.university || "")
    setNewUserDepartment(user.department || "")
    setNewUserMajor(user.major || "")
    setIsAddUserDialogOpen(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (!node) return

    const updatedUsers = users.filter((user) => user.id !== userId)
    setUsers(updatedUsers)
    await api.users.updateUsers(node.id, updatedUsers)
  }

  const handleResetPassword = (userId: string) => {
    console.log("Password reset for user:", userId)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.account.toLowerCase().includes(userSearchQuery.toLowerCase()),
  )

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayedUsers = filteredUsers.slice(startIndex, endIndex)

  // 根据节点类型计算统计数据
  const getStatistics = () => {
    if (node.type === "department") {
      // 院系级：统计系部管理员、专业管理员、任课教师
      return [
        {
          count: users.filter((u) => u.auth === "系部管理员").length,
          label: "系部管理员",
          color: "primary",
        },
        {
          count: users.filter((u) => u.auth === "专业管理员").length,
          label: "专业管理员",
          color: "accent",
        },
        {
          count: users.filter((u) => u.auth === "任课教师").length,
          label: "任课教师",
          color: "chart-3",
        },
      ]
    } else {
      // 其他级别：使用原有逻辑
      const adminCount = users.filter((u) => u.auth === roleConfig.roles[0]).length
      const secondRoleCount = roleConfig.roles[1] ? users.filter((u) => u.auth === roleConfig.roles[1]).length : 0

      return [
        {
          count: users.length,
          label: "总成员数",
          color: "primary",
        },
        {
          count: adminCount,
          label: roleConfig.labels[roleConfig.roles[0]],
          color: "accent",
        },
        {
          count: secondRoleCount,
          label: roleConfig.roles[1] ? roleConfig.labels[roleConfig.roles[1]] : "其他成员",
          color: "chart-3",
        },
      ]
    }
  }

  const statistics = getStatistics()

  return (
    <div className="space-y-6">
      {/* 院系级显示统计卡片 */}
      {node.type === "department" && (
        <div className="grid grid-cols-3 gap-4">
          {statistics.map((stat, index) => (
            <Card
              key={index}
              className={`bg-gradient-to-br from-${stat.color}/10 to-${stat.color}/5 border-${stat.color}/20`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className={`text-3xl font-bold text-${stat.color}`}>{stat.count}</div>
                  <div className={`text-sm text-${stat.color}/80`}>{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-64">
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingUserId(null)
              setNewUserAccount("")
              setNewUserName("")
              setNewUserRole(roleConfig.defaultRole)
              setNewUserUniversity("")
              setNewUserDepartment("")
              setNewUserMajor("")
              setIsAddUserDialogOpen(true)
            }}
            className="gap-2 hover:bg-primary/10 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">新增成员</span>
          </Button>
        </div>
        <div className="rounded-lg border border-border overflow-hidden bg-white/50">
          {displayedUsers.map((user, index) => {
            // 根据节点类型和角色显示对应的机构归属标签
            let affiliationTag = null

            if (node.type === "university" || node.type === "department") {
              // 学校级和院系级：不显示机构归属
              affiliationTag = null
            } else {
              // 其他级别：根据角色显示机构归属
              if (user.auth === "校级管理员" && user.university) {
                affiliationTag = (
                  <span className="px-2 py-1 rounded bg-blue-100 border border-blue-200 text-xs font-medium text-blue-700 whitespace-nowrap">
                    {user.university}
                  </span>
                )
              } else if (user.auth === "院系管理员" && user.department) {
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
              } else if (user.auth === "授课教师" && user.courseCount !== undefined) {
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", !user.disabled ? "text-muted-foreground" : "text-red-600")}>
                    禁用
                  </span>
                  <Switch
                    checked={!user.disabled}
                    onCheckedChange={() => handleToggleUserEnabled(user.id)}
                    className="cursor-pointer"
                  />
                  <span
                    className={cn("text-xs font-medium", !user.disabled ? "text-green-600" : "text-muted-foreground")}
                  >
                    启用
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} className="gap-2">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="gap-2 text-orange-600 hover:text-orange-700">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认重置密码</AlertDialogTitle>
                      <AlertDialogDescription>
                        确认要重置用户 {user.name} 的密码？新密码将发送至用户邮箱。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleResetPassword(user.id)}>确认重置</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                      <AlertDialogDescription>确认要删除用户 {user.name}？此操作无法撤销。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            )
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">没有找到匹配的用户</div>
        )}

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

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUserId ? "编辑用户" : "添加用户"}</DialogTitle>
            <DialogDescription>填写用户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">姓名</Label>
              <Input
                id="user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-account">账号</Label>
              <Input
                id="user-account"
                value={newUserAccount}
                onChange={(e) => setNewUserAccount(e.target.value)}
                placeholder="请输入账号"
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
                    {roleConfig.roles.map((role) => (
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

            {/* 根据角色显示对应的机构归属字段 */}
            {newUserRole === "校级管理员" && (
              <div className="space-y-2">
                <Label htmlFor="user-university">学校名称</Label>
                <Input
                  id="user-university"
                  value={newUserUniversity}
                  onChange={(e) => setNewUserUniversity(e.target.value)}
                  placeholder="请输入学校名称"
                />
              </div>
            )}

            {newUserRole === "院系管理员" && (
              <div className="space-y-2">
                <Label htmlFor="user-department">院系名称</Label>
                <Input
                  id="user-department"
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  placeholder="请输入院系名称"
                />
              </div>
            )}

            {newUserRole === "专业管理员" && (
              <div className="space-y-2">
                <Label htmlFor="user-major">专业名称</Label>
                <Input
                  id="user-major"
                  value={newUserMajor}
                  onChange={(e) => setNewUserMajor(e.target.value)}
                  placeholder="请输入专业名称"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


