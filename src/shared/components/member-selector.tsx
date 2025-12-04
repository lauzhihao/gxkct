"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import type { NodeType, TaskMember } from "@/types"
import { api } from "@/lib/api"

// 获取角色标签样式
const getRoleTagStyle = (auth: string): { bg: string; border: string; text: string } => {
  const roleStyles: Record<string, { bg: string; border: string; text: string }> = {
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

interface MemberSelectorProps {
  mode?: "single" | "multiple"
  departmentId?: string
  majorId?: string
  nodeType: NodeType
  onConfirm: (selected: MemberSelectorUser | MemberSelectorUser[]) => void
  onCancel?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}

export function MemberSelector({
  mode = "single",
  departmentId,
  majorId,
  nodeType,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
  title = "选择成员",
  description = "请选择要添加的成员",
}: MemberSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Array<MemberSelectorUser["id"]>>([])
  const [allUsers, setAllUsers] = useState<MemberSelectorUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const pageSize = 10

  // 当弹窗打开时加载成员数据
  useEffect(() => {
    const targetId = departmentId || majorId
    if (open && targetId) {
      const loadUsers = async () => {
        setIsLoading(true)
        try {
          if (nodeType === "department") {
            const response = await api.tree.getDepartmentUsers(targetId)
            setAllUsers(response.data ?? [])
          } else {
            const response = await api.users.getUsers(targetId)
            setAllUsers(response.data ?? [])
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
  }, [open, departmentId, majorId, nodeType])

  const filteredUsers = useMemo(
    () => {
      if (!allUsers || allUsers.length === 0) return []
      return allUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.account.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    },
    [allUsers, searchQuery],
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

  // 当弹窗打开时清空搜索框
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setCurrentPage(1)
      setSelectedIds([])
    }
  }, [open])

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

          <ScrollArea className="h-96 border rounded-lg p-4">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : displayedUsers.length > 0 ? (
                mode === "single" ? (
                  <RadioGroup value={selectedIds[0]?.toString() || ""} onValueChange={(val) => setSelectedIds([parseInt(val)])}>
                    <table className="w-full">
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
                            <td className="p-2 w-6">
                              <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                                {user.account}
                              </Label>
                            </td>
                            <td className="p-2">
                              <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                                <div className="font-medium text-foreground">{user.name}</div>
                              </Label>
                            </td>
                            <td className="p-2 text-right">
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
                  </RadioGroup>
                ) : (
                  <table className="w-full">
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
                          <td className="p-2 w-6">
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
                          <td className="p-2 text-xs text-muted-foreground">
                            <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                              {user.account}
                            </Label>
                          </td>
                          <td className="p-2">
                            <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                              <div className="font-medium text-foreground">{user.name}</div>
                            </Label>
                          </td>
                          <td className="p-2 text-right">
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
            </div>
          </ScrollArea>
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
