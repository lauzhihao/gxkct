"use client"
import { useState, useEffect } from "react"
import { Calendar, BookOpen, FileText, Clock, Tag } from "lucide-react"
import { formatDate } from "@/shared/utils/date-utils"
import { getCourseType, createCourseNameMapper } from "@/shared/utils/data-transform"

interface CourseBasicInfoProps {
  name: string
  courseDetail?: any
  courseNameData?: any
  createTime?: string
  metadata?: any
}

export function CourseBasicInfo({ name, courseDetail, courseNameData, createTime, metadata }: CourseBasicInfoProps) {
  const [getCourseName, setGetCourseName] = useState<(typeId: number | null | undefined) => string>(() => () => "未设置")

  // 加载课程类型映射
  useEffect(() => {
    const loadCourseTypes = async () => {
      try {
        const courseTypesModule = await import("@/mock-data/course-types.json")
        const courseTypesData = courseTypesModule.default.data || []
        // 使用共享的 createCourseNameMapper 创建映射函数
        const mapper = createCourseNameMapper(courseTypesData)
        setGetCourseName(() => mapper)
      } catch (error) {
        console.error("加载课程类型失败:", error)
      }
    }
    loadCourseTypes()
  }, [])

  return (
    <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-sm bg-primary" />
        <h3 className="text-base font-semibold text-foreground">基本信息</h3>
      </div>
      <div className="border-t border-dashed border-border mb-4" />
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
          <div className="text-base font-medium text-foreground">{getCourseName(courseDetail?.typeId)}</div>
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
      <div className="mt-6 pt-6 border-t border-dashed border-border">
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
          {courseDetail?.teachingTime && (
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
                  const scheduleRows = Array.isArray(scheduleData) ? scheduleData : [scheduleData]

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
                } catch (error) {
                  return (
                    <div className="p-2 border border-input rounded-md bg-muted/30">
                      {courseDetail.teachingTime}
                    </div>
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
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h4 className="text-base font-semibold text-foreground">课程简介</h4>
          </div>
          <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {courseDetail.introduction}
          </div>
        </div>
      )}

      {/* 主要教材 */}
      {courseDetail?.mainTextbook && (
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h4 className="text-base font-semibold text-foreground">课程使用的主要教材</h4>
          </div>
          <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {courseDetail.mainTextbook}
          </div>
        </div>
      )}

      {/* 参考文献 */}
      {courseDetail?.referenceResources && (
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h4 className="text-base font-semibold text-foreground">建议阅读材料和参考文献</h4>
          </div>
          <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {courseDetail.referenceResources}
          </div>
        </div>
      )}

      {/* 课程要求 */}
      {(courseDetail?.attendancePolicy || courseDetail?.assignmentPolicy || courseDetail?.conductRequirements ||
        courseDetail?.practiceRequirements || courseDetail?.teamworkRequirements || courseDetail?.bonusRequirements ||
        courseDetail?.otherSuggestions) && (
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h4 className="text-base font-semibold text-foreground">课程要求</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* 关于课堂出席政策及要求 */}
            {courseDetail?.attendancePolicy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于课堂出席政策及要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.attendancePolicy}
                </div>
              </div>
            )}

            {/* 关于作业提交的政策及要求 */}
            {courseDetail?.assignmentPolicy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于作业提交的政策及要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.assignmentPolicy}
                </div>
              </div>
            )}

            {/* 关于上课行为规范、诚信学习要求 */}
            {courseDetail?.conductRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于上课行为规范、诚信学习要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.conductRequirements}
                </div>
              </div>
            )}

            {/* 关于参与实践环节的要求 */}
            {courseDetail?.practiceRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于参与实践环节的要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.practiceRequirements}
                </div>
              </div>
            )}

            {/* 关于团队学习、分组讨论的要求 */}
            {courseDetail?.teamworkRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于团队学习、分组讨论的要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.teamworkRequirements}
                </div>
              </div>
            )}

            {/* 关于专利、论文等加分项的要求 */}
            {courseDetail?.bonusRequirements && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">关于专利、论文等加分项的要求</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.bonusRequirements}
                </div>
              </div>
            )}

            {/* 其他学习建议 */}
            {courseDetail?.otherSuggestions && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">其他学习建议</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.otherSuggestions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 考核评价 */}
      {(courseDetail?.assessmentMethod || courseDetail?.assessmentForm || courseDetail?.scoreType ||
        courseDetail?.scoreTable || courseDetail?.assessmentDescription) && (
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h4 className="text-base font-semibold text-foreground">考核评价</h4>
          </div>
          <div className="space-y-4">
            {/* 考核方式 */}
            {courseDetail?.assessmentMethod && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">考核方式</div>
                <div className="text-base text-muted-foreground">{courseDetail.assessmentMethod}</div>
              </div>
            )}

            {/* 具体形式 */}
            {courseDetail?.assessmentForm && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">具体形式</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.assessmentForm}
                </div>
              </div>
            )}

            {/* 总成绩类型 */}
            {courseDetail?.scoreType && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">总成绩为</div>
                <div className="text-base text-muted-foreground">{courseDetail.scoreType}</div>
              </div>
            )}

            {/* 总成绩表格 */}
            {courseDetail?.scoreTable && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">总成绩</div>
                <div className="border border-input rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-input bg-secondary/30">
                        {courseDetail.scoreTable.headers?.map((header: string, idx: number) => (
                          <th key={idx} className={`border-input p-2 text-center font-medium ${idx < (courseDetail.scoreTable.headers?.length || 0) - 1 ? "border-r" : ""}`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {courseDetail.scoreTable.rows?.map((row: any, rowIdx: number) => (
                        <tr key={rowIdx} className="border-t border-input hover:bg-secondary/20">
                          {courseDetail.scoreTable.headers?.map((header: string, colIdx: number) => (
                            <td key={colIdx} className={`border-input p-2 text-center ${colIdx < (courseDetail.scoreTable.headers?.length || 0) - 1 ? "border-r" : ""}`}>
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

            {/* 五级分制说明 */}
            {courseDetail?.scoreType === "五级分制" && (
              <div className="p-4 bg-secondary/30 rounded-md border border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  五级分制的成绩等级与分值对应如下：90-100分为优秀，80-89分为良好，70-79分为中等，60-69分为及格，60分以下为不及格（详细列示五级分制的考核标准和具体要求）。
                </p>
              </div>
            )}

            {/* 考核评价说明 */}
            {courseDetail?.assessmentDescription && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">考核评价说明</div>
                <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {courseDetail.assessmentDescription}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
