/**
 * 专业基础信息Section
 * 负责专业基本信息的输入：专业类别、名称、层次、特色
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { FieldError } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import type { MajorBasicInfoSectionProps } from "@/modules/majors/types/components"
import { X } from "lucide-react"
import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react"

export type {
  MajorBasicInfoErrors,
  MajorBasicInfoField,
} from "@/modules/majors/types/components"

const MAJOR_CODE_ERROR_ID = "major-code-error"
const MAJOR_NAME_ERROR_ID = "major-name-error"
const MAJOR_LEVEL_LABEL_ID = "major-level-label"
const MAJOR_LEVEL_ERROR_ID = "major-level-error"
const EDUCATIONAL_FEATURES_ERROR_ID = "educational-features-error"
const MAJOR_LEVEL_OPTIONS = [
  { value: "2", label: "本科" },
  { value: "1", label: "高职" },
  { value: "0", label: "中职" },
] as const

type MajorLevelValue = (typeof MAJOR_LEVEL_OPTIONS)[number]["value"]

export function MajorBasicInfoSection({
  majorCode,
  majorName,
  majorLevel,
  educationalFeatures,
  setMajorCode,
  setMajorName,
  setMajorLevel,
  setEducationalFeatures,
  errors,
  validationAttempt,
  focusField,
  onFieldValidationChange,
}: MajorBasicInfoSectionProps) {
  const majorCodeRef = useRef<HTMLInputElement>(null)
  const majorNameRef = useRef<HTMLInputElement>(null)
  const majorLevelOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const educationalFeaturesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (validationAttempt === 0) {
      return
    }

    if (focusField === null) {
      return
    }

    switch (focusField) {
      case "majorCode":
        majorCodeRef.current?.focus()
        return
      case "majorName":
        majorNameRef.current?.focus()
        return
      case "majorLevel":
        majorLevelOptionRefs.current[0]?.focus()
        return
      case "educationalFeatures":
        educationalFeaturesRef.current?.focus()
    }
  }, [focusField, validationAttempt])

  const handleMajorCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.slice(0, 20)
    setMajorCode(nextValue)
    onFieldValidationChange("majorCode", nextValue)
  }

  const handleMajorNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.slice(0, 20)
    setMajorName(nextValue)
    onFieldValidationChange("majorName", nextValue)
  }

  const handleEducationalFeaturesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value.slice(0, 200)
    setEducationalFeatures(nextValue)
    onFieldValidationChange("educationalFeatures", nextValue)
  }

  const handleClearMajorCode = () => {
    setMajorCode("")
    onFieldValidationChange("majorCode", "")
  }

  const handleClearMajorName = () => {
    setMajorName("")
    onFieldValidationChange("majorName", "")
  }

  const handleSetMajorLevel = (level: MajorLevelValue) => {
    setMajorLevel(level)
    onFieldValidationChange("majorLevel", level)
  }

  const handleMajorLevelKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex: number | null = null

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % MAJOR_LEVEL_OPTIONS.length
        break
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + MAJOR_LEVEL_OPTIONS.length) % MAJOR_LEVEL_OPTIONS.length
        break
      case "Home":
        nextIndex = 0
        break
      case "End":
        nextIndex = MAJOR_LEVEL_OPTIONS.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const nextOption = MAJOR_LEVEL_OPTIONS[nextIndex]
    handleSetMajorLevel(nextOption.value)
    majorLevelOptionRefs.current[nextIndex]?.focus()
  }

  const handleClearEducationalFeatures = () => {
    setEducationalFeatures("")
    onFieldValidationChange("educationalFeatures", "")
  }

  const majorCodeError = errors.majorCode
  const majorNameError = errors.majorName
  const majorLevelError = errors.majorLevel
  const educationalFeaturesError = errors.educationalFeatures
  const selectedMajorLevelIndex = MAJOR_LEVEL_OPTIONS.findIndex(
    (option) => option.value === majorLevel
  )
  const tabbableMajorLevelIndex = selectedMajorLevelIndex >= 0 ? selectedMajorLevelIndex : 0

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
              ref={majorCodeRef}
              id="major-code"
              placeholder="例如：120204"
              value={majorCode}
              onChange={handleMajorCodeChange}
              maxLength={20}
              className="pr-20"
              aria-invalid={majorCodeError !== undefined}
              aria-required={true}
              aria-describedby={majorCodeError !== undefined ? MAJOR_CODE_ERROR_ID : undefined}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{majorCode.length}/20</span>
              {majorCode && (
                <button
                  type="button"
                  onClick={handleClearMajorCode}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="清空专业类别"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {majorCodeError !== undefined && (
            <FieldError id={MAJOR_CODE_ERROR_ID}>{majorCodeError}</FieldError>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="major-name">
            专业名称 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              ref={majorNameRef}
              id="major-name"
              placeholder="例如：计算机科学与技术"
              value={majorName}
              onChange={handleMajorNameChange}
              maxLength={20}
              className="pr-20"
              aria-invalid={majorNameError !== undefined}
              aria-required={true}
              aria-describedby={majorNameError !== undefined ? MAJOR_NAME_ERROR_ID : undefined}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{majorName.length}/20</span>
              {majorName && (
                <button
                  type="button"
                  onClick={handleClearMajorName}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="清空专业名称"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {majorNameError !== undefined && (
            <FieldError id={MAJOR_NAME_ERROR_ID}>{majorNameError}</FieldError>
          )}
        </div>

        <div className="space-y-2">
          <Label id={MAJOR_LEVEL_LABEL_ID}>
            专业层次 <span className="text-red-500">*</span>
          </Label>
          <div
            className={
              majorLevelError !== undefined
                ? "flex flex-col gap-2 rounded-md border border-destructive p-2"
                : "flex flex-col gap-2"
            }
            role="radiogroup"
            aria-labelledby={MAJOR_LEVEL_LABEL_ID}
            aria-required={true}
            aria-invalid={majorLevelError !== undefined}
            aria-describedby={majorLevelError !== undefined ? MAJOR_LEVEL_ERROR_ID : undefined}
          >
            {MAJOR_LEVEL_OPTIONS.map((option, index) => (
              <Button
                key={option.value}
                ref={(node) => {
                  majorLevelOptionRefs.current[index] = node
                }}
                type="button"
                variant={majorLevel === option.value ? "default" : "outline"}
                className="justify-center"
                onClick={() => handleSetMajorLevel(option.value)}
                onKeyDown={(event) => handleMajorLevelKeyDown(event, index)}
                role="radio"
                aria-checked={majorLevel === option.value}
                aria-describedby={
                  majorLevelError !== undefined ? MAJOR_LEVEL_ERROR_ID : undefined
                }
                tabIndex={tabbableMajorLevelIndex === index ? 0 : -1}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {majorLevelError !== undefined && (
            <FieldError id={MAJOR_LEVEL_ERROR_ID}>{majorLevelError}</FieldError>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="educational-features">
            专业特色 <span className="text-red-500">*</span>
          </Label>
          <div className="relative h-[120px]">
            <Textarea
              ref={educationalFeaturesRef}
              id="educational-features"
              placeholder="简要描述专业的特色和优势"
              value={educationalFeatures}
              onChange={handleEducationalFeaturesChange}
              maxLength={200}
              className="pr-20 h-full resize-none"
              aria-invalid={educationalFeaturesError !== undefined}
              aria-required={true}
              aria-describedby={
                educationalFeaturesError !== undefined ? EDUCATIONAL_FEATURES_ERROR_ID : undefined
              }
            />
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{educationalFeatures.length}/200</span>
              {educationalFeatures && (
                <button
                  type="button"
                  onClick={handleClearEducationalFeatures}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="清空专业特色"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {educationalFeaturesError !== undefined && (
            <FieldError id={EDUCATIONAL_FEATURES_ERROR_ID}>
              {educationalFeaturesError}
            </FieldError>
          )}
        </div>
      </div>
    </div>
  )
}
