"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  Star,
  Settings,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FileUpload } from "@/components/ui/file-upload"
import { useToast } from "@/hooks/use-toast"
import { CourseSelector } from "@/components/shared/course-selector"
import { api } from "@/lib/api"
import worksJsonData from "@/mock-data/works.json"
import type { TreeNode } from "@/types"

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

interface IndicatorCourseSupport {
  courseId: string
  courseName: string
  supportLevel: "strong" | "weak"
}

interface GraduationRequirement {
  id: string
  content: string
  indicators: string[]
  indicatorCourseSupports?: Record<number, IndicatorCourseSupport[]>
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
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")
  const [isCourseSelectorOpenRef, setIsCourseSelectorOpen] = useState(false)

  // 从导入的JSON文件中获取职业方向数据
  const worksData = (worksJsonData as WorksData).data || []

  // 如果是编辑模式且initialData中有departmentId，则使用它；否则使用传入的departmentId
  const effectiveDepartmentId = isEditMode && initialData?.metadata?.departmentId ? initialData.metadata.departmentId : departmentId

  const [majorCode, setMajorCode] = useState(initialData?.metadata?.majorClass || initialData?.metadata?.code || "")
  const [majorName, setMajorName] = useState(initialData?.name || "")
  const [majorLevel, setMajorLevel] = useState(initialData?.metadata?.majorLevel || "1")
  const [educationalFeatures, setEducationalFeatures] = useState(initialData?.metadata?.feature || "")

  // 从 professionsVOS 或 careerInfo 加载职业信息
  const loadCareerInfoList = () => {
    if (initialData?.metadata?.professionsVOS && initialData.metadata.professionsVOS.length > 0) {
      // 从新格式 professionsVOS 加载
      return initialData.metadata.professionsVOS.map((professionVO: any, index: number) => ({
        id: String(professionVO.id || index + 1),
        level: "中级",
        direction: {
          category1: professionVO.profession?.[0]?.name || "",
          category2: professionVO.profession?.[1]?.name || "",
          category3: professionVO.profession?.[2]?.name || "",
          category4: professionVO.profession?.[3]?.name || "",
        },
        tasks: professionVO.task || "",
      }))
    } else if (initialData?.metadata?.careerInfo) {
      // 从旧格式 careerInfo 加载
      return initialData.metadata.careerInfo
    } else {
      // 默认值
      return [
        {
          id: "1",
          level: "中级",
          direction: { category1: "", category2: "", category3: "", category4: "" },
          tasks: "",
        },
      ]
    }
  }

  const [careerInfoList, setCareerInfoList] = useState<CareerInfo[]>(loadCareerInfoList())

  // 职业方向搜索相关状态
  const [careerSearchMap, setCareerSearchMap] = useState<{ [key: string]: string }>({})
  const [careerPopoverOpenMap, setCareerPopoverOpenMap] = useState<{ [key: string]: boolean }>({})

  const [demandStatus, setDemandStatus] = useState(initialData?.metadata?.demandStatus || "全部状况")
  const [selectedProvince, setSelectedProvince] = useState(initialData?.metadata?.selectedProvince || "")
  const [provinceSearch, setProvinceSearch] = useState("")
  const [provincePopoverOpen, setProvincePopoverOpen] = useState(false)
  const [position, setPosition] = useState(initialData?.metadata?.position || "")

  // 从 requiresVOS 或 graduationRequirements 加载毕业要求
  const loadGraduationRequirements = () => {
    if (initialData?.metadata?.requiresVOS && initialData.metadata.requiresVOS.length > 0) {
      // 从新格式 requiresVOS 加载
      return initialData.metadata.requiresVOS.map((requireVO: any) => ({
        id: String(requireVO.id),
        content: requireVO.description || "",
        indicators: requireVO.children?.map((child: any) => child.description || "") || [""],
      }))
    } else if (initialData?.metadata?.graduationRequirements) {
      // 从旧格式 graduationRequirements 加载
      return initialData.metadata.graduationRequirements
    } else {
      // 默认值
      return [{ id: "1", content: "", indicators: [""] }]
    }
  }

