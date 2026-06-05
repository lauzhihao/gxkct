"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Flag, Plus, Search, Settings2, Trash2, X } from "lucide-react"
import { api, getCurrentUserId } from "@/lib/api"
import { useSemesterReadonly } from "@/shared/hooks/use-semester-readonly"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { useSemesterStore } from "@/shared/stores/semester-store"
import { cn } from "@/shared/utils/utils"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { SemesterBrief } from "@/types"
import {
  buildNextSemesterDraft,
  canSetSemesterAsCurrent,
  canViewSemesterManagement,
  type SemesterBootstrapDraft,
} from "./semester-management.utils"

interface SemesterManagementProps {
  collegeId: number
  collegeName: string
}

interface DraftState extends SemesterBootstrapDraft {
  sourceSemesterName: string
}

function getCurrentSemesterItem(semesterList: SemesterBrief[]): SemesterBrief | null {
  const currentSemester = semesterList.find((semester) => semester.isCurrent)
  if (currentSemester) {
    return currentSemester
  }

  return null
}

export function SemesterManagement({ collegeId, collegeName }: SemesterManagementProps) {
  const currentUserId = getCurrentUserId()
  const canOpenSemesterManagement = canViewSemesterManagement(currentUserId)
  const isReadonly = useSemesterReadonly()
  const syncFromAuthContext = useSemesterStore((state) => state.syncFromAuthContext)
  const currentSemesterId = useSemesterStore((state) => state.currentSemesterId)
  const updateCurrentSemesterId = useSemesterStore((state) => state.updateCurrentSemesterId)
  const updateSemesterList = useSemesterStore((state) => state.updateSemesterList)
  const globalSemesterList = useSemesterStore((state) => state.semesterList)
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const setSelectedSemesterId = useSemesterStore((state) => state.setSelectedSemesterId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [semesterList, setSemesterList] = useState<SemesterBrief[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [pendingCurrentSemester, setPendingCurrentSemester] = useState<SemesterBrief | null>(null)
  const [switchingSemesterId, setSwitchingSemesterId] = useState<number | null>(null)
  const [pendingDeleteSemester, setPendingDeleteSemester] = useState<SemesterBrief | null>(null)
  const [isDeletingSemesterId, setIsDeletingSemesterId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const loadRequestIdRef = useRef(0)
  const saveRequestIdRef = useRef(0)
  const activeCollegeIdRef = useRef(collegeId)
  activeCollegeIdRef.current = collegeId

  const loadSemesters = useCallback(async (): Promise<SemesterBrief[] | null> => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    const requestedCollegeId = collegeId
    const currentSelectedSemesterId = useSemesterStore.getState().selectedSemesterId

    setIsLoading(true)
    setLoadError(null)

    try {
      if (requestedCollegeId <= 0) {
        throw new Error("学校 ID 无效，无法加载学期列表")
      }

      const response = await api.semesters.getSemesters(requestedCollegeId)
      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data) {
        throw new Error("学期列表返回为空")
      }

      if (loadRequestIdRef.current !== requestId || activeCollegeIdRef.current !== requestedCollegeId) {
        return null
      }

      setSemesterList(response.data)
      const nextCurrentSemester = getCurrentSemesterItem(response.data)
      syncFromAuthContext({
        currentSemesterId: nextCurrentSemester ? nextCurrentSemester.id : null,
        selectedSemesterId: currentSelectedSemesterId,
        semesterList: response.data,
      })
      return response.data
    } catch (error) {
      if (loadRequestIdRef.current !== requestId || activeCollegeIdRef.current !== requestedCollegeId) {
        return null
      }

      const message = error instanceof Error ? error.message : "加载学期列表失败"
      setSemesterList([])
      setLoadError(message)
      return null
    } finally {
      if (loadRequestIdRef.current === requestId && activeCollegeIdRef.current === requestedCollegeId) {
        setIsLoading(false)
      }
    }
  }, [collegeId, syncFromAuthContext])

  const resetTransientState = useCallback(() => {
    setSearchTerm("")
    setDraft(null)
    setDraftError(null)
    setPendingCurrentSemester(null)
    setPendingDeleteSemester(null)
    setIsDeletingSemesterId(null)
    setLoadError(null)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    resetTransientState()

    if (open) {
      void loadSemesters()
    }
  }, [loadSemesters, resetTransientState])

  const selectedSemester = useMemo(() => globalSemesterList.find(s => Number(s.id) === Number(selectedSemesterId)) || null, [globalSemesterList, selectedSemesterId])

  useEffect(() => {
    loadRequestIdRef.current += 1
    saveRequestIdRef.current += 1
    setIsDialogOpen(false)
    setSemesterList([])
    setSearchTerm("")
    setDraft(null)
    setIsLoading(false)
    setIsSaving(false)
    setPendingCurrentSemester(null)
    setSwitchingSemesterId(null)
    setPendingDeleteSemester(null)
    setIsDeletingSemesterId(null)
    setLoadError(null)
    setDraftError(null)
  }, [collegeId])

  // [MOD] 自动轮询新创建学期的状态
  useEffect(() => {
    if (!isPolling || !isDialogOpen) {
      return
    }

    // 最多轮询 5 次 (约 10 秒)
    if (pollCount >= 5) {
      setIsPolling(false)
      return
    }

    const timer = setTimeout(async () => {
      const latestList = await loadSemesters()
      setPollCount((prev) => prev + 1)

      // [MOD] 轮询期间如果发现列表更新，同步更新全局 Store
      if (latestList) {
        updateSemesterList(latestList)
      }

      if (latestList && latestList.every((s) => s.status === "READY")) {
        setIsPolling(false)
      }
    }, 2000)


    return () => {
      clearTimeout(timer)
    }
  }, [isPolling, pollCount, isDialogOpen, loadSemesters, updateSemesterList])

  const filteredSemesterList = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()
    if (!normalizedSearchTerm) {
      return semesterList
    }

    return semesterList.filter((semester) => semester.name.toLowerCase().includes(normalizedSearchTerm))
  }, [searchTerm, semesterList])

  const handleStartDraft = useCallback((sourceSemester: SemesterBrief) => {
    try {
      const nextDraft = buildNextSemesterDraft(sourceSemester, semesterList)
      setDraft({
        ...nextDraft,
        sourceSemesterName: sourceSemester.name,
      })
      setDraftError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成学期草稿失败"
      setDraftError(message)
      showError(message, "无法创建学期")
    }
  }, [semesterList])

  const handleSaveDraft = useCallback(async () => {
    if (!draft) {
      return
    }

    const requestId = saveRequestIdRef.current + 1
    saveRequestIdRef.current = requestId
    const requestedCollegeId = collegeId

    const trimmedName = draft.name.trim()
    if (!trimmedName) {
      setDraftError("请输入学期名称")
      return
    }

    setIsSaving(true)
    setDraftError(null)

    try {
      // [MOD] 将学年范围转换为结束年份（如 "2025-2026" -> "2026"）
      const endYear = draft.schoolYear.includes('-')
        ? draft.schoolYear.split('-')[1]
        : draft.schoolYear

      const response = await api.semesters.bootstrapSemester(requestedCollegeId, {
        schoolYear: endYear,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data) {
        throw new Error("创建学期返回空数据")
      }

      if (saveRequestIdRef.current !== requestId || activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }

      setDraft(null)
      showSuccess(`已提交“${trimmedName}”推进请求`, `当前阶段：${response.data.stage}`)
      setIsPolling(true)
      setPollCount(0)
      
      // [MOD] 刷新列表并更新 Store
      const latestSemesterList = await loadSemesters()
      if (latestSemesterList) {
        updateSemesterList(latestSemesterList)
      }
    } catch (error) {
      if (saveRequestIdRef.current !== requestId || activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }

      const message = error instanceof Error ? error.message : "推进学期失败"
      setDraftError(message)
      showError(message, "推进学期失败")
    } finally {
      if (saveRequestIdRef.current === requestId && activeCollegeIdRef.current === requestedCollegeId) {
        setIsSaving(false)
      }
    }
  }, [collegeId, draft, loadSemesters, updateSemesterList])

  const handleCancelDraft = useCallback(() => {
    setDraft(null)
    setDraftError(null)
  }, [])

  const handleConfirmDeleteSemester = useCallback(async () => {
    const semester = pendingDeleteSemester
    if (!semester) {
      return
    }

    const requestedCollegeId = collegeId
    setIsDeletingSemesterId(semester.id)

    try {
      const response = await api.semesters.deleteSemester(requestedCollegeId, semester.id)
      if (response.error) {
        throw new Error(response.error)
      }

      if (activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }

      setPendingDeleteSemester(null)
      showSuccess(`已删除"${semester.name}"`, "学期删除成功")
      const latestSemesterList = await loadSemesters()
      if (latestSemesterList) {
        updateSemesterList(latestSemesterList)
      }
    } catch (error) {
      if (activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }
      const message = error instanceof Error ? error.message : "删除学期失败"
      showError(message, "删除学期失败")
    } finally {
      if (activeCollegeIdRef.current === requestedCollegeId) {
        setIsDeletingSemesterId(null)
      }
    }
  }, [collegeId, loadSemesters, pendingDeleteSemester, updateSemesterList])

  const handleConfirmSetCurrentSemester = useCallback(async () => {
    const semester = pendingCurrentSemester
    if (!semester) {
      return
    }

    const requestedCollegeId = collegeId

    setSwitchingSemesterId(semester.id)
    setDraftError(null)

    try {
      const response = await api.semesters.switchCurrentSemester(requestedCollegeId, semester.id)
      if (response.error) {
        throw new Error(response.error)
      }

      if (activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }

      setPendingCurrentSemester(null)
      setIsDialogOpen(false)
      setSelectedSemesterId(semester.id)
      updateCurrentSemesterId(semester.id)
      const latestSemesterList = await loadSemesters()
      if (latestSemesterList) {
        updateSemesterList(latestSemesterList)
      }

      showSuccess(`已将“${semester.name}”设为当前学期`, "当前学期已切换")
    } catch (error) {
      if (activeCollegeIdRef.current !== requestedCollegeId) {
        return
      }

      const message = error instanceof Error ? error.message : "切换当前学期失败"
      showError(message, "切换当前学期失败")
    } finally {
      if (activeCollegeIdRef.current === requestedCollegeId) {
        setSwitchingSemesterId(null)
      }
    }
  }, [collegeId, loadSemesters, pendingCurrentSemester, setSelectedSemesterId, updateCurrentSemesterId, updateSemesterList])

  const currentSemesterLabel = selectedSemester
    ? `${selectedSemester.name}${isReadonly ? " (只读)" : ""}`
    : isLoading
      ? "加载学期中"
      : loadError
        ? "学期加载失败"
        : "暂无学期"

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center gap-2">
        <Badge className={cn(
          "h-8 rounded-full border px-3 shadow-sm",
          isReadonly
            ? "border-secondary bg-secondary text-secondary-foreground"
            : "border-primary/20 bg-primary text-primary-foreground shadow-primary/20"
        )}>
          {currentSemesterLabel}
        </Badge>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-border/70 bg-background/70 p-0 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
            aria-label="打开学期管理"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-[760px] p-0 overflow-hidden">
        <DialogHeader className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
          <DialogTitle>{canOpenSemesterManagement ? `学期管理 @ ${collegeName}` : "切换学期"}</DialogTitle>
          {!canOpenSemesterManagement && (
            <DialogDescription className="mt-1.5 text-xs text-muted-foreground/80">
              您可以只读查看其他学期的数据
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 px-6 pt-3 pb-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索学期名称"
                className="pl-9"
              />
            </div>
            {isLoading ? <Spinner className="h-4 w-4 shrink-0 text-primary" /> : null}
          </div>

          <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
            {canOpenSemesterManagement && draft ? (
              <div className="border-b border-primary/20 bg-primary/10 px-4 py-3 dark:border-primary/50 dark:bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="rounded-md border border-primary/20 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm">
                      {draft.name}
                    </div>
                    {draftError ? <div className="mt-2 text-xs font-medium text-destructive">{draftError}</div> : null}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void handleSaveDraft()}
                      disabled={isSaving}
                      className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      aria-label="保存新学期"
                    >
                      {isSaving ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelDraft}
                      disabled={isSaving}
                      className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none shadow-sm"
                      aria-label="取消创建学期"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="max-h-[420px] overflow-y-auto">
              {loadError ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-medium text-destructive">{loadError}</div>
                  <Button type="button" variant="ghost" className="mt-3" onClick={() => void loadSemesters()}>
                    重新加载
                  </Button>
                </div>
              ) : null}

              {!loadError && !isLoading && semesterList.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">暂无学期数据</div>
              ) : null}

              {!loadError && !isLoading && semesterList.length > 0 && filteredSemesterList.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">未找到匹配学期</div>
              ) : null}

              {!loadError && filteredSemesterList.length > 0 ? (
                <TooltipProvider>
                  <div className="divide-y divide-border">
                  {filteredSemesterList.map((semester) => {
                    const isCurrentSemester = Number(semester.id) === Number(currentSemesterId)
                    const isSelected = Number(semester.id) === Number(selectedSemesterId)
                    const canSetCurrent = canSetSemesterAsCurrent(semester)
                    const isSwitchingCurrent = switchingSemesterId === semester.id
                    const isDraftBlocked = draft !== null || isSaving || isLoading || switchingSemesterId !== null

                    return (
                      <div
                        key={semester.id}
                        className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary/5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "truncate font-medium text-foreground",
                              isSelected && "text-primary font-bold"
                            )}>
                              {semester.name}
                            </span>
                            {isCurrentSemester && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-primary border-primary/50">当前学期</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          {/* 切换视图按钮 - 全员可见 */}
                          {isSelected ? (
                            <div className="flex h-9 w-9 items-center justify-center text-primary">
                              <Check className="h-5 w-5" />
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedSemesterId(semester.id)
                                    setIsDialogOpen(false)
                                  }}
                                  className="h-9 w-9 rounded-full border border-border/70 text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                                  aria-label={`查看${semester.name}数据`}
                                >
                                  <Check className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">设为当前视图</TooltipContent>
                            </Tooltip>
                          )}

                      {canOpenSemesterManagement && (
                        <div className="flex items-center gap-2 border-l border-border pl-2 ml-1">
                          {isCurrentSemester ? (
                            <div className="flex h-9 w-9 items-center justify-center text-primary/40">
                              <Flag className="h-[18px] w-[18px]" fill="currentColor" />
                            </div>
                          ) : canSetCurrent ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setPendingCurrentSemester(semester)}
                                  disabled={isDraftBlocked || semester.status !== "READY"}
                                  className={cn(
                                    "h-9 w-9 rounded-full border border-border/70 text-primary transition-all",
                                    (isDraftBlocked || semester.status !== "READY")
                                      ? "opacity-0 group-hover:opacity-30 focus-visible:opacity-30"
                                      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                                  )}
                                  aria-label={`将${semester.name}设为全校当前学期`}
                                >
                                  {isSwitchingCurrent ? (
                                    <Spinner className="h-[18px] w-[18px]" />
                                  ) : (
                                    <Flag className={cn("h-[18px] w-[18px]", semester.status !== "READY" && "text-muted-foreground/50")} />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {semester.status === "READY" ? "设为全校当前" : "学期正在复制中，请稍后操作"}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStartDraft(semester)}
                                    disabled={isDraftBlocked}
                                    className={cn(
                                      "h-9 w-9 rounded-full border border-border/70 text-primary transition-all",
                                      isDraftBlocked
                                        ? "opacity-0 group-hover:opacity-30 focus-visible:opacity-30"
                                        : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                                    )}
                                    aria-label={`基于${semester.name}创建新学期`}
                                  >
                                    <Plus className="h-[18px] w-[18px]" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">创建新学期</TooltipContent>
                              </Tooltip>

                              {/* 删除学期按钮 - 当前视图或全校当前学期禁用 */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setPendingDeleteSemester(semester)}
                                    disabled={isDraftBlocked || isCurrentSemester || isSelected || isDeletingSemesterId !== null}
                                    className="h-9 w-9 rounded-full border border-border/70 text-destructive transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                    aria-label={`删除${semester.name}`}
                                  >
                                    {isDeletingSemesterId === semester.id ? (
                                      <Spinner className="h-[18px] w-[18px]" />
                                    ) : (
                                      <Trash2 className="h-[18px] w-[18px]" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {isCurrentSemester ? "当前学期不可删除" : isSelected ? "当前视图学期不可删除" : "删除学期"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </TooltipProvider>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog
        open={pendingCurrentSemester !== null}
        onOpenChange={(open) => {
          if (!open && switchingSemesterId === null) {
            setPendingCurrentSemester(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换当前学期确认</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCurrentSemester
                ? `确定要将“${pendingCurrentSemester.name}”设为当前学期吗？页面将切换并重新加载该学期数据。`
                : "确定要切换当前学期吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={switchingSemesterId !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmSetCurrentSemester()}
              disabled={switchingSemesterId !== null}
            >
              {switchingSemesterId !== null ? "切换中..." : "确定"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteSemester !== null}
        onOpenChange={(open) => {
          if (!open && isDeletingSemesterId === null) {
            setPendingDeleteSemester(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除学期确认</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSemester
                ? `确定要删除"${pendingDeleteSemester.name}"吗？此操作不可恢复，该学期的所有数据将被删除。`
                : "确定要删除该学期吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSemesterId !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDeleteSemester()}
              disabled={isDeletingSemesterId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSemesterId !== null ? "删除中..." : "确定删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
