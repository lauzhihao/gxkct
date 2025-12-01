import type { FileData, CourseResourceData, ScoringData } from "@/lib/api"

// 文件夹类型
export type FolderData = CourseResourceData["folders"][0]

// 评分数据类型
export type { ScoringData }

// 上传文件类型
export interface UploadFile {
  file: File
  id: string
}

// 面包屑导航 Props
export interface ResourceBreadcrumbProps {
  currentFolder: string | null
  selectedFile: FileData | null
  folderName?: string
  onBackToFolders: () => void
  onBackToFiles: () => void
}

// 搜索栏 Props
export interface ResourceSearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  placeholder: string
  currentFolder: string | null
  onUploadClick: () => void
}

// 文件夹网格 Props
export interface FolderGridProps {
  folders: FolderData[]
  onFolderClick: (folderId: string) => void
}

// 文件列表 Props
export interface FileListProps {
  files: FileData[]
  onFileClick: (file: FileData) => void
}

// 评分卡片 Props
export interface ScoringCardProps {
  scoringKey: string
  scoring: ScoringData
  isEditing: boolean
  editScores: ScoringData | null
  onStartEdit: (key: string, scoring: ScoringData) => void
  onSave: () => void
  onCancel: () => void
  onUpdateScore: (index: number, score: number) => void
  onUpdateComment: (comment: string) => void
}

// 文件详情视图 Props
export interface FileDetailViewProps {
  file: FileData
  scoring: CourseResourceData["scoring"]
  editingScoring: string | null
  editScores: ScoringData | null
  onStartEditScoring: (key: string, scoring: ScoringData) => void
  onSaveScoring: () => void
  onCancelEditScoring: () => void
  onUpdateIndicatorScore: (index: number, score: number) => void
  onUpdateScoringComment: (comment: string) => void
}

// 上传对话框 Props
export interface UploadDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  uploadFiles: UploadFile[]
  uploadProgress: number
  isUploading: boolean
  isDragging: boolean
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onRemoveFile: (id: string) => void
  onUpload: () => void
}

