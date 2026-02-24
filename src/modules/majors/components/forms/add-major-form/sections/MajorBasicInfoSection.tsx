/**
 * 专业基础信息Section
 * 负责专业基本信息的输入：专业类别、名称、层次、特色
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { X } from "lucide-react"

const MANAGE_MAJOR_ACTION: PermissionAction = "department.major.create"
const MANAGE_MAJOR_CONTEXT = { scope: "department" as const }

interface MajorBasicInfoSectionProps {
  majorCode: string
  majorName: string
  majorLevel: string
  educationalFeatures: string
  setMajorCode: (value: string) => void
  setMajorName: (value: string) => void
  setMajorLevel: (value: string) => void
  setEducationalFeatures: (value: string) => void
}

export function MajorBasicInfoSection({
  majorCode,
  majorName,
  majorLevel,
  educationalFeatures,
  setMajorCode,
  setMajorName,
  setMajorLevel,
  setEducationalFeatures,
}: MajorBasicInfoSectionProps) {
  const { can } = usePermission()
  const canManageMajor = can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)

  const handleClearMajorCode = () => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    setMajorCode("")
  }

  const handleClearMajorName = () => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    setMajorName("")
  }

  const handleSetMajorLevel = (level: string) => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    setMajorLevel(level)
  }

  const handleClearEducationalFeatures = () => {
    if (!can(MANAGE_MAJOR_ACTION, MANAGE_MAJOR_CONTEXT)) return
    setEducationalFeatures("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
        <h3 className="text-base font-semibold text-foreground">专业信息</h3>
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="major-code">
            专业类别 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="major-code"
              placeholder="例如：120204"
              value={majorCode}
              onChange={(e) => setMajorCode(e.target.value.slice(0, 20))}
              maxLength={20}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{majorCode.length}/20</span>
              {canManageMajor && majorCode && (
                <button
                  type="button"
                  onClick={handleClearMajorCode}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="major-name">
            专业名称 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="major-name"
              placeholder="例如：计算机科学与技术"
              value={majorName}
              onChange={(e) => setMajorName(e.target.value.slice(0, 20))}
              maxLength={20}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{majorName.length}/20</span>
              {canManageMajor && majorName && (
                <button
                  type="button"
                  onClick={handleClearMajorName}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            专业层次 <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-col gap-2">
            {canManageMajor && (
              <>
                <Button
                  type="button"
                  variant={majorLevel === "1" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => handleSetMajorLevel("1")}
                >
                  本科
                </Button>
                <Button
                  type="button"
                  variant={majorLevel === "2" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => handleSetMajorLevel("2")}
                >
                  高职
                </Button>
                <Button
                  type="button"
                  variant={majorLevel === "3" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => handleSetMajorLevel("3")}
                >
                  中职
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="educational-features">
            专业特色 <span className="text-red-500">*</span>
          </Label>
          <div className="relative h-[120px]">
            <Textarea
              id="educational-features"
              placeholder="简要描述专业的特色和优势"
              value={educationalFeatures}
              onChange={(e) => setEducationalFeatures(e.target.value.slice(0, 200))}
              maxLength={200}
              className="pr-20 h-full resize-none"
            />
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{educationalFeatures.length}/200</span>
              {canManageMajor && educationalFeatures && (
                <button
                  type="button"
                  onClick={handleClearEducationalFeatures}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
