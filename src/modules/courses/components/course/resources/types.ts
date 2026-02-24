import type { ResourceFolder } from "@/lib/api"
import type { ResourceBreadcrumbNode, ResourceObject } from "@/modules/courses/hooks/use-course-resources"
import type { FileUploadProps } from "@/shared/components/ui/file-upload"

export type FolderData = ResourceFolder
export type ResourceObjectItem = ResourceObject

export interface ResourceBreadcrumbProps {
  path: ResourceBreadcrumbNode[]
  onCrumbClick: (index: number) => void
}

export interface ResourceSearchBarProps {
  courseEditable?: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
  placeholder: string
  onViewModeChange?: (mode: "grid" | "list") => void
  viewMode?: "grid" | "list"
  className?: string
  uploadProps?: FileUploadProps
  onCreateFolderClick?: () => void
  disableCreateFolder?: boolean
}

export type ResourceEntry =
  | {
      type: "folder"
      folder: FolderData
    }
  | {
      type: "object"
      object: ResourceObjectItem
    }

export interface ResourceObjectListProps {
  entries: ResourceEntry[]
  viewMode: "grid" | "list"
  selectedIds: Set<string>
  onToggleSelect: (objectId: string) => void
  onFolderClick: (folder: FolderData) => void
  isRootLevel?: boolean
}

export interface FileListItem {
  id: string
  name: string
  size: string
  date: string
}

export interface FileListProps {
  files: FileListItem[]
  onFileClick: (file: FileListItem) => void
}
