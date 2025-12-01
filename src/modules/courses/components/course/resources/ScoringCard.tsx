"use client"

import { Star, Edit, Save, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Slider } from "@/shared/components/ui/slider"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import type { ScoringCardProps } from "./types"

// 获取评分类型名称
function getScoringTitle(key: string): string {
  switch (key) {
    case "selfEvaluation":
      return "自我评分"
    case "professionalEvaluation":
      return "专业评分"
    case "supervisionEvaluation":
      return "督导评分"
    default:
      return key
  }
}

export function ScoringCard({
  scoringKey,
  scoring,
  isEditing,
  editScores,
  onStartEdit,
  onSave,
  onCancel,
  onUpdateScore,
  onUpdateComment,
}: ScoringCardProps) {
  const displayScoring = isEditing ? editScores! : scoring

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          {getScoringTitle(scoringKey)}
        </h4>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onSave}>
                <Save className="w-3.5 h-3.5 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onStartEdit(scoringKey, scoring)}
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
                onValueChange={(value) => onUpdateScore(index, value[0])}
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
          <Label htmlFor={`comment-${scoringKey}`} className="text-xs text-muted-foreground">
            评语
          </Label>
          <Textarea
            id={`comment-${scoringKey}`}
            value={displayScoring.comment || ""}
            onChange={(e) => onUpdateComment(e.target.value)}
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
}

