"use client"
import { useState, useEffect } from "react"
import { Calendar, BookOpen, FileText, Clock, Tag } from "lucide-react"

interface CourseBasicInfoProps {
  name: string
  courseDetail?: any
  courseNameData?: any
  createTime?: string
  metadata?: any
}

export function CourseBasicInfo({ name, courseDetail, courseNameData, createTime, metadata }: CourseBasicInfoProps) {
  const [courseTypeMap, setCourseTypeMap] = useState<Record<number, string>>({})

  // 加载课程类型映射
  useEffect(() => {
    const loadCourseTypes = async () => {
      try {
        const courseTypesModule = await import("@/mock-data/course-types.json")
        const courseTypesData = courseTypesModule.default.data || []
        const typeMap: Record<number, string> = {}
        courseTypesData.forEach((item: any) => {
          typeMap[item.id] = item.name
        })
        setCourseTypeMap(typeMap)
      } catch (error) {
        console.error("加载课程类型失败:", error)
      }
    }
    loadCourseTypes()
  }, [])

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

  // 获取课程性质文本
  const getCourseName = (typeId: number) => {
    return courseTypeMap[typeId] || "未设置"
  }

  // 获取课程类型文本（必修/选修）
  const getCourseType = (classId: number) => {
    const courseTypeMap: Record<number, string> = {
      1: "必修",
      2: "选修",
    }
    return courseTypeMap[classId] || "未设置"
  }

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
    </div>
  )
}
