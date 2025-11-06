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
import { cn } from "@/lib/utils"
import type { TreeNode, NodeType } from "@/types"
import { api } from "@/lib/api"

interface MembersProps {
  node: TreeNode
}

// 根据节点类型获取角色配置
const getRoleConfig = (nodeType: NodeType) => {
  const roleConfigs: Record<NodeType, { roles: string[]; defaultRole: string; labels: Record<string, string> }> = {
    university: {
      roles: ["学校管理员", "院系负责人", "教务人员"],
      defaultRole: "学校管理员",
      labels: {
        学校管理员: "管理人员",
        院系负责人: "院系负责人",
        教务人员: "教务人员",
      },
    },
    department: {
      roles: ["院系管理员", "专业负责人", "教学秘书"],
      defaultRole: "院系管理员",
      labels: {
        院系管理员: "管理人员",
        专业负责人: "专业负责人",
        教学秘书: "教学秘书",
      },
    },
    major: {
      roles: ["专业管理员", "任课教师", "教学督导"],
      defaultRole: "专业管理员",
      labels: {
        专业管理员: "管理人员",
        任课教师: "任课教师",
        教学督导: "教学督导",
      },
    },
    course: {
      roles: ["课程负责人", "主讲教师", "助教"],
      defaultRole: "课程负责人",
      labels: {
        课程负责人: "管理人员",
        主讲教师: "主讲教师",
        助教: "助教",
      },
    },
    root: {
      roles: ["系统管理员"],
      defaultRole: "系统管理员",
      labels: {
        系统管理员: "管理人员",
      },
    },
  }

  return roleConfigs[nodeType] || roleConfigs.major
}

export function Members({ node }: MembersProps) {
  const roleConfig = getRoleConfig(node.type)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState(roleConfig.defaultRole)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [users, setUsers] = useState([
    { id: "1", name: "李教授", role: roleConfig.defaultRole, email: "li@example.com", enabled: true },
    { id: "2", name: "王老师", role: roleConfig.roles[1] || roleConfig.defaultRole, email: "wang@example.com", enabled: true },
    { id: "3", name: "张老师", role: roleConfig.roles[1] || roleConfig.defaultRole, email: "zhang@example.com", enabled: true },
  ])

  useEffect(() => {
    if (node) {
      const config = getRoleConfig(node.type)
      const loadUsers = async () => {
        const response = await api.users.getUsers(node.id)
        if (response.data) {
          setUsers(response.data)
        } else {
          const initialUsers = [
            { id: "1", name: "李教授", role: config.defaultRole, email: "li@example.com", enabled: true },
            { id: "2", name: "王老师", role: config.roles[1] || config.defaultRole, email: "wang@example.com", enabled: true },
            { id: "3", name: "张老师", role: config.roles[1] || config.defaultRole, email: "zhang@example.com", enabled: true },
          ]
          setUsers(initialUsers)
          await api.users.updateUsers(node.id, initialUsers)
        }
      }
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, node.type])

  const handleSaveUser = async () => {
    if (!node || !newUserEmail || !newUserName) return

    let updatedUsers

    if (editingUserId) {
      updatedUsers = users.map((user) =>
        user.id === editingUserId ? { ...user, name: newUserName, email: newUserEmail, role: newUserRole } : user,
      )
    } else {
      const newUser = {
        id: Date.now().toString(),
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        enabled: true,
      }
      updatedUsers = [...users, newUser]
    }

    setUsers(updatedUsers)
    await api.users.updateUsers(node.id, updatedUsers)

    setIsAddUserDialogOpen(false)
    setNewUserEmail("")
    setNewUserName("")
    setNewUserRole(roleConfig.defaultRole)
    setEditingUserId(null)
  }

  const handleToggleUserEnabled = async (userId: string) => {
    if (!node) return

    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, enabled: !user.enabled } : user))
    setUsers(updatedUsers)
    await api.users.updateUsers(node.id, updatedUsers)
  }

  const handleEditUser = (user: any) => {
    setEditingUserId(user.id)
    setNewUserEmail(user.email)
    setNewUserName(user.name)
    setNewUserRole(user.role)
    setIsAddUserDialogOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
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
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()),
  )

  const displayedUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, 10)

  // 获取管理人员数量（第一个角色）
  const adminCount = users.filter((u) => u.role === roleConfig.roles[0]).length
  // 获取第二类角色数量
  const secondRoleCount = roleConfig.roles[1] ? users.filter((u) => u.role === roleConfig.roles[1]).length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">成员管理</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditingUserId(null)
            setNewUserEmail("")
            setNewUserName("")
            setNewUserRole(roleConfig.defaultRole)
            setIsAddUserDialogOpen(true)
          }}
          className="gap-2 hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 text-primary" />
          <span className="text-primary font-medium">新增成员</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="text-3xl font-bold text-primary">{users.length}</div>
              <div className="text-sm text-primary/80">总成员数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="text-3xl font-bold text-accent">{adminCount}</div>
              <div className="text-sm text-accent/80">{roleConfig.labels[roleConfig.roles[0]]}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="text-3xl font-bold text-chart-3">{secondRoleCount}</div>
              <div className="text-sm text-chart-3/80">
                {roleConfig.roles[1] ? roleConfig.labels[roleConfig.roles[1]] : "其他成员"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-foreground">成员列表</h4>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名或邮箱..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          {displayedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-border hover:bg-white/70 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 w-48">
                  <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
                <span className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-xs font-medium text-primary whitespace-nowrap flex-shrink-0">
                  {roleConfig.labels[user.role] || user.role}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", user.enabled ? "text-muted-foreground" : "text-red-600")}>
                    禁用
                  </span>
                  <Switch
                    checked={user.enabled}
                    onCheckedChange={() => handleToggleUserEnabled(user.id)}
                    className="cursor-pointer"
                  />
                  <span
                    className={cn("text-xs font-medium", user.enabled ? "text-green-600" : "text-muted-foreground")}
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
          ))}
          {filteredUsers.length > 10 && !showAllUsers && (
            <Button variant="outline" onClick={() => setShowAllUsers(true)} className="w-full gap-2">
              展示更多 ({filteredUsers.length - 10} 个用户)
            </Button>
          )}
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">没有找到匹配的用户</div>
          )}
        </div>
      </div>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUserId ? "编辑用户" : "添加用户"}</DialogTitle>
            <DialogDescription>填写用户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">姓名</Label>
              <Input
                id="user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <Label htmlFor="user-email">邮箱</Label>
              <Input
                id="user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <Label htmlFor="user-role">角色</Label>
              <select
                id="user-role"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                {roleConfig.roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
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


