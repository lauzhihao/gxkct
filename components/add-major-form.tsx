"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import worksJsonData from "@/mock-data/works.json"

interface WorkCategory {
  value: string
  label: string
  children: WorkCategory[]
}

interface WorksData {
  code: string
  message: string
  data: WorkCategory[]
}

interface CareerInfo {
  id: string
  level: string
  direction: {
    category1: string
    category2: string
    category3: string
    category4: string
  }
  tasks: string
}

interface GraduationRequirement {
  id: string
  content: string
  indicators: string[]
}

interface AddMajorFormProps {
  departmentId: string
  onCancel: () => void
  onSubmit: (majorData: any) => void
  initialData?: any
  isEditMode?: boolean
}

const provinces = [
  "北京市",
  "天津市",
  "河北省",
  "山西省",
  "内蒙古自治区",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "上海市",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "广西壮族自治区",
  "海南省",
  "重庆市",
  "四川省",
  "贵州省",
  "云南省",
  "西藏自治区",
  "陕西省",
  "甘肃省",
  "青海省",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "台湾省",
  "香港特别行政区",
  "澳门特别行政区",
]

export function AddMajorForm({ departmentId, onCancel, onSubmit, initialData, isEditMode = false }: AddMajorFormProps) {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)

  // 从导入的JSON文件中获取职业方向数据
  const worksData = (worksJsonData as WorksData).data || []

  const [majorCode, setMajorCode] = useState(initialData?.metadata?.code || "")
  const [majorName, setMajorName] = useState(initialData?.name || "")
  const [majorLevel, setMajorLevel] = useState(initialData?.metadata?.level || "本科")
  const [educationalFeatures, setEducationalFeatures] = useState(initialData?.description || "")

  const [careerInfoList, setCareerInfoList] = useState<CareerInfo[]>(
    initialData?.metadata?.careerInfo || [
      {
        id: "1",
        level: "中级",
        direction: { category1: "", category2: "", category3: "", category4: "" },
        tasks: "",
      },
    ],
  )

  // 职业方向搜索相关状态
  const [careerSearchMap, setCareerSearchMap] = useState<{ [key: string]: string }>({})
  const [careerPopoverOpenMap, setCareerPopoverOpenMap] = useState<{ [key: string]: boolean }>({})

  const [demandStatus, setDemandStatus] = useState(initialData?.metadata?.demandStatus || "全部状况")
  const [selectedProvince, setSelectedProvince] = useState(initialData?.metadata?.selectedProvince || "")
  const [provinceSearch, setProvinceSearch] = useState("")
  const [provincePopoverOpen, setProvincePopoverOpen] = useState(false)
  const [trainingObjectives, setTrainingObjectives] = useState(initialData?.metadata?.trainingObjectives || "")

  const [graduationRequirements, setGraduationRequirements] = useState<GraduationRequirement[]>(
    initialData?.metadata?.graduationRequirements || [{ id: "1", content: "", indicators: [""] }],
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const lastRequirementRef = useRef<HTMLInputElement>(null)
  const lastIndicatorRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // 根据选择的分类获取子分类
  const getCategory2Options = (category1Label: string): WorkCategory[] => {
    const category1 = worksData.find(item => item.label === category1Label)
    return category1?.children || []
  }

  const getCategory3Options = (category1Label: string, category2Label: string): WorkCategory[] => {
    const category1 = worksData.find(item => item.label === category1Label)
    const category2 = category1?.children.find(item => item.label === category2Label)
    return category2?.children || []
  }

  const getCategory4Options = (category1Label: string, category2Label: string, category3Label: string): WorkCategory[] => {
    const category1 = worksData.find(item => item.label === category1Label)
    const category2 = category1?.children.find(item => item.label === category2Label)
    const category3 = category2?.children.find(item => item.label === category3Label)
    return category3?.children || []
  }

  // 搜索职业方向（递归搜索所有层级，只返回第4级的完整路径）
  interface SearchResult {
    category1: WorkCategory
    category2: WorkCategory
    category3: WorkCategory
    category4: WorkCategory
    matchedText: string // 匹配到的文本
    matchLevel: number // 1-4 表示匹配在第几级
  }

  const searchCareerDirection = (searchText: string): SearchResult[] => {
    if (!searchText.trim()) return []

    const results: SearchResult[] = []
    const lowerSearch = searchText.toLowerCase()

    worksData.forEach(cat1 => {
      cat1.children?.forEach(cat2 => {
        cat2.children?.forEach(cat3 => {
          cat3.children?.forEach(cat4 => {
            // 检查任意层级是否匹配
            let matchLevel = 0
            let matchedText = ''

            if (cat4.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 4
              matchedText = cat4.label
            } else if (cat3.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 3
              matchedText = cat3.label
            } else if (cat2.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 2
              matchedText = cat2.label
            } else if (cat1.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 1
              matchedText = cat1.label
            }

            if (matchLevel > 0) {
              results.push({
                category1: cat1,
                category2: cat2,
                category3: cat3,
                category4: cat4,
                matchedText,
                matchLevel
              })
            }
          })
        })
      })
    })

    return results
  }

  // 高亮搜索文本
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text

    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase()
        ? <mark key={index} className="bg-yellow-200 text-black group-hover:bg-yellow-400 group-hover:text-white">{part}</mark>
        : part
    )
  }

  const addCareerInfo = () => {
    setCareerInfoList([
      ...careerInfoList,
      {
        id: Date.now().toString(),
        level: "中级",
        direction: { category1: "", category2: "", category3: "", category4: "" },
        tasks: "",
      },
    ])
  }

  const removeCareerInfo = (id: string) => {
    if (careerInfoList.length > 1) {
      setCareerInfoList(careerInfoList.filter((item) => item.id !== id))
    }
  }

  const updateCareerInfo = (id: string, field: string, value: any) => {
    setCareerInfoList(careerInfoList.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const addGraduationRequirement = () => {
    const newId = Date.now().toString()
    setGraduationRequirements([...graduationRequirements, { id: newId, content: "", indicators: [""] }])
    setTimeout(() => {
      lastRequirementRef.current?.focus()
    }, 0)
  }

  const removeGraduationRequirement = (id: string) => {
    if (graduationRequirements.length > 1) {
      setGraduationRequirements(graduationRequirements.filter((req) => req.id !== id))
    }
  }

  const updateGraduationRequirement = (id: string, content: string) => {
    setGraduationRequirements(graduationRequirements.map((req) => (req.id === id ? { ...req, content } : req)))
  }

  const addIndicator = (reqId: string) => {
    setGraduationRequirements(
      graduationRequirements.map((req) => (req.id === reqId ? { ...req, indicators: [...req.indicators, ""] } : req)),
    )
    setTimeout(() => {
      lastIndicatorRefs.current[reqId]?.focus()
    }, 0)
  }

  const removeIndicator = (reqId: string, index: number) => {
    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId ? { ...req, indicators: req.indicators.filter((_, i) => i !== index) } : req,
      ),
    )
  }

  const updateIndicator = (reqId: string, index: number, value: string) => {
    setGraduationRequirements(
      graduationRequirements.map((req) =>
        req.id === reqId
          ? {
              ...req,
              indicators: req.indicators.map((ind, i) => (i === index ? value : ind)),
            }
          : req,
      ),
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      // TODO: Parse Excel file and populate graduation requirements
    }
  }

  const handleSubmit = () => {
    setIsLoading(true)

    if (!majorCode.trim() || !majorName.trim() || !educationalFeatures.trim()) {
      toast({
        variant: "destructive",
        title: "表单验证失败",
        description: "请完整填写表单内容",
        duration: 5000,
      })
      setIsLoading(false)
      return
    }

    const majorData = {
      name: majorName,
      type: "major" as const,
      description: educationalFeatures,
      metadata: {
        code: majorCode,
        level: majorLevel,
        careerInfo: careerInfoList,
        demandStatus,
        selectedProvince,
        trainingObjectives,
        graduationRequirements,
      },
      children: initialData?.children || [],
    }

    setTimeout(() => {
      toast({
        variant: "success",
        title: "保存成功",
        description: isEditMode ? "专业信息已成功更新" : "专业信息已成功保存",
        duration: 3000, // Updated success toast duration to 3 seconds
      })
      onSubmit(majorData)
      setIsLoading(false)
    }, 1000)
  }

  const filteredProvinces = provinces.filter((province) =>
    province.toLowerCase().includes(provinceSearch.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h2 className="text-xl font-bold text-foreground">{isEditMode ? "编辑专业" : "新增专业"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} className="gap-2 bg-transparent" disabled={isLoading}>
            <X className="w-4 h-4" />
            取消
          </Button>
          <Button onClick={handleSubmit} className="gap-2" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
            <h3 className="text-base font-semibold text-foreground">专业信息</h3>
          </div>
          <div className="border-t border-dashed border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="major-code">
                专业代码 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="major-code"
                  placeholder="例如：080901"
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
                  variant={majorLevel === "本科" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => setMajorLevel("本科")}
                >
                  本科
                </Button>
                <Button
                  type="button"
                  variant={majorLevel === "高职" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => setMajorLevel("高职")}
                >
                  高职
                </Button>
                <Button
                  type="button"
                  variant={majorLevel === "中职" ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => setMajorLevel("中职")}
                >
                  中职
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educational-features">
                办学特色 <span className="text-red-500">*</span>
              </Label>
              <div className="relative h-[120px]">
                <Textarea
                  id="educational-features"
                  placeholder="简要描述专业的办学特色和优势"
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
              <h3 className="text-base font-semibold text-foreground">职业信息</h3>
            </div>
            <Button size="sm" variant="outline" onClick={addCareerInfo} className="gap-2 bg-transparent">
              <Plus className="w-4 h-4" />
              添加职业信息
            </Button>
          </div>
          <div className="border-t border-dashed border-border" />
          <div className="space-y-4">
            {careerInfoList.map((careerInfo, index) => (
              <div key={careerInfo.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">职业信息 {index + 1}</span>
                  {careerInfoList.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCareerInfo(careerInfo.id)}
                      className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>职业方向</Label>
                    <Popover
                      open={careerPopoverOpenMap[careerInfo.id]}
                      onOpenChange={(open) => {
                        setCareerPopoverOpenMap(prev => ({ ...prev, [careerInfo.id]: open }))
                        if (!open) {
                          setCareerSearchMap(prev => ({ ...prev, [careerInfo.id]: '' }))
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-transparent">
                          <span className="truncate">
                            {careerInfo.direction.category1 &&
                            careerInfo.direction.category2 &&
                            careerInfo.direction.category3 &&
                            careerInfo.direction.category4
                              ? `${careerInfo.direction.category1}/${careerInfo.direction.category2}/${careerInfo.direction.category3}/${careerInfo.direction.category4}`
                              : "请选择职业方向"}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-2 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        {/* 搜索框 */}
                        <div className="p-3 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="搜索职业方向..."
                              value={careerSearchMap[careerInfo.id] || ''}
                              onChange={(e) => setCareerSearchMap(prev => ({ ...prev, [careerInfo.id]: e.target.value }))}
                              className="pl-8 h-8"
                            />
                          </div>
                        </div>

                        {/* 搜索结果 */}
                        {careerSearchMap[careerInfo.id]?.trim() ? (
                          <div className="p-2 max-h-[400px] overflow-y-auto w-[500px]">
                            {searchCareerDirection(careerSearchMap[careerInfo.id]).length > 0 ? (
                              <div className="space-y-1">
                                {searchCareerDirection(careerSearchMap[careerInfo.id]).map((result, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      updateCareerInfo(careerInfo.id, "direction", {
                                        category1: result.category1.label,
                                        category2: result.category2.label,
                                        category3: result.category3.label,
                                        category4: result.category4.label,
                                      })
                                      setCareerPopoverOpenMap(prev => ({ ...prev, [careerInfo.id]: false }))
                                      setCareerSearchMap(prev => ({ ...prev, [careerInfo.id]: '' }))
                                    }}
                                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-primary transition-colors group"
                                  >
                                    <div className="flex items-center gap-2 text-xs group-hover:text-white/90">
                                      <span className={result.matchLevel === 1 ? 'font-medium' : ''}>
                                        {result.matchLevel === 1 ? highlightText(result.category1.label, careerSearchMap[careerInfo.id]) : result.category1.label}
                                      </span>
                                      <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                      <span className={result.matchLevel === 2 ? 'font-medium' : ''}>
                                        {result.matchLevel === 2 ? highlightText(result.category2.label, careerSearchMap[careerInfo.id]) : result.category2.label}
                                      </span>
                                      <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                      <span className={result.matchLevel === 3 ? 'font-medium' : ''}>
                                        {result.matchLevel === 3 ? highlightText(result.category3.label, careerSearchMap[careerInfo.id]) : result.category3.label}
                                      </span>
                                      <span className="text-muted-foreground group-hover:text-white/60">/</span>
                                      <span className={result.matchLevel === 4 ? 'font-medium' : ''}>
                                        {result.matchLevel === 4 ? highlightText(result.category4.label, careerSearchMap[careerInfo.id]) : result.category4.label}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                未找到匹配的职业方向
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 级联选择器 */
                          <div className="flex divide-x">
                            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                              {worksData.map((category) => (
                                <button
                                  key={category.value}
                                  onClick={() =>
                                    updateCareerInfo(careerInfo.id, "direction", {
                                      category1: category.label,
                                      category2: "",
                                      category3: "",
                                      category4: "",
                                    })
                                  }
                                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                    careerInfo.direction.category1 === category.label
                                      ? "bg-primary text-white"
                                      : "hover:bg-primary hover:text-white"
                                  }`}
                                >
                                  <span className="flex-1 break-words pr-2">{category.label}</span>
                                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                </button>
                              ))}
                            </div>

                            {careerInfo.direction.category1 && (
                              <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                                {getCategory2Options(careerInfo.direction.category1).map((category) => (
                                  <button
                                    key={category.value}
                                    onClick={() =>
                                      updateCareerInfo(careerInfo.id, "direction", {
                                        ...careerInfo.direction,
                                        category2: category.label,
                                        category3: "",
                                        category4: "",
                                      })
                                    }
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                      careerInfo.direction.category2 === category.label
                                        ? "bg-primary text-white"
                                        : "hover:bg-primary hover:text-white"
                                    }`}
                                  >
                                    <span className="flex-1 break-words pr-2">{category.label}</span>
                                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {careerInfo.direction.category1 && careerInfo.direction.category2 && (
                              <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                                {getCategory3Options(careerInfo.direction.category1, careerInfo.direction.category2).map((category) => (
                                  <button
                                    key={category.value}
                                    onClick={() =>
                                      updateCareerInfo(careerInfo.id, "direction", {
                                        ...careerInfo.direction,
                                        category3: category.label,
                                        category4: "",
                                      })
                                    }
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                                      careerInfo.direction.category3 === category.label
                                        ? "bg-primary text-white"
                                        : "hover:bg-primary hover:text-white"
                                    }`}
                                  >
                                    <span className="flex-1 break-words pr-2">{category.label}</span>
                                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {careerInfo.direction.category1 &&
                              careerInfo.direction.category2 &&
                              careerInfo.direction.category3 && (
                                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto min-w-[180px] max-w-[280px]">
                                  {getCategory4Options(
                                    careerInfo.direction.category1,
                                    careerInfo.direction.category2,
                                    careerInfo.direction.category3
                                  ).map((category) => (
                                    <button
                                      key={category.value}
                                      onClick={() => {
                                        updateCareerInfo(careerInfo.id, "direction", {
                                          ...careerInfo.direction,
                                          category4: category.label,
                                        })
                                        setCareerPopoverOpenMap(prev => ({ ...prev, [careerInfo.id]: false }))
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                                        careerInfo.direction.category4 === category.label
                                          ? "bg-primary text-white"
                                          : "hover:bg-primary hover:text-white"
                                      }`}
                                    >
                                      <span className="flex-1 break-words">{category.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>职业级别</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={careerInfo.level === "高级" ? "default" : "outline"}
                        onClick={() => updateCareerInfo(careerInfo.id, "level", "高级")}
                        className="flex-1"
                      >
                        高级
                      </Button>
                      <Button
                        type="button"
                        variant={careerInfo.level === "中级" ? "default" : "outline"}
                        onClick={() => updateCareerInfo(careerInfo.id, "level", "中级")}
                        className="flex-1"
                      >
                        中级
                      </Button>
                      <Button
                        type="button"
                        variant={careerInfo.level === "初级" ? "default" : "outline"}
                        onClick={() => updateCareerInfo(careerInfo.id, "level", "初级")}
                        className="flex-1"
                      >
                        初级
                      </Button>
                      <Button
                        type="button"
                        variant={careerInfo.level === "无定级" ? "default" : "outline"}
                        onClick={() => updateCareerInfo(careerInfo.id, "level", "无定级")}
                        className="flex-1"
                      >
                        无定级
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>工作任务</Label>
                    <div className="relative">
                      <Textarea
                        placeholder="描述该职业方向的主要工作任务"
                        rows={3}
                        value={careerInfo.tasks}
                        onChange={(e) => updateCareerInfo(careerInfo.id, "tasks", e.target.value.slice(0, 200))}
                        maxLength={200}
                        className="pr-20"
                      />
                      <div className="absolute right-2 top-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{careerInfo.tasks.length}/200</span>
                        {careerInfo.tasks && (
                          <button
                            type="button"
                            onClick={() => updateCareerInfo(careerInfo.id, "tasks", "")}
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
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
            <h3 className="text-base font-semibold text-foreground">职业培养信息</h3>
          </div>
          <div className="border-t border-dashed border-border" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>需求状况</Label>
              <div className="flex gap-2">
                <div className="flex gap-2 w-1/2">
                  <Button
                    type="button"
                    variant={demandStatus === "全部状况" ? "default" : "outline"}
                    onClick={() => {
                      setDemandStatus("全部状况")
                      setSelectedProvince("")
                    }}
                    className="flex-1"
                  >
                    全部状况
                  </Button>
                  <Button
                    type="button"
                    variant={demandStatus === "全国紧缺" ? "default" : "outline"}
                    onClick={() => {
                      setDemandStatus("全国紧缺")
                      setSelectedProvince("")
                    }}
                    className="flex-1"
                  >
                    全国紧缺
                  </Button>
                  <Button
                    type="button"
                    variant={demandStatus === "地方紧缺" ? "default" : "outline"}
                    onClick={() => setDemandStatus("地方紧缺")}
                    className="flex-1"
                  >
                    地方紧缺
                  </Button>
                </div>
                {demandStatus === "地方紧缺" && (
                  <div className="w-1/4">
                    <Popover open={provincePopoverOpen} onOpenChange={setProvincePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-transparent">
                          <span className="truncate">{selectedProvince || "请选择省份"}</span>
                          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="flex flex-col">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="搜索省份..."
                                value={provinceSearch}
                                onChange={(e) => setProvinceSearch(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-2">
                            {filteredProvinces.length > 0 ? (
                              filteredProvinces.map((province) => (
                                <button
                                  key={province}
                                  onClick={() => {
                                    setSelectedProvince(province)
                                    setProvincePopoverOpen(false)
                                    setProvinceSearch("")
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent hover:text-white ${
                                    selectedProvince === province ? "bg-[var(--naive-primary)] text-white" : ""
                                  }`}
                                >
                                  {province}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                未找到匹配的省份
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-objectives">培养目标</Label>
              <div className="relative">
                <Textarea
                  id="training-objectives"
                  placeholder="描述专业的培养目标和人才培养定位"
                  rows={4}
                  value={trainingObjectives}
                  onChange={(e) => setTrainingObjectives(e.target.value.slice(0, 200))}
                  maxLength={200}
                  className="pr-20"
                />
                <div className="absolute right-2 top-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{trainingObjectives.length}/200</span>
                  {trainingObjectives && (
                    <button
                      type="button"
                      onClick={() => setTrainingObjectives("")}
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
              <h3 className="text-base font-semibold text-foreground">毕业要求</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addGraduationRequirement} className="gap-2 bg-transparent">
                <Plus className="w-4 h-4" />
                添加毕业要求
              </Button>
              <Button size="sm" variant="outline" className="gap-2 bg-transparent" asChild>
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4" />
                  上传Excel
                  <input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
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
                        <Input
                          ref={reqIndex === graduationRequirements.length - 1 ? lastRequirementRef : null}
                          placeholder="输入毕业要求内容（最多200字）"
                          value={requirement.content}
                          onChange={(e) => updateGraduationRequirement(requirement.id, e.target.value.slice(0, 200))}
                          maxLength={200}
                          className="pr-20"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{requirement.content.length}/200</span>
                          {requirement.content && (
                            <button
                              type="button"
                              onClick={() => updateGraduationRequirement(requirement.id, "")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
                      {requirement.indicators.map((indicator, indIndex) => (
                        <div key={indIndex} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {reqIndex + 1}.{indIndex + 1}
                          </span>
                          <div className="relative flex-1">
                            <Input
                              ref={
                                indIndex === requirement.indicators.length - 1
                                  ? (el) => {
                                      lastIndicatorRefs.current[requirement.id] = el
                                    }
                                  : null
                              }
                              placeholder="输入指标点内容"
                              value={indicator}
                              onChange={(e) => updateIndicator(requirement.id, indIndex, e.target.value.slice(0, 200))}
                              maxLength={200}
                              className="h-9 text-sm pr-20"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{indicator.length}/200</span>
                              {indicator && (
                                <button
                                  type="button"
                                  onClick={() => updateIndicator(requirement.id, indIndex, "")}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
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
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2 pb-6">
        <Button variant="outline" onClick={onCancel} className="gap-2 bg-transparent" disabled={isLoading}>
          <X className="w-4 h-4" />
          取消
        </Button>
        <Button onClick={handleSubmit} className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          保存
        </Button>
      </div>
    </div>
  )
}
