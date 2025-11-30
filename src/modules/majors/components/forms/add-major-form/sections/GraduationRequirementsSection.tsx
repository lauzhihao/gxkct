/**
 * 毕业要求Section
 * 负责毕业要求及指标点的管理，包括指标点与课程的支撑关系设置
 */

"use client"

import { useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Plus, Star, Trash2, Settings, X, FileSpreadsheet } from "lucide-react"
import { FileUpload } from "@/shared/components/ui/file-upload"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { CourseSelector } from "@/modules/majors/components/shared/course-selector"
import type { UseGraduationRequirementsResult } from "@/modules/majors/hooks/use-graduation-requirements"
import type { UseMajorFormStateResult } from "@/modules/majors/hooks/use-major-form-state"
import type { TreeNode } from "@/types"

interface GraduationRequirementsSectionProps {
  graduationReqs: UseGraduationRequirementsResult
  formState: Pick<
    UseMajorFormStateResult,
    | "uploadedFile"
    | "setUploadedFile"
    | "focusedRequirementId"
    | "setFocusedRequirementId"
    | "focusedIndicatorKey"
    | "setFocusedIndicatorKey"
    | "lastRequirementRef"
    | "lastIndicatorRefs"
  >
  isEditMode: boolean
  majorName: string
  majorId?: string
  departmentId: string
  toast: any
}

export function GraduationRequirementsSection({
  graduationReqs,
  formState,
  isEditMode,
  majorName,
  majorId,
  departmentId,
  toast,
}: GraduationRequirementsSectionProps) {
  const {
    graduationRequirements,
    courseSelectorOpen,
    selectedIndicatorForCourse,
    indicatorCourseSupports,
    addGraduationRequirement,
    updateGraduationRequirement,
    removeGraduationRequirement,
    addIndicator,
    updateIndicator,
    removeIndicator,
    openCourseSelectorForIndicator,
    setCourseSelectorOpen,
    handleSaveCoursesForIndicator,
    removeIndicatorCourseSupport,
  } = graduationReqs

  const {
    uploadedFile,
    setUploadedFile,
    focusedRequirementId,
    setFocusedRequirementId,
    focusedIndicatorKey,
    setFocusedIndicatorKey,
    lastRequirementRef,
    lastIndicatorRefs,
  } = formState

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
            <h3 className="text-base font-semibold text-foreground">毕业要求</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2 bg-primary text-white hover:bg-primary/90"
              onClick={() => {
                toast({
                  title: "提示",
                  description: "功能开发中，敬请期待！",
                  duration: 3000,
                })
              }}
            >
              <Star className="w-4 h-4" />
              AI一键生成
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addGraduationRequirement}
              className="gap-2 bg-transparent"
            >
              <Plus className="w-4 h-4" />
              添加毕业要求
            </Button>
            <FileUpload
              buttonText="上传Excel"
              fileType="Excel文件"
              maxFileSize={10 * 1024 * 1024}
              maxFileCount={1}
              accept=".xlsx,.xls"
              templateUrl="/毕业要求指标点模板.xlsx"
              onUpload={async (files) => {
                // TODO: 将文件上传到OSS，返回文件地址
                return files.map((file) => `/uploads/${file.name}`)
              }}
            />
          </div>
        </div>
        <div className="border-t border-dashed border-border" />
        {uploadedFile && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">{uploadedFile.name}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setUploadedFile(null)}
              className="gap-2 text-red-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {graduationRequirements.map((requirement, reqIndex) => (
            <div key={requirement.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-2">
                  {reqIndex + 1}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="relative flex-1">
                      <ExpandableTextarea
                        ref={reqIndex === graduationRequirements.length - 1 ? lastRequirementRef : null}
                        value={requirement.content}
                        onChange={(value) => updateGraduationRequirement(requirement.id, value)}
                        onFocus={() => setFocusedRequirementId(requirement.id)}
                        onBlur={() => setFocusedRequirementId(null)}
                        placeholder="输入毕业要求内容（最多200字）"
                        maxLength={200}
                        rows={4}
                        expandThreshold={50}
                      />
                    </div>
                    {graduationRequirements.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeGraduationRequirement(requirement.id)}
                        className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">指标点</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addIndicator(requirement.id)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        添加指标点
                      </Button>
                    </div>
                    {requirement.indicators.map((indicator, indIndex) => {
                      const supportKey = `${requirement.id}-${indIndex}`
                      const coursesForIndicator = indicatorCourseSupports[supportKey] || []

                      return (
                        <div key={indIndex} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground mt-2 font-mono w-8">
                              {reqIndex + 1}.{indIndex + 1}
                            </span>
                            <div className="relative flex-1">
                              <ExpandableTextarea
                                ref={
                                  indIndex === requirement.indicators.length - 1
                                    ? (el) => {
                                        lastIndicatorRefs.current[requirement.id] = el
                                      }
                                    : null
                                }
                                value={indicator}
                                onChange={(value) => updateIndicator(requirement.id, indIndex, value)}
                                onFocus={() => setFocusedIndicatorKey(`${requirement.id}-${indIndex}`)}
                                onBlur={() => setFocusedIndicatorKey(null)}
                                placeholder="输入指标点内容"
                                maxLength={200}
                                rows={4}
                                expandThreshold={50}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCourseSelectorForIndicator(requirement.id, indIndex)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="设置课程支撑关系"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            {requirement.indicators.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeIndicator(requirement.id, indIndex)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {coursesForIndicator.length > 0 && (
                            <div className="ml-8 mt-3 grid grid-cols-5 gap-2">
                              {coursesForIndicator.map((courseSupport) => (
                                <div
                                  key={courseSupport.courseId}
                                  className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-lg border border-border text-xs group hover:shadow-md transition-shadow"
                                  title={courseSupport.courseName}
                                >
                                  <span className="font-medium flex-1 truncate">{courseSupport.courseName}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 text-white ${
                                      courseSupport.supportLevel === "strong" ? "bg-orange-500" : "bg-green-500"
                                    }`}
                                  >
                                    {courseSupport.supportLevel === "strong" ? "强支撑" : "弱支撑"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeIndicatorCourseSupport(requirement.id, indIndex, courseSupport.courseId)
                                    }
                                    className="text-muted-foreground hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CourseSelector对话框 */}
      {useMemo(
        () => (
          <CourseSelector
            open={courseSelectorOpen}
            onOpenChange={(open) => {
              setCourseSelectorOpen(open)
            }}
            majorId={majorId || ""}
            majorName={majorName}
            departmentId={departmentId}
            onSaveCourses={handleSaveCoursesForIndicator}
            initialSupport={
              selectedIndicatorForCourse
                ? Object.fromEntries(
                    (
                      indicatorCourseSupports[
                        `${selectedIndicatorForCourse.requirementId}-${selectedIndicatorForCourse.indicatorIndex}`
                      ] || []
                    ).map((item) => [item.courseId, item.supportLevel])
                  )
                : undefined
            }
          />
        ),
        [
          selectedIndicatorForCourse,
          courseSelectorOpen,
          majorId,
          majorName,
          departmentId,
          handleSaveCoursesForIndicator,
          indicatorCourseSupports,
        ]
      )}
    </>
  )
}
