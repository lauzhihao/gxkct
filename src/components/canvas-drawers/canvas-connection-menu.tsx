"use client"

import { memo } from "react"
import type { Node } from "@xyflow/react"
import { Plus, Grid3X3, Table, FileText, BookOpen, X } from "lucide-react"
import { FlowNodeType } from "../flow/utils/types"
import type {
  GraduationSupportData,
  KsaItemData,
  ProjectMatrixData,
  ProjectMatrixKsaItem,
} from "@/components/canvas-elements/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { getKsaMatchIds } from "@/shared/utils/ksa"

/**
 * 连接菜单选项类型
 */
export type ConnectionMenuOption = "objective" | "coursePoint" | "chapter" | "ksa" | "courseMatrix" | "projectMatrix" | "courseReport" | "courseInfo" | "graduationSupport"

/**
 * 连接菜单状态
 */
export interface ConnectionMenuState {
  visible: boolean
  x: number
  y: number
  sourceNodeId: string | null
  sourceHandle: string | null
}

/**
 * CanvasConnectionMenu 组件属性
 */
export interface CanvasConnectionMenuProps {
  /** 连接菜单状态 */
  connectionMenu: ConnectionMenuState
  /** 画布节点列表 */
  flowNodes: Node[]
  /** 菜单选择回调 */
  onMenuSelect: (option: ConnectionMenuOption) => void
  /** 菜单关闭回调 */
  onClose: () => void
}

interface ProjectMatrixValidationIssue {
  matrixLabel: string
  rowLabel?: string
  reason: string
}

type KsaCategory = "K" | "S" | "A"
type KsaLookupMap = Record<string, KsaItemData>

function addKsaLookupItem(
  map: KsaLookupMap,
  key: string,
  item: KsaItemData
): void {
  const normalizedKey = key.trim()
  if (normalizedKey.length === 0) {
    return
  }

  map[normalizedKey] = item
}

function getProjectMatrixLabel(matrixData: ProjectMatrixData): string {
  const chapterName = typeof matrixData.chapter_name === "string"
    ? matrixData.chapter_name.trim()
    : ""

  if (typeof matrixData.chapter_index === "number" && chapterName.length > 0) {
    return `第${matrixData.chapter_index}章 项目矩阵 - ${chapterName}`
  }

  if (typeof matrixData.chapter_index === "number") {
    return `第${matrixData.chapter_index}章 项目矩阵`
  }

  if (chapterName.length > 0) {
    return `项目矩阵 - ${chapterName}`
  }

  return "项目矩阵"
}

function getProjectMatrixRowLabel(
  row: ProjectMatrixData["rows"][number],
  rowIndex: number
): string {
  const coursePointName = typeof row.course_point_name === "string"
    ? row.course_point_name.trim()
    : ""

  if (coursePointName.length > 0) {
    return coursePointName
  }

  const coursePointId = typeof row.course_point_id === "string"
    ? row.course_point_id.trim()
    : ""

  if (coursePointId.length > 0) {
    return coursePointId
  }

  return `第${rowIndex + 1}行`
}

function resolveProjectMatrixKsaCategory(
  item: ProjectMatrixKsaItem,
  ksaItemsMap: KsaLookupMap
): KsaCategory | null {
  if (item.category === "K" || item.category === "S" || item.category === "A") {
    return item.category
  }

  const matchedById = ksaItemsMap[item.id]
  if (matchedById) {
    return matchedById.category
  }

  const matchedByName = ksaItemsMap[item.name]
  if (matchedByName) {
    return matchedByName.category
  }

  const nameText = typeof item.name === "string" ? item.name.trim().toUpperCase() : ""
  if (nameText.startsWith("K")) {
    return "K"
  }
  if (nameText.startsWith("S")) {
    return "S"
  }
  if (nameText.startsWith("A")) {
    return "A"
  }

  const idText = typeof item.id === "string" ? item.id.trim().toUpperCase() : ""
  if (idText.startsWith("K")) {
    return "K"
  }
  if (idText.startsWith("S")) {
    return "S"
  }
  if (idText.startsWith("A")) {
    return "A"
  }

  return null
}

