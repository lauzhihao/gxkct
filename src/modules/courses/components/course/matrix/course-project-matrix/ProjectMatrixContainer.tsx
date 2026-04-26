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
    setKsaDialogOpen,
    setKsaSearchK,
    setKsaSearchS,
    setKsaSearchA,
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
          .filter((pm) => pm.taskGoalId === parseInt(taskId) && pm.id >= 0)
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

    try {
      const { chapterId, coursePointId, taskId } = selectedKsaCell
      const taskGoalId = Number(taskId)
      const selectedChapterId = Number(chapterId)
      const selectedCoursePointId = Number(coursePointId)

      if (!Number.isInteger(taskGoalId) || taskGoalId <= 0) {
        throw new Error("任务目标ID缺失或非法，无法保存KSA支撑关系")
      }
      if (!Number.isInteger(selectedChapterId) || selectedChapterId <= 0) {
        throw new Error("项目章节ID缺失或非法，无法保存KSA支撑关系")
      }
      if (!Number.isInteger(selectedCoursePointId) || selectedCoursePointId <= 0) {
        throw new Error("课程点ID缺失或非法，无法保存KSA支撑关系")
      }
      if (!projectMatrixData.data) {
        throw new Error("项目矩阵行数据不存在，无法保存KSA支撑关系")
      }

      const selectedEntries = Object.entries(selectedKsaSupport).map(([ksaIdStr, support]) => {
        const ksaId = Number(ksaIdStr)
        if (!Number.isInteger(ksaId) || ksaId <= 0) {
          throw new Error("KSA ID缺失或非法，无法保存KSA支撑关系")
        }

        return { ksaId, support }
      })

      let matchedCell = false

      // 后端按增量协议处理：id=0 新增，id<0 删除，因此这里必须保留旧 id 并显式发送删除项。
      const updatedData = projectMatrixData.data.map((item) => {
        if (
          item.courseMatrix?.projectId === selectedChapterId &&
          item.courseMatrix?.point?.id === selectedCoursePointId
        ) {
          matchedCell = true
          const parentMatrixId = item.courseMatrix.id

          if (!Number.isInteger(parentMatrixId) || parentMatrixId <= 0) {
            throw new Error("父级项目矩阵ID缺失或非法，无法保存KSA支撑关系")
          }

          let existingProjectMatrices: ProjectMatrixItemProjectMatrix[] = []
          if (item.projectMatrices !== undefined) {
            if (!Array.isArray(item.projectMatrices)) {
              throw new Error("已有项目矩阵KSA关系格式非法，无法保存KSA支撑关系")
            }
            existingProjectMatrices = item.projectMatrices
          }
          const currentGoalEntries = existingProjectMatrices.filter(
            (pm) => pm.taskGoalId === taskGoalId && pm.id >= 0
          )
          const currentGoalDeleteEntries = existingProjectMatrices.filter(
            (pm) => pm.taskGoalId === taskGoalId && pm.id < 0
          )
          const existingEntriesByKsaId = new Map<number, ProjectMatrixItemProjectMatrix>()
          currentGoalEntries.forEach((pm) => {
            const existingKsaId = pm.ksa?.id
            if (typeof existingKsaId !== "number" || !Number.isInteger(existingKsaId) || existingKsaId <= 0) {
              throw new Error("已有KSA关系缺少合法KSA ID，无法保存KSA支撑关系")
            }
            existingEntriesByKsaId.set(existingKsaId, pm)
          })

          const newEntries: ProjectMatrixItemProjectMatrix[] = []
          selectedEntries.forEach(({ ksaId, support }) => {
            const existingEntry = existingEntriesByKsaId.get(ksaId)
            const relateValue = support === "strong" ? 0 : 1
            const relate = {
              name: support === "strong" ? "强支撑" : "弱支撑",
              code: support === "strong" ? "primary" : "success",
              relate: relateValue,
            }

            if (existingEntry) {
              newEntries.push({
                ...existingEntry,
                relate,
              })
              return
            }

            const ksaItem = ksaListData.find((k) => k.id === ksaId)
            if (!ksaItem) {
              throw new Error("选中的KSA不存在，无法保存KSA支撑关系")
            }

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
              relate,
              valid: true,
            })
          })

          const selectedKsaIds = new Set(selectedEntries.map(({ ksaId }) => ksaId))
          currentGoalEntries.forEach((pm) => {
            const existingKsaId = pm.ksa?.id
            if (typeof existingKsaId !== "number" || !Number.isInteger(existingKsaId) || existingKsaId <= 0) {
              throw new Error("已有KSA关系缺少合法KSA ID，无法保存KSA支撑关系")
            }
            if (!selectedKsaIds.has(existingKsaId) && pm.id > 0) {
              newEntries.push({
                ...pm,
                id: -pm.id,
              })
            }
          })

          const otherGoalEntries = existingProjectMatrices.filter((pm) => pm.taskGoalId !== taskGoalId)
          return {
            ...item,
            projectMatrices: [...otherGoalEntries, ...currentGoalDeleteEntries, ...newEntries],
          }
        }
        return item
      })

      if (!matchedCell) {
        throw new Error("未找到对应的项目矩阵单元格，无法保存KSA支撑关系")
      }

      setProjectMatrixData({ ...projectMatrixData, data: updatedData })
      closeKsaDialog()
    } catch (error) {
      const message = error instanceof Error ? error.message : "KSA支撑关系保存失败"
      showError(message)
    }
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

  const handleRemoveKsaSupport = (courseMatrixId: number | undefined, taskGoalId: number, ksaId: number) => {
    if (!courseEditable) return

    try {
      if (!Number.isInteger(courseMatrixId) || Number(courseMatrixId) <= 0) {
        throw new Error("项目矩阵ID缺失或非法，无法删除KSA支撑关系")
      }
      if (!Number.isInteger(taskGoalId) || taskGoalId <= 0) {
        throw new Error("任务目标ID缺失或非法，无法删除KSA支撑关系")
      }
      if (!Number.isInteger(ksaId) || ksaId <= 0) {
        throw new Error("KSA ID缺失或非法，无法删除KSA支撑关系")
      }
      if (!projectMatrixData?.data) {
        throw new Error("项目矩阵行数据不存在，无法删除KSA支撑关系")
      }

      let matchedSupport = false
      const nextData = projectMatrixData.data.map((item) => {
        if (item.courseMatrix?.id !== courseMatrixId) {
          return item
        }
        if (item.projectMatrices === undefined) {
          throw new Error("当前项目矩阵没有KSA支撑关系，无法删除")
        }
        if (!Array.isArray(item.projectMatrices)) {
          throw new Error("已有项目矩阵KSA关系格式非法，无法删除KSA支撑关系")
        }

        const nextProjectMatrices: ProjectMatrixItemProjectMatrix[] = []
        item.projectMatrices.forEach((pm) => {
          if (pm.taskGoalId !== taskGoalId) {
            nextProjectMatrices.push(pm)
            return
          }

          const currentKsaId = pm.ksa?.id
          if (typeof currentKsaId !== "number" || !Number.isInteger(currentKsaId) || currentKsaId <= 0) {
            throw new Error("已有KSA关系缺少合法KSA ID，无法删除KSA支撑关系")
          }
          if (currentKsaId !== ksaId) {
            nextProjectMatrices.push(pm)
            return
          }

          matchedSupport = true
          if (pm.id > 0) {
            nextProjectMatrices.push({ ...pm, id: -pm.id })
          }
        })

        return {
          ...item,
          projectMatrices: nextProjectMatrices,
        }
      })

      if (!matchedSupport) {
        throw new Error("未找到要删除的KSA支撑关系")
      }

      setProjectMatrixData({ ...projectMatrixData, data: nextData })
    } catch (error) {
      const message = error instanceof Error ? error.message : "KSA支撑关系删除失败"
      showError(message)
    }
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
          onRemoveKsaSupport={handleRemoveKsaSupport}
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
        setKsaDialogOpen={setKsaDialogOpen}
        setKsaSearchK={setKsaSearchK}
        setKsaSearchS={setKsaSearchS}
        setKsaSearchA={setKsaSearchA}
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
