"use client"

import { useState, useCallback } from "react"
import type { ScoringData, CourseResourceData } from "@/lib/api"
import { courseResourcesApi } from "@/modules/courses/api/courseResourcesApi"

interface UseScoringEditorProps {
  nodeId: string
  resourceData: CourseResourceData | null
  setResourceData: React.Dispatch<React.SetStateAction<CourseResourceData | null>>
}

interface UseScoringEditorReturn {
  editingScoring: string | null
  editScores: ScoringData | null
  startEditScoring: (key: string, scoring: ScoringData) => void
  cancelEditScoring: () => void
  updateIndicatorScore: (index: number, score: number) => void
  updateScoringComment: (comment: string) => void
  saveScoring: () => Promise<void>
}

export function useScoringEditor({
  nodeId,
  resourceData,
  setResourceData,
}: UseScoringEditorProps): UseScoringEditorReturn {
  const [editingScoring, setEditingScoring] = useState<string | null>(null)
  const [editScores, setEditScores] = useState<ScoringData | null>(null)

  const startEditScoring = useCallback((key: string, scoring: ScoringData) => {
    setEditingScoring(key)
    setEditScores(JSON.parse(JSON.stringify(scoring))) // 深拷贝
  }, [])

  const cancelEditScoring = useCallback(() => {
    setEditingScoring(null)
    setEditScores(null)
  }, [])

  const updateIndicatorScore = useCallback((index: number, score: number) => {
    if (!editScores) return
    const updatedIndicators = [...editScores.indicators]
    updatedIndicators[index] = { ...updatedIndicators[index], score }
    const total = updatedIndicators.reduce((sum, ind) => sum + ind.score, 0) / updatedIndicators.length
    setEditScores({ ...editScores, indicators: updatedIndicators, total: Math.round(total) })
  }, [editScores])

  const updateScoringComment = useCallback((comment: string) => {
    if (!editScores) return
    setEditScores({ ...editScores, comment })
  }, [editScores])

  const saveScoring = useCallback(async () => {
    if (!editingScoring || !editScores || !resourceData) return

    const updatedScoring = {
      ...resourceData.scoring,
      [editingScoring]: editScores,
    }

    const updatedResourceData: CourseResourceData = {
      ...resourceData,
      scoring: updatedScoring,
    }

    setResourceData(updatedResourceData)
    await courseResourcesApi.updateCourseResources(nodeId, updatedResourceData)
    setEditingScoring(null)
    setEditScores(null)
  }, [editingScoring, editScores, resourceData, setResourceData, nodeId])

  return {
    editingScoring,
    editScores,
    startEditScoring,
    cancelEditScoring,
    updateIndicatorScore,
    updateScoringComment,
    saveScoring,
  }
}

