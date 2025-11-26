"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NodeType } from "@/types"
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

interface MemberSelectorUser {
  id: number
  account: string
  name: string
  auth: string
  belong?: string
  permission?: number
  old?: boolean
  disabled?: boolean
}

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

// 生成Mock数据 - 根据节点类型和过滤条件
const generateFilteredUsers = (nodeType: NodeType, departmentId?: string, majorId?: string): MemberSelectorUser[] => {
  // 这里使用与Members组件相同的数据源
  const allUsers: MemberSelectorUser[] = [
    { id: 4845, account: "2021017", name: "于骁晗", belong: "管理工程系", auth: "系部管理员", permission: 1001 },
    { id: 4847, account: "2017063", name: "赵靖宇", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 4848, account: "2006008", name: "徐一楠", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 4849, account: "2019017", name: "郭慧莹", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 4850, account: "2022076", name: "沈斯文", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 6884, account: "lauzhihao", name: "lauzhihao", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 6885, account: "lauzhihao@qq.com", name: "刘志昊", belong: "管理工程系", auth: "专业管理员", permission: 2001 },
    { id: 4846, account: "2020045", name: "王微双", belong: "管理工程系", auth: "任课教师", permission: 3001 },
    { id: 5004, account: "2012025", name: "宋玉丽", belong: "管理工程系", auth: "任课教师", permission: 3001 },
    { id: 5005, account: "2009010", name: "孙玲", belong: "管理工程系", auth: "任课教师", permission: 3001 },
  ]

  // 根据departmentId、majorId进行过滤
  return allUsers.filter((user) => {
    if (departmentId && user.belong !== departmentId) return false
    if (majorId) {
      // majorId过滤逻辑可根据实际需求调整
      return false
    }
    return true
  })
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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [allUsers, setAllUsers] = useState<MemberSelectorUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const pageSize = 10

  // 当弹窗打开时加载成员数据
  useEffect(() => {
    if (open && departmentId) {
      const loadUsers = async () => {
        setIsLoading(true)
        try {
          // 院系级别：从deptUsers.json加载数据，按院系ID过滤
          if (nodeType === "department") {
            const response = await api.tree.getDepartmentUsers(departmentId)
            if (response.data && response.data.length > 0) {
              setAllUsers(response.data)
            } else {
              // 如果API返回空数据，使用空数组
              setAllUsers([])
            }
          } else {
            // 其他类型：使用原有逻辑
            const response = await api.users.getUsers(departmentId)
            if (response.data) {
              setAllUsers(response.data)
            } else {
              // 如果API返回空，使用Mock数据
              const mockUsers = generateFilteredUsers(nodeType, departmentId, majorId)
              setAllUsers(mockUsers)
            }
          }
        } catch (error) {
          console.error("加载成员数据失败:", error)
          // 加载失败时使用Mock数据
          const mockUsers = generateFilteredUsers(nodeType, departmentId, majorId)
          setAllUsers(mockUsers)
        } finally {
          setIsLoading(false)
        }
      }
      loadUsers()
    }
  }, [open, departmentId, nodeType, majorId])

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

