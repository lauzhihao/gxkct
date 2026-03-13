/**
 * 项目矩阵容器组件
 * 负责协调各个hook和子组件
 */

"use client"

import { Grid3x3, Edit, Check, X, Settings } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { CourseProjectMatrixProps } from "@/modules/courses/types"
import { useProjectMatrix } from "@/modules/courses/hooks/use-project-matrix"
import { useTaskObjectives } from "@/modules/courses/hooks/use-task-objectives"
import { useKsaManagement } from "@/modules/courses/hooks/use-ksa-management"
import type { ProjectMatrixItemProjectMatrix } from "@/modules/courses/hooks/use-project-matrix"
import { projectMatrixApi } from "@/modules/courses/api/projectMatrixApi"
import { ProjectMatrixTable } from "./ProjectMatrixTable"
import { TaskObjectivesDialog } from "../../../dialogs/task-objectives-dialog"
import { KsaDialog } from "../../../dialogs/ksa-dialog"

export function ProjectMatrixContainer({ node, onUpdate, majorId, courseEditable = false }: CourseProjectMatrixProps) {
  const canManageProjectMatrix = courseEditable

  // 使用项目矩阵数据管理hook
  const {
    projectMatrixData,
    chapterTaskObjectives,
    ksaData,
    ksaListData,
    isLoadingProjectMatrix,
    isLoadingKsaList,
    isEditingProjectMatrix,
    isSavingProjectMatrix,
    setProjectMatrixData,
    setChapterTaskObjectives,
    setKsaListData,
    setIsEditingProjectMatrix,
    setIsSavingProjectMatrix,
    loadProjectMatrixData,
    updateKsaSupport,
  } = useProjectMatrix(node, majorId)

  // 使用任务目标管理hook
  const {
    taskObjectivesDialogOpen,
    selectedProjectForTasks,
    projectGoalsForDialog,
    newTaskObjective,
    editingTaskId,
    taskObjectiveSearch,
    focusedCell,
    setTaskObjectivesDialogOpen,
    setProjectGoalsForDialog,
    setNewTaskObjective,
    setEditingTaskId,
    setTaskObjectiveSearch,
    setFocusedCell,
    openTaskObjectivesDialog,
    closeTaskObjectivesDialog,
  } = useTaskObjectives(chapterTaskObjectives, setChapterTaskObjectives)

  // 使用KSA管理hook
  const {
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
    setKsaSearchK,
    setKsaSearchS,
    setKsaSearchA,
    setNewRowKsaType,
    setNewRowDescription,
    setEditingKsaId,
    setEditingDescription,
    openKsaDialog: openKsaDialogBase,
    closeKsaDialog,
    setKsaSupportLevel,
    setSelectedKsaSupport,
  } = useKsaManagement(ksaData, updateKsaSupport)

  // 打开 KSA 对话框时，预填充该单元格已有的 projectMatrices 选中状态
  const handleOpenKsaDialog = (chapterId: string, coursePointId: string, taskId: string) => {
    // 从 projectMatrixData 中查找该单元格已有的 KSA 关系
    const existingSupport: Record<string, "strong" | "weak"> = {}
    if (projectMatrixData?.data) {
      const matchingItem = projectMatrixData.data.find(
        (item) =>
          item.courseMatrix?.projectId === parseInt(chapterId) &&
          item.courseMatrix?.point?.id === parseInt(coursePointId)
      )
      if (matchingItem?.projectMatrices) {
        matchingItem.projectMatrices
          .filter((pm) => pm.taskGoalId === parseInt(taskId))
          .forEach((pm) => {
            if (pm.ksa?.id) {
              existingSupport[String(pm.ksa.id)] = pm.relate?.relate === 0 ? "strong" : "weak"
            }
          })
      }
    }

    openKsaDialogBase(chapterId, coursePointId, taskId)
    // 在 openKsaDialogBase 清空后重新设置已有的选中状态
    setSelectedKsaSupport(existingSupport)
  }

  // 确认 KSA 选择后，将选中的 KSA 填充到 projectMatrixData 的 projectMatrices 中
  const handleSaveKsaSelection = () => {
    if (!selectedKsaCell || !projectMatrixData) {
      closeKsaDialog()
      return
    }

    // 全局模式不更新矩阵数据
    if (selectedKsaCell.chapterId === "global") {
      closeKsaDialog()
      return
    }

    const { chapterId, coursePointId, taskId } = selectedKsaCell
    const taskGoalId = parseInt(taskId)

    // 更新 projectMatrixData.data 中对应行的 projectMatrices
    // 在 map 内部构建条目，以便获取 courseMatrix.id 作为 projectMatrixId
    const updatedData = (projectMatrixData.data || []).map((item) => {
      if (
        item.courseMatrix?.projectId === parseInt(chapterId) &&
        item.courseMatrix?.point?.id === parseInt(coursePointId)
      ) {
        const parentMatrixId = item.courseMatrix.id

        // 构建新的 projectMatrices 条目（字段与 docs/payload.json 对齐）
        const newEntries: ProjectMatrixItemProjectMatrix[] = []
        Object.entries(selectedKsaSupport).forEach(([ksaIdStr, support]) => {
          const ksaId = Number(ksaIdStr)
          const ksaItem = ksaListData.find((k) => k.id === ksaId)
          if (!ksaItem) return

          const relateValue = support === "strong" ? 0 : 1
          newEntries.push({
            id: 0,
            projectMatrixId: parentMatrixId,
            taskGoalId,
            ksa: {
              id: ksaItem.id,
              majorId: ksaItem.majorId,
              courseUnitId: ksaItem.courseUnitId,
              title: ksaItem.title,
              description: ksaItem.description,
              level: ksaItem.level,
            },
            relate: {
              name: support === "strong" ? "强支撑" : "弱支撑",
              code: support === "strong" ? "primary" : "success",
              relate: relateValue,
            },
            valid: true,
          })
        })

        // 保留其他 taskGoalId 的条目，替换当前 taskGoalId 的条目
        const otherGoalEntries = (item.projectMatrices || []).filter(
          (pm) => pm.taskGoalId !== taskGoalId
        )
        return {
          ...item,
          projectMatrices: [...otherGoalEntries, ...newEntries],
        }
      }
      return item
    })

    setProjectMatrixData({ ...projectMatrixData, data: updatedData })
    closeKsaDialog()
  }

  // 保存项目矩阵
  const handleSaveProjectMatrix = async (isAutoSave = false) => {
    if (!courseEditable) return

    try {
      if (!projectMatrixData) {
        throw new Error("项目矩阵数据不存在，无法保存")
      }
      if (!projectMatrixData.data) {
        throw new Error("项目矩阵行数据不存在，无法保存")
      }

      setIsSavingProjectMatrix(true)
      const saveResponse = await projectMatrixApi.saveProjectMatrixData(projectMatrixData.data)
      if (saveResponse.error) {
        throw new Error(saveResponse.error)
      }

      onUpdate({
        projectMatrixData,
        chapterTaskObjectives,
        ksaData,
      })

      await loadProjectMatrixData()

      if (!isAutoSave) {
        setIsEditingProjectMatrix(false)
        showSuccess("项目矩阵保存成功")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "项目矩阵保存失败"
      console.error("[ProjectMatrixContainer] 保存项目矩阵失败:", error)
      showError(message)
    } finally {
      setIsSavingProjectMatrix(false)
    }
  }

  // 取消编辑项目矩阵
  const handleCancelProjectMatrix = () => {
    if (!courseEditable) return

    // 取消编辑时重新加载数据
    loadProjectMatrixData()
    setIsEditingProjectMatrix(false)
  }

  // 打开全局KSA管理
  const handleOpenGlobalKsaDialog = () => {
    if (!courseEditable) return

    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")
    openKsaDialogBase("global", "global", "global")
  }

  const handleStartEditProjectMatrix = () => {
    if (!courseEditable) return
    setIsEditingProjectMatrix(true)
  }

  const handleUpdateCourseMatrixField = (
    courseMatrixId: number | undefined,
    field: "study" | "teach" | "product" | "week" | "theoryPeriod" | "practicePeriod",
    value: string,
  ) => {
    if (!courseEditable || !courseMatrixId || !projectMatrixData?.data) return

    setProjectMatrixData({
      ...projectMatrixData,
      data: projectMatrixData.data.map((item) => {
        if (item.courseMatrix?.id !== courseMatrixId) {
          return item
        }

        return {
          ...item,
          courseMatrix: {
            ...item.courseMatrix,
            [field]: value,
          },
        }
      }),
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Grid3x3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">项目矩阵</h3>
            <p className="text-xs text-muted-foreground mt-0.5">管理每个章节/项目的教学任务目标和实施细节</p>
          </div>
        </div>
        {isEditingProjectMatrix ? (
          canManageProjectMatrix && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelProjectMatrix}
              disabled={isSavingProjectMatrix}
              className="gap-2 bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveProjectMatrix(false)}
              disabled={isSavingProjectMatrix}
              className="gap-2"
            >
              {isSavingProjectMatrix ? (
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
          )
        ) : (
          canManageProjectMatrix && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenGlobalKsaDialog}
              disabled={isLoadingKsaList}
              className="gap-2"
            >
              {isLoadingKsaList ? (
                <>
                  <Spinner className="w-4 h-4" />
                  加载中
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  KSA
                </>
              )}
            </Button>
            <Button size="sm" onClick={handleStartEditProjectMatrix} className="gap-2">
              <Edit className="w-4 h-4" />
              编辑矩阵
            </Button>
          </div>
          )
        )}
      </div>

      {isLoadingProjectMatrix ? (
        <LoadingState title="加载中" />
      ) : (
        <ProjectMatrixTable
          courseEditable={courseEditable}
          projectMatrixData={projectMatrixData}
          isEditingProjectMatrix={isEditingProjectMatrix}
          focusedCell={focusedCell}
          onUpdateCourseMatrixField={handleUpdateCourseMatrixField}
          onOpenTaskObjectivesDialog={openTaskObjectivesDialog}
          onOpenKsaDialog={handleOpenKsaDialog}
          onFocusCell={setFocusedCell}
        />
      )}

      <TaskObjectivesDialog
        taskObjectivesDialogOpen={taskObjectivesDialogOpen}
        selectedProjectForTasks={selectedProjectForTasks}
        projectGoalsForDialog={projectGoalsForDialog}
        newTaskObjective={newTaskObjective}
        editingTaskId={editingTaskId}
        taskObjectiveSearch={taskObjectiveSearch}
        projectMatrixData={projectMatrixData}
        setTaskObjectivesDialogOpen={setTaskObjectivesDialogOpen}
        setNewTaskObjective={setNewTaskObjective}
        setEditingTaskId={setEditingTaskId}
        setTaskObjectiveSearch={setTaskObjectiveSearch}
        setProjectGoalsForDialog={setProjectGoalsForDialog}
        setProjectMatrixData={setProjectMatrixData}
        closeTaskObjectivesDialog={closeTaskObjectivesDialog}
        onUpdate={onUpdate}
      />

      <KsaDialog
        ksaDialogOpen={ksaDialogOpen}
        selectedKsaCell={selectedKsaCell}
        selectedKsaSupport={selectedKsaSupport}
        ksaListData={ksaListData}
        ksaSearchK={ksaSearchK}
        ksaSearchS={ksaSearchS}
        ksaSearchA={ksaSearchA}
        newRowKsaType={newRowKsaType}
        newRowDescription={newRowDescription}
        editingKsaId={editingKsaId}
        editingDescription={editingDescription}
        setKsaDialogOpen={setKsaDialogOpen}
        setKsaSearchK={setKsaSearchK}
        setKsaSearchS={setKsaSearchS}
        setKsaSearchA={setKsaSearchA}
        setNewRowKsaType={setNewRowKsaType}
        setNewRowDescription={setNewRowDescription}
        setEditingKsaId={setEditingKsaId}
        setEditingDescription={setEditingDescription}
        setKsaListData={setKsaListData}
        setKsaSupportLevel={setKsaSupportLevel}
        saveKsaSelection={handleSaveKsaSelection}
        closeKsaDialog={closeKsaDialog}
        courseId={node.id}
        majorId={majorId}
      />
    </>
  )
}
