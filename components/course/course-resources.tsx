"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FolderOpen, Folder, File, Download, ChevronRight, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, type FileData, type CourseResourceData } from "@/lib/api"

interface CourseResourcesProps {
  nodeId: string
}

export function CourseResources({ nodeId }: CourseResourcesProps) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [resourceData, setResourceData] = useState<CourseResourceData | null>(null)

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
  }

  const handleBackToFolders = () => {
    setCurrentFolder(null)
    setSelectedFile(null)
  }

  const handleFileClick = (file: FileData) => {
    setSelectedFile(file)
  }

  const handleBackToFiles = () => {
    setSelectedFile(null)
  }

  const getCurrentFolderData = () => {
    if (!currentFolder) return null
    const folder = courseResources.find((r) => r.id === currentFolder)
    const files = mockFiles[currentFolder] || []
    return { folder, files }
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
          <Button size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            批量下载
          </Button>
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
            {Object.entries(mockScoring).map(([key, scoring]) => (
              <div key={key} className="rounded-lg border border-border bg-card/50 p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  {key === "selfEvaluation" ? "自我评分" : key === "professionalEvaluation" ? "专业评分" : "督导评分"}
                </h4>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary">{scoring.total}</div>
                  <div className="text-xs text-muted-foreground">总分</div>
                </div>
                <div className="space-y-3">
                  {scoring.indicators.map((indicator, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">
                          {indicator.name}
                          <span className="text-muted-foreground ml-1">({indicator.weight})</span>
                        </span>
                        <span className="font-medium text-primary">{indicator.score}分</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${indicator.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !currentFolder ? (
        <div className="grid grid-cols-3 gap-3">
          {courseResources.map((resource) => (
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
    </div>
  )
}
