"use client"

import { BookOpen, User, TrendingUp, Award, ClipboardCheck } from "lucide-react"
import type { TreeNode } from "@/types"

interface MajorBasicInfoProps {
  node: TreeNode
}

export function MajorBasicInfo({ node }: MajorBasicInfoProps) {
  return (
    <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          基本信息
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2">专业代码</div>
            <div className="text-base font-semibold text-foreground">{node.metadata?.code || "未设置"}</div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2">专业名称</div>
            <div className="text-base font-semibold text-foreground">{node.name}</div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2">专业层次</div>
            <div className="text-base font-semibold text-foreground">{node.metadata?.level || "未设置"}</div>
          </div>
        </div>

        {node.metadata?.director && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              负责人
            </div>
            <div className="text-base font-semibold text-foreground">{node.metadata.director}</div>
          </div>
        )}

        {node.description && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2">办学特色</div>
            <div className="text-sm text-foreground leading-relaxed">{node.description}</div>
          </div>
        )}
      </div>

      {/* Career Information Section */}
      {node.metadata?.careerInfo && node.metadata.careerInfo.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            职业信息
          </h3>

          <div className="space-y-3">
            {node.metadata.careerInfo.map((career: any, index: number) => (
              <div key={career.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">职业方向 {index + 1}</span>
                  <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-sm font-medium text-primary">
                    {career.level}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">职业方向</div>
                    <div className="text-sm text-foreground font-medium">
                      {career.direction?.category1 &&
                      career.direction?.category2 &&
                      career.direction?.category3 &&
                      career.direction?.category4
                        ? `${career.direction.category1} / ${career.direction.category2} / ${career.direction.category3} / ${career.direction.category4}`
                        : "未设置"}
                    </div>
                  </div>

                  {career.tasks && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">工作任务</div>
                      <div className="text-sm text-foreground leading-relaxed">{career.tasks}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Information Section */}
      {(node.metadata?.demandStatus || node.metadata?.trainingObjectives) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            培养信息
          </h3>

          {node.metadata?.demandStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <div className="text-sm text-muted-foreground mb-2">需求状况</div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-sm font-medium text-accent">
                    {node.metadata.demandStatus}
                  </span>
                  {node.metadata.selectedProvince && (
                    <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium text-primary">
                      {node.metadata.selectedProvince}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {node.metadata?.trainingObjectives && (
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <div className="text-sm text-muted-foreground mb-2">培养目标</div>
              <div className="text-sm text-foreground leading-relaxed">{node.metadata.trainingObjectives}</div>
            </div>
          )}
        </div>
      )}

      {/* Graduation Requirements Section */}
      {node.metadata?.graduationRequirements && node.metadata.graduationRequirements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            毕业要求
          </h3>

          <div className="space-y-3">
            {node.metadata.graduationRequirements.map((req: any, reqIndex: number) => (
              <div key={req.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                    {reqIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground mb-2">{req.content}</div>

                    {req.indicators && req.indicators.length > 0 && (
                      <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                        <div className="text-xs text-muted-foreground mb-2">指标点</div>
                        {req.indicators.map((indicator: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                              {reqIndex + 1}.{idx + 1}
                            </span>
                            <div className="text-xs text-foreground leading-relaxed">{indicator}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message if no detailed data */}
      {!node.metadata?.code &&
        !node.description &&
        (!node.metadata?.careerInfo || node.metadata.careerInfo.length === 0) &&
        !node.metadata?.trainingObjectives &&
        (!node.metadata?.graduationRequirements || node.metadata.graduationRequirements.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无详细信息</p>
            <p className="text-xs">点击右上角编辑按钮完善专业信息</p>
          </div>
        )}
    </div>
  )
}