  const [graduationRequirements, setGraduationRequirements] = useState<GraduationRequirement[]>(
    loadGraduationRequirements(),
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // 课程选择器相关状态
  const [courseSelectorOpen, setCourseSelectorOpen] = useState(false)
  const [selectedIndicatorForCourse, setSelectedIndicatorForCourse] = useState<{
    requirementId: string
    indicatorIndex: number
  } | null>(null)
  const [indicatorCourseSupports, setIndicatorCourseSupports] = useState<
    Record<string, IndicatorCourseSupport[]>
  >({})
  const [focusedRequirementId, setFocusedRequirementId] = useState<string | null>(null)
  const [focusedIndicatorKey, setFocusedIndicatorKey] = useState<string | null>(null)

  const lastRequirementRef = useRef<HTMLInputElement>(null)
  const lastIndicatorRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const indicatorCoursesSnapshotRef = useRef<Record<string, IndicatorCourseSupport[]>>({})

  // 进入编辑模式时，加载指标点与课程的支撑关系
  useEffect(() => {
    if (isEditMode && initialData?.metadata?.majorId) {
      const loadIndicatorCourseSupports = async () => {
        try {
          const response = await api.matrices.getMajorIndicatorCourseSupports(initialData.metadata.majorId)
          if (response.data?.supports) {
            setIndicatorCourseSupports(response.data.supports)
          }
        } catch (error) {
          console.error("加载指标点课程支撑关系失败:", error)
        }
      }
      loadIndicatorCourseSupports()
    }
  }, [isEditMode, initialData?.metadata?.majorId])

  // 更新快照ref，不触发重新渲染
  useEffect(() => {
    indicatorCoursesSnapshotRef.current = indicatorCourseSupports
  }, [indicatorCourseSupports])

  // 自动保存指标点与课程的支撑关系（异步，不阻塞UI）
  useEffect(() => {
    if (!isEditMode || !initialData?.metadata?.majorId || isCourseSelectorOpenRef) return

    const majorId = initialData.metadata.majorId

    const autoSaveInterval = setInterval(() => {
      // 使用快照进行异步保存，不改变state，不触发重新渲染
      const snapshot = indicatorCoursesSnapshotRef.current

      // 在后台异步执行保存，不阻塞主线程
      Promise.resolve().then(async () => {
        try {
          setAutoSaveStatus("saving")
          await api.matrices.updateMajorIndicatorCourseSupports(
            majorId,
            snapshot
          )
          setAutoSaveStatus("saved")
          // 3秒后清除提示
          setTimeout(() => setAutoSaveStatus(""), 3000)
        } catch (error) {
          console.error("自动保存指标点课程支撑关系失败:", error)
          setAutoSaveStatus("failed")
          setTimeout(() => setAutoSaveStatus(""), 3000)
        }
      })
    }, 10000) // 每10秒自动保存一次

    return () => clearInterval(autoSaveInterval)
  }, [isEditMode, initialData?.metadata?.majorId, isCourseSelectorOpenRef])

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
      {
        id: Date.now().toString(),
        level: "中级",
        direction: { category1: "", category2: "", category3: "", category4: "" },
        tasks: "",
      },
      ...careerInfoList,
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

  // 获取职业代码
  const getOccupationCode = (category1: string, category2: string, category3: string, category4: string): string | null => {
    const cat1 = worksData.find(item => item.label === category1)
    if (!cat1) return null

    const cat2 = cat1.children?.find(item => item.label === category2)
    if (!cat2) return null

    const cat3 = cat2.children?.find(item => item.label === category3)
    if (!cat3) return null

    const cat4 = cat3.children?.find(item => item.label === category4)
    if (!cat4) return null

    return cat4.value
  }

  // 选择职业方向后调用接口获取工作职责
  const handleCareerDirectionSelect = useCallback((careerInfoId: string, category1: string, category2: string, category3: string, category4: string) => {
    // 先更新职业方向
    setCareerInfoList(prevList => prevList.map((item) =>
      item.id === careerInfoId
        ? {
            ...item,
            direction: {
              category1,
              category2,
              category3,
              category4,
            }
          }
        : item
    ))

    // 获取职业代码
    const occupationCode = getOccupationCode(category1, category2, category3, category4)
    if (occupationCode) {
      // 异步调用接口获取工作职责
      api.occupation.getOccupationBook(occupationCode).then((response) => {
        if (response.data) {
          // 将职业任务填充到工作任务字段，如果为空则填充默认文本
          const taskText = response.data.task || "暂未设置工作任务。"
          setCareerInfoList(prevList => prevList.map((item) =>
            item.id === careerInfoId
              ? { ...item, tasks: taskText }
              : item
          ))
        }
      }).catch((error) => {
        console.error("获取职业信息失败:", error)
      })
    }
  }, [])

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

  const openCourseSelectorForIndicator = (requirementId: string, indicatorIndex: number) => {
    setSelectedIndicatorForCourse({ requirementId, indicatorIndex })
    setIsCourseSelectorOpen(true)
    setCourseSelectorOpen(true)
  }

  const handleSaveCoursesForIndicator = (
    selectedCourses: Array<{ course: TreeNode; supportLevel: "strong" | "weak" }>
  ) => {
    if (!selectedIndicatorForCourse) return

    const { requirementId, indicatorIndex } = selectedIndicatorForCourse
    const key = `${requirementId}-${indicatorIndex}`

    // 替换而不是追加，清空旧的支撑关系并设置新的
    const coursesToSave = selectedCourses.map((item) => ({
      courseId: item.course.id,
      courseName: item.course.name,
      supportLevel: item.supportLevel,
    }))
    console.log("保存指标点与课程的支撑关系，key:", key, "课程列表:", coursesToSave)

    setIndicatorCourseSupports((prev) => ({
      ...prev,
      [key]: coursesToSave,
    }))

    setCourseSelectorOpen(false)
    setIsCourseSelectorOpen(false)
    setSelectedIndicatorForCourse(null)
  }

  const removeIndicatorCourseSupport = (requirementId: string, indicatorIndex: number, courseId: string) => {
    const key = `${requirementId}-${indicatorIndex}`
    setIndicatorCourseSupports((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.courseId !== courseId),
    }))
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

