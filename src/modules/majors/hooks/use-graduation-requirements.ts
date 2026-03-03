/**
 * 毕业要求管理Hook
 * 负责管理毕业要求和指标点的CRUD操作
 */

import { useState, useEffect, useRef } from "react"
import type { GraduationRequirement, IndicatorCourseSupport } from "@/modules/majors/types"
import type { TreeNode } from "@/types"

export interface UseGraduationRequirementsResult {
  // 状态
  graduationRequirements: GraduationRequirement[]
  deletedNodeIds: number[]
  indicatorCourseSupports: Record<string, IndicatorCourseSupport[]>
  courseSelectorOpen: boolean
  selectedIndicatorForCourse: {
    requirementId: string
    indicatorIndex: number
  } | null
  isCourseSelectorOpenRef: boolean

  // 更新方法
  setGraduationRequirements: (value: GraduationRequirement[]) => void
  clearDeletedNodeIds: () => void
  setIndicatorCourseSupports: (value: Record<string, IndicatorCourseSupport[]>) => void
  setCourseSelectorOpen: (value: boolean) => void
  setSelectedIndicatorForCourse: (value: { requirementId: string; indicatorIndex: number } | null) => void
  setIsCourseSelectorOpen: (value: boolean) => void

  // 业务操作方法
  addGraduationRequirement: () => void
  removeGraduationRequirement: (id: string) => void
  updateGraduationRequirement: (id: string, content: string) => void
  addIndicator: (reqId: string) => void
  removeIndicator: (reqId: string, index: number) => void
  updateIndicator: (reqId: string, index: number, value: string) => void
  openCourseSelectorForIndicator: (requirementId: string, indicatorIndex: number) => void
  handleSaveCoursesForIndicator: (selectedCourses: Array<{ course: TreeNode; supportLevel: "strong" | "weak" }>) => void
  removeIndicatorCourseSupport: (requirementId: string, indicatorIndex: number, courseId: string) => void

  // Ref
  indicatorCoursesSnapshotRef: React.MutableRefObject<Record<string, IndicatorCourseSupport[]>>
}

