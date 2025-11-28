'use client'

import * as React from 'react'
import { Upload, X, File, Download } from 'lucide-react'
import { cn } from '@/shared/utils/utils'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { toast } from '@/shared/hooks/use-toast'

// 内部上传文件接口
interface UploadFile {
  file: File
  id: string
}

// 文件验证错误接口
interface FileValidationError {
  type: 'size' | 'count' | 'type'
  message: string
}

// 组件Props接口
export interface FileUploadProps {
  // 按钮文字，默认"上传"
  buttonText?: string
  // 上传文件类型描述，默认"任意文件"
  fileType?: string
  // 最大文件大小，单位字节，默认10MB
  maxFileSize?: number
  // 最大文件个数，默认1
  maxFileCount?: number
  // 上传模板文件URL，可选
  templateUrl?: string
  // 上传完成回调，返回上传后的文件地址数组
  onUpload: (files: File[]) => Promise<string[]>
  // HTML accept属性，用于文件类型过滤
  accept?: string
  // 自定义按钮样式
  buttonClassName?: string
  // 是否禁用上传按钮
  disabled?: boolean
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      buttonText = '上传',
      fileType = '任意文件',
      maxFileSize = 10 * 1024 * 1024, // 10MB
      maxFileCount = 1,
      templateUrl,
      onUpload,
      accept,
      buttonClassName,
      disabled = false,
    },
    ref,
  ) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [uploadFiles, setUploadFiles] = React.useState<UploadFile[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [uploadProgress, setUploadProgress] = React.useState(0)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // 验证文件
    const validateFiles = (files: File[]): FileValidationError[] => {
      const errors: FileValidationError[] = []

      // 检查文件个数
      if (uploadFiles.length + files.length > maxFileCount) {
        errors.push({
          type: 'count',
          message: `最多只能上传${maxFileCount}个文件`,
        })
        return errors
      }

      // 检查每个文件
      for (const file of files) {
        if (file.size > maxFileSize) {
          errors.push({
            type: 'size',
            message: `文件"${file.name}"超过大小限制（${(maxFileSize / 1024 / 1024).toFixed(1)}MB）`,
          })
        }
      }

      return errors
    }

    // 处理文件选择
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        const fileArray = Array.from(files)
        const errors = validateFiles(fileArray)

        if (errors.length > 0) {
          errors.forEach((error) => {
            toast({
              variant: 'destructive',
              title: '文件验证失败',
              description: error.message,
              duration: 5000,
            })
          })
          return
        }

        const newFiles: UploadFile[] = fileArray.map((file) => ({
          file,
          id: `${Date.now()}-${Math.random()}`,
        }))
        setUploadFiles((prev) => [...prev, ...newFiles])
      }

      // 重置input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    // 处理拖拽
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer.files
      if (files) {
        const fileArray = Array.from(files)
        const errors = validateFiles(fileArray)

        if (errors.length > 0) {
          errors.forEach((error) => {
            toast({
              variant: 'destructive',
              title: '文件验证失败',
              description: error.message,
              duration: 5000,
            })
          })
          return
        }

        const newFiles: UploadFile[] = fileArray.map((file) => ({
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

    // 移除文件
    const removeFile = (id: string) => {
      setUploadFiles((prev) => prev.filter((f) => f.id !== id))
    }

    // 处理上传
    const handleUpload = async () => {
      if (uploadFiles.length === 0) return

      setIsUploading(true)
      setUploadProgress(0)
      try {
        const files = uploadFiles.map((uf) => uf.file)

        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + Math.random() * 30
          })
        }, 300)

        // 调用上传回调，获取文件地址
        const fileUrls = await onUpload(files)

        clearInterval(progressInterval)
        setUploadProgress(100)

        // 延迟关闭以显示100%进度
        await new Promise((resolve) => setTimeout(resolve, 500))

        setUploadFiles([])
        setIsDialogOpen(false)
        setUploadProgress(0)
        toast({
          title: '上传成功',
          description: `成功上传${files.length}个文件`,
          duration: 3000,
        })
      } catch (error) {
        setUploadProgress(0)
        toast({
          variant: 'destructive',
          title: '上传失败',
          description: error instanceof Error ? error.message : '上传过程中出错',
          duration: 5000,
        })
      } finally {
        setIsUploading(false)
      }
    }

    return (
      <div ref={ref} className="w-full">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={disabled}
          className={cn('gap-2 bg-transparent', buttonClassName)}
        >
          <Upload className="w-4 h-4" />
          {buttonText}
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>文件上传</DialogTitle>
              <DialogDescription>
                支持上传{fileType}，单个文件最大{(maxFileSize / 1024 / 1024).toFixed(1)}MB，最多{maxFileCount}个文件
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 模板下载链接 */}
              {templateUrl && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Download className="w-4 h-4 text-primary" />
                  <a
                    href={templateUrl}
                    download
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    点击此处获取文件模板
                  </a>
                </div>
              )}

              {/* 拖拽上传区域 */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50',
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-foreground mb-1">拖拽文件到此处或点击选择</p>
                <p className="text-xs text-muted-foreground">支持{fileType}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={maxFileCount > 1}
                  accept={accept}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* 文件列表 */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">已选择文件（{uploadFiles.length}/{maxFileCount}）</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadFiles.map((uf) => (
                      <div
                        key={uf.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-primary">{uf.file.name}</p>
                            <p className="text-xs text-primary/60">
                              {(uf.file.size / 1024).toFixed(1)}KB
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uf.id)}
                          disabled={isUploading}
                          className="gap-2 text-red-500 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 上传进度指示器 */}
              {isUploading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* 圆形进度条背景 */}
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-border"
                      />
                      {/* 进度条 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - uploadProgress / 100)}`}
                        className="text-primary transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* 中间的百分比文字 */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">上传中...</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || isUploading}
              >
                {isUploading ? '上传中...' : '开始上传'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

FileUpload.displayName = 'FileUpload'

