"use client"
import { useMemo, type ReactNode } from "react"
import { Calendar, BookOpen, FileText, Clock, Tag } from "lucide-react"
import { formatDate } from "@/shared/utils/date-utils"
import { getCourseType } from "@/shared/utils/data-transform"
import { SectionCard, SectionHeader, Divider } from "@/shared/components/design-system"
import { SafeRichTextContent } from "@/shared/components/ui/safe-rich-text-content"

type ScoreTableRow = Record<string, string | number | null | undefined>
type ScheduleRow = Record<string, string | number | null | undefined>

interface ScoreTableData {
  headers?: string[]
  rows?: ScoreTableRow[]
}

interface CourseDetailData {
  typeId?: number | null
  theoryPeriod?: number | null
  practicePeriod?: number | null
  classId?: number | null
  position?: string | null
  criterion?: string | null
  teachingClass?: string | null
  teachingLocation?: string | null
  teachingTime?: unknown
  studentCount?: number | null
  credits?: number | null
  introduction?: string | null
  mainTextbook?: string | null
  referenceResources?: string | null
  attendancePolicy?: string | null
  assignmentPolicy?: string | null
  conductRequirements?: string | null
  practiceRequirements?: string | null
  teamworkRequirements?: string | null
  bonusRequirements?: string | null
  otherSuggestions?: string | null
  assessmentMethod?: string | null
  assessmentForm?: string | null
  scoreType?: string | null
  scoreTable?: ScoreTableData | null
  assessmentDescription?: string | null
}

interface CourseBasicInfoProps {
  name: string
  courseDetail?: CourseDetailData
  courseNameData?: unknown
  createTime?: string
  metadata?: unknown
}

interface AssessmentFieldProps {
  label: string
  children: ReactNode
  alignTop?: boolean
}

function AssessmentField({ label, children, alignTop = false }: AssessmentFieldProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 md:flex-row md:gap-6">
      <div className={`text-sm font-medium text-muted-foreground md:w-28 md:flex-shrink-0 ${alignTop ? "md:pt-1" : "md:self-center"}`}>
        {label}
      </div>
      <div className="min-w-0 flex-1 text-base text-muted-foreground">{children}</div>
    </div>
  )
}