export function useGraduationRequirements(
  initialData: any,
  isEditMode: boolean,
  lastRequirementRef: React.RefObject<HTMLTextAreaElement | null>,
  lastIndicatorRefs: React.MutableRefObject<{ [key: string]: HTMLTextAreaElement | null }>
): UseGraduationRequirementsResult {
  const normalizeRequirement = (item: any, fallbackId: string): GraduationRequirement => {
    const indicators = Array.isArray(item?.indicators) ? item.indicators.map((value: unknown) => String(value)) : [""]
    const normalizedIndicatorIds = Array.isArray(item?.indicatorIds)
      ? item.indicatorIds.map((value: unknown) => {
          const numeric = Number.parseInt(String(value), 10)
          return Number.isInteger(numeric) && numeric > 0 ? numeric : 0
        })
      : []

    if (normalizedIndicatorIds.length < indicators.length) {
      const missingCount = indicators.length - normalizedIndicatorIds.length
      normalizedIndicatorIds.push(...Array.from({ length: missingCount }, () => 0))
    }

    if (normalizedIndicatorIds.length > indicators.length) {
      normalizedIndicatorIds.length = indicators.length
    }

    return {
      id: typeof item?.id === "string" ? item.id : fallbackId,
      content: typeof item?.content === "string" ? item.content : "",
      indicators,
      indicatorIds: normalizedIndicatorIds,
    }
  }

  // 从 requiresVOS 或 graduationRequirements 加载毕业要求
  const loadGraduationRequirements = () => {
    // 直接访问 initialData 的属性（已扁平化）
    if (initialData?.requiresVOS && initialData.requiresVOS.length > 0) {
      return initialData.requiresVOS.map((requireVO: any) => {
        const children = Array.isArray(requireVO?.children) ? requireVO.children : []
        const indicators = children.length > 0 ? children.map((child: any) => child.description || "") : [""]
        const indicatorIds =
          children.length > 0
            ? children.map((child: any) => {
                const numeric = Number.parseInt(String(child?.id), 10)
                return Number.isInteger(numeric) && numeric > 0 ? numeric : 0
              })
            : [0]

        return {
          id: String(requireVO.id),
          content: requireVO.description || "",
          indicators,
          indicatorIds,
        }
      })
    } else if (initialData?.graduationRequirements) {
      return initialData.graduationRequirements.map((item: any, index: number) =>
        normalizeRequirement(item, `new-${index + 1}`)
      )
    } else {
      return [{ id: "new-1", content: "", indicators: [""], indicatorIds: [0] }]
    }
  }

  const [graduationRequirements, setGraduationRequirements] = useState<GraduationRequirement[]>(
    loadGraduationRequirements()
  )
  const [deletedNodeIds, setDeletedNodeIds] = useState<number[]>([])
  const [indicatorCourseSupports, setIndicatorCourseSupports] = useState<Record<string, IndicatorCourseSupport[]>>({})
  const [courseSelectorOpen, setCourseSelectorOpen] = useState(false)
  const [selectedIndicatorForCourse, setSelectedIndicatorForCourse] = useState<{
    requirementId: string
    indicatorIndex: number
  } | null>(null)
  const [isCourseSelectorOpenRef, setIsCourseSelectorOpen] = useState(false)

  const indicatorCoursesSnapshotRef = useRef<Record<string, IndicatorCourseSupport[]>>({})

  // 更新快照ref，不触发重新渲染
  useEffect(() => {
    indicatorCoursesSnapshotRef.current = indicatorCourseSupports
  }, [indicatorCourseSupports])

  const addGraduationRequirement = () => {
    const newId = `new-${Date.now().toString()}`
    setGraduationRequirements([...graduationRequirements, { id: newId, content: "", indicators: [""], indicatorIds: [0] }])
    setTimeout(() => {
      lastRequirementRef.current?.focus()
    }, 0)
  }

  const removeGraduationRequirement = (id: string) => {
    if (graduationRequirements.length > 1) {
      const targetRequirement = graduationRequirements.find((req) => req.id === id)
      if (targetRequirement) {
        const idsToDelete: number[] = []
        const requirementId = Number.parseInt(targetRequirement.id, 10)
        if (Number.isInteger(requirementId) && requirementId > 0) {
          idsToDelete.push(requirementId)
        }
        targetRequirement.indicatorIds.forEach((indicatorId) => {
          if (Number.isInteger(indicatorId) && indicatorId > 0) {
            idsToDelete.push(indicatorId)
          }
        })

        if (idsToDelete.length > 0) {
          setDeletedNodeIds((prev) => Array.from(new Set([...prev, ...idsToDelete])))
        }
      }

      setGraduationRequirements(graduationRequirements.filter((req) => req.id !== id))
    }
  }

  const updateGraduationRequirement = (id: string, content: string) => {
    setGraduationRequirements(graduationRequirements.map((req) => (req.id === id ? { ...req, content } : req)))
  }

  const addIndicator = (reqId: string) => {
    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId
          ? {
              ...req,
              indicators: [...req.indicators, ""],
              indicatorIds: [...req.indicatorIds, 0],
            }
          : req
      )
    )
    setTimeout(() => {
      lastIndicatorRefs.current[reqId]?.focus()
    }, 0)
  }

  const removeIndicator = (reqId: string, index: number) => {
    const targetRequirement = graduationRequirements.find((req) => req.id === reqId)
    if (targetRequirement) {
      const indicatorId = targetRequirement.indicatorIds[index]
      if (Number.isInteger(indicatorId) && indicatorId > 0) {
        setDeletedNodeIds((prev) => Array.from(new Set([...prev, indicatorId])))
      }
    }

    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId
          ? {
              ...req,
              indicators: req.indicators.filter((_, i) => i !== index),
              indicatorIds: req.indicatorIds.filter((_, i) => i !== index),
            }
          : req
      )
    )
  }

  const updateIndicator = (reqId: string, index: number, value: string) => {
    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId
          ? {
              ...req,
              indicators: req.indicators.map((ind, i) => (i === index ? value : ind)),
            }
          : req
      )
    )
  }

  const openCourseSelectorForIndicator = (requirementId: string, indicatorIndex: number) => {
    setSelectedIndicatorForCourse({ requirementId, indicatorIndex })
    setIsCourseSelectorOpen(true)
    setCourseSelectorOpen(true)
  }

  const handleSaveCoursesForIndicator = (selectedCourses: Array<{ course: TreeNode; supportLevel: "strong" | "weak" }>) => {
    if (!selectedIndicatorForCourse) return

    const { requirementId, indicatorIndex } = selectedIndicatorForCourse
    const key = `${requirementId}-${indicatorIndex}`

    const coursesToSave: IndicatorCourseSupport[] = selectedCourses.map((item) => ({
      courseId: item.course.id || "",
      courseName: item.course.name || "",
      supportLevel: item.supportLevel,
    }))

    setIndicatorCourseSupports((prev) => ({
      ...prev,
      [key]: coursesToSave,
    }))

    setCourseSelectorOpen(false)
    setIsCourseSelectorOpen(false)
    setSelectedIndicatorForCourse(null)
  }

  const removeIndicatorCourseSupport = (requirementId: string, indicatorIndex: number, courseId: string) => {
    const key = `${requirementId}-${indicatorIndex}`
    setIndicatorCourseSupports((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.courseId !== courseId),
    }))
  }

  const clearDeletedNodeIds = () => {
    setDeletedNodeIds([])
  }

  return {
    graduationRequirements,
    deletedNodeIds,
    indicatorCourseSupports,
    courseSelectorOpen,
    selectedIndicatorForCourse,
    isCourseSelectorOpenRef,
    setGraduationRequirements,
    clearDeletedNodeIds,
    setIndicatorCourseSupports,
    setCourseSelectorOpen,
    setSelectedIndicatorForCourse,
    setIsCourseSelectorOpen,
    addGraduationRequirement,
    removeGraduationRequirement,
    updateGraduationRequirement,
    addIndicator,
    removeIndicator,
    updateIndicator,
    openCourseSelectorForIndicator,
    handleSaveCoursesForIndicator,
    removeIndicatorCourseSupport,
    indicatorCoursesSnapshotRef,
  }
}
