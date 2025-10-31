"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FolderOpen, Folder, File, Download, ChevronRight, Star, Search, X, Upload, FileText, Trash2, Edit, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, type FileData, type CourseResourceData, type ScoringData } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CourseResourcesProps {
  nodeId: string
}

interface UploadFile {
  file: File
  id: string
}

export function CourseResources({ nodeId }: CourseResourcesProps) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [resourceData, setResourceData] = useState<CourseResourceData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingScoring, setEditingScoring] = useState<string | null>(null)
  const [editScores, setEditScores] = useState<ScoringData | null>(null)

  useEffect(() => {
    const loadResources = async () => {
      const response = await api.resources.getCourseResources(nodeId)
      if (response.data) {
        setResourceData(response.data)
      }
    }
    loadResources()
  }, [nodeId])

  const courseResources = resourceData?.folders || []
  const mockFiles = resourceData?.files || {}
  const mockScoring = resourceData?.scoring || {
    selfEvaluation: { total: 0, indicators: [] },
    professionalEvaluation: { total: 0, indicators: [] },
    supervisionEvaluation: { total: 0, indicators: [] },
  }

  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId)
    setSelectedFile(null)
    setSearchTerm("")
  }

  const handleBackToFolders = () => {
    setCurrentFolder(null)
    setSelectedFile(null)
    setSearchTerm("")
  }

  const handleFileClick = (file: FileData) => {
    setSelectedFile(file)
  }

  const handleBackToFiles = () => {
    setSelectedFile(null)
  }

  const getFilteredFolders = () => {
    if (!searchTerm.trim()) return courseResources

    const lowerSearchTerm = searchTerm.toLowerCase()
    return courseResources.filter((folder) => folder.name.toLowerCase().includes(lowerSearchTerm))
  }

  const getCurrentFolderData = () => {
    if (!currentFolder) return null
    const folder = courseResources.find((r) => r.id === currentFolder)
    let files = mockFiles[currentFolder] || []

    // 根据搜索词过滤文件
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      files = files.filter((file) => file.name.toLowerCase().includes(lowerSearchTerm))
    }

    return { folder, files }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
      }))
      setUploadFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      const newFiles: UploadFile[] = Array.from(files).map((file) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
      }))
      setUploadFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeUploadFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleUpload = async () => {
    if (!currentFolder || uploadFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    // 模拟上传进度
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // 等待进度完成
    await new Promise((resolve) => setTimeout(resolve, 2200))

    // 将文件添加到当前文件夹的mock数据中
    if (resourceData) {
      const newFiles: FileData[] = uploadFiles.map((uf) => ({
        name: uf.file.name,
        size: `${(uf.file.size / 1024).toFixed(2)} KB`,
        date: new Date().toLocaleDateString("zh-CN"),
        type: uf.file.type || "未知类型",
        uploader: "当前用户",
        version: "v1.0",
      }))

      const updatedFiles = {
        ...resourceData.files,
        [currentFolder]: [...(resourceData.files[currentFolder] || []), ...newFiles],
      }

      const updatedFolders = resourceData.folders.map((folder) =>
        folder.id === currentFolder ? { ...folder, count: folder.count + newFiles.length } : folder,
      )

      const updatedResourceData: CourseResourceData = {
        ...resourceData,
        files: updatedFiles,
        folders: updatedFolders,
      }

      setResourceData(updatedResourceData)
      await api.resources.updateCourseResources(nodeId, updatedResourceData)
    }

    // 重置状态
    setIsUploading(false)
    setUploadProgress(0)
    setUploadFiles([])
    setIsUploadDialogOpen(false)
  }

  const startEditScoring = (key: string, scoring: ScoringData) => {
    setEditingScoring(key)
    setEditScores(JSON.parse(JSON.stringify(scoring))) // 深拷贝
  }

  const cancelEditScoring = () => {
    setEditingScoring(null)
    setEditScores(null)
  }

  const updateIndicatorScore = (index: number, score: number) => {
    if (!editScores) return
    const updatedIndicators = [...editScores.indicators]
    updatedIndicators[index] = { ...updatedIndicators[index], score }
    const total = updatedIndicators.reduce((sum, ind) => sum + ind.score, 0) / updatedIndicators.length
    setEditScores({ ...editScores, indicators: updatedIndicators, total: Math.round(total) })
  }

  const updateScoringComment = (comment: string) => {
    if (!editScores) return
    setEditScores({ ...editScores, comment })
  }

  const saveScoring = async () => {
    if (!editingScoring || !editScores || !resourceData) return

    const updatedScoring = {
      ...resourceData.scoring,
      [editingScoring]: editScores,
    }

    const updatedResourceData: CourseResourceData = {
      ...resourceData,
      scoring: updatedScoring,
    }

    setResourceData(updatedResourceData)
    await api.resources.updateCourseResources(nodeId, updatedResourceData)
    setEditingScoring(null)
    setEditScores(null)
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          {selectedFile ? (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={handleBackToFolders}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                课程资源
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={handleBackToFiles}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {getCurrentFolderData()?.folder?.name}
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{selectedFile.name}</span>
            </div>
          ) : currentFolder ? (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={handleBackToFolders}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                课程资源
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">{getCurrentFolderData()?.folder?.name}</span>
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-foreground">课程资源</h3>
          )}
        </div>
        {!selectedFile && (
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={currentFolder ? "快速定位文件..." : "快速定位目录..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-9 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="清空搜索"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              批量下载
            </Button>
            {currentFolder && (
              <Button size="sm" className="gap-2" onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="w-4 h-4" />
                上传
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedFile ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h4 className="text-sm font-semibold mb-3">文件信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">文件名：</span>
                  <span className="text-foreground">{selectedFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">大小：</span>
                  <span className="text-foreground">{selectedFile.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">类型：</span>
                  <span className="text-foreground">{selectedFile.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上传者：</span>
                  <span className="text-foreground">{selectedFile.uploader}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">版本：</span>
                  <span className="text-foreground">{selectedFile.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">日期：</span>
                  <span className="text-foreground">{selectedFile.date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(mockScoring).map(([key, scoring]) => {
              const isEditing = editingScoring === key
              const displayScoring = isEditing ? editScores! : scoring

              return (
                <div key={key} className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      {key === "selfEvaluation"
                        ? "自我评分"
                        : key === "professionalEvaluation"
                          ? "专业评分"
                          : "督导评分"}
                    </h4>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveScoring}>
                            <Save className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditScoring}>
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => startEditScoring(key, scoring)}
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">{displayScoring.total}</div>
                    <div className="text-xs text-muted-foreground">总分</div>
                  </div>

                  <div className="space-y-3">
                    {displayScoring.indicators.map((indicator, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground">
                            {indicator.name}
                            <span className="text-muted-foreground ml-1">({indicator.weight})</span>
                          </span>
                          <span className="font-medium text-primary">{indicator.score}分</span>
                        </div>
                        {isEditing ? (
                          <Slider
                            value={[indicator.score]}
                            onValueChange={(value) => updateIndicatorScore(index, value[0])}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${indicator.score}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 评语区域 */}
                  {isEditing ? (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`comment-${key}`} className="text-xs text-muted-foreground">
                        评语
                      </Label>
                      <Textarea
                        id={`comment-${key}`}
                        value={displayScoring.comment || ""}
                        onChange={(e) => updateScoringComment(e.target.value)}
                        placeholder="请输入评语..."
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </div>
                  ) : (
                    displayScoring.comment && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground mb-1">评语</div>
                        <div className="text-sm text-foreground">{displayScoring.comment}</div>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : !currentFolder ? (
        <div className="grid grid-cols-3 gap-3">
          {getFilteredFolders().map((resource) => (
            <button
              key={resource.id}
              onClick={() => handleFolderClick(resource.id)}
              className="relative flex flex-col items-center gap-3 p-4 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 hover:shadow-md transition-all group"
            >
              <Folder className="w-12 h-12 text-primary/70 group-hover:text-primary transition-colors" />
              <span className="text-sm text-foreground text-center line-clamp-2 leading-tight">{resource.name}</span>
              <div
                className={cn(
                  "absolute top-2 right-2 min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium",
                  resource.count === 0
                    ? "bg-muted/50 text-muted-foreground border border-border"
                    : "bg-primary/20 text-primary border border-primary/30",
                )}
              >
                {formatCount(resource.count)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {getCurrentFolderData()?.files && getCurrentFolderData()!.files.length > 0 ? (
            getCurrentFolderData()!.files.map((file, index) => (
              <button
                key={index}
                onClick={() => handleFileClick(file)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 transition-all group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm text-foreground truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {file.size} · {file.date}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">该文件夹暂无内容</p>
            </div>
          )}
        </div>
      )}

      {/* 上传弹窗 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>上传文件</DialogTitle>
            <DialogDescription>拖拽文件到下方区域或点击选择文件上传</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 拖拽上传区域 */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50",
              )}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-foreground mb-1">拖拽文件到此处或点击选择</p>
              <p className="text-xs text-muted-foreground">支持多个文件同时上传</p>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* 文件预览列表 */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">待上传文件 ({uploadFiles.length})</h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {uploadFiles.map((uf) => (
                    <div
                      key={uf.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{uf.file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(uf.file.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeUploadFile(uf.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        disabled={isUploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 上传进度 */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">上传中...</span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploadFiles.length === 0 || isUploading}>
              {isUploading ? "上传中..." : "开始上传"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
