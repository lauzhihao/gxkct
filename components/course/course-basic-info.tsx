import { Calendar, BookOpen, FileText, Award, Clock } from "lucide-react"

interface CourseBasicInfoProps {
  name: string
  courseDetail?: any
  courseNameData?: any
  createTime?: string
  metadata?: any
}

export function CourseBasicInfo({ name, courseDetail, courseNameData, createTime, metadata }: CourseBasicInfoProps) {
  // 格式化日期，只显示日期部分 (YYYY-MM-DD)
  const formatDate = (dateString: string) => {
    if (!dateString) return "未设置"
    try {
      const date = new Date(dateString)
      return date.toISOString().split("T")[0]
    } catch {
      return "未设置"
    }
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-sm bg-primary" />
        <h3 className="text-base font-semibold text-foreground">课程基本信息</h3>
      </div>
      <div className="border-t border-dashed border-border mb-4" />
      <div className="grid grid-cols-3 gap-6">
        {/* 课程名称 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>课程名称</span>
          </div>
          <div className="text-sm font-medium text-foreground">{name}</div>
        </div>

        {/* 开课日期 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>开课日期</span>
          </div>
          <div className="text-sm font-medium text-foreground">{formatDate(createTime)}</div>
        </div>

        {/* 所属专业 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="w-3 h-3" />
            <span>所属专业</span>
          </div>
          <div className="text-sm font-medium text-foreground">{courseNameData?.major || "未设置"}</div>
        </div>

        {/* 所属系部 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Award className="w-3 h-3" />
            <span>所属系部</span>
          </div>
          <div className="text-sm font-medium text-foreground">{courseNameData?.department?.name || "未设置"}</div>
        </div>

        {/* 所属学院 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>所属学院</span>
          </div>
          <div className="text-sm font-medium text-foreground">{courseNameData?.college?.name || "未设置"}</div>
        </div>

        {/* 理论学时 */}
        {courseDetail?.theoryPeriod > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>理论学时</span>
            </div>
            <div className="text-sm font-medium text-foreground">{courseDetail.theoryPeriod}</div>
          </div>
        )}

        {/* 实践学时 */}
        {courseDetail?.practicePeriod > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>实践学时</span>
            </div>
            <div className="text-sm font-medium text-foreground">{courseDetail.practicePeriod}</div>
          </div>
        )}
      </div>
    </div>
  )
}
