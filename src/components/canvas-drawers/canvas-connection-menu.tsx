"use client"

import { memo } from "react"
import type { Node } from "@xyflow/react"
import { Plus, Grid3X3, Table, FileText, BookOpen } from "lucide-react"
import { FlowNodeType } from "../flow/utils/types"
import type { GraduationSupportData } from "@/components/canvas-elements/types"

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
}

/**
 * 画布连接菜单组件
 * 在连线松开时显示上下文菜单，根据源节点类型显示不同选项
 */
export const CanvasConnectionMenu = memo(function CanvasConnectionMenu({
  connectionMenu,
  flowNodes,
  onMenuSelect,
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
        <>
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm canvas-menu-item ${
              hasCourseReport
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => !hasCourseReport && onMenuSelect("courseReport")}
            disabled={hasCourseReport}
            title={hasCourseReport ? "画布中已存在开课说明" : ""}
          >
            <FileText className={`h-4 w-4 transition-colors ${hasCourseReport ? "text-rose-300" : "text-rose-500 group-hover:text-accent-foreground"}`} />
            <span>+ 开课说明</span>
          </button>
        </>
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
