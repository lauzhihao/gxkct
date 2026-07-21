'use client'

import * as React from 'react'
import { Upload, X, File, Download } from 'lucide-react'
import { cn } from '@/shared/utils/utils'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { toast } from '@/shared/hooks/use-toast'

interface UploadFile {
  file: File
  id: string
}

interface FileValidationError {
  type: 'size' | 'count' | 'type'
  message: string
}

interface UploadControl {
  setCancelHandler: (handler: (() => void) | null) => void
}

export interface FileUploadProps {
  buttonText?: string
  fileType?: string
  maxFileSize?: number
  maxFileCount?: number
  templateUrl?: string
  onDownloadTemplate?: () => Promise<void>
  onUpload: (files: File[], onProgress?: (progress: number) => void, control?: UploadControl) => Promise<string[]>
  accept?: string
  buttonClassName?: string
  disabled?: boolean
  containerClassName?: string
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      buttonText = '上传',
      fileType = '任意文件',
      maxFileSize = 10 * 1024 * 1024,
      maxFileCount = 1,
      templateUrl,
      onDownloadTemplate,
      onUpload,
      accept,
      buttonClassName,
      disabled = false,
      containerClassName,
    },
    ref,
  ) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [uploadFiles, setUploadFiles] = React.useState<UploadFile[]>([])
    const [isDragging, setIsDragging] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false)
    const [uploadProgress, setUploadProgress] = React.useState(0)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const cancelUploadRef = React.useRef<(() => void) | null>(null)

    const resetUploadState = React.useCallback(() => {
      setUploadFiles([])
      setIsDragging(false)
      setIsUploading(false)
      setIsDownloadingTemplate(false)
      setUploadProgress(0)
      cancelUploadRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, [])

    const handleDialogOpenChange = React.useCallback(
      (open: boolean) => {
        if (open) {
          resetUploadState()
          setIsDialogOpen(true)
          return
        }

        resetUploadState()
        setIsDialogOpen(false)
      },
      [resetUploadState],
    )

    const validateFiles = (files: File[]): FileValidationError[] => {
      const errors: FileValidationError[] = []

      if (uploadFiles.length + files.length > maxFileCount) {
        errors.push({
          type: 'count',
          message: `最多只能上传${maxFileCount}个文件`,
        })
        return errors
      }

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

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

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

    const removeFile = (id: string) => {
      setUploadFiles((prev) => prev.filter((f) => f.id !== id))
    }

    const handleCancelUpload = React.useCallback(() => {
      cancelUploadRef.current?.()
    }, [])

    const handleUpload = async () => {
      if (uploadFiles.length === 0) return

      setIsUploading(true)
      setUploadProgress(0)

      try {
        const files = uploadFiles.map((uf) => uf.file)
        await onUpload(
          files,
          (progress) => {
            setUploadProgress(Math.max(0, Math.min(100, progress)))
          },
          {
            setCancelHandler: (handler) => {
              cancelUploadRef.current = handler
            },
          },
        )

        setUploadProgress(100)
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
        cancelUploadRef.current = null
        const isCanceled = error instanceof Error && error.name === 'UploadCanceledError'
        toast({
          variant: isCanceled ? 'default' : 'destructive',
          title: isCanceled ? '已取消上传' : '上传失败',
          description: error instanceof Error ? error.message : '上传过程中出错',
          duration: isCanceled ? 3000 : 5000,
        })
      } finally {
        cancelUploadRef.current = null
        setIsUploading(false)
      }
    }

    const handleDownloadTemplate = async () => {
      if (!onDownloadTemplate) {
        return
      }

      setIsDownloadingTemplate(true)
      try {
        await onDownloadTemplate()
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '模板下载失败',
          description: error instanceof Error ? error.message : '下载模板时出错',
          duration: 5000,
        })
      } finally {
        setIsDownloadingTemplate(false)
      }
    }

    return (
      <div ref={ref} className={cn('w-full', containerClassName)}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDialogOpenChange(true)}
          disabled={disabled}
          className={cn('gap-2 bg-transparent', buttonClassName)}
        >
          <Upload className="w-4 h-4" />
          {buttonText}
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>文件上传</DialogTitle>
              <DialogDescription>
                支持上传{fileType}，单个文件最大{(maxFileSize / 1024 / 1024).toFixed(1)}MB，最多{maxFileCount}个文件
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {(templateUrl || onDownloadTemplate) && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Download className="h-4 w-4 text-primary" />
                  {templateUrl ? (
                    <a href={templateUrl} download className="text-sm text-primary underline hover:text-primary/80">
                      点击此处获取文件模板
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void handleDownloadTemplate()
                      }}
                      disabled={isDownloadingTemplate}
                      className="text-sm text-primary underline hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloadingTemplate ? '正在下载模板...' : '点击此处获取文件模板'}
                    </button>
                  )}
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  'group cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary hover:bg-primary/90 hover:text-primary-foreground',
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  className={cn(
                    'mx-auto mb-3 h-12 w-12 transition-colors',
                    isDragging ? 'text-white' : 'text-muted-foreground group-hover:text-white',
                  )}
                />
                <p
                  className={cn(
                    'mb-1 text-sm transition-colors',
                    isDragging ? 'text-white' : 'text-foreground group-hover:text-white',
                  )}
                >
                  拖拽文件到此处或点击选择
                </p>
                <p
                  className={cn(
                    'text-xs transition-colors',
                    isDragging ? 'text-white/80' : 'text-muted-foreground group-hover:text-white/80',
                  )}
                >
                  支持{fileType}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={maxFileCount > 1}
                  accept={accept}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">已选择文件（{uploadFiles.length}/{maxFileCount}）</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {uploadFiles.map((uf) => (
                      <div
                        key={uf.id}
                        className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <File className="h-4 w-4 flex-shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary">{uf.file.name}</p>
                            <p className="text-xs text-primary/60">{(uf.file.size / 1024).toFixed(1)}KB</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uf.id)}
                          disabled={isUploading}
                          className="gap-2 text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-border"
                      />
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
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{Math.round(uploadProgress)}%</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">上传中...</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={isUploading ? handleCancelUpload : () => handleDialogOpenChange(false)}>
                {isUploading ? '取消上传' : '取消'}
              </Button>
              <Button onClick={handleUpload} disabled={uploadFiles.length === 0 || isUploading}>
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
