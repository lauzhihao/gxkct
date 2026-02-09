/**
 * KSA对话框组件
 * 负责显示和管理KSA支撑关系
 */

import { Plus, Check, X, Edit, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/utils"
import type { KsaItem } from "@/modules/courses/hooks/use-project-matrix"
import type { KsaCellData } from "@/modules/courses/hooks/use-ksa-management"
import { projectMatrixApi } from "@/modules/courses/api/projectMatrixApi"

interface KsaDialogProps {
  ksaDialogOpen: boolean
  selectedKsaCell: KsaCellData | null
  selectedKsaSupport: Record<string, "strong" | "weak">
  ksaListData: KsaItem[]
  ksaSearchK: string
  ksaSearchS: string
  ksaSearchA: string
  newRowKsaType: string | null
  newRowDescription: string
  editingKsaId: number | null
  editingDescription: string
  setKsaDialogOpen: (value: boolean) => void
  setKsaSearchK: (value: string) => void
  setKsaSearchS: (value: string) => void
  setKsaSearchA: (value: string) => void
  setNewRowKsaType: (value: string | null) => void
  setNewRowDescription: (value: string) => void
  setEditingKsaId: (value: number | null) => void
  setEditingDescription: (value: string) => void
  setKsaListData: (data: KsaItem[]) => void
  toggleKsaSupport: (ksaId: number, currentLevel?: "strong" | "weak") => void
  saveKsaSelection: () => void
  closeKsaDialog: () => void
  courseId?: string
  majorId?: string | number
}

export function KsaDialog({
  ksaDialogOpen,
  selectedKsaCell,
  selectedKsaSupport,
  ksaListData,
  ksaSearchK,
  ksaSearchS,
  ksaSearchA,
  newRowKsaType,
  newRowDescription,
  editingKsaId,
  editingDescription,
  setKsaDialogOpen,
  setKsaSearchK,
  setKsaSearchS,
  setKsaSearchA,
  setNewRowKsaType,
  setNewRowDescription,
  setEditingKsaId,
  setEditingDescription,
  setKsaListData,
  toggleKsaSupport,
  saveKsaSelection,
  closeKsaDialog,
  courseId,
  majorId,
}: KsaDialogProps) {
  if (!selectedKsaCell) return null

  // Group KSA list data by type
  const knowledgePoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "K") || []
  const skillPoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "S") || []
  const attitudePoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "A") || []

  // Filter by search and sort by level
  const filteredKnowledgePoints = knowledgePoints
    .filter(
      (p: any) =>
        !ksaSearchK ||
        p.id?.toString().includes(ksaSearchK) ||
        p.description?.toLowerCase().includes(ksaSearchK.toLowerCase())
    )
    .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))

  const filteredSkillPoints = skillPoints
    .filter(
      (p: any) =>
        !ksaSearchS ||
        p.id?.toString().includes(ksaSearchS) ||
        p.description?.toLowerCase().includes(ksaSearchS.toLowerCase())
    )
    .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))

  const filteredAttitudePoints = attitudePoints
    .filter(
      (p: any) =>
        !ksaSearchA ||
        p.id?.toString().includes(ksaSearchA) ||
        p.description?.toLowerCase().includes(ksaSearchA.toLowerCase())
    )
    .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))

  const handleAddKsa = async (ksaType: string, filteredPoints: KsaItem[]) => {
    if (!newRowDescription) {
      alert("请填写描述")
      return
    }

    // 计算该分类的最大level
    const maxLevel = filteredPoints.reduce((max: number, point: any) => {
      return Math.max(max, point.level || 1)
    }, 0)

    // 调用API新增KSA
    const result = await projectMatrixApi.addKsa({
      majorId: parseInt(String(majorId) || "0"),
      courseUnitId: parseInt(courseId || "0"),
      title: "KSA",
      description: newRowDescription,
      level: maxLevel + 1,
    })

    if (!result.error && result.data) {
      setKsaListData([...ksaListData, result.data])
      setNewRowKsaType(null)
      setNewRowDescription("")
    } else {
      alert("新增失败: " + result.error)
    }
  }

  const handleUpdateKsa = async (ksaId: number) => {
    if (!editingDescription) {
      alert("请填写描述")
      return
    }

    const result = await projectMatrixApi.updateKsa(ksaId, {
      description: editingDescription,
    })

    if (!result.error) {
      setKsaListData(ksaListData.map((k: any) => (k.id === ksaId ? { ...k, description: editingDescription } : k)))
      setEditingKsaId(null)
      setEditingDescription("")
    } else {
      alert("更新失败: " + result.error)
    }
  }

  const handleDeleteKsa = async (ksaId: number) => {
    if (confirm("确定删除此KSA吗？")) {
      const result = await projectMatrixApi.deleteKsa(ksaId)
      if (!result.error) {
        setKsaListData(ksaListData.filter((k: any) => k.id !== ksaId))
      } else {
        alert("删除失败: " + result.error)
      }
    }
  }

  const renderInfoPointList = (
    title: string,
    points: any[],
    filteredPoints: any[],
    searchValue: string,
    onSearchChange: (value: string) => void,
    colorClass: string,
    bgClass: string,
    borderClass: string,
    ksaType: string
  ) => (
    <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className={`px-4 py-3 ${bgClass} ${borderClass}`}>
        <h4 className={`text-sm font-semibold ${colorClass}`}>
          {title} ({points.length})
        </h4>
      </div>

      {/* Search - Fixed */}
      <div className="px-3 py-2 flex-shrink-0 bg-background flex items-center gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`搜索${title.split("（")[0]}...`}
          disabled={editingKsaId !== null}
          className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => setNewRowKsaType(ksaType)}
          disabled={editingKsaId !== null}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="新增"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-background">
        <div className="p-3 space-y-2">
          {/* New Row */}
          {newRowKsaType === ksaType && (
            <div className="p-2 rounded-lg border border-blue-300 bg-blue-50">
              <div className="flex items-start gap-2">
                <textarea
                  value={newRowDescription}
                  onChange={(e) => setNewRowDescription(e.target.value)}
                  placeholder="输入描述"
                  className="flex-1 px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={2}
                  disabled={editingKsaId !== null}
                />
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleAddKsa(ksaType, filteredPoints)}
                    disabled={editingKsaId !== null}
                    className="p-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="保存"
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => {
                      setNewRowKsaType(null)
                      setNewRowDescription("")
                    }}
                    disabled={editingKsaId !== null}
                    className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="取消"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KSA points */}
          {filteredPoints.length > 0 ? (
            filteredPoints.map((point: any) => {
              const support = selectedKsaSupport[point.id]
              const isEditing = editingKsaId === point.id

              return (
                <div
                  key={point.id}
                  className={cn(
                    "p-2 rounded-lg border transition-all",
                    isEditing && "border-blue-300 bg-blue-50",
                    !isEditing && support ? `${borderClass} ${bgClass}` : !isEditing && "border-border bg-background"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          rows={2}
                        />
                      ) : (
                        <>
                          <div className={`text-xs font-medium mb-1 ${colorClass}`}>
                            {point.title}
                            {point.level}
                          </div>
                          <div className="text-sm text-foreground leading-relaxed break-words">{point.description}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {selectedKsaCell?.chapterId === "global" ? (
                        isEditing ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleUpdateKsa(point.id)}
                              className="p-1 rounded hover:bg-green-200 transition-colors"
                              title="保存"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingKsaId(null)
                                setEditingDescription("")
                              }}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="取消"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingKsaId(point.id)
                                setEditingDescription(point.description)
                              }}
                              disabled={editingKsaId !== null || newRowKsaType !== null}
                              className="p-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteKsa(point.id)}
                              disabled={editingKsaId !== null || newRowKsaType !== null}
                              className="p-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )
                      ) : (
                        <button
                          onClick={() => toggleKsaSupport(point.id, support)}
                          disabled={editingKsaId !== null || newRowKsaType !== null}
                          className={cn(
                            "px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
                            !support && "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                            support === "strong" && `${borderClass} ${bgClass} ${colorClass} font-medium`,
                            support === "weak" && `border-dashed ${borderClass} bg-white ${colorClass}`
                          )}
                          title="切换支撑强度"
                        >
                          {!support ? "未选" : support === "strong" ? "强支撑" : "弱支撑"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchValue ? "无匹配结果" : "暂无KSA数据"}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={ksaDialogOpen} onOpenChange={setKsaDialogOpen}>
      <DialogContent className="h-[85vh] flex flex-col" style={{ width: "75vw", maxWidth: "75vw" }}>
        <DialogHeader>
          <DialogTitle>{selectedKsaCell?.chapterId === "global" ? "KSA库管理" : "设置KSA支撑关系"}</DialogTitle>
          <DialogDescription>
            {selectedKsaCell?.chapterId === "global" ? "查看和管理课程的KSA数据" : "选择KSA项目并设置支撑强度"}
          </DialogDescription>
        </DialogHeader>

        {!ksaListData || ksaListData.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">暂无KSA数据</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4 px-4">
            {/* KSA Lists */}
            <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
              {renderInfoPointList(
                "知识（Knowledge）",
                knowledgePoints,
                filteredKnowledgePoints,
                ksaSearchK,
                setKsaSearchK,
                "text-blue-700",
                "bg-blue-50",
                "border-blue-300",
                "K"
              )}
              {renderInfoPointList(
                "技能（Skills）",
                skillPoints,
                filteredSkillPoints,
                ksaSearchS,
                setKsaSearchS,
                "text-green-700",
                "bg-green-50",
                "border-green-300",
                "S"
              )}
              {renderInfoPointList(
                "态度（Attitude）",
                attitudePoints,
                filteredAttitudePoints,
                ksaSearchA,
                setKsaSearchA,
                "text-purple-700",
                "bg-purple-50",
                "border-purple-300",
                "A"
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={closeKsaDialog}>
            {selectedKsaCell?.chapterId === "global" ? "关闭" : "取消"}
          </Button>
          {selectedKsaCell?.chapterId !== "global" && <Button onClick={saveKsaSelection}>确认</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
