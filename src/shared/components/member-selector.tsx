"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import type { NodeType, TaskMember, Long } from "@/types"
import { api } from "@/lib/api"

// 获取角色标签样式
const getRoleTagStyle = (auth: string): { bg: string; border: string; text: string } => {
  const roleStyles: Record<string, { bg: string; border: string; text: string }> = {
    "校级管理员": { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
    "系部管理员": { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
    "专业管理员": { bg: "bg-accent/20", border: "border-accent/30", text: "text-accent" },
    "任课教师": { bg: "bg-chart-3/20", border: "border-chart-3/30", text: "text-chart-3" },
    "管理员": { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
    "授课教师": { bg: "bg-chart-3/20", border: "border-chart-3/30", text: "text-chart-3" },
    "课程负责人": { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
    "主讲教师": { bg: "bg-accent/20", border: "border-accent/30", text: "text-accent" },
    "助教": { bg: "bg-chart-3/20", border: "border-chart-3/30", text: "text-chart-3" },
    "系统管理员": { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
  }
  return roleStyles[auth] || { bg: "bg-muted/20", border: "border-muted/30", text: "text-muted-foreground" }
}

type MemberSelectorUser = TaskMember

// 稳定的空数组引用，避免默认参数每次渲染创建新引用导致无限循环
const EMPTY_MEMBERS: MemberSelectorUser[] = []

interface MemberSelectorProps {
  mode?: "single" | "multiple"
  departmentId?: string
  majorId?: string
  universityId?: string
  nodeType: NodeType
  onConfirm: (selected: MemberSelectorUser | MemberSelectorUser[]) => void
  onCancel?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  // 已选成员列表，用于初始化和回显
  initialSelectedMembers?: MemberSelectorUser[]
}

export function MemberSelector({
  mode = "single",
  departmentId,
  majorId,
  universityId,
  nodeType,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
  title = "选择成员",
  description = "请选择要添加的成员",
  initialSelectedMembers = EMPTY_MEMBERS,
}: MemberSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Array<MemberSelectorUser["id"]>>([])
  const [allUsers, setAllUsers] = useState<MemberSelectorUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("全部")

  const pageSize = 10

  // 当弹窗打开时加载成员数据
  useEffect(() => {
    const targetId = universityId || departmentId || majorId
    if (open && targetId) {
      const loadUsers = async () => {
        setIsLoading(true)
        try {
          // 如果提供了 universityId，优先获取学校全部成员
          if (universityId) {
            const response = await api.tree.getUniversityUsers(universityId)
            setAllUsers(response.data ?? [])
          } else if (nodeType === "university") {
            // 学校级别：调用学校成员接口
            const response = await api.tree.getUniversityUsers(targetId)
            setAllUsers(response.data ?? [])
          } else if (nodeType === "department") {
            // 院系级别：调用院系成员接口
            const response = await api.tree.getDepartmentUsers(targetId)
            setAllUsers(response.data ?? [])
          } else {
            // 其他级别：调用通用成员接口
            const response = await api.users.getUsers(targetId)
            // 类型转换：User[] -> TaskMember[]，添加缺失的 account 和 auth 属性
            const users: TaskMember[] = (response.data ?? []).map((user) => ({
              id: Number(user.id) as Long,
              account: user.email || "",
              name: user.name,
              auth: user.role,
            }))
            setAllUsers(users)
          }
        } catch (error) {
          console.error("加载成员数据失败:", error)
          setAllUsers([])
        } finally {
          setIsLoading(false)
        }
      }
      loadUsers()
    }
  }, [open, universityId, departmentId, majorId, nodeType])

  // 从用户数据中提取唯一的角色列表
  const uniqueRoles = useMemo(() => {
    const roles = new Set(allUsers.map((user) => user.auth))
    return ["全部", ...Array.from(roles)]
  }, [allUsers])

  const filteredUsers = useMemo(
    () => {
      if (!allUsers || allUsers.length === 0) return []
      return allUsers.filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.account.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = selectedRoleFilter === "全部" || user.auth === selectedRoleFilter
        return matchesSearch && matchesRole
      })
    },
    [allUsers, searchQuery, selectedRoleFilter],
  )

  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + pageSize)

  const handleConfirm = () => {
    if (mode === "single") {
      const selected = allUsers.find((u) => u.id === selectedIds[0])
      if (selected) onConfirm(selected)
    } else {
      const selected = allUsers.filter((u) => selectedIds.includes(u.id))
      onConfirm(selected)
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedIds([])
    setSearchQuery("")
    setCurrentPage(1)
    onCancel?.()
    onOpenChange(false)
  }

  // 当弹窗打开时清空搜索框和筛选状态，并用已选成员初始化
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setCurrentPage(1)
      // 使用已选成员的id初始化selectedIds
      setSelectedIds(initialSelectedMembers.map((m) => m.id))
      setSelectedRoleFilter("全部")
    }
  }, [open, initialSelectedMembers])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名或账号..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>

          {/* 角色快速筛选按钮组 */}
          {uniqueRoles.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {uniqueRoles.map((role) => {
                // "全部"使用默认的muted样式，与getRoleTagStyle的fallback一致
                const style = role === "全部"
                  ? { bg: "bg-muted/20", border: "border-muted/30", text: "text-muted-foreground" }
                  : getRoleTagStyle(role)
                return (
                  <Button
                    key={role}
                    size="sm"
                    variant={selectedRoleFilter === role ? "default" : "outline"}
                    onClick={() => {
                      setSelectedRoleFilter(role)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "h-7 px-3 text-xs",
                      selectedRoleFilter === role
                        ? "bg-primary text-primary-foreground"
                        : `${style.bg} ${style.border} ${style.text} hover:bg-primary hover:text-primary-foreground`
                    )}
                  >
                    {role}
                  </Button>
                )
              })}
            </div>
          )}

          <div className="border overflow-hidden">
            {/* 表头 - 仅多选模式显示 */}
            {mode === "multiple" && !isLoading && displayedUsers.length > 0 && (
              <div className="bg-muted/50 border-b">
                <table className="w-full table-fixed">
                  <thead>
                    <tr>
                      <th className="w-20 p-2 text-center">
                        <Checkbox
                          checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.includes(u.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const allFilteredIds = filteredUsers.map((u) => u.id)
                              setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])])
                            } else {
                              const allFilteredIds = new Set(filteredUsers.map((u) => u.id))
                              setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.has(id)))
                            }
                          }}
                        />
                      </th>
                      <th className="w-50 p-2 text-left text-xs font-medium text-muted-foreground">姓名</th>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">角色</th>
                    </tr>
                  </thead>
                </table>
              </div>
            )}
            <ScrollArea className="h-72">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : displayedUsers.length > 0 ? (
                mode === "single" ? (
                  <RadioGroup value={selectedIds[0]?.toString() || ""} onValueChange={(val) => setSelectedIds([parseInt(val)])}>
                    <table className="w-full table-fixed">
                      <tbody>
                        {displayedUsers.map((user, index) => (
                          <tr
                            key={user.id}
                            className={cn(
                              "transition-colors",
                              index % 2 === 0 ? "bg-muted/30" : "bg-background",
                              "hover:bg-primary/5"
                            )}
                          >
                            <td className="w-20 p-2 text-center">
                              <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                            </td>
                            <td className="w-50 p-2">
                              <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                                <div className="font-medium text-foreground truncate">{user.name}</div>
                              </Label>
                            </td>
                            <td className="p-2">
                              {(() => {
                                const style = getRoleTagStyle(user.auth)
                                return (
                                  <span className={cn("px-2 py-1 border text-xs font-medium whitespace-nowrap inline-block", style.bg, style.border, style.text)}>
                                    {user.auth}
                                  </span>
                                )
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </RadioGroup>
                ) : (
                  <table className="w-full table-fixed">
                    <tbody>
                      {displayedUsers.map((user, index) => (
                        <tr
                          key={user.id}
                          className={cn(
                            "transition-colors",
                            index % 2 === 0 ? "bg-muted/30" : "bg-background",
                            "hover:bg-primary/5"
                          )}
                        >
                          <td className="w-20 p-2 text-center">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={selectedIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIds([...selectedIds, user.id])
                                } else {
                                  setSelectedIds(selectedIds.filter((id) => id !== user.id))
                                }
                              }}
                            />
                          </td>
                          <td className="w-50 p-2">
                            <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                              <div className="font-medium text-foreground truncate">{user.name}</div>
                            </Label>
                          </td>
                          <td className="p-2">
                            {(() => {
                              const style = getRoleTagStyle(user.auth)
                              return (
                                <span className={cn("px-2 py-1 rounded border text-xs font-medium whitespace-nowrap inline-block", style.bg, style.border, style.text)}>
                                  {user.auth}
                                </span>
                              )
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无成员数据</div>
              )}
            </ScrollArea>
          </div>

          {/* 已选成员标签区域 */}
          {mode === "multiple" && selectedIds.length > 0 && (
            <div className="border p-3 bg-muted/20 overflow-hidden">
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span>已选成员 ({selectedIds.length}人)</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-primary hover:underline decoration-primary"
                >
                  清除
                </button>
              </div>
              <div className="h-20 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {selectedIds.map((id) => {
                    const user = allUsers.find((u) => u.id === id)
                    if (!user) return null
                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 text-sm"
                      >
                        <span>{user.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedIds(selectedIds.filter((i) => i !== id))}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center">
          {totalPages > 1 && (
            <div className="flex items-center gap-4 text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-muted-foreground min-w-[60px] text-center">
                第 {currentPage} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              确认
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
