"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { BookMarked, Pencil, X, Check, Search } from "lucide-react"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import { TreeApi } from "@/lib/api/tree-api"
import { api } from "@/lib/api"
import type { MajorMatrixItemResponse } from "@/lib/api/matrix-api"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { buildApiUrl } from "@/lib/api/config"
import { getStoredAuthToken } from "@/lib/api/auth-config"

const treeApiInstance = new TreeApi()
const MATRIX_MANAGE_ACTION: PermissionAction = "major.course.create"
const MATRIX_MANAGE_CONTEXT = { scope: "major" } as const

// 课程项（从接口提取的精简结构）
interface CourseInfo {
  courseId: string
  courseName: string
}

interface CourseItem {
  self: { value: string; label: string } | null
}

interface MajorMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: any) => void
}

export function MajorMatrix(props: MajorMatrixProps) {
  const { node } = props
  const { can } = usePermission()
  const canManageMatrix = can(MATRIX_MANAGE_ACTION, MATRIX_MANAGE_CONTEXT)
  const [isEditingMatrix, setIsEditingMatrix] = useState(false)
  const [matrixSupportLevels, setMatrixSupportLevels] = useState<Record<string, string>>({})
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set())
  const [clampedReqs, setClampedReqs] = useState<Set<number>>(new Set())
  const textRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set())
  const [clampedIndicators, setClampedIndicators] = useState<Set<string>>(new Set())
  const indicatorRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const [requiresVOS, setRequiresVOS] = useState<any[]>([])
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false)
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [courseMatrixMap, setCourseMatrixMap] = useState<Record<string, MajorMatrixItemResponse[]>>({})
  const [courseLoadingMap, setCourseLoadingMap] = useState<Record<string, boolean>>({})
  const [courseErrorMap, setCourseErrorMap] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState("")
  const [courseSearchTerm, setCourseSearchTerm] = useState("")
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matrixRequestGenerationRef = useRef(0)

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setCourseSearchTerm(value)
    }, 300)
  }, [])

  const handleSearchClear = useCallback(() => {
    setSearchInput("")
    setCourseSearchTerm("")
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const loadSingleCourseMatrix = useCallback(async (courseId: string, generation: number) => {
    setCourseLoadingMap((prev) => ({
      ...prev,
      [courseId]: true,
    }))
    setCourseErrorMap((prev) => ({
      ...prev,
      [courseId]: "",
    }))

    try {
      const response = await api.matrices.getMajorMatrix(courseId)
      if (generation !== matrixRequestGenerationRef.current) {
        return
      }

      if (response.error) {
        const errorText = typeof response.error === "string" ? response.error : String(response.error)
        setCourseErrorMap((prev) => ({
          ...prev,
          [courseId]: errorText,
        }))
        return
      }

      const matrixItems = Array.isArray(response.data) ? response.data : []
      setCourseMatrixMap((prev) => ({
        ...prev,
        [courseId]: matrixItems,
      }))
    } catch (error) {
      if (generation !== matrixRequestGenerationRef.current) {
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      setCourseErrorMap((prev) => ({
        ...prev,
        [courseId]: message,
      }))
    } finally {
      if (generation !== matrixRequestGenerationRef.current) {
        return
      }
      setCourseLoadingMap((prev) => ({
        ...prev,
        [courseId]: false,
      }))
    }
  }, [])

  // 加载毕业要求数据 + 课程列表（矩阵数据按课程异步加载）
  useEffect(() => {
    const majorId = node.id
    if (!majorId) return

    const loadMajorData = async () => {
      setIsLoadingMatrix(true)
      try {
        const majorDetailPromise = treeApiInstance.getMajorDetail(majorId)

        const courseListUrl = buildApiUrl(`/api/v4/webpage/majorindex/courses?majorId=${majorId}&lang=80101`)
        const headers: Record<string, string> = {
          Accept: "application/json",
          "Content-Type": "application/json",
        }
        const authToken = getStoredAuthToken()
        if (authToken) {
          headers.authToken = authToken
        }

        const courseListPromise = fetch(courseListUrl, {
          method: "GET",
          headers,
        })

        const [majorDetailResponse, courseListResponse] = await Promise.all([
          majorDetailPromise,
          courseListPromise,
        ])

        if (majorDetailResponse.data?.requiresVOS) {
          setRequiresVOS(majorDetailResponse.data.requiresVOS)
        }

        if (!courseListResponse.ok) {
          throw new Error(`获取课程列表失败，状态码: ${courseListResponse.status}`)
        }

        const courseResult = await courseListResponse.json()
        const rawCourses = Array.isArray(courseResult.data) ? (courseResult.data as CourseItem[]) : []

        const parsedCourses: CourseInfo[] = []
        for (const rawCourse of rawCourses) {
          if (!rawCourse.self) {
            continue
          }
          const rawId = rawCourse.self.value
          const rawName = rawCourse.self.label

          if (typeof rawId !== "string" || rawId.trim() === "") {
            console.error("[MajorMatrix] 跳过课程：缺少有效 courseId", rawCourse)
            continue
          }
          if (typeof rawName !== "string" || rawName.trim() === "") {
            console.error("[MajorMatrix] 跳过课程：缺少有效 courseName", rawCourse)
            continue
          }

          parsedCourses.push({
            courseId: rawId,
            courseName: rawName,
          })
        }

        setCourses(parsedCourses)
        setCourseMatrixMap({})
        setCourseErrorMap({})

        const initialLoadingMap: Record<string, boolean> = {}
        for (const course of parsedCourses) {
          initialLoadingMap[course.courseId] = false
        }
        setCourseLoadingMap(initialLoadingMap)
      } catch (error) {
        console.error("Failed to load major matrix data:", error)
      } finally {
        setIsLoadingMatrix(false)
      }
    }

    loadMajorData()
  }, [node.id])

  // 按课程逐个异步加载矩阵数据，边到达边渲染
  useEffect(() => {
    if (courses.length === 0) {
      return
    }

    matrixRequestGenerationRef.current += 1
    const generation = matrixRequestGenerationRef.current
    const queue = [...courses]
    const concurrency = Math.min(5, queue.length)

    const runWorker = async () => {
      while (queue.length > 0) {
        const nextCourse = queue.shift()
        if (!nextCourse) {
          return
        }
        await loadSingleCourseMatrix(nextCourse.courseId, generation)
      }
    }

    const workers = Array.from({ length: concurrency }, () => runWorker())
    Promise.all(workers).catch((error) => {
      console.error("[MajorMatrix] 分批加载课程矩阵失败:", error)
    })

    return () => {
      matrixRequestGenerationRef.current += 1
    }
  }, [courses, loadSingleCourseMatrix])

  const handleRetryCourseMatrix = useCallback((courseId: string) => {
    const generation = matrixRequestGenerationRef.current
    loadSingleCourseMatrix(courseId, generation)
  }, [loadSingleCourseMatrix])

  // 获取毕业要求数据
  const getGraduationRequirements = () => {
    if (requiresVOS && requiresVOS.length > 0) {
      return requiresVOS.map((req: any) => ({
        id: req.id,
        content: req.description || "",
        indicators: req.children?.map((child: any) => child.description || "") || [],
      }))
    }
    return []
  }

  // 检测毕业要求文本是否被截断
  useEffect(() => {
    const newClampedReqs = new Set<number>()
    textRefsMap.current.forEach((element, index) => {
      if (!expandedReqs.has(index) && element.scrollHeight > element.clientHeight) {
        newClampedReqs.add(index)
      }
    })
    setClampedReqs(newClampedReqs)
  }, [expandedReqs])

  // 检测指标点文本是否被截断
  useEffect(() => {
    const newClampedIndicators = new Set<string>()
    indicatorRefsMap.current.forEach((element, key) => {
      if (!expandedIndicators.has(key) && element.scrollHeight > element.clientHeight) {
        newClampedIndicators.add(key)
      }
    })
    setClampedIndicators(newClampedIndicators)
  }, [expandedIndicators])

  // 初始化时检测指标点截断状态
  useEffect(() => {
    const timer = setTimeout(() => {
      const newClampedIndicators = new Set<string>()
      indicatorRefsMap.current.forEach((element, key) => {
        if (!expandedIndicators.has(key) && element.scrollHeight > element.clientHeight) {
          newClampedIndicators.add(key)
        }
      })
      setClampedIndicators(newClampedIndicators)
    }, 100)
    return () => clearTimeout(timer)
  }, [node, expandedIndicators])

  // 获取某门课程在某个指标点的支撑级别
  const getSupportLevel = (courseId: string, reqId: number, indicatorIdx: number): string => {
    const matrixItems = courseMatrixMap[courseId] || []
    const req = requiresVOS.find((r: any) => r.id === reqId)
    if (!req?.children?.[indicatorIdx]) return ""
    const graduateRequireId = req.children[indicatorIdx].id
    const item = matrixItems.find((m) => m.graduateRequireId === graduateRequireId)
    if (!item) return ""
    return item.relate === 0 ? "强支撑" : "弱支撑"
  }

  const handleSupportLevelChange = (courseId: string, reqId: number, indicatorIdx: number, value: string) => {
    if (!canManageMatrix) return

    const key = `${courseId}-${reqId}-${indicatorIdx}`
    setMatrixSupportLevels((prev) => {
      if (prev[key] === value) {
        const next = { ...prev }
        delete next[key]
        return next
      }

      return {
        ...prev,
        [key]: value,
      }
    })
  }

  const handleSaveMatrix = useCallback(async (isAutoSave = false) => {
    if (!canManageMatrix) return
    if (Object.keys(matrixSupportLevels).length === 0) {
      if (!isAutoSave) {
        setIsEditingMatrix(false)
      }
      return
    }

    setIsSavingMatrix(true)

    try {
      // 收集受影响的课程ID
      const affectedCourseIds = new Set<string>()
      for (const key of Object.keys(matrixSupportLevels)) {
        const course = courses.find((c) => key.startsWith(`${c.courseId}-`))
        if (course) {
          affectedCourseIds.add(course.courseId)
        }
      }

      // 逐课程构建完整矩阵数据并调用保存接口
      for (const courseId of Array.from(affectedCourseIds)) {
        const existingItems = [...(courseMatrixMap[courseId] || [])]

        // 将该课程下的所有变更合并到已有矩阵数据中
        for (const req of requiresVOS) {
          const children = req.children || []
          for (let indicatorIdx = 0; indicatorIdx < children.length; indicatorIdx++) {
            const key = `${courseId}-${req.id}-${indicatorIdx}`
            if (!(key in matrixSupportLevels)) continue

            const value = matrixSupportLevels[key]
            const graduateRequireId = children[indicatorIdx].id
            const relate = value === "\u5F3A\u652F\u6491" ? 0 : 1

            const existingIndex = existingItems.findIndex(
              (item) => item.graduateRequireId === graduateRequireId
            )
            if (existingIndex >= 0) {
              existingItems[existingIndex] = {
                ...existingItems[existingIndex],
                relate,
              }
            } else {
              const courseName = courses.find((c) => c.courseId === courseId)?.courseName
              if (!courseName) {
                throw new Error(`[MajorMatrix] courseId=${courseId} courseName missing`)
              }
              existingItems.push({
                id: 0,
                majorId: Number(node.id),
                courseUnitId: Number(courseId),
                courseUnitName: courseName,
                graduateRequireId,
                relate,
              })
            }
          }
        }

        const saveData = existingItems.map((item) => ({
          id: item.id > 0 ? item.id : 0,
          majorId: item.majorId,
          courseUnitId: item.courseUnitId,
          courseUnitName: item.courseUnitName || "",
          graduateRequireId: item.graduateRequireId,
          relate: item.relate,
        }))

        const response = await api.matrices.updateMajorMatrix(courseId, saveData)
        if (response.error) {
          const errorText = typeof response.error === "string" ? response.error : String(response.error)
          throw new Error(errorText)
        }
      }

      // 全部保存成功：清空变更记录，异步重新加载受影响课程的矩阵数据
      setMatrixSupportLevels({})
      const generation = matrixRequestGenerationRef.current
      for (const courseId of Array.from(affectedCourseIds)) {
        loadSingleCourseMatrix(courseId, generation)
      }
    } catch (error) {
      console.error("[MajorMatrix] save matrix failed:", error)
    } finally {
      setIsSavingMatrix(false)
      if (!isAutoSave) {
        setIsEditingMatrix(false)
      }
    }
  }, [canManageMatrix, matrixSupportLevels, courseMatrixMap, requiresVOS, courses, node.id, loadSingleCourseMatrix])

  const handleCancelMatrix = () => {
    if (!canManageMatrix) return

    setMatrixSupportLevels({})
    setIsEditingMatrix(false)
  }

  const handleStartEditMatrix = () => {
    if (!canManageMatrix) return
    setIsEditingMatrix(true)
  }

  useEffect(() => {
    if (!canManageMatrix || !isEditingMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [canManageMatrix, isEditingMatrix, matrixSupportLevels, handleSaveMatrix])

  const graduationRequirements = getGraduationRequirements()

  const filteredCourses = useMemo(() => {
    if (!courseSearchTerm) return courses
    const term = courseSearchTerm.toLowerCase()
    return courses.filter((course) => course.courseName.toLowerCase().includes(term))
  }, [courses, courseSearchTerm])

  if (isLoadingMatrix) {
    return <LoadingState title="加载中..." />
  }

  return (
    <>
      {graduationRequirements.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              专业矩阵
            </h3>
            <div className="flex items-center gap-3">
              {/* 搜索框 */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索课程名称..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searchInput && (
                  searchInput !== courseSearchTerm ? (
                    <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <button
                      onClick={handleSearchClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="清空搜索"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              {!isEditingMatrix && canManageMatrix ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEditMatrix}
                  className="gap-2 bg-transparent"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  编辑
                </Button>
              ) : isEditingMatrix && canManageMatrix ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelMatrix}
                    className="gap-2 bg-transparent"
                    disabled={isSavingMatrix}
                  >
                    <X className="w-3.5 h-3.5" />
                    取消
                  </Button>
                  <Button size="sm" onClick={() => handleSaveMatrix(false)} className="gap-2" disabled={isSavingMatrix}>
                    {isSavingMatrix ? (
                      <>
                        <Spinner className="w-3.5 h-3.5" />
                        保存中
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        保存
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative rounded-lg border border-border overflow-hidden overflow-x-auto mb-[15px]">
            {isSavingMatrix && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="w-4 h-4" />
                  <span>保存中...</span>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                {/* 第一层表头：课程名称 + 毕业要求 */}
                <tr className="border-b border-border bg-secondary/50">
                  <th
                    rowSpan={2}
                    className="text-center p-3 text-muted-foreground font-medium border-r border-border sticky left-0 bg-secondary z-10"
                    style={{ minWidth: "240px", width: "240px", maxWidth: "240px" }}
                  >
                    <span style={{ fontSize: "0.96rem", fontWeight: 600 }}>课程名称</span>
                  </th>
                  {graduationRequirements.map((req: any, reqIndex: number) => {
                    const indicatorCount = (req.indicators || []).length || 1
                    const isExpanded = expandedReqs.has(reqIndex)
                    const isClamped = clampedReqs.has(reqIndex)

                    return (
                      <th
                        key={req.id}
                        colSpan={indicatorCount}
                        className="text-center p-3 text-muted-foreground font-medium border-r border-border"
                        style={{ width: "1000px", minWidth: "1000px" }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                            {reqIndex + 1}
                          </div>
                          <div className="flex-1 text-left flex items-center gap-1">
                            <div
                              ref={(el) => {
                                if (el) {
                                  textRefsMap.current.set(reqIndex, el)
                                }
                              }}
                              className={isExpanded ? "" : "line-clamp-2"}
                              style={{ fontSize: "0.96rem", fontWeight: 600 }}
                            >
                              {req.content}
                            </div>
                            {isClamped && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedReqs)
                                  if (isExpanded) {
                                    newExpanded.delete(reqIndex)
                                  } else {
                                    newExpanded.add(reqIndex)
                                  }
                                  setExpandedReqs(newExpanded)
                                }}
                                className="text-xs text-primary hover:underline cursor-pointer flex-shrink-0 whitespace-nowrap"
                              >
                                {isExpanded ? "收起" : "展开"}
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
                {/* 第二层表头：指标点 */}
                <tr className="border-b border-border bg-secondary/30">
                  {graduationRequirements.map((req: any, reqIndex: number) => {
                    const indicators = req.indicators || []
                    const isRowExpanded = indicators.some((_: any, idx: number) => expandedIndicators.has(`${req.id}-${idx}`))
                    const hasClampedInRow = indicators.some((_: any, idx: number) => clampedIndicators.has(`${req.id}-${idx}`))

                    return indicators.map((indicator: string, indicatorIdx: number) => {
                      const indicatorKey = `${req.id}-${indicatorIdx}`
                      const isExpanded = expandedIndicators.has(indicatorKey)

                      return (
                        <th
                          key={indicatorKey}
                          className="text-center p-3 text-muted-foreground border-r border-border"
                          style={{ width: "250px", minWidth: "250px" }}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm" style={{ fontSize: "0.96rem", fontWeight: 600 }}>{reqIndex + 1}.{indicatorIdx + 1}</span>
                            <div
                              ref={(el) => {
                                if (el) {
                                  indicatorRefsMap.current.set(indicatorKey, el)
                                }
                              }}
                              className={isExpanded ? "break-words" : "line-clamp-3 break-words"}
                              style={{ fontSize: "0.96rem", fontWeight: 600 }}
                            >
                              {indicator}
                            </div>
                            {hasClampedInRow && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedIndicators)
                                  if (isRowExpanded) {
                                    // 收起整行
                                    indicators.forEach((_: any, idx: number) => {
                                      newExpanded.delete(`${req.id}-${idx}`)
                                    })
                                  } else {
                                    // 展开整行
                                    indicators.forEach((_: any, idx: number) => {
                                      newExpanded.add(`${req.id}-${idx}`)
                                    })
                                  }
                                  setExpandedIndicators(newExpanded)
                                }}
                                className="text-xs text-primary hover:underline cursor-pointer"
                              >
                                {isRowExpanded ? "收起" : "展开"}
                              </button>
                            )}
                          </div>
                        </th>
                      )
                    })
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td
                      className="p-6 text-center text-muted-foreground text-sm sticky left-0 bg-background"
                      style={{ minWidth: "240px", width: "240px" }}
                    >
                      {courses.length === 0 ? "暂无课程数据" : "没有匹配的课程"}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr key={course.courseId} className="border-b border-border hover:bg-white/50 transition-colors">
                      {/* 课程名称列 - sticky + truncate + tooltip */}
                      <td
                        className="p-3 text-left border-r border-border sticky left-0 bg-background z-10 font-medium"
                        style={{ minWidth: "240px", width: "240px", maxWidth: "240px" }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-default">{course.courseName}</div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            {course.courseName}
                          </TooltipContent>
                        </Tooltip>
                        {courseErrorMap[course.courseId] ? (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-red-600">矩阵加载失败</span>
                            <button
                              type="button"
                              onClick={() => handleRetryCourseMatrix(course.courseId)}
                              className="text-xs text-primary hover:underline"
                            >
                              重试
                            </button>
                          </div>
                        ) : null}
                      </td>
                      {graduationRequirements.flatMap((req: any) => {
                        const indicators = req.indicators || []
                        return indicators.map((_indicator: string, indicatorIdx: number) => {
                          const key = `${course.courseId}-${req.id}-${indicatorIdx}`
                          const isCourseLoading = courseLoadingMap[course.courseId] === true
                          const courseError = courseErrorMap[course.courseId]
                          const hasCourseError = typeof courseError === "string" && courseError.trim() !== ""
                          const supportLevel = matrixSupportLevels[key] || getSupportLevel(course.courseId, req.id, indicatorIdx)

                          return (
                            <td key={key} className="p-3 text-center border-r border-border">
                              {isCourseLoading ? (
                                <span className="inline-flex items-center justify-center text-muted-foreground">
                                  <Spinner className="w-3.5 h-3.5" />
                                </span>
                              ) : hasCourseError ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : isEditingMatrix && canManageMatrix ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSupportLevelChange(course.courseId, req.id, indicatorIdx, "强支撑")}
                                    className={cn(
                                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                      "border hover:shadow-sm",
                                      supportLevel === "强支撑"
                                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                        : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100",
                                    )}
                                  >
                                    强支撑
                                  </button>
                                  <button
                                    onClick={() => handleSupportLevelChange(course.courseId, req.id, indicatorIdx, "弱支撑")}
                                    className={cn(
                                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                      "border hover:shadow-sm",
                                      supportLevel === "弱支撑"
                                        ? "bg-green-500 text-white border-green-500 shadow-sm"
                                        : "bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100",
                                    )}
                                  >
                                    弱支撑
                                  </button>
                                </div>
                              ) : supportLevel ? (
                                <span
                                  className={cn(
                                    "inline-block px-3 py-1 rounded-full text-xs font-medium",
                                    supportLevel === "强支撑" && "bg-orange-100 border border-orange-300 text-orange-700",
                                    supportLevel === "弱支撑" && "bg-green-100 border border-green-300 text-green-700",
                                  )}
                                >
                                  {supportLevel}
                                </span>
                              ) : null}
                            </td>
                          )
                        })
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-2">暂无毕业要求数据</p>
          <p className="text-xs">请等待专业管理员设置课程支撑关系</p>
        </div>
      )}
    </>
  )
}
