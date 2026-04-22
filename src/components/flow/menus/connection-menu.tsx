"use client"

import { memo } from "react"
import { Plus, Grid3X3, Table, FileText } from "lucide-react"
import type { Node } from "@xyflow/react"
import { FlowNodeType } from "../utils/types"

/**
 * 连接菜单选项类型
 */
export type ConnectionMenuOption = "objective" | "coursePoint" | "chapter" | "ksa" | "courseMatrix" | "projectMatrix" | "courseReport"

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
 * 连接菜单组件属性
 */
export interface CanvasConnectionMenuProps {
  // 菜单状态
  menuState: ConnectionMenuState
  // 画布节点列表（用于判断面板是否存在）
  flowNodes: Node[]
  // 菜单选择回调
  onSelect: (option: ConnectionMenuOption) => void
}

/**
 * 画布连接菜单组件
 * 从连接点拖拽松开后显示的上下文菜单，根据源节点类型显示不同选项
 */
export const CanvasConnectionMenu = memo(function CanvasConnectionMenu({
  menuState,
  flowNodes,
  onSelect,
}: CanvasConnectionMenuProps) {
  if (!menuState.visible) return null

  // 检查各面板是否已存在
  const hasObjectivePanel = flowNodes.some(n => n.type === FlowNodeType.OBJECTIVE_PANEL)
  const hasCoursePointPanel = flowNodes.some(n => n.type === FlowNodeType.COURSE_POINT_PANEL)
  const hasChapterPanel = flowNodes.some(n => n.type === FlowNodeType.CHAPTER_PANEL)
  const hasKsaPanel = flowNodes.some(n => n.type === FlowNodeType.KSA_PANEL)
  const hasCourseMatrix = flowNodes.some(n => n.type === FlowNodeType.COURSE_MATRIX)
  const hasCourseReport = flowNodes.some(n => n.type === FlowNodeType.COURSE_REPORT)

  // 获取源节点类型
  const sourceNode = flowNodes.find(n => n.id === menuState.sourceNodeId)
  const sourceNodeType = sourceNode?.type as FlowNodeType | undefined

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

  // 渲染从项目矩阵拖出的菜单（只显示开课说明）
  const renderProjectMatrixMenu = () => (
    <button
      className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
        hasCourseReport
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={() => !hasCourseReport && onSelect("courseReport")}
      disabled={hasCourseReport}
      title={hasCourseReport ? "画布中已存在开课说明" : ""}
    >
      <FileText className={`h-4 w-4 transition-colors ${hasCourseReport ? "text-rose-300" : "text-rose-500 group-hover:text-accent-foreground"}`} />
      <span>开课说明</span>
    </button>
  )

  // 渲染从课程矩阵拖出的菜单（只显示 KSA）
  const renderCourseMatrixMenu = () => (
    <button
      className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
        hasKsaPanel
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
      onClick={() => !hasKsaPanel && onSelect("ksa")}
      disabled={hasKsaPanel}
      title={hasKsaPanel ? "画布中已存在KSA面板" : ""}
    >
      <Plus className={`h-4 w-4 transition-opacity ${
        hasKsaPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
      }`} />
      <span>KSA</span>
    </button>
  )

  // 渲染从 KSA 面板拖出的菜单（只显示项目矩阵）
  const renderKsaPanelMenu = () => (
    <button
      className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground canvas-menu-item"
      onClick={() => onSelect("projectMatrix")}
    >
      <Table className="h-4 w-4 text-slate-500 group-hover:text-accent-foreground transition-colors" />
      <span>项目矩阵</span>
    </button>
  )

  // 渲染矩阵扩展菜单（从章节卡片的 matrix handle 拖出）
  const renderMatrixExtendMenu = () => (
    <>
      <button
        className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
          hasCourseMatrix
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => !hasCourseMatrix && onSelect("courseMatrix")}
        disabled={hasCourseMatrix}
        title={hasCourseMatrix ? "画布中已存在课程矩阵" : ""}
      >
        <Grid3X3 className={`h-4 w-4 transition-colors ${hasCourseMatrix ? "text-indigo-300" : "text-indigo-500 group-hover:text-accent-foreground"}`} />
        <span>课程矩阵</span>
      </button>
      <button
        className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground canvas-menu-item"
        onClick={() => onSelect("projectMatrix")}
      >
        <Table className="h-4 w-4 text-slate-500 group-hover:text-accent-foreground transition-colors" />
        <span>项目矩阵</span>
      </button>
    </>
  )

  // 渲染从基础面板拖出的菜单（只显示课程矩阵）
  const renderBasicPanelMenu = () => (
    <button
      className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
        canCreateCourseMatrix
          ? "hover:bg-accent hover:text-accent-foreground"
          : "text-muted-foreground/50 cursor-not-allowed"
      }`}
      onClick={() => canCreateCourseMatrix && onSelect("courseMatrix")}
      disabled={!canCreateCourseMatrix}
      title={!canCreateCourseMatrix ? (hasCourseMatrix ? "画布中已存在课程矩阵" : "需要教学目标、章节列表、课点列表三个面板都存在且不为空") : ""}
    >
      <Grid3X3 className={`h-4 w-4 transition-colors ${canCreateCourseMatrix ? "text-indigo-500 group-hover:text-accent-foreground" : "text-indigo-300"}`} />
      <span>课程矩阵</span>
    </button>
  )

  // 渲染默认菜单（从课程信息卡片拖出，显示四个基础面板选项）
  const renderDefaultMenu = () => (
    <>
      <button
        className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
          hasObjectivePanel
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => !hasObjectivePanel && onSelect("objective")}
        disabled={hasObjectivePanel}
      >
        <Plus className={`h-4 w-4 transition-opacity ${
          hasObjectivePanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
        }`} />
        <span>教学目标</span>
      </button>
      <button
        className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
          hasCoursePointPanel
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => !hasCoursePointPanel && onSelect("coursePoint")}
        disabled={hasCoursePointPanel}
      >
        <Plus className={`h-4 w-4 transition-opacity ${
          hasCoursePointPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
        }`} />
        <span>课点信息</span>
      </button>
      <button
        className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
          hasChapterPanel
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => !hasChapterPanel && onSelect("chapter")}
        disabled={hasChapterPanel}
      >
        <Plus className={`h-4 w-4 transition-opacity ${
          hasChapterPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
        }`} />
        <span>章节项目</span>
      </button>
      <button
        className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
          hasKsaPanel
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        onClick={() => !hasKsaPanel && onSelect("ksa")}
        disabled={hasKsaPanel}
      >
        <Plus className={`h-4 w-4 transition-opacity ${
          hasKsaPanel ? "opacity-30" : "opacity-0 group-hover:opacity-100"
        }`} />
        <span>KSA</span>
      </button>
    </>
  )

  // 根据源节点类型选择渲染内容
  const renderMenuContent = () => {
    if (sourceNodeType === FlowNodeType.PROJECT_MATRIX) {
      return renderProjectMatrixMenu()
    }
    if (sourceNodeType === FlowNodeType.COURSE_MATRIX) {
      return renderCourseMatrixMenu()
    }
    if (sourceNodeType === FlowNodeType.KSA_PANEL) {
      return renderKsaPanelMenu()
    }
    if (menuState.sourceHandle === "matrix") {
      return renderMatrixExtendMenu()
    }
    if (isFromBasicPanel) {
      return renderBasicPanelMenu()
    }
    return renderDefaultMenu()
  }

  return (
    <div
      className="absolute z-50 min-w-[160px] bg-popover text-popover-foreground rounded-lg border shadow-lg p-1 canvas-connection-menu"
      style={{
        left: menuState.x,
        top: menuState.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {renderMenuContent()}
    </div>
  )
})

export default CanvasConnectionMenu
