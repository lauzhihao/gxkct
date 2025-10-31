"use client"

import { Button } from "@/components/ui/button"
import { ClipboardCheck, MessageSquare } from "lucide-react"

export function CourseSupervision() {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4" />
        督导评分
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-primary mb-1">85</div>
            <div className="text-xs text-muted-foreground">自评分数</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-accent mb-1">88</div>
            <div className="text-xs text-muted-foreground">部门评分</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-green-600 mb-1">90</div>
            <div className="text-xs text-muted-foreground">督导评分</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">教学内容</span>
              <span className="text-sm text-primary font-medium">92分</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "92%" }}></div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">教学方法</span>
              <span className="text-sm text-accent font-medium">88分</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: "88%" }}></div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">资源完整性</span>
              <span className="text-sm text-green-600 font-medium">90分</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "90%" }}></div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-card/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">督导评语</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            课程资源丰富，教学内容完整，教学方法多样化。建议进一步完善预习手册和增加互动案例。整体质量优秀，继续保持。
          </p>
        </div>

        <Button size="sm" className="w-full gap-2">
          <ClipboardCheck className="w-4 h-4" />
          查看详细评估报告
        </Button>
      </div>
    </div>
  )
}
