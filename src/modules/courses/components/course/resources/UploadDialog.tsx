"use client"

import { Upload, FileText, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Progress } from "@/shared/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { cn } from "@/shared/utils/utils"
import type { UploadDialogProps } from "./types"

export function UploadDialog({
  isOpen,
  onOpenChange,
  uploadFiles,
  uploadProgress,
  isUploading,
  isDragging,
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemoveFile,
  onUpload,
}: UploadDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>拖拽文件到下方区域或点击选择文件上传</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
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
              onChange={onFileSelect}
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
                      onClick={() => onRemoveFile(uf.id)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            取消
          </Button>
          <Button onClick={onUpload} disabled={uploadFiles.length === 0 || isUploading}>
            {isUploading ? "上传中..." : "开始上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