export function CourseBasicInfo({ name, courseDetail, createTime }: CourseBasicInfoProps) {
  const courseTypeName = useMemo(() => getCourseType(courseDetail?.typeId), [courseDetail?.typeId])

  return (
    <SectionCard>
      <SectionHeader title="基本信息" />
      <Divider spacing="none" className="mb-4" />
      <div className="grid grid-cols-3 gap-6">
        {/* 课程名称 */}
        <div className="flex flex-row items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
            <FileText className="w-3 h-3" />
            <span>课程名称</span>
          </div>
          <div className="text-base font-medium text-foreground">{name}</div>
        </div>

        {/* 开课日期 */}
        <div className="flex flex-row items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
            <Calendar className="w-3 h-3" />
            <span>开课日期</span>
          </div>
          <div className="text-base font-medium text-foreground">{formatDate(createTime)}</div>
        </div>

        {/* 课程性质 */}
        <div className="flex flex-row items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
            <Tag className="w-3 h-3" />
            <span>课程性质</span>
          </div>
          <div className="text-base font-medium text-foreground">{courseTypeName}</div>
        </div>

        {/* 理论学时 */}
        {courseDetail?.theoryPeriod !== undefined && courseDetail?.theoryPeriod !== null && (
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>理论学时</span>
            </div>
            <div className="text-base font-medium text-foreground">{courseDetail.theoryPeriod}</div>
          </div>
        )}

        {/* 实践学时 */}
        {courseDetail?.practicePeriod !== undefined && courseDetail?.practicePeriod !== null && (
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>实践学时</span>
            </div>
            <div className="text-base font-medium text-foreground">{courseDetail.practicePeriod}</div>
          </div>
        )}

        {/* 课程类型 */}
        {courseDetail?.classId !== undefined && courseDetail?.classId !== null && (
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <Tag className="w-3 h-3" />
              <span>课程类型</span>
            </div>
            <div className="text-base font-medium text-foreground">{getCourseType(courseDetail.classId)}</div>
          </div>
        )}

        {/* 课程定位 */}
        {courseDetail?.position !== undefined && courseDetail?.position !== null && (
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <BookOpen className="w-3 h-3" />
              <span>课程定位</span>
            </div>
            <div className="text-base font-medium text-foreground">{courseDetail.position || "未设置"}</div>
          </div>
        )}

        {/* 课程标准 */}
        {courseDetail?.criterion !== undefined && courseDetail?.criterion !== null && (
          <div className="flex flex-row items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <FileText className="w-3 h-3" />
              <span>课程标准</span>
            </div>
            <div className="text-base font-medium text-foreground">{courseDetail.criterion || "未设置"}</div>
          </div>
        )}
      </div>

      {/* 新增字段显示 */}
      <Divider spacing="lg" className="mt-6" />
      <div className="pt-2">
        <div className="grid grid-cols-3 gap-6">
          {/* 授课班级 */}
          {courseDetail?.teachingClass && (
            <div className="flex flex-row items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                <FileText className="w-3 h-3" />
                <span>授课班级</span>
              </div>
              <div className="text-base font-medium text-foreground">{courseDetail.teachingClass}</div>
            </div>
          )}

          {/* 授课地点 */}
          {courseDetail?.teachingLocation && (
            <div className="flex flex-row items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                <FileText className="w-3 h-3" />
                <span>授课地点</span>
              </div>
              <div className="text-base font-medium text-foreground">{courseDetail.teachingLocation}</div>
            </div>
          )}

          {/* 授课时间 */}
          {courseDetail?.teachingTime !== undefined && courseDetail?.teachingTime !== null && (
            <div className="col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">授课时间</span>
              </div>
              {(() => {
                try {
                  const scheduleData = typeof courseDetail.teachingTime === "string"
                    ? JSON.parse(courseDetail.teachingTime)
                    : courseDetail.teachingTime

                  // 支持数组格式（多行）和单对象格式（向后兼容）
                  const scheduleRows: ScheduleRow[] = (Array.isArray(scheduleData)
                    ? scheduleData
                    : [scheduleData]
                  ).filter(
                    (row): row is ScheduleRow => row !== null && typeof row === "object",
                  )

                  return (
                    <div className="border border-input rounded-md overflow-hidden bg-background">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-secondary/50">
                            <th className="border-r border-input p-2 text-center font-medium w-32">时段</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">节次</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周一</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周二</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周三</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周四</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周五</th>
                            <th className="border-r border-input p-2 text-center font-medium w-8">周六</th>
                            <th className="p-2 text-center font-medium w-8">周日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleRows.map((row, idx) => (
                            <tr key={idx} className="border-t border-input hover:bg-secondary/20">
                              <td className="border-r border-input p-2 text-center whitespace-pre-wrap break-words">
                                {row.period || "-"}
                              </td>
                              <td className="border-r border-input p-2 text-center whitespace-pre-wrap break-words">
                                {row.sessions || "-"}
                              </td>
                              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day, dayIdx) => (
                                <td
                                  key={day}
                                  className={`p-2 text-center whitespace-pre-wrap break-words ${dayIdx < 6 ? "border-r border-input" : ""}`}
                                >
                                  {row[day] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                } catch {
                  return (
                      <div className="p-2 border border-input rounded-md bg-muted/30">{String(courseDetail.teachingTime)}</div>
                  )
                }
              })()}
            </div>
          )}

          {/* 学生人数 */}
          {courseDetail?.studentCount !== undefined && courseDetail?.studentCount !== null && (
            <div className="flex flex-row items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                <FileText className="w-3 h-3" />
                <span>学生人数</span>
              </div>
              <div className="text-base font-medium text-foreground">{courseDetail.studentCount}</div>
            </div>
          )}

          {/* 学分 */}
          {courseDetail?.credits !== undefined && courseDetail?.credits !== null && (
            <div className="flex flex-row items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                <FileText className="w-3 h-3" />
                <span>学分</span>
              </div>
              <div className="text-base font-medium text-foreground">{courseDetail.credits}</div>
            </div>
          )}
        </div>
      </div>

      {/* 课程简介 */}
      {courseDetail?.introduction && (
        <div className="mt-6">
          <Divider spacing="lg" />
          <SectionHeader title="课程简介" className="mb-3" />
          <SafeRichTextContent content={courseDetail.introduction} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
        </div>
      )}

      {/* 主要教材 */}
      {courseDetail?.mainTextbook && (
        <div className="mt-6">
          <Divider spacing="lg" />
          <SectionHeader title="课程使用的主要教材" className="mb-3" />
          <SafeRichTextContent content={courseDetail.mainTextbook} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
        </div>
      )}

      {/* 参考文献 */}
      {courseDetail?.referenceResources && (
        <div className="mt-6">
          <Divider spacing="lg" />
          <SectionHeader title="建议阅读材料和参考文献" className="mb-3" />
          <SafeRichTextContent content={courseDetail.referenceResources} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
        </div>
      )}

      {/* 课程要求 */}
      {(courseDetail?.attendancePolicy || courseDetail?.assignmentPolicy || courseDetail?.conductRequirements ||
        courseDetail?.practiceRequirements || courseDetail?.teamworkRequirements || courseDetail?.bonusRequirements ||
        courseDetail?.otherSuggestions) && (
        <div className="mt-6">
          <Divider spacing="lg" />
          <SectionHeader title="课程要求" className="mb-3" />
          <div className="grid grid-cols-2 gap-6">
            {/* 关于课堂出席政策及要求 */}
            {courseDetail?.attendancePolicy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于课堂出席政策及要求</div>
                <SafeRichTextContent content={courseDetail.attendancePolicy} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 关于作业提交的政策及要求 */}
            {courseDetail?.assignmentPolicy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于作业提交的政策及要求</div>
                <SafeRichTextContent content={courseDetail.assignmentPolicy} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 关于上课行为规范、诚信学习要求 */}
            {courseDetail?.conductRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于上课行为规范、诚信学习要求</div>
                <SafeRichTextContent content={courseDetail.conductRequirements} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 关于参与实践环节的要求 */}
            {courseDetail?.practiceRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于参与实践环节的要求</div>
                <SafeRichTextContent content={courseDetail.practiceRequirements} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 关于团队学习、分组讨论的要求 */}
            {courseDetail?.teamworkRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于团队学习、分组讨论的要求</div>
                <SafeRichTextContent content={courseDetail.teamworkRequirements} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 关于专利、论文等加分项的要求 */}
            {courseDetail?.bonusRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于专利、论文等加分项的要求</div>
                <SafeRichTextContent content={courseDetail.bonusRequirements} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}

            {/* 其他课程要求或学习建议 */}
            {courseDetail?.otherSuggestions && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">其他课程要求或学习建议</div>
                <SafeRichTextContent content={courseDetail.otherSuggestions} className="text-base text-muted-foreground leading-relaxed" plainTextClassName="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 考核评价 */}
      {(courseDetail?.assessmentMethod || courseDetail?.assessmentForm || courseDetail?.scoreType ||
        courseDetail?.scoreTable || courseDetail?.assessmentDescription) && (
        <div className="mt-6">
          <Divider spacing="lg" />
          <SectionHeader title="考核评价" className="mb-3" />
          <div className="space-y-4">
            {courseDetail?.assessmentMethod && (
              <AssessmentField label="考核方式">
                {courseDetail.assessmentMethod}
              </AssessmentField>
            )}

            {courseDetail?.assessmentForm && (
              <AssessmentField label="具体形式" alignTop>
                <SafeRichTextContent
                  content={courseDetail.assessmentForm}
                  className="leading-relaxed"
                  plainTextClassName="whitespace-pre-wrap"
                />
              </AssessmentField>
            )}

            {courseDetail?.scoreType && (
              <AssessmentField label="总成绩为" alignTop>
                <div className="space-y-3">
                  <div>{courseDetail.scoreType}</div>
                  {courseDetail.scoreType === "五级分制" && (
                    <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">
                      五级分制的成绩等级与分值对应如下：90-100分为优秀，80-89分为良好，70-79分为中等，60-69分为及格，60分以下为不及格（详细列示五级分制的考核标准和具体要求）。
                    </div>
                  )}
                </div>
              </AssessmentField>
            )}

            {courseDetail?.scoreTable && (() => {
              const scoreTable = courseDetail.scoreTable
              return (
                <AssessmentField label="总成绩" alignTop>
                  <div className="border border-input rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-input bg-secondary/30">
                          {scoreTable.headers?.map((header: string, idx: number) => (
                            <th key={idx} className={`border-input p-2 text-center font-medium ${idx < (scoreTable.headers?.length || 0) - 1 ? "border-r" : ""}`}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scoreTable.rows?.map((row: ScoreTableRow, rowIdx: number) => (
                          <tr key={rowIdx} className="border-t border-input hover:bg-secondary/20">
                            {scoreTable.headers?.map((header: string, colIdx: number) => (
                              <td key={colIdx} className={`border-input p-2 text-center ${colIdx < (scoreTable.headers?.length || 0) - 1 ? "border-r" : ""}`}>
                                {row[header] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AssessmentField>
              )
            })()}

            {courseDetail?.assessmentDescription && (
              <AssessmentField label="考核评价说明" alignTop>
                <SafeRichTextContent
                  content={courseDetail.assessmentDescription}
                  className="leading-relaxed"
                  plainTextClassName="whitespace-pre-wrap"
                />
              </AssessmentField>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
