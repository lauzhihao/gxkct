import { Calendar, BookOpen, FileText, Award } from "lucide-react"

interface CourseBasicInfoProps {
  name: string
  metadata: any
}

export function CourseBasicInfo({ name, metadata }: CourseBasicInfoProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-sm bg-primary" />
        <h3 className="text-base font-semibold text-foreground">课程基本信息</h3>
      </div>
      <div className="border-t border-dashed border-border mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">开课日期:</span>
          <span className="font-medium text-foreground">{metadata.openingDate || "未设置"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">课程类型:</span>
          <span className="font-medium text-foreground">{metadata.courseType || "未设置"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">课程名称:</span>
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Award className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">课程性质:</span>
          <span className="font-medium text-foreground">{metadata.courseNature || "未设置"}</span>
        </div>
      </div>
    </div>
  )
}
