/**
 * KSA（知识/技能/态度）管理Hook
 * 负责管理KSA对话框的状态和编辑操作
 */

import { useState } from "react"
import type { KsaItem } from "./use-project-matrix"

export interface KsaCellData {
  chapterId: string
  coursePointId: string
  taskId: string
}

export interface UseKsaManagementResult {
  // 对话框状态
  ksaDialogOpen: boolean
  selectedKsaCell: KsaCellData | null
  selectedKsaSupport: Record<string, "strong" | "weak">

  // 搜索状态
  ksaSearchK: string
  ksaSearchS: string
  ksaSearchA: string

  // 编辑状态
  newRowKsaType: string | null
  newRowDescription: string
  editingKsaId: number | null
  editingDescription: string

  // 状态更新方法
  setKsaDialogOpen: (value: boolean) => void
  setSelectedKsaCell: (value: KsaCellData | null) => void
  setSelectedKsaSupport: (value: Record<string, "strong" | "weak">) => void
  setKsaSearchK: (value: string) => void
  setKsaSearchS: (value: string) => void
  setKsaSearchA: (value: string) => void
  setNewRowKsaType: (value: string | null) => void
  setNewRowDescription: (value: string) => void
  setEditingKsaId: (value: number | null) => void
  setEditingDescription: (value: string) => void

  // 业务操作方法
  openKsaDialog: (chapterId: string, coursePointId: string, taskId: string) => void
  closeKsaDialog: () => void
  setKsaSupportLevel: (ksaId: number, level: "strong" | "weak") => void
  saveKsaSelection: () => void
  startAddingKsa: (ksaType: string) => void
  cancelAddingKsa: () => void
  confirmAddKsa: (ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => void
  startEditingKsa: (ksa: KsaItem) => void
  cancelEditingKsa: () => void
  confirmEditKsa: (ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => void
  deleteKsa: (ksaId: number, ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => void
}

export function useKsaManagement(
  ksaData: Record<string, Record<string, "strong" | "weak">>,
  updateKsaSupport: (chapterId: string, coursePointId: string, taskId: string, ksaId: number, support: "strong" | "weak" | null) => void
): UseKsaManagementResult {
  const [ksaDialogOpen, setKsaDialogOpen] = useState(false)
  const [selectedKsaCell, setSelectedKsaCell] = useState<KsaCellData | null>(null)
  const [selectedKsaSupport, setSelectedKsaSupport] = useState<Record<string, "strong" | "weak">>({})

  const [ksaSearchK, setKsaSearchK] = useState("")
  const [ksaSearchS, setKsaSearchS] = useState("")
  const [ksaSearchA, setKsaSearchA] = useState("")

  const [newRowKsaType, setNewRowKsaType] = useState<string | null>(null)
  const [newRowDescription, setNewRowDescription] = useState("")
  const [editingKsaId, setEditingKsaId] = useState<number | null>(null)
  const [editingDescription, setEditingDescription] = useState("")

  // 打开KSA对话框
  const openKsaDialog = (chapterId: string, coursePointId: string, taskId: string) => {
    const cell: KsaCellData = { chapterId, coursePointId, taskId }
    setSelectedKsaCell(cell)
    setSelectedKsaSupport({})
    setKsaDialogOpen(true)
    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")
  }

  // 关闭KSA对话框
  const closeKsaDialog = () => {
    setKsaDialogOpen(false)
    setSelectedKsaCell(null)
    setSelectedKsaSupport({})
    setNewRowKsaType(null)
    setNewRowDescription("")
    setEditingKsaId(null)
    setEditingDescription("")
  }

  // 设置KSA支撑级别：点击已选中的等级则取消选中，否则设置为该等级
  const setKsaSupportLevel = (ksaId: number, level: "strong" | "weak") => {
    setSelectedKsaSupport((prev) => {
      const newSupport = { ...prev }
      const ksaIdStr = String(ksaId)

      if (prev[ksaIdStr] === level) {
        // 已选中该等级，取消选中
        delete newSupport[ksaIdStr]
      } else {
        // 选中该等级
        newSupport[ksaIdStr] = level
      }

      return newSupport
    })
  }

  // 保存KSA选择
  const saveKsaSelection = () => {
    if (!selectedKsaCell) return

    const { chapterId, coursePointId, taskId } = selectedKsaCell
    const cellKey = `${chapterId}-${coursePointId}-${taskId}`

    // 获取当前单元格的原有支撑关系
    const currentSupport = ksaData[cellKey] || {}

    // 找出需要更新的KSA
    const allKsaIds = new Set([...Object.keys(currentSupport), ...Object.keys(selectedKsaSupport)])

    allKsaIds.forEach((ksaIdStr) => {
      const ksaId = Number(ksaIdStr)
      const oldSupport = currentSupport[ksaIdStr]
      const newSupport = selectedKsaSupport[ksaIdStr]

      if (oldSupport !== newSupport) {
        updateKsaSupport(chapterId, coursePointId, taskId, ksaId, newSupport || null)
      }
    })

    closeKsaDialog()
  }

  // 开始添加新KSA
  const startAddingKsa = (ksaType: string) => {
    setNewRowKsaType(ksaType)
    setNewRowDescription("")
  }

  // 取消添加KSA
  const cancelAddingKsa = () => {
    setNewRowKsaType(null)
    setNewRowDescription("")
  }

  // 确认添加KSA
  const confirmAddKsa = (ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => {
    if (!newRowDescription.trim() || !newRowKsaType) return

    const newKsa: KsaItem = {
      id: Date.now(),
      majorId: 0,
      courseUnitId: 0,
      title: newRowKsaType as "K" | "S" | "A",
      description: newRowDescription.trim(),
      level: 1,
    }

    setKsaListData([...ksaListData, newKsa])
    cancelAddingKsa()
  }

  // 开始编辑KSA
  const startEditingKsa = (ksa: KsaItem) => {
    setEditingKsaId(ksa.id)
    setEditingDescription(ksa.description)
  }

  // 取消编辑KSA
  const cancelEditingKsa = () => {
    setEditingKsaId(null)
    setEditingDescription("")
  }

  // 确认编辑KSA
  const confirmEditKsa = (ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => {
    if (!editingDescription.trim()) return

    setKsaListData(
      ksaListData.map((ksa) =>
        ksa.id === editingKsaId ? { ...ksa, description: editingDescription.trim() } : ksa
      )
    )
    cancelEditingKsa()
  }

  // 删除KSA
  const deleteKsa = (ksaId: number, ksaListData: KsaItem[], setKsaListData: (data: KsaItem[]) => void) => {
    setKsaListData(ksaListData.filter((ksa) => ksa.id !== ksaId))
  }

  return {
    ksaDialogOpen,
    selectedKsaCell,
    selectedKsaSupport,
    ksaSearchK,
    ksaSearchS,
    ksaSearchA,
    newRowKsaType,
    newRowDescription,
    editingKsaId,
    editingDescription,
    setKsaDialogOpen,
    setSelectedKsaCell,
    setSelectedKsaSupport,
    setKsaSearchK,
    setKsaSearchS,
    setKsaSearchA,
    setNewRowKsaType,
    setNewRowDescription,
    setEditingKsaId,
    setEditingDescription,
    openKsaDialog,
    closeKsaDialog,
    setKsaSupportLevel,
    saveKsaSelection,
    startAddingKsa,
    cancelAddingKsa,
    confirmAddKsa,
    startEditingKsa,
    cancelEditingKsa,
    confirmEditKsa,
    deleteKsa,
  }
}
