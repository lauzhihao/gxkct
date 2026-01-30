"use client"

/**
 * 画布开课报告预览组件
 * 从画布节点数据汇总展示课程体系完整信息（只读模式，用于导出PDF）
 */

import { useState, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import {
  FileText, Target, BookOpen, Layers, Brain, Wrench, Heart,
  Grid3X3, Table, Award, ClipboardCheck, FileDown, Save
} from "lucide-react"
import type {
  CourseInfoData,
  ObjectiveCardData,
  ChapterCardData,
  CoursePointCardData,
  KsaItemData,
  CourseMatrixData,
  ProjectMatrixData,
  CanvasElementData,
} from "./canvas-elements/types"
import type { TreeNode } from "@/types"
import { CanvasSaveWizard } from "./canvas-save-wizard"

// 开课报告预览数据结构
export interface CourseReportPreviewData {
  // 课程基本信息
  courseInfo: CourseInfoData | null
  // 教学目标列表
  objectives: ObjectiveCardData[]
  // 章节列表
  chapters: ChapterCardData[]
  // 课点列表
  coursePoints: CoursePointCardData[]
  // KSA列表
  ksaItems: KsaItemData[]
  // 课程矩阵
  courseMatrix: CourseMatrixData | null
  // 项目矩阵列表
  projectMatrices: ProjectMatrixData[]
}

interface CanvasCourseReportPreviewProps {
  data: CourseReportPreviewData
  onClose: () => void
  /** 画布元素数据（用于保存向导） */
  canvasElements?: CanvasElementData[]
  /** 画布内容的OSS Key */
  canvasOssKey?: string | null
  /** 树形结构数据（用于保存向导选择专业） */
  treeData?: TreeNode | null
  /** 保存成功回调 */
  onSaveSuccess?: (majorId: string, courseId: string) => void
  /** 更新课程信息回调（用于保存后更新画布中的 courseId） */
  onUpdateCourseInfo?: (updates: { courseId?: number; majorId?: number }) => void
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN")
  } catch {
    return dateStr
  }
}

/**
 * 解析授课时间
 */
function parseTeachingTime(teachingTime?: string): string {
  if (!teachingTime) return "-"
  try {
    const scheduleData = typeof teachingTime === "string"
      ? JSON.parse(teachingTime)
      : teachingTime
    const scheduleRows = Array.isArray(scheduleData) ? scheduleData : [scheduleData]
    const validRows = scheduleRows.filter((row: any) =>
      row.period || row.sessions || row.monday || row.tuesday ||
      row.wednesday || row.thursday || row.friday || row.saturday || row.sunday
    )
    if (validRows.length === 0) return "-"
    return `${validRows.length}个时段`
  } catch {
    return teachingTime
  }
}

/**
 * 信息项组件
 */
function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="font-medium">{value ?? "-"}</p>
    </div>
  )
}

/**
 * 文本区块组件
 */
function TextBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="text-sm mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

/**
 * 区块标题组件
 */
