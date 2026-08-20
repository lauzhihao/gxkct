/**
 * 毕业要求Section
 * 负责毕业要求及指标点的管理，包括指标点与课程的支撑关系设置
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Plus, Trash2, Search, X, FileSpreadsheet } from "lucide-react"
import { FileUpload } from "@/shared/components/ui/file-upload"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover"
import { SupportLabel } from "@/shared/components/support-label"
import { useSemesterReadonly } from "@/shared/hooks/use-semester-readonly"
import type { UseGraduationRequirementsResult } from "@/modules/majors/hooks/use-graduation-requirements"
import type { UseMajorFormStateResult } from "@/modules/majors/hooks/use-major-form-state"

type ToastInvoker = (options: {
  title: string
  description: string
  duration?: number
}) => void

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
  toast: ToastInvoker
  onUploadGraduationRequirements: (files: File[]) => Promise<string[]>
  onDownloadGraduationTemplate: () => Promise<void>
  isUploadDisabled: boolean
}

export function GraduationRequirementsSection({
  graduationReqs,
  formState,
  isEditMode,
  majorName,
  majorId,
  departmentId,
  toast,
  onUploadGraduationRequirements,
  onDownloadGraduationTemplate,
  isUploadDisabled,
}: GraduationRequirementsSectionProps) {
  void isEditMode
  void majorName
  void majorId
  void departmentId
  void toast

  const {
    graduationRequirements,
    indicatorCourseSupports,
    addGraduationRequirement,
    updateGraduationRequirement,
    removeGraduationRequirement,
    addIndicator,
    updateIndicator,
    removeIndicator,
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

  void focusedRequirementId
  void focusedIndicatorKey

  const isSemesterReadonly = useSemesterReadonly()

  const handleAddGraduationRequirement = () => {
    if (isSemesterReadonly) return
    addGraduationRequirement()
  }

  const handleRemoveGraduationRequirement = (requirementId: string) => {
    if (isSemesterReadonly) return
    removeGraduationRequirement(requirementId)
  }

  const handleAddIndicator = (requirementId: string) => {
    if (isSemesterReadonly) return
    addIndicator(requirementId)
  }

  const handleRemoveIndicator = (requirementId: string, indicatorIndex: number) => {
    if (isSemesterReadonly) return
    removeIndicator(requirementId, indicatorIndex)
  }

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
            <h3 className="text-base font-semibold text-foreground">毕业要求</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button
              size="sm"
              className="gap-2 bg-primary text-white hover:bg-primary/90"
              onClick={() => {
                // 非管理类交互: 当前仅提示，不执行数据管理操作
                toast({
                  title: "提示",
                  description: "功能开发中，敬请期待！",
                  duration: 3000,
                })
              }}
            >
              <Star className="w-4 h-4" />
              AI一键生成
            </Button> */}
            {!isSemesterReadonly && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddGraduationRequirement}
                className="gap-2 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                添加毕业要求
              </Button>
            )}
            <FileUpload
              buttonText="上传Excel"
              fileType="Excel文件"
              maxFileSize={10 * 1024 * 1024}
              maxFileCount={1}
              accept=".xlsx,.xls"
              onDownloadTemplate={onDownloadGraduationTemplate}
              onUpload={onUploadGraduationRequirements}
              disabled={isUploadDisabled || isSemesterReadonly}
            />
          </div>
        </div>
        <div className="border-t border-dashed border-border" />
        {!isUploadDisabled && !isSemesterReadonly && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-1">
            <p className="font-medium">重要提醒</p>
            <p>1、上传新的毕业要求表会覆盖原有毕业要求表，并导致该专业下所有课程的三级矩阵数据失效，请谨慎上传。</p>
            <p>2、如需小范围修改，请优先使用当前页面上方的逐条编辑能力。</p>
          </div>
        )}
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
              disabled={isSemesterReadonly}
              className="gap-2 text-red-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {graduationRequirements.map((requirement, reqIndex) => (
            <div key={requirement.id} className={`py-4 space-y-3${reqIndex > 0 ? " border-t border-dashed border-border" : ""}`}>
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
                        disabled={isSemesterReadonly}
                      />
                    </div>
                    {!isSemesterReadonly && graduationRequirements.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveGraduationRequirement(requirement.id)}
                        className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">指标点</Label>
                      {!isSemesterReadonly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddIndicator(requirement.id)}
                          className="gap-1 h-7 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          添加指标点
                        </Button>
                      )}
                    </div>
                    {requirement.indicators.map((indicator, indIndex) => {
                      const supportKey = `${requirement.id}-${indIndex}`
                      const coursesForIndicator = indicatorCourseSupports[supportKey] || []

                      return (
                        <div key={indIndex} className="py-3 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-2">
                              {reqIndex + 1}.{indIndex + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
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
                                    disabled={isSemesterReadonly}
                                  />
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                      title="查看课程支撑关系"
                                    >
                                      <Search className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-auto max-w-[400px] p-3">
                                    {coursesForIndicator.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {coursesForIndicator.map((courseSupport) => (
                                          <SupportLabel
                                            key={courseSupport.courseId}
                                            title={courseSupport.courseName}
                                            desc={courseSupport.courseName}
                                            type={courseSupport.supportLevel}
                                            size="sm"
                                            tipsPosition="top"
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">暂无课程支撑关系</p>
                                    )}
                                  </PopoverContent>
                                </Popover>
                                {!isSemesterReadonly && requirement.indicators.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveIndicator(requirement.id, indIndex)}
                                    className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
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
  )
}
