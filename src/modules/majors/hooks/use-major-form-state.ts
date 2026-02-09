/**
 * 专业表单状态管理Hook
 * 负责管理表单的基础状态和UI状态
 */

import { useState, useRef } from "react"

export interface UseMajorFormStateResult {
  // 基础信息状态
  majorCode: string
  majorName: string
  majorLevel: string
  educationalFeatures: string

  // 需求状况状态
  demandStatus: string
  selectedProvince: string
  provinceSearch: string
  provincePopoverOpen: boolean
  position: string

  // UI状态
  isLoading: boolean
  autoSaveStatus: "" | "saving" | "saved" | "failed"
  uploadedFile: File | null
  focusedRequirementId: string | null
  focusedIndicatorKey: string | null

  // Refs - 使用 | null 以匹配 useRef<T>(null) 的返回类型
  lastRequirementRef: React.RefObject<HTMLTextAreaElement | null>
  lastIndicatorRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>

  // 更新方法
  setMajorCode: (value: string) => void
  setMajorName: (value: string) => void
  setMajorLevel: (value: string) => void
  setEducationalFeatures: (value: string) => void
  setDemandStatus: (value: string) => void
  setSelectedProvince: (value: string) => void
  setProvinceSearch: (value: string) => void
  setProvincePopoverOpen: (value: boolean) => void
  setPosition: (value: string) => void
  setIsLoading: (value: boolean) => void
  setAutoSaveStatus: (value: "" | "saving" | "saved" | "failed") => void
  setUploadedFile: (value: File | null) => void
  setFocusedRequirementId: (value: string | null) => void
  setFocusedIndicatorKey: (value: string | null) => void
}

// 导出初始数据类型供其他模块使用
export interface InitialData {
  majorClass?: string
  code?: string
  name?: string
  nodeName?: string
  majorLevel?: string
  feature?: string
  demandStatus?: string
  selectedProvince?: string
  position?: string
}

// 导出 Refs 类型供其他模块使用
export type UseMajorFormStateResultRefs = Pick<
  UseMajorFormStateResult,
  "lastRequirementRef" | "lastIndicatorRefs"
>

export function useMajorFormState(initialData?: InitialData): UseMajorFormStateResult {
  // 基础信息状态 - 直接访问 initialData 的属性
  const [majorCode, setMajorCode] = useState(initialData?.majorClass || initialData?.code || "")
  const [majorName, setMajorName] = useState(initialData?.name || initialData?.nodeName || "")
  const [majorLevel, setMajorLevel] = useState(initialData?.majorLevel || "1")
  const [educationalFeatures, setEducationalFeatures] = useState(initialData?.feature || "")

  // 需求状况状态
  const [demandStatus, setDemandStatus] = useState(initialData?.demandStatus || "全部状况")
  const [selectedProvince, setSelectedProvince] = useState(initialData?.selectedProvince || "")
  const [provinceSearch, setProvinceSearch] = useState("")
  const [provincePopoverOpen, setProvincePopoverOpen] = useState(false)
  const [position, setPosition] = useState(initialData?.position || "")

  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [focusedRequirementId, setFocusedRequirementId] = useState<string | null>(null)
  const [focusedIndicatorKey, setFocusedIndicatorKey] = useState<string | null>(null)

  // Refs - 使用 | null 以匹配 useRef<T>(null) 的返回类型
  const lastRequirementRef = useRef<HTMLTextAreaElement | null>(null)
  const lastIndicatorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  return {
    majorCode,
    majorName,
    majorLevel,
    educationalFeatures,
    demandStatus,
    selectedProvince,
    provinceSearch,
    provincePopoverOpen,
    position,
    isLoading,
    autoSaveStatus,
    uploadedFile,
    focusedRequirementId,
    focusedIndicatorKey,
    lastRequirementRef,
    lastIndicatorRefs,
    setMajorCode,
    setMajorName,
    setMajorLevel,
    setEducationalFeatures,
    setDemandStatus,
    setSelectedProvince,
    setProvinceSearch,
    setProvincePopoverOpen,
    setPosition,
    setIsLoading,
    setAutoSaveStatus,
    setUploadedFile,
    setFocusedRequirementId,
    setFocusedIndicatorKey,
  }
}