function getProjectMatrixValidationIssues(
  matrixData: ProjectMatrixData,
  ksaItemsMap: KsaLookupMap
): ProjectMatrixValidationIssue[] {
  const matrixLabel = getProjectMatrixLabel(matrixData)
  const issues: ProjectMatrixValidationIssue[] = []

  if (!Array.isArray(matrixData.rows)) {
    issues.push({
      matrixLabel,
      reason: "缺少课点行",
    })
    return issues
  }

  if (matrixData.rows.length === 0) {
    issues.push({
      matrixLabel,
      reason: "缺少课点行",
    })
  }

  if (!Array.isArray(matrixData.task_objectives)) {
    issues.push({
      matrixLabel,
      reason: "缺少任务目标",
    })
  } else if (matrixData.task_objectives.length === 0) {
    issues.push({
      matrixLabel,
      reason: "缺少任务目标",
    })
  }

  matrixData.rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row.objective_supports)) {
      issues.push({
        matrixLabel,
        rowLabel: getProjectMatrixRowLabel(row, rowIndex),
        reason: "缺少K或S支撑和A支撑",
      })
      return
    }

    // 按课点行汇总所有任务目标单元格的 KSA，只要求整行满足 K/S + A。
    const ksaItems = row.objective_supports.flatMap((support) => {
      if (!Array.isArray(support.ksa_items)) {
        return []
      }

      return support.ksa_items
    })
    const ksaCategories = ksaItems.map((item) =>
      resolveProjectMatrixKsaCategory(item, ksaItemsMap)
    )
    const hasKnowledgeOrSkill = ksaCategories.some((category) =>
      category === "K" ? true : category === "S"
    )
    const hasAttitude = ksaCategories.some((category) => category === "A")

    if (hasKnowledgeOrSkill && hasAttitude) {
      return
    }

    const reasonParts: string[] = []
    if (!hasKnowledgeOrSkill) {
      reasonParts.push("缺少K或S支撑")
    }
    if (!hasAttitude) {
      reasonParts.push("缺少A支撑")
    }

    issues.push({
      matrixLabel,
      rowLabel: getProjectMatrixRowLabel(row, rowIndex),
      reason: reasonParts.join("，"),
    })
  })

  return issues
}

function formatProjectMatrixValidationTitle(
  issues: ProjectMatrixValidationIssue[]
): string {
  if (issues.length === 0) {
    return ""
  }

  const visibleIssues = issues.slice(0, 5)
  const issueLines = visibleIssues.map((issue) => {
    if (typeof issue.rowLabel === "string" && issue.rowLabel.length > 0) {
      return `${issue.matrixLabel} / ${issue.rowLabel}：${issue.reason}`
    }

    return `${issue.matrixLabel}：${issue.reason}`
  })
  const hiddenCount = issues.length - visibleIssues.length

  if (hiddenCount > 0) {
    issueLines.push(`还有${hiddenCount}项问题`)
  }

  return issueLines.join("\n")
}

/**
 * 画布连接菜单组件
 * 在连线松开时显示上下文菜单，根据源节点类型显示不同选项
 */