function SectionTitle({
  icon: Icon,
  title,
  count,
  bgColor = "bg-sky-100",
  iconColor = "text-sky-600"
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count?: number
  bgColor?: string
  iconColor?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`p-2 rounded-lg ${bgColor}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="text-sm text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

/**
 * 开课报告预览组件
 */
export function CanvasCourseReportPreview({
  data,
  onClose,
  canvasElements = [],
  canvasOssKey = null,
  treeData = null,
  onSaveSuccess,
  onUpdateCourseInfo,
}: CanvasCourseReportPreviewProps) {
  const { objectives, chapters, coursePoints, ksaItems, courseMatrix, projectMatrices } = data

  // 维护 courseInfo 的本地副本，保存成功后可就地更新 courseId/majorId，
  // 避免因抽屉持有旧快照导致二次保存时重复创建课程
  const [courseInfo, setCourseInfo] = useState(data.courseInfo)
  const metadata = courseInfo?.metadata

  // 保存向导状态
  const [isSaveWizardOpen, setIsSaveWizardOpen] = useState(false)

  // 包装 onUpdateCourseInfo：同时更新本地 courseInfo 状态和外部画布数据
  const handleUpdateCourseInfo = useCallback((updates: { courseId?: number; majorId?: number }) => {
    setCourseInfo(prev => {
      if (!prev) return prev
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          courseId: updates.courseId ?? prev.metadata?.courseId,
          majorId: updates.majorId ?? prev.metadata?.majorId,
        },
      }
    })
    onUpdateCourseInfo?.(updates)
  }, [onUpdateCourseInfo])

  // 计算章节学时统计
  const totalTheoryHours = chapters.reduce((sum, ch) => sum + (ch.theory_hours || 0), 0)
  const totalPracticeHours = chapters.reduce((sum, ch) => sum + (ch.practice_hours || 0), 0)

  // KSA 分类
  const ksaByCategory = {
    K: ksaItems.filter(item => item.category === "K").sort((a, b) => a.index - b.index),
    S: ksaItems.filter(item => item.category === "S").sort((a, b) => a.index - b.index),
    A: ksaItems.filter(item => item.category === "A").sort((a, b) => a.index - b.index),
  }

  // 检查是否有课程要求内容
  const hasRequirements = metadata?.attendancePolicy || metadata?.assignmentPolicy ||
    metadata?.conductRequirements || metadata?.practiceRequirements ||
    metadata?.teamworkRequirements || metadata?.bonusRequirements ||
    metadata?.otherSuggestions

  // 检查是否有考核评价内容
  const hasAssessment = metadata?.assessmentMethod || metadata?.assessmentForm ||
    metadata?.scoreType || metadata?.scoreTable || metadata?.assessmentDescription

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 预览内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* ========== 1. 课程基本信息 ========== */}
          <section>
            <SectionTitle icon={FileText} title="课程基本信息" bgColor="bg-sky-100" iconColor="text-sky-600" />
            {courseInfo ? (
              <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-4 space-y-4">
                {/* 基础字段网格 */}
                <div className="grid grid-cols-4 gap-4">
                  <InfoField label="课程名称" value={courseInfo.name} />
                  <InfoField label="课程类型" value={metadata?.courseType} />
                  <InfoField label="课程性质" value={metadata?.courseNatureName} />
                  <InfoField label="开课日期" value={formatDate(metadata?.openingDate)} />
                  <InfoField label="理论学时" value={metadata?.theoryPeriod} />
                  <InfoField label="实践学时" value={metadata?.practicePeriod} />
                  <InfoField label="学分" value={metadata?.credits} />
                  <InfoField label="学生人数" value={metadata?.studentCount} />
                  <InfoField label="授课班级" value={metadata?.teachingClass} />
                  <InfoField label="授课地点" value={metadata?.teachingLocation} />
                  <InfoField label="授课时间" value={parseTeachingTime(metadata?.teachingTime)} />
                </div>
                {/* 长文本字段 */}
                <TextBlock label="课程介绍" value={metadata?.introduction} />
                <div className="grid grid-cols-2 gap-4">
                  <TextBlock label="主要教材" value={metadata?.mainTextbook} />
                  <TextBlock label="参考文献" value={metadata?.referenceResources} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无课程信息
              </div>
            )}
          </section>

          {/* ========== 2. 课程要求 ========== */}
          {hasRequirements && (
            <section>
              <SectionTitle icon={ClipboardCheck} title="课程要求" bgColor="bg-orange-100" iconColor="text-orange-600" />
              <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <TextBlock label="关于课堂出席政策及要求" value={metadata?.attendancePolicy} />
                  <TextBlock label="关于作业提交的政策及要求" value={metadata?.assignmentPolicy} />
                  <TextBlock label="关于上课行为规范、诚信学习要求" value={metadata?.conductRequirements} />
                  <TextBlock label="关于参与实践环节的要求" value={metadata?.practiceRequirements} />
                  <TextBlock label="关于团队学习、分组讨论的要求" value={metadata?.teamworkRequirements} />
                  <TextBlock label="关于专利、论文等加分项的要求" value={metadata?.bonusRequirements} />
                  <TextBlock label="其他学习建议" value={metadata?.otherSuggestions} />
                </div>
              </div>
            </section>
          )}

          {/* ========== 3. 考核评价 ========== */}
          {hasAssessment && (
            <section>
              <SectionTitle icon={Award} title="考核评价" bgColor="bg-emerald-100" iconColor="text-emerald-600" />
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <InfoField label="考核方式" value={metadata?.assessmentMethod} />
                  <InfoField label="总成绩类型" value={metadata?.scoreType} />
                </div>
                <TextBlock label="具体形式" value={metadata?.assessmentForm} />
                <TextBlock label="考核评价说明" value={metadata?.assessmentDescription} />
                {/* 成绩表格 */}
                {metadata?.scoreTable && metadata.scoreTable.rows && metadata.scoreTable.rows.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">总成绩表格</span>
                    <div className="mt-2 border border-emerald-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-100">
                          <tr>
                            {metadata.scoreTable.headers.map((header, idx) => (
                              <th key={idx} className="px-3 py-2 text-left font-medium text-emerald-700 border-b border-emerald-200">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {metadata.scoreTable.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-emerald-100 last:border-b-0">
                              {metadata.scoreTable!.headers.map((header, colIdx) => (
                                <td key={colIdx} className="px-3 py-2">
                                  {row[header] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ========== 4. 教学目标 ========== */}
          <section>
            <SectionTitle icon={Target} title="教学目标" count={objectives.length} bgColor="bg-blue-100" iconColor="text-blue-600" />
            {objectives.length > 0 ? (
              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700 border-b border-blue-200 w-16">序号</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700 border-b border-blue-200">教学目标内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objectives.map((obj) => (
                      <tr key={obj.id} className="border-b border-blue-100 last:border-b-0">
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-medium">
                            {obj.index}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{obj.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无教学目标
              </div>
            )}
          </section>

          {/* ========== 5. 课点列表 ========== */}
          <section>
            <SectionTitle icon={Layers} title="课点列表" count={coursePoints.length} bgColor="bg-green-100" iconColor="text-green-600" />
            {coursePoints.length > 0 ? (
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 border-b border-green-200 w-16">序号</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 border-b border-green-200">课点名称</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 border-b border-green-200">课点描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursePoints.map((point) => (
                      <tr key={point.id} className="border-b border-green-100 last:border-b-0">
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-green-500 text-white text-xs font-medium">
                            {point.index}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{point.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{point.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无课点
              </div>
            )}
          </section>

          {/* ========== 6. 章节项目 ========== */}
          <section>
            <SectionTitle icon={BookOpen} title="章节项目" count={chapters.length} bgColor="bg-purple-100" iconColor="text-purple-600" />
            {chapters.length > 0 ? (
              <div className="border border-purple-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700 border-b border-purple-200 w-16">序号</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700 border-b border-purple-200">名称</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-purple-700 border-b border-purple-200 w-24">理论学时</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-purple-700 border-b border-purple-200 w-24">实践学时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter) => (
                      <tr key={chapter.id} className="border-b border-purple-100 last:border-b-0">
                        <td className="px-4 py-3 text-sm">{chapter.index}</td>
                        <td className="px-4 py-3 text-sm">{chapter.name}</td>
                        <td className="px-4 py-3 text-sm text-center">{chapter.theory_hours || 0}</td>
                        <td className="px-4 py-3 text-sm text-center">{chapter.practice_hours || 0}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-100/50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-sm text-purple-700">合计</td>
                      <td className="px-4 py-3 text-sm text-center text-purple-700">{totalTheoryHours}</td>
                      <td className="px-4 py-3 text-sm text-center text-purple-700">{totalPracticeHours}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无章节项目
              </div>
            )}
          </section>

          {/* ========== 7. KSA 列表 ========== */}
          <section>
            <SectionTitle icon={Brain} title="KSA 列表" count={ksaItems.length} bgColor="bg-amber-100" iconColor="text-amber-600" />
            {ksaItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {/* 知识 K */}
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-700" />
                    <span className="text-sm font-semibold text-amber-700">知识 ({ksaByCategory.K.length})</span>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {ksaByCategory.K.length > 0 ? ksaByCategory.K.map(item => (
                      <div key={item.id} className="px-3 py-2 text-sm">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-medium mr-2">
                          K{item.index}
                        </span>
                        <span>{item.content}</span>
                      </div>
                    )) : (
                      <p className="text-center py-4 text-muted-foreground text-sm">暂无</p>
                    )}
                  </div>
                </div>
                {/* 技能 S */}
                <div className="border border-cyan-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-cyan-50 border-b border-cyan-200 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-cyan-700" />
                    <span className="text-sm font-semibold text-cyan-700">技能 ({ksaByCategory.S.length})</span>
                  </div>
                  <div className="divide-y divide-cyan-100">
                    {ksaByCategory.S.length > 0 ? ksaByCategory.S.map(item => (
                      <div key={item.id} className="px-3 py-2 text-sm">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-cyan-500 text-white text-xs font-medium mr-2">
                          S{item.index}
                        </span>
                        <span>{item.content}</span>
                      </div>
                    )) : (
                      <p className="text-center py-4 text-muted-foreground text-sm">暂无</p>
                    )}
                  </div>
                </div>
                {/* 态度 A */}
                <div className="border border-rose-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-rose-50 border-b border-rose-200 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-700" />
                    <span className="text-sm font-semibold text-rose-700">态度 ({ksaByCategory.A.length})</span>
                  </div>
                  <div className="divide-y divide-rose-100">
                    {ksaByCategory.A.length > 0 ? ksaByCategory.A.map(item => (
                      <div key={item.id} className="px-3 py-2 text-sm">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-rose-500 text-white text-xs font-medium mr-2">
                          A{item.index}
                        </span>
                        <span>{item.content}</span>
                      </div>
                    )) : (
                      <p className="text-center py-4 text-muted-foreground text-sm">暂无</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无KSA数据
              </div>
            )}
          </section>

          {/* ========== 8. 课程矩阵 ========== */}
          <section>
            <SectionTitle icon={Grid3X3} title="课程矩阵" bgColor="bg-indigo-100" iconColor="text-indigo-600" />
            {courseMatrix && courseMatrix.objectives && courseMatrix.objectives.length > 0 ? (
              <div className="border border-indigo-200 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-indigo-700 border-b border-r border-indigo-200 whitespace-nowrap">
                        章节/项目
                      </th>
                      {courseMatrix.objectives.map((obj, idx) => (
                        <th key={obj.id || idx} className="px-3 py-2 text-center font-semibold text-indigo-700 border-b border-r border-indigo-200 whitespace-nowrap min-w-[80px]">
                          目标{idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courseMatrix.rows?.map((row, rowIdx) => (
                      <tr key={row.chapter_id || rowIdx} className="border-b border-indigo-100 last:border-b-0">
                        <td className="px-3 py-2 font-medium border-r border-indigo-100 whitespace-nowrap">
                          {row.chapter_name}
                        </td>
                        {courseMatrix.objectives.map((obj, colIdx) => {
                          // 从 supports 中查找对应教学目标的支撑课点
                          const support = row.supports?.find(s => s.objective_id === obj.id)
                          const coursePointNames = support?.course_points?.map(cp => {
                            const found = coursePoints.find(p => p.id === cp.id)
                            return found ? `课点${found.index}` : cp.name
                          }).join(", ")
                          return (
                            <td key={`${rowIdx}-${colIdx}`} className="px-3 py-2 text-center border-r border-indigo-100 last:border-r-0">
                              {coursePointNames || "-"}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无课程矩阵
              </div>
            )}
          </section>

          {/* ========== 9. 项目矩阵 ========== */}
          <section>
            <SectionTitle icon={Table} title="项目矩阵" count={projectMatrices.length} bgColor="bg-slate-100" iconColor="text-slate-600" />
            {projectMatrices.length > 0 ? (
              <div className="space-y-6">
                {projectMatrices.map((matrix) => (
                  <div key={matrix.chapter_id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* 章节标题 */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-500 text-white text-xs font-medium">
                        第{matrix.chapter_index}章
                      </span>
                      <span className="font-semibold text-slate-700">{matrix.chapter_name}</span>
                    </div>
                    {/* 矩阵表格 */}
                    {matrix.task_objectives && matrix.task_objectives.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">
                                课点
                              </th>
                              {matrix.task_objectives.map((obj, idx) => (
                                <th key={obj.id || idx} className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap min-w-[60px]">
                                  任务{idx + 1}
                                </th>
                              ))}
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">学法</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">教法</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">学习产出</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">周次</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">理论</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">实践</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matrix.rows?.map((row, rowIdx) => (
                              <tr key={row.course_point_id || rowIdx} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-3 py-2 font-medium border-r border-slate-100 whitespace-nowrap">
                                  {row.course_point_name}
                                </td>
                                {matrix.task_objectives.map((obj, colIdx) => {
                                  // 从 objective_supports 中查找对应任务目标的 KSA 支撑
                                  const support = row.objective_supports?.find(s => s.task_objective_id === obj.id)
                                  const ksaLabels = support?.ksa_items?.map(ksa => {
                                    // 先尝试使用 ksa_items 中的 category 和 index
                                    if (ksa.category && ksa.index !== undefined) {
                                      return `${ksa.category}${ksa.index}`
                                    }
                                    // 否则从全局 ksaItems 中查找
                                    const found = ksaItems.find(k => k.id === ksa.id)
                                    return found ? `${found.category}${found.index}` : ksa.name
                                  }).filter(Boolean).join(", ")
                                  return (
                                    <td key={`${rowIdx}-${colIdx}`} className="px-3 py-2 text-center border-r border-slate-100">
                                      {ksaLabels || "-"}
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-2 text-center border-r border-slate-100">{row.learning_method || "-"}</td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">{row.teaching_method || "-"}</td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">{row.learning_output || "-"}</td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">{row.week || "-"}</td>
                                <td className="px-3 py-2 text-center border-r border-slate-100">{row.theory_hours || 0}</td>
                                <td className="px-3 py-2 text-center">{row.practice_hours || 0}</td>
                              </tr>
                            ))}
                            {/* 合计行 */}
                            <tr className="bg-slate-100/50 font-semibold">
                              <td colSpan={matrix.task_objectives.length + 5} className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                                合计
                              </td>
                              <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-200">
                                {matrix.rows?.reduce((sum, r) => sum + (r.theory_hours || 0), 0) || 0}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-700">
                                {matrix.rows?.reduce((sum, r) => sum + (r.practice_hours || 0), 0) || 0}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        暂无任务目标
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg">
                暂无项目矩阵
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-end">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: 实现导出 Word 功能
              console.log("导出 Word")
            }}
            className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-500"
          >
            <FileText className="h-4 w-4" />
            导出 Word
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // TODO: 实现导出 PDF 功能
              console.log("导出 PDF")
            }}
            className="gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
          >
            <FileDown className="h-4 w-4" />
            导出 PDF
          </Button>
          <Button
            onClick={() => setIsSaveWizardOpen(true)}
            className="gap-2"
            disabled={!courseInfo}
            title={courseInfo ? "保存课程到专业" : "暂无课程信息"}
          >
            <Save className="h-4 w-4" />
            保存课程
          </Button>
        </div>
      </div>

      {/* 保存向导对话框 */}
      <CanvasSaveWizard
        open={isSaveWizardOpen}
        onOpenChange={setIsSaveWizardOpen}
        courseInfo={courseInfo}
        canvasElements={canvasElements}
        canvasOssKey={canvasOssKey}
        treeData={treeData}
        onSaveSuccess={onSaveSuccess}
        onUpdateCourseInfo={handleUpdateCourseInfo}
      />
    </div>
  )
}

export default CanvasCourseReportPreview
