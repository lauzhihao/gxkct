"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Upload, FileSpreadsheet, X, Check, Loader2, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface TeachingObjective {
  id: string
  content: string
  points: string[]
}

interface CoursePoint {
  id: string
  content: string // Merged title and description into single content field
  infoPoints: InfoPoint[]
}

interface InfoPoint {
  id: string
  type: "K" | "S" | "A" // Added type field for Knowledge/Skills/Attitude
  content: string // Single content field instead of title and description
}

interface ChapterProject {
  id: string
  name: string
  theoryHours: number
  practiceHours: number
}

interface AddCourseFormProps {
  majorId: string
  onCancel: () => void
  onSubmit: (courseData: any) => void
  initialData?: any
  isEditMode?: boolean
}

const courseNatureOptions = ["公共基础课", "专业基础课", "专业核心课", "专业拓展课", "实践课程"]

function AddCourseForm({ majorId, onCancel, onSubmit, initialData, isEditMode = false }: AddCourseFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Tab 1: Basic Information
  const [openingDate, setOpeningDate] = useState(initialData?.metadata?.openingDate || "")
  const [courseType, setCourseType] = useState(initialData?.metadata?.courseType || "必修")
  const [courseName, setCourseName] = useState(initialData?.name || "")
  const [courseNature, setCourseNature] = useState(initialData?.metadata?.courseNature || "")

  // Tab 2: Teaching Objectives
  const [teachingObjectives, setTeachingObjectives] = useState<TeachingObjective[]>(
    initialData?.metadata?.teachingObjectives || [{ id: "1", content: "", points: [""] }],
  )
  const [objectivesFile, setObjectivesFile] = useState<File | null>(null)

  // Tab 3: Course Point Information Library
  const [coursePoints, setCoursePoints] = useState<CoursePoint[]>(
    initialData?.metadata?.coursePoints?.map((cp: any) => ({
      id: cp.id,
      content: cp.content || cp.title || "",
      infoPoints:
        cp.infoPoints?.map((ip: any) => ({
          id: ip.id || Date.now().toString() + Math.random(),
          type: ip.type || "K",
          content: ip.content || ip.title || "",
        })) || [],
    })) || [{ id: "1", content: "", infoPoints: [] }],
  )
  const [pointsFile, setPointsFile] = useState<File | null>(null)

  // Tab 4: Chapter and Project Management
  const [chapters, setChapters] = useState<ChapterProject[]>(
    initialData?.metadata?.chapters || [{ id: "1", name: "", theoryHours: 0, practiceHours: 0 }],
  )

  const lastObjectiveRef = useRef<HTMLInputElement>(null)
  const lastPointRef = useRef<HTMLInputElement>(null)

  // Teaching Objectives functions
  const addTeachingObjective = () => {
    const newId = Date.now().toString()
    setTeachingObjectives([...teachingObjectives, { id: newId, content: "", points: [""] }])
    setTimeout(() => lastObjectiveRef.current?.focus(), 0)
  }

  const removeTeachingObjective = (id: string) => {
    if (teachingObjectives.length > 1) {
      setTeachingObjectives(teachingObjectives.filter((obj) => obj.id !== id))
    }
  }

  const updateTeachingObjective = (id: string, content: string) => {
    setTeachingObjectives(teachingObjectives.map((obj) => (obj.id === id ? { ...obj, content } : obj)))
  }

  const addObjectivePoint = (objId: string) => {
    setTeachingObjectives(
      teachingObjectives.map((obj) => (obj.id === objId ? { ...obj, points: [...obj.points, ""] } : obj)),
    )
  }

  const removeObjectivePoint = (objId: string, index: number) => {
    setTeachingObjectives(
      teachingObjectives.map((obj) =>
        obj.id === objId ? { ...obj, points: obj.points.filter((_, i) => i !== index) } : obj,
      ),
    )
  }

  const updateObjectivePoint = (objId: string, index: number, value: string) => {
    setTeachingObjectives(
      teachingObjectives.map((obj) =>
        obj.id === objId
          ? {
              ...obj,
              points: obj.points.map((p, i) => (i === index ? value : p)),
            }
          : obj,
      ),
    )
  }

  // Course Points functions
  const addCoursePoint = () => {
    const newId = Date.now().toString()
    setCoursePoints([...coursePoints, { id: newId, content: "", infoPoints: [] }])
    setTimeout(() => lastPointRef.current?.focus(), 0)
  }

  const removeCoursePoint = (id: string) => {
    if (coursePoints.length > 1) {
      setCoursePoints(coursePoints.filter((point) => point.id !== id))
    }
  }

  const updateCoursePointContent = (id: string, content: string) => {
    setCoursePoints(coursePoints.map((point) => (point.id === id ? { ...point, content } : point)))
  }

  const addInfoPointWithType = (pointId: string, type: "K" | "S" | "A") => {
    setCoursePoints(
      coursePoints.map((point) => {
        if (point.id === pointId) {
          // Count existing info points of this type
          const existingCount = point.infoPoints.filter((ip) => ip.type === type).length
          const newNumber = existingCount + 1
          const newId = `${type}${newNumber}`

          return {
            ...point,
            infoPoints: [...point.infoPoints, { id: newId, type, content: "" }],
          }
        }
        return point
      }),
    )
  }

  const removeInfoPoint = (pointId: string, infoPointId: string) => {
    setCoursePoints(
      coursePoints.map((point) =>
        point.id === pointId ? { ...point, infoPoints: point.infoPoints.filter((ip) => ip.id !== infoPointId) } : point,
      ),
    )
  }

  const updateInfoPointContent = (pointId: string, infoPointId: string, content: string) => {
    setCoursePoints(
      coursePoints.map((point) =>
        point.id === pointId
          ? {
              ...point,
              infoPoints: point.infoPoints.map((ip) => (ip.id === infoPointId ? { ...ip, content } : ip)),
            }
          : point,
      ),
    )
  }

  // Chapter functions
  const addChapter = () => {
    setChapters([...chapters, { id: Date.now().toString(), name: "", theoryHours: 0, practiceHours: 0 }])
  }

  const removeChapter = (id: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((ch) => ch.id !== id))
    }
  }

  const updateChapter = (id: string, field: string, value: any) => {
    setChapters(chapters.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch)))
  }

  const handleObjectivesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setObjectivesFile(file)
      // TODO: Parse Excel file
    }
  }

  const handlePointsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPointsFile(file)
      // TODO: Parse Excel file
    }
  }

  const handleSubmit = () => {
    setIsLoading(true)

    if (!courseName.trim() || !courseNature) {
      toast({
        variant: "destructive",
        title: "表单验证失败",
        description: "请完整填写表单内容",
        duration: 5000,
      })
      setIsLoading(false)
      return
    }

    const courseData = {
      name: courseName,
      type: "course" as const,
      metadata: {
        openingDate,
        courseType,
        courseNature,
        teachingObjectives,
        coursePoints,
        chapters,
      },
      children: initialData?.children || [],
    }

    setTimeout(() => {
      toast({
        variant: "success",
        title: "保存成功",
        description: isEditMode ? "课程信息已成功更新" : "课程信息已成功保存",
        duration: 3000,
      })
      onSubmit(courseData)
      setIsLoading(false)
    }, 1000)
  }

  const totalTheoryHours = chapters.reduce((sum, ch) => sum + (ch.theoryHours || 0), 0)
  const totalPracticeHours = chapters.reduce((sum, ch) => sum + (ch.practiceHours || 0), 0)
  const totalHours = totalTheoryHours + totalPracticeHours
  const chapterCount = chapters.filter((ch) => ch.name.includes("章")).length
  const projectCount = chapters.filter((ch) => ch.name.includes("项目")).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h2 className="text-xl font-bold text-foreground">{isEditMode ? "编辑课程" : "新增课程"}</h2>
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

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm rounded-none p-0">
            <TabsTrigger value="basic" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程基本信息
            </TabsTrigger>
            <TabsTrigger value="objectives" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程教学目标
            </TabsTrigger>
            <TabsTrigger value="points" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课点信息库
            </TabsTrigger>
            <TabsTrigger value="chapters" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              章节项目管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                <h3 className="text-base font-semibold text-foreground">基本信息</h3>
              </div>
              <div className="border-t border-dashed border-border" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-date">开课日期</Label>
                  <div className="relative">
                    <Input
                      id="opening-date"
                      type="date"
                      value={openingDate}
                      onChange={(e) => setOpeningDate(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    课程类型 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={courseType === "必修" ? "default" : "outline"}
                      onClick={() => setCourseType("必修")}
                      className="flex-1"
                    >
                      必修
                    </Button>
                    <Button
                      type="button"
                      variant={courseType === "选修" ? "default" : "outline"}
                      onClick={() => setCourseType("选修")}
                      className="flex-1"
                    >
                      选修
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-name">
                    课程名称 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="course-name"
                      placeholder="例如：数据结构与算法"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value.slice(0, 32))}
                      maxLength={32}
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{courseName.length}/32</span>
                      {courseName && (
                        <button
                          type="button"
                          onClick={() => setCourseName("")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-nature">
                    课程性质 <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="course-nature"
                    value={courseNature}
                    onChange={(e) => setCourseNature(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">请选择课程性质</option>
                    {courseNatureOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="objectives" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">教学目标</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addTeachingObjective} className="gap-2 bg-transparent">
                    <Plus className="w-4 h-4" />
                    添加教学目标
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent" asChild>
                    <label htmlFor="objectives-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4" />
                      上传Excel
                      <input
                        id="objectives-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleObjectivesFileUpload}
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="border-t border-dashed border-border" />
              {objectivesFile && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">{objectivesFile.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setObjectivesFile(null)}
                    className="gap-2 text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {teachingObjectives.map((objective, objIndex) => (
                  <div key={objective.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-2">
                        {objIndex + 1}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="relative flex-1">
                            <Input
                              ref={objIndex === teachingObjectives.length - 1 ? lastObjectiveRef : null}
                              placeholder="输入教学目标内容（最多200字）"
                              value={objective.content}
                              onChange={(e) => updateTeachingObjective(objective.id, e.target.value.slice(0, 200))}
                              maxLength={200}
                              className="pr-20"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{objective.content.length}/200</span>
                            </div>
                          </div>
                          {teachingObjectives.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTeachingObjective(objective.id)}
                              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">教学目标点</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addObjectivePoint(objective.id)}
                              className="gap-1 h-7 text-xs"
                            >
                              <Plus className="w-3 h-3" />
                              添加目标点
                            </Button>
                          </div>
                          {objective.points.map((point, pointIndex) => (
                            <div key={pointIndex} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {objIndex + 1}.{pointIndex + 1}
                              </span>
                              <Input
                                placeholder="输入教学目标点内容"
                                value={point}
                                onChange={(e) =>
                                  updateObjectivePoint(objective.id, pointIndex, e.target.value.slice(0, 200))
                                }
                                maxLength={200}
                                className="h-9 text-sm flex-1"
                              />
                              {objective.points.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeObjectivePoint(objective.id, pointIndex)}
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
          </TabsContent>

          <TabsContent value="points" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">课点信息库</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addCoursePoint} className="gap-2 bg-transparent">
                    <Plus className="w-4 h-4" />
                    添加课点
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent" asChild>
                    <label htmlFor="points-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4" />
                      上传Excel
                      <input
                        id="points-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handlePointsFileUpload}
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="border-t border-dashed border-border" />
              {pointsFile && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">{pointsFile.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPointsFile(null)}
                    className="gap-2 text-red-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {coursePoints.map((point, pointIndex) => {
                  const kPoints = point.infoPoints
                    .filter((ip) => ip.type === "K")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })
                  const sPoints = point.infoPoints
                    .filter((ip) => ip.type === "S")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })
                  const aPoints = point.infoPoints
                    .filter((ip) => ip.type === "A")
                    .sort((a, b) => {
                      const aNum = Number.parseInt(a.id.substring(1)) || 0
                      const bNum = Number.parseInt(b.id.substring(1)) || 0
                      return aNum - bNum
                    })

                  return (
                    <div key={point.id} className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-2">
                          {pointIndex + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="relative flex-1">
                              <Label className="text-sm font-medium mb-1.5 block">课点内容</Label>
                              <Input
                                ref={pointIndex === coursePoints.length - 1 ? lastPointRef : null}
                                placeholder="输入课点内容（最多200字）"
                                value={point.content}
                                onChange={(e) => updateCoursePointContent(point.id, e.target.value.slice(0, 200))}
                                maxLength={200}
                                className="pr-20"
                              />
                              <div className="absolute right-2 top-[34px] flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{point.content.length}/200</span>
                              </div>
                            </div>
                            {coursePoints.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeCoursePoint(point.id)}
                                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 mt-7"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">信息点（KSA）</Label>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "K")}
                                  className="gap-1 h-7 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                >
                                  <Plus className="w-3 h-3" />K
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "S")}
                                  className="gap-1 h-7 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                                >
                                  <Plus className="w-3 h-3" />S
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addInfoPointWithType(point.id, "A")}
                                  className="gap-1 h-7 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                >
                                  <Plus className="w-3 h-3" />A
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {kPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-blue-100 border border-blue-200 text-blue-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入知识点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {sPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-green-100 border border-green-200 text-green-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入技能点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              {aPoints.map((infoPoint) => (
                                <div key={infoPoint.id} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-10 h-7 rounded text-xs font-medium bg-purple-100 border border-purple-200 text-purple-700 flex-shrink-0">
                                    {infoPoint.id}
                                  </span>
                                  <Input
                                    placeholder="输入态度点内容（最多200字）"
                                    value={infoPoint.content}
                                    onChange={(e) =>
                                      updateInfoPointContent(point.id, infoPoint.id, e.target.value.slice(0, 200))
                                    }
                                    maxLength={200}
                                    className="h-7 text-sm flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeInfoPoint(point.id, infoPoint.id)}
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chapters" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
                  <h3 className="text-base font-semibold text-foreground">章节项目管理</h3>
                </div>
                <Button size="sm" variant="outline" onClick={addChapter} className="gap-2 bg-transparent">
                  <Plus className="w-4 h-4" />
                  添加章节/项目
                </Button>
              </div>
              <div className="border-t border-dashed border-border" />

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        序号
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        名称
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        理论学时
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                        实践学时
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter, index) => (
                      <tr key={chapter.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm text-foreground border-r border-border">{index + 1}</td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            placeholder="例如：第一章 数据结构基础"
                            value={chapter.name}
                            onChange={(e) => updateChapter(chapter.id, "name", e.target.value)}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            type="number"
                            min="0"
                            value={chapter.theoryHours}
                            onChange={(e) =>
                              updateChapter(chapter.id, "theoryHours", Number.parseInt(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <Input
                            type="number"
                            min="0"
                            value={chapter.practiceHours}
                            onChange={(e) =>
                              updateChapter(chapter.id, "practiceHours", Number.parseInt(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {chapters.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeChapter(chapter.id)}
                              className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border"
                      >
                        统计：{chapterCount} 个章节，{projectCount} 个项目
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                        {totalTheoryHours} 学时
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                        {totalPracticeHours} 学时
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">合计：{totalHours} 学时</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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

export { AddCourseForm }
export default AddCourseForm
