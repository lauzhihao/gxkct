"use client"

import type { FileDetailViewProps } from "./types"
import { ScoringCard } from "./ScoringCard"

export function FileDetailView({
  file,
  scoring,
  editingScoring,
  editScores,
  onStartEditScoring,
  onSaveScoring,
  onCancelEditScoring,
  onUpdateIndicatorScore,
  onUpdateScoringComment,
}: FileDetailViewProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 文件信息 */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <h4 className="text-sm font-semibold mb-3">文件信息</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">文件名：</span>
              <span className="text-foreground">{file.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">大小：</span>
              <span className="text-foreground">{file.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">类型：</span>
              <span className="text-foreground">{file.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">上传者：</span>
              <span className="text-foreground">{file.uploader}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本：</span>
              <span className="text-foreground">{file.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">日期：</span>
              <span className="text-foreground">{file.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 评分卡片 */}
      <div className="space-y-4">
        {Object.entries(scoring).map(([key, scoringData]) => (
          <ScoringCard
            key={key}
            scoringKey={key}
            scoring={scoringData}
            isEditing={editingScoring === key}
            editScores={editScores}
            onStartEdit={onStartEditScoring}
            onSave={onSaveScoring}
            onCancel={onCancelEditScoring}
            onUpdateScore={onUpdateIndicatorScore}
            onUpdateComment={onUpdateScoringComment}
          />
        ))}
      </div>
    </div>
  )
}

