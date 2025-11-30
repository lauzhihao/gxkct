/**
 * 毕业要求管理Hook
 * 负责管理毕业要求和指标点的CRUD操作
 */

import { useState, useEffect, useRef } from "react"
import type { GraduationRequirement, IndicatorCourseSupport } from "@/modules/majors/types"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"

export interface UseGraduationRequirementsResult {
  // 状态
  graduationRequirements: GraduationRequirement[]
  indicatorCourseSupports: Record<string, IndicatorCourseSupport[]>
  courseSelectorOpen: boolean
  selectedIndicatorForCourse: {
    requirementId: string
    indicatorIndex: number
  } | null
  isCourseSelectorOpenRef: boolean

  // 更新方法
  setGraduationRequirements: (value: GraduationRequirement[]) => void
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
  lastRequirementRef: React.RefObject<HTMLInputElement>,
  lastIndicatorRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>
): UseGraduationRequirementsResult {
  // 从 requiresVOS 或 graduationRequirements 加载毕业要求
  const loadGraduationRequirements = () => {
    if (initialData?.metadata?.requiresVOS && initialData.metadata.requiresVOS.length > 0) {
      return initialData.metadata.requiresVOS.map((requireVO: any) => ({
        id: String(requireVO.id),
        content: requireVO.description || "",
        indicators: requireVO.children?.map((child: any) => child.description || "") || [""],
      }))
    } else if (initialData?.metadata?.graduationRequirements) {
      return initialData.metadata.graduationRequirements
    } else {
      return [{ id: "1", content: "", indicators: [""] }]
    }
  }

  const [graduationRequirements, setGraduationRequirements] = useState<GraduationRequirement[]>(
    loadGraduationRequirements()
  )
  const [indicatorCourseSupports, setIndicatorCourseSupports] = useState<Record<string, IndicatorCourseSupport[]>>({})
  const [courseSelectorOpen, setCourseSelectorOpen] = useState(false)
  const [selectedIndicatorForCourse, setSelectedIndicatorForCourse] = useState<{
    requirementId: string
    indicatorIndex: number
  } | null>(null)
  const [isCourseSelectorOpenRef, setIsCourseSelectorOpen] = useState(false)

  const indicatorCoursesSnapshotRef = useRef<Record<string, IndicatorCourseSupport[]>>({})

  // 进入编辑模式时，加载指标点与课程的支撑关系
  useEffect(() => {
    if (isEditMode && initialData?.metadata?.majorId) {
      const loadIndicatorCourseSupports = async () => {
        try {
          const response = await api.matrices.getMajorIndicatorCourseSupports(initialData.metadata.majorId)
          if (response.data?.supports) {
            setIndicatorCourseSupports(response.data.supports)
          }
        } catch (error) {
          console.error("加载指标点课程支撑关系失败:", error)
        }
      }
      loadIndicatorCourseSupports()
    }
  }, [isEditMode, initialData?.metadata?.majorId])

  // 更新快照ref，不触发重新渲染
  useEffect(() => {
    indicatorCoursesSnapshotRef.current = indicatorCourseSupports
  }, [indicatorCourseSupports])

  const addGraduationRequirement = () => {
    const newId = Date.now().toString()
    setGraduationRequirements([...graduationRequirements, { id: newId, content: "", indicators: [""] }])
    setTimeout(() => {
      lastRequirementRef.current?.focus()
    }, 0)
  }

  const removeGraduationRequirement = (id: string) => {
    if (graduationRequirements.length > 1) {
      setGraduationRequirements(graduationRequirements.filter((req) => req.id !== id))
    }
  }

  const updateGraduationRequirement = (id: string, content: string) => {
    setGraduationRequirements(graduationRequirements.map((req) => (req.id === id ? { ...req, content } : req)))
  }

  const addIndicator = (reqId: string) => {
    setGraduationRequirements(
      graduationRequirements.map((req) => (req.id === reqId ? { ...req, indicators: [...req.indicators, ""] } : req))
    )
    setTimeout(() => {
      lastIndicatorRefs.current[reqId]?.focus()
    }, 0)
  }

  const removeIndicator = (reqId: string, index: number) => {
    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId ? { ...req, indicators: req.indicators.filter((_, i) => i !== index) } : req
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

    const coursesToSave = selectedCourses.map((item) => ({
      courseId: item.course.id,
      courseName: item.course.name,
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

  return {
    graduationRequirements,
    indicatorCourseSupports,
    courseSelectorOpen,
    selectedIndicatorForCourse,
    isCourseSelectorOpenRef,
    setGraduationRequirements,
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