export const CanvasConnectionMenu = memo(function CanvasConnectionMenu({
  connectionMenu,
  flowNodes,
  onMenuSelect,
  onClose,
}: CanvasConnectionMenuProps) {
  if (!connectionMenu.visible) {
    return null
  }

  // 检查各面板是否已存在
  const hasCourseInfo = flowNodes.some(n => n.type === FlowNodeType.COURSE_INFO)
  const hasObjectivePanel = flowNodes.some(n => n.type === FlowNodeType.OBJECTIVE_PANEL)
  const hasCoursePointPanel = flowNodes.some(n => n.type === FlowNodeType.COURSE_POINT_PANEL)
  const hasChapterPanel = flowNodes.some(n => n.type === FlowNodeType.CHAPTER_PANEL)
  const hasGraduationSupportPanel = flowNodes.some(n => n.type === FlowNodeType.GRADUATION_SUPPORT_PANEL)
  const hasKsaPanel = flowNodes.some(n => n.type === FlowNodeType.KSA_PANEL)
  const hasCourseMatrix = flowNodes.some(n => n.type === FlowNodeType.COURSE_MATRIX)
  const hasCourseReport = flowNodes.some(n => n.type === FlowNodeType.COURSE_REPORT)
  const ksaItemsMap: KsaLookupMap = {}
  flowNodes.forEach((node) => {
    if (node.type !== FlowNodeType.KSA || !node.data) {
      return
    }

    const ksaData = node.data as unknown as KsaItemData
    addKsaLookupItem(ksaItemsMap, node.id, ksaData)
    getKsaMatchIds(ksaData).forEach((matchId) => {
      addKsaLookupItem(ksaItemsMap, matchId, ksaData)
    })
    addKsaLookupItem(ksaItemsMap, ksaData.content, ksaData)
  })
  const projectMatrixNodes = flowNodes.filter(
    n => n.type === FlowNodeType.PROJECT_MATRIX
  )
  const hasProjectMatrix = projectMatrixNodes.length > 0
  const projectMatrixValidationIssues = projectMatrixNodes.flatMap((node) =>
    getProjectMatrixValidationIssues(node.data as ProjectMatrixData, ksaItemsMap)
  )
  const areAllProjectMatricesComplete =
    hasProjectMatrix &&
    projectMatrixValidationIssues.length === 0
  const isCourseReportDisabled = hasCourseReport
    ? true
    : !areAllProjectMatricesComplete
  const projectMatrixValidationTitle = formatProjectMatrixValidationTitle(
    projectMatrixValidationIssues
  )
  const courseReportTitle = hasCourseReport
    ? "画布中已存在开课说明"
    : areAllProjectMatricesComplete
      ? ""
      : projectMatrixValidationTitle

  // 获取源节点类型
  const sourceNode = flowNodes.find(n => n.id === connectionMenu.sourceNodeId)
  const sourceNodeType = sourceNode?.type as FlowNodeType | undefined
  const sourceGraduationSupportData = sourceNodeType === FlowNodeType.GRADUATION_SUPPORT_PANEL
    ? (sourceNode?.data as GraduationSupportData | undefined)
    : undefined

  // 判断是否从三个基础面板（教学目标/章节/课点）的右侧连接点拖出
  const isFromBasicPanel = [
    FlowNodeType.OBJECTIVE_PANEL,
    FlowNodeType.CHAPTER_PANEL,
    FlowNodeType.COURSE_POINT_PANEL,
  ].includes(sourceNodeType as FlowNodeType)

  // 计算三个基础面板的子节点数量
  const objectivePanelNode = flowNodes.find(n => n.type === FlowNodeType.OBJECTIVE_PANEL)
  const chapterPanelNode = flowNodes.find(n => n.type === FlowNodeType.CHAPTER_PANEL)
  const coursePointPanelNode = flowNodes.find(n => n.type === FlowNodeType.COURSE_POINT_PANEL)

  const objectiveChildCount = objectivePanelNode
    ? flowNodes.filter(n => n.parentId === objectivePanelNode.id).length
    : 0
  const chapterChildCount = chapterPanelNode
    ? flowNodes.filter(n => n.parentId === chapterPanelNode.id).length
    : 0
  const coursePointChildCount = coursePointPanelNode
    ? flowNodes.filter(n => n.parentId === coursePointPanelNode.id).length
    : 0

  // 课程矩阵可用条件：三个面板都存在且内部都有子节点，且课程矩阵不存在
  const canCreateCourseMatrix =
    !hasCourseMatrix &&
    hasObjectivePanel &&
    hasChapterPanel &&
    hasCoursePointPanel &&
    objectiveChildCount > 0 &&
    chapterChildCount > 0 &&
    coursePointChildCount > 0

  // 仅当毕业要求指标点组件内存在有效数据时，才允许创建教学目标
  const hasGraduationSupportData = Boolean(
    sourceGraduationSupportData?.requirements?.some(req =>
      req.indicators?.length
    )
  )
  const canCreateObjectiveFromGraduationSupport = !hasObjectivePanel && hasGraduationSupportData

  return (
    <div
      className="absolute z-50 min-w-[160px] bg-popover text-popover-foreground rounded-lg border shadow-lg p-1 canvas-connection-menu"
      style={{
        left: connectionMenu.x,
        top: connectionMenu.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 从源文档卡片拖出时显示课程设计选项 */}
      {sourceNodeType === FlowNodeType.SOURCE_DOCUMENT ? (
        <>
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasCourseInfo
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasCourseInfo && onMenuSelect("courseInfo")}
            disabled={hasCourseInfo}
            title={hasCourseInfo ? "画布中已存在课程信息卡片" : ""}
          >
            <BookOpen className={`h-4 w-4 transition-colors ${hasCourseInfo ? "text-sky-300" : "text-sky-500 group-hover:text-accent-foreground"}`} />
            <span>+ 课程设计</span>
          </button>
        </>
      ) : /* 从项目矩阵拖出时只显示开课说明选项 */
      sourceNodeType === FlowNodeType.PROJECT_MATRIX ? (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <button
                  className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
                    isCourseReportDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => !isCourseReportDisabled && onMenuSelect("courseReport")}
                  disabled={isCourseReportDisabled}
                  title={isCourseReportDisabled ? "" : courseReportTitle}
                >
                  <FileText className={`h-4 w-4 transition-colors ${isCourseReportDisabled ? "text-rose-300" : "text-rose-500 group-hover:text-accent-foreground"}`} />
                  <span>+ 开课说明</span>
                </button>
              </span>
            </TooltipTrigger>
            {isCourseReportDisabled && courseReportTitle.length > 0 ? (
              <TooltipContent side="right" align="start" className="max-w-[420px] whitespace-pre-line">
                {courseReportTitle}
              </TooltipContent>
            ) : null}
          </Tooltip>
          {isCourseReportDisabled ? (
            <button
              type="button"
              aria-label="关闭菜单"
              title="关闭"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : sourceNodeType === FlowNodeType.COURSE_MATRIX ? (
        /* 从课程矩阵拖出时只显示 KSA 选项 */
        <>
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasKsaPanel
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasKsaPanel && onMenuSelect("ksa")}
            disabled={hasKsaPanel}
            title={hasKsaPanel ? "画布中已存在KSA面板" : ""}
          >
            <Plus className={`h-4 w-4 transition-opacity ${
              hasKsaPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
            }`} />
            <span>KSA</span>
          </button>
        </>
      ) : sourceNodeType === FlowNodeType.KSA_PANEL ? (
        /* 从 KSA 面板拖出时只显示项目矩阵选项 */
        <>
          <button
            className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground canvas-menu-item"
            onClick={() => onMenuSelect("projectMatrix")}
          >
            <Table className="h-4 w-4 text-slate-500 group-hover:text-accent-foreground transition-colors" />
            <span>+ 项目矩阵</span>
          </button>
        </>
      ) : sourceNodeType === FlowNodeType.GRADUATION_SUPPORT_PANEL ? (
        <>
          {/* 从专业矩阵拖出时只显示教学目标选项 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              canCreateObjectiveFromGraduationSupport
                ? "hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground/50 cursor-not-allowed"
            }`}
            onClick={() => canCreateObjectiveFromGraduationSupport && onMenuSelect("objective")}
            disabled={!canCreateObjectiveFromGraduationSupport}
            title={hasObjectivePanel ? "画布中已存在教学目标面板" : !hasGraduationSupportData ? "毕业要求指标点组件内部数据不能为空" : ""}
          >
            <Plus className={`h-4 w-4 transition-opacity ${
              canCreateObjectiveFromGraduationSupport ? "opacity-0 group-hover:opacity-100" : "opacity-30"
            }`} />
            <span>教学目标</span>
          </button>
        </>
      ) : sourceNodeType === FlowNodeType.OBJECTIVE_PANEL ? (
        <>
          {/* 从教学目标面板拖出时只显示章节项目选项 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasChapterPanel
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasChapterPanel && onMenuSelect("chapter")}
            disabled={hasChapterPanel}
            title={hasChapterPanel ? "画布中已存在章节项目面板" : ""}
          >
            <Plus className={`h-4 w-4 transition-opacity ${
              hasChapterPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
            }`} />
            <span>章节项目</span>
          </button>
        </>
      ) : sourceNodeType === FlowNodeType.CHAPTER_PANEL ? (
        <>
          {/* 从章节项目面板拖出时只显示课点信息选项 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasCoursePointPanel
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasCoursePointPanel && onMenuSelect("coursePoint")}
            disabled={hasCoursePointPanel}
            title={hasCoursePointPanel ? "画布中已存在课点信息面板" : ""}
          >
            <Plus className={`h-4 w-4 transition-opacity ${
              hasCoursePointPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
            }`} />
            <span>课点信息</span>
          </button>
        </>
      ) : connectionMenu.sourceHandle === "matrix" ? (
        <>
          {/* 矩阵扩展菜单 - 从章节卡片的 matrix handle 拖出时显示 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasCourseMatrix
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasCourseMatrix && onMenuSelect("courseMatrix")}
            disabled={hasCourseMatrix}
            title={hasCourseMatrix ? "画布中已存在课程矩阵" : ""}
          >
            <Grid3X3 className={`h-4 w-4 transition-colors ${hasCourseMatrix ? "text-indigo-300" : "text-indigo-500 group-hover:text-accent-foreground"}`} />
            <span>+ 课程矩阵</span>
          </button>
          <button
            className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground canvas-menu-item"
            onClick={() => onMenuSelect("projectMatrix")}
          >
            <Table className="h-4 w-4 text-slate-500 group-hover:text-accent-foreground transition-colors" />
            <span>+ 项目矩阵</span>
          </button>
        </>
      ) : isFromBasicPanel ? (
        <>
          {/* 从三个基础面板拖出时只显示课程矩阵选项 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              canCreateCourseMatrix
                ? "hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground/50 cursor-not-allowed"
            }`}
            onClick={() => canCreateCourseMatrix && onMenuSelect("courseMatrix")}
            disabled={!canCreateCourseMatrix}
            title={!canCreateCourseMatrix ? (hasCourseMatrix ? "画布中已存在课程矩阵" : "需要教学目标、章节列表、课点列表三个面板都存在且不为空") : ""}
          >
            <Grid3X3 className={`h-4 w-4 transition-colors ${canCreateCourseMatrix ? "text-indigo-500 group-hover:text-accent-foreground" : "text-indigo-300"}`} />
            <span>+ 课程矩阵</span>
          </button>
        </>
      ) : (
        <>
          {/* 默认菜单 - 从课程信息卡片拖出时仅显示专业矩阵 */}
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              !hasGraduationSupportPanel
                ? "hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground/50 cursor-not-allowed"
            }`}
            onClick={() => !hasGraduationSupportPanel && onMenuSelect("graduationSupport")}
            disabled={hasGraduationSupportPanel}
            title={hasGraduationSupportPanel ? "画布中已存在专业矩阵" : ""}
          >
            <Plus className={`h-4 w-4 transition-opacity ${
              !hasGraduationSupportPanel ? "opacity-0 group-hover:opacity-100" : "opacity-30"
            }`} />
            <span>专业矩阵</span>
          </button>
        </>
      )}
    </div>
  )
})

export default CanvasConnectionMenu
