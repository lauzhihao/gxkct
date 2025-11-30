/**
 * 专业基础信息Section
 * 负责专业基本信息的输入：专业类别、名称、层次、特色
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { X } from "lucide-react"

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
              {majorCode && (
                <button
                  type="button"
                  onClick={() => setMajorCode("")}
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
              {majorName && (
                <button
                  type="button"
                  onClick={() => setMajorName("")}
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
            <Button
              type="button"
              variant={majorLevel === "1" ? "default" : "outline"}
              className="justify-center"
              onClick={() => setMajorLevel("1")}
            >
              本科
            </Button>
            <Button
              type="button"
              variant={majorLevel === "2" ? "default" : "outline"}
              className="justify-center"
              onClick={() => setMajorLevel("2")}
            >
              高职
            </Button>
            <Button
              type="button"
              variant={majorLevel === "3" ? "default" : "outline"}
              className="justify-center"
              onClick={() => setMajorLevel("3")}
            >
              中职
            </Button>
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
              {educationalFeatures && (
                <button
                  type="button"
                  onClick={() => setEducationalFeatures("")}
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
