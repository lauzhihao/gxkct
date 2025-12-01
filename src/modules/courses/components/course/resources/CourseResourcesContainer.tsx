"use client"

import { FolderOpen } from "lucide-react"
import { SectionCard } from "@/shared/components/design-system"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import { useFileUpload } from "@/modules/courses/hooks/use-file-upload"
import { useScoringEditor } from "@/modules/courses/hooks/use-scoring-editor"
import { ResourceBreadcrumb } from "./ResourceBreadcrumb"
import { ResourceSearchBar } from "./ResourceSearchBar"
import { FolderGrid } from "./FolderGrid"
import { FileList } from "./FileList"
import { FileDetailView } from "./FileDetailView"
import { UploadDialog } from "./UploadDialog"

interface CourseResourcesContainerProps {
  nodeId: string
}

export function CourseResourcesContainer({ nodeId }: CourseResourcesContainerProps) {
  // 资源管理 Hook
  const {
    resourceData,
    setResourceData,
    isLoading,
    error,
    currentFolder,
    selectedFile,
    searchTerm,
    handleFolderClick,
    handleBackToFolders,
    handleFileClick,
    handleBackToFiles,
    setSearchTerm,
    getFilteredFolders,
    getCurrentFolderData,
    mockScoring,
  } = useCourseResources(nodeId)

  // 文件上传 Hook
  const fileUpload = useFileUpload({
    nodeId,
    currentFolder,
    resourceData,
    setResourceData,
  })

  // 评分编辑 Hook
  const scoringEditor = useScoringEditor({
    nodeId,
    resourceData,
    setResourceData,
  })

  const courseResources = resourceData?.folders || []
  const folderData = getCurrentFolderData()

  // 加载状态
  if (isLoading) {
    return (
      <SectionCard padding="sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">加载中</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  // 错误状态
  if (error) {
    return (
      <SectionCard padding="sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-2">加载失败</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  // 无数据状态
  if (!resourceData || courseResources.length === 0) {
    return (
      <SectionCard padding="sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">暂无课程资源</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard padding="sm">
      {/* 头部区域 */}
      <div className="flex items-center justify-between mb-4">
        <ResourceBreadcrumb
          currentFolder={currentFolder}
          selectedFile={selectedFile}
          folderName={folderData?.folder?.name}
          onBackToFolders={handleBackToFolders}
          onBackToFiles={handleBackToFiles}
        />
        {!selectedFile && (
          <ResourceSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder={currentFolder ? "快速定位文件..." : "快速定位目录..."}
            currentFolder={currentFolder}
            onUploadClick={() => fileUpload.setIsUploadDialogOpen(true)}
          />
        )}
      </div>

      {/* 内容区域 */}
      {selectedFile ? (
        <FileDetailView
          file={selectedFile}
          scoring={mockScoring}
          editingScoring={scoringEditor.editingScoring}
          editScores={scoringEditor.editScores}
          onStartEditScoring={scoringEditor.startEditScoring}
          onSaveScoring={scoringEditor.saveScoring}
          onCancelEditScoring={scoringEditor.cancelEditScoring}
          onUpdateIndicatorScore={scoringEditor.updateIndicatorScore}
          onUpdateScoringComment={scoringEditor.updateScoringComment}
        />
      ) : !currentFolder ? (
        <FolderGrid folders={getFilteredFolders()} onFolderClick={handleFolderClick} />
      ) : (
        <FileList files={folderData?.files || []} onFileClick={handleFileClick} />
      )}

      {/* 上传对话框 */}
      <UploadDialog
        isOpen={fileUpload.isUploadDialogOpen}
        onOpenChange={fileUpload.setIsUploadDialogOpen}
        uploadFiles={fileUpload.uploadFiles}
        uploadProgress={fileUpload.uploadProgress}
        isUploading={fileUpload.isUploading}
        isDragging={fileUpload.isDragging}
        onFileSelect={fileUpload.handleFileSelect}
        onDrop={fileUpload.handleDrop}
        onDragOver={fileUpload.handleDragOver}
        onDragLeave={fileUpload.handleDragLeave}
        onRemoveFile={fileUpload.removeUploadFile}
        onUpload={fileUpload.handleUpload}
      />
    </SectionCard>
  )
}

