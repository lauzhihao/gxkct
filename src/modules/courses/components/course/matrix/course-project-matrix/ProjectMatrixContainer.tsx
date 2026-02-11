/**
 * 项目矩阵容器组件
 * 负责协调各个hook和子组件
 */

"use client"

import { Grid3x3, Edit, Check, X, Settings } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"
import { LoadingState } from "@/shared/components/ui/loading-state"
import type { CourseProjectMatrixProps } from "@/modules/courses/types"
import { useProjectMatrix } from "@/modules/courses/hooks/use-project-matrix"
import { useTaskObjectives } from "@/modules/courses/hooks/use-task-objectives"
import { useKsaManagement } from "@/modules/courses/hooks/use-ksa-management"
import { ProjectMatrixTable } from "./ProjectMatrixTable"
import { TaskObjectivesDialog } from "../../../dialogs/task-objectives-dialog"
import { KsaDialog } from "../../../dialogs/ksa-dialog"

export function ProjectMatrixContainer({ node, onUpdate, majorId }: CourseProjectMatrixProps) {
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
    openKsaDialog,
    closeKsaDialog,
    toggleKsaSupport,
    saveKsaSelection,
  } = useKsaManagement(ksaData, updateKsaSupport)

  // 保存项目矩阵
  const handleSaveProjectMatrix = async (isAutoSave = false) => {
    setIsSavingProjectMatrix(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    onUpdate({
      projectMatrixData,
      chapterTaskObjectives,
      ksaData,
    })

    setIsSavingProjectMatrix(false)
    if (!isAutoSave) {
      setIsEditingProjectMatrix(false)
    }
  }

  // 取消编辑项目矩阵
  const handleCancelProjectMatrix = () => {
    // 取消编辑时重新加载数据
    loadProjectMatrixData()
    setIsEditingProjectMatrix(false)
  }

  // 打开全局KSA管理
  const handleOpenGlobalKsaDialog = () => {
    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")
    openKsaDialog("global", "global", "global")
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
        ) : (
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
            <Button size="sm" onClick={() => setIsEditingProjectMatrix(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              编辑矩阵
            </Button>
          </div>
        )}
      </div>

      {isLoadingProjectMatrix ? (
        <LoadingState title="加载中" />
      ) : (
        <ProjectMatrixTable
          projectMatrixData={projectMatrixData}
          isEditingProjectMatrix={isEditingProjectMatrix}
          focusedCell={focusedCell}
          onOpenTaskObjectivesDialog={openTaskObjectivesDialog}
          onOpenKsaDialog={openKsaDialog}
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
        toggleKsaSupport={toggleKsaSupport}
        saveKsaSelection={saveKsaSelection}
        closeKsaDialog={closeKsaDialog}
        courseId={node.id}
        majorId={majorId}
      />
    </>
  )
}