    // 将 careerInfoList 转换为 professionsVOS 格式
    const professionsVOS = careerInfoList.map((careerInfo, index) => {
      const profession = []

      // 从 worksData 中查找对应的职业层级信息
      if (careerInfo.direction.category1) {
        const cat1 = worksData.find(item => item.label === careerInfo.direction.category1)
        if (cat1) {
          profession.push({
            id: parseInt(cat1.value) || index * 1000 + 1,
            level: 0,
            code: cat1.value,
            name: cat1.label,
          })

          if (careerInfo.direction.category2) {
            const cat2 = cat1.children?.find(item => item.label === careerInfo.direction.category2)
            if (cat2) {
              profession.push({
                id: parseInt(cat2.value.replace(/-/g, '')) || index * 1000 + 2,
                level: 1,
                code: cat2.value,
                name: cat2.label,
              })

              if (careerInfo.direction.category3) {
                const cat3 = cat2.children?.find(item => item.label === careerInfo.direction.category3)
                if (cat3) {
                  profession.push({
                    id: parseInt(cat3.value.replace(/-/g, '')) || index * 1000 + 3,
                    level: 2,
                    code: cat3.value,
                    name: cat3.label,
                  })

                  if (careerInfo.direction.category4) {
                    const cat4 = cat3.children?.find(item => item.label === careerInfo.direction.category4)
                    if (cat4) {
                      profession.push({
                        id: parseInt(cat4.value.replace(/-/g, '')) || index * 1000 + 4,
                        level: 3,
                        code: cat4.value,
                        name: cat4.label,
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }

      return {
        id: parseInt(careerInfo.id) || index + 1,
        profession: profession,
        task: careerInfo.tasks,
      }
    })

    // 将 graduationRequirements 转换为 requiresVOS 格式
    const requiresVOS = graduationRequirements.map((requirement, index) => ({
      id: parseInt(requirement.id) || index + 1,
      description: requirement.content,
      children: requirement.indicators.map((indicator, indIndex) => ({
        id: parseInt(requirement.id) * 1000 + indIndex + 1,
        description: indicator,
        children: null,
      })),
    }))

    const majorData = {
      name: majorName,
      type: "major" as const,
      metadata: {
        code: majorCode,
        majorClass: majorCode,
        majorLevel: majorLevel,
        feature: educationalFeatures,
        demandStatus: demandStatus,
        selectedProvince: selectedProvince,
        position: position,
        professionsVOS: professionsVOS,
        requiresVOS: requiresVOS,
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
    }, 3000)
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
          <Button variant="outline" onClick={onCancel} className="gap-2 bg-transparent" disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}>
            <X className="w-4 h-4" />
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="gap-2"
            disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
            variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中
              </>
            ) : autoSaveStatus === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                自动保存中
              </>
            ) : autoSaveStatus === "saved" ? (
              <>
                <Check className="w-4 h-4" />
                已保存
              </>
            ) : autoSaveStatus === "failed" ? (
              <>
                <X className="w-4 h-4" />
                保存失败
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                保存
              </>
            )}
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
                                      handleCareerDirectionSelect(
                                        careerInfo.id,
                                        result.category1.label,
                                        result.category2.label,
                                        result.category3.label,
                                        result.category4.label
                                      )
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
                                        handleCareerDirectionSelect(
                                          careerInfo.id,
                                          careerInfo.direction.category1,
                                          careerInfo.direction.category2,
                                          careerInfo.direction.category3,
                                          category.label
                                        )
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
                        onChange={(e) => updateCareerInfo(careerInfo.id, "tasks", e.target.value.slice(0, 1024))}
                        maxLength={1024}
                        className="pr-20"
                      />
                      <div className="absolute right-2 top-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{careerInfo.tasks.length}/1024</span>
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
                  <div className="w-1/2">
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
              <Label htmlFor="position">培养定位</Label>
              <div className="relative">
                <Textarea
                  id="position"
                  placeholder="描述专业的培养定位和人才培养目标"
                  rows={4}
                  value={position}
                  onChange={(e) => setPosition(e.target.value.slice(0, 500))}
                  maxLength={500}
                  className="pr-20"
                />
                <div className="absolute right-2 top-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{position.length}/500</span>
                  {position && (
                    <button
                      type="button"
                      onClick={() => setPosition("")}
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
              <Button size="sm" variant="outline" onClick={addGraduationRequirement} className="gap-2 bg-transparent">
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
                  // 目前mock返回文件地址
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
                        {focusedRequirementId === requirement.id && requirement.content.length > 50 ? (
                          <div className="relative">
                            <Textarea
                              ref={reqIndex === graduationRequirements.length - 1 ? lastRequirementRef : null}
                              placeholder="输入毕业要求内容（最多200字）"
                              value={requirement.content}
                              onChange={(e) => updateGraduationRequirement(requirement.id, e.target.value.slice(0, 200))}
                              onFocus={() => setFocusedRequirementId(requirement.id)}
                              onBlur={() => setFocusedRequirementId(null)}
                              maxLength={200}
                              className="pr-20 pb-8 resize-none min-h-[80px]"
                              autoFocus
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-2">
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
                        ) : (
                          <div className="relative">
                            <Input
                              ref={reqIndex === graduationRequirements.length - 1 ? lastRequirementRef : null}
                              placeholder="输入毕业要求内容（最多200字）"
                              value={requirement.content}
                              onChange={(e) => updateGraduationRequirement(requirement.id, e.target.value.slice(0, 200))}
                              onFocus={() => setFocusedRequirementId(requirement.id)}
                              onBlur={() => setFocusedRequirementId(null)}
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
                        )}
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
                                {focusedIndicatorKey === `${requirement.id}-${indIndex}` && indicator.length > 50 ? (
                                  <div className="relative">
                                    <Textarea
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
                                      onFocus={() => setFocusedIndicatorKey(`${requirement.id}-${indIndex}`)}
                                      onBlur={() => setFocusedIndicatorKey(null)}
                                      maxLength={200}
                                      className="pr-20 pb-8 resize-none min-h-[80px]"
                                      autoFocus
                                    />
                                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
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
                                ) : (
                                  <div className="relative">
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
                                      onFocus={() => setFocusedIndicatorKey(`${requirement.id}-${indIndex}`)}
                                      onBlur={() => setFocusedIndicatorKey(null)}
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
                                )}
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
                                        courseSupport.supportLevel === "strong"
                                          ? "bg-orange-500"
                                          : "bg-green-500"
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
      </Card>

      <div className="flex items-center justify-center gap-2 pb-6">
        <Button variant="outline" onClick={onCancel} className="gap-2 bg-transparent" disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}>
          <X className="w-4 h-4" />
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          className="gap-2"
          disabled={isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
          variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中
            </>
          ) : autoSaveStatus === "saving" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              自动保存中
            </>
          ) : autoSaveStatus === "saved" ? (
            <>
              <Check className="w-4 h-4" />
              已保存
            </>
          ) : autoSaveStatus === "failed" ? (
            <>
              <X className="w-4 h-4" />
              保存失败
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              保存
            </>
          )}
        </Button>
      </div>

      {/* 使用useMemo缓存initialSupport，只在selectedIndicatorForCourse改变时重新计算 */}
      {useMemo(() => (
        <CourseSelector
          open={courseSelectorOpen}
          onOpenChange={(open) => {
            setCourseSelectorOpen(open)
            setIsCourseSelectorOpen(open)
          }}
          majorId={initialData?.metadata?.majorId || ""}
          majorName={majorName}
          departmentId={effectiveDepartmentId}
          onSaveCourses={handleSaveCoursesForIndicator}
          initialSupport={
            selectedIndicatorForCourse
              ? Object.fromEntries(
                  (indicatorCourseSupports[`${selectedIndicatorForCourse.requirementId}-${selectedIndicatorForCourse.indicatorIndex}`] || []).map(
                    (item) => [item.courseId, item.supportLevel]
                  )
                )
              : undefined
          }
        />
      ), [selectedIndicatorForCourse, courseSelectorOpen, initialData?.metadata?.majorId, majorName, effectiveDepartmentId, handleSaveCoursesForIndicator, indicatorCourseSupports])}
    </div>
  )
}
