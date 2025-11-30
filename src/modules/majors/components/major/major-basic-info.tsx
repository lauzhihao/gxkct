"use client"

import { BookOpen, Briefcase, Award, ClipboardCheck } from "lucide-react"
import { useEffect, useState, useRef, useMemo } from "react"
import type { TreeNode } from "@/types"
import { TreeApi } from "@/lib/api/tree-api"

interface MajorBasicInfoProps {
  node: TreeNode
}

// 专业层次字典映射
const majorLevelMap: { [key: string]: string } = {
  "1": "本科",
  "2": "高职",
  "3": "中职",
}

// 创建单例 TreeApi 实例
const treeApiInstance = new TreeApi()

export function MajorBasicInfo({ node }: MajorBasicInfoProps) {
  const [detailData, setDetailData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasLoadedRef = useRef(false)
  const majorIdRef = useRef<string | null>(null)

  // 获取专业层次显示文本
  const getMajorLevelText = (level: string | undefined) => {
    if (!level) return "未设置"
    return majorLevelMap[level] || level
  }

  // 加载专业详情
  useEffect(() => {
    const majorId = node.metadata?.majorId

    // 如果已有详情数据或已加载过，不需要加载
    if (node.metadata?.majorLevel || node.metadata?.feature || !majorId) {
      return
    }

    // 如果已经加载过这个专业，不再加载
    if (hasLoadedRef.current && majorIdRef.current === majorId) {
      return
    }

    // 标记为已加载，防止重复请求
    hasLoadedRef.current = true
    majorIdRef.current = majorId

    const loadMajorDetail = async () => {
      setIsLoading(true)
      try {
        const response = await treeApiInstance.getMajorDetail(majorId)
        if (response.data) {
          setDetailData(response.data)
        }
      } catch (error) {
        console.error("加载专业详情失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMajorDetail()
  }, [node.metadata?.majorId])

  // 合并本地数据和加载的详情数据
  const metadata = {
    ...node.metadata,
    majorLevel: node.metadata?.majorLevel || detailData?.majorLevel || "",
    majorClass: node.metadata?.majorClass || detailData?.majorClass || "",
    feature: node.metadata?.feature || detailData?.feature || "",
    careerLevel: node.metadata?.careerLevel || detailData?.careerLevel || "",
    demandType: node.metadata?.demandType || detailData?.demandType || "",
    demandArea: node.metadata?.demandArea || detailData?.demandArea || "",
    professionsVOS: node.metadata?.professionsVOS?.length ? node.metadata.professionsVOS : detailData?.professionsVOS || [],
    position: node.metadata?.position || detailData?.position || "",
    requiresVOS: node.metadata?.requiresVOS?.length ? node.metadata.requiresVOS : detailData?.requiresVOS || [],
  }
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
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              专业代码
            </div>
            <div className="text-base font-semibold text-foreground">{metadata?.code || "未设置"}</div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              专业名称
            </div>
            <div className="text-base font-semibold text-foreground">{node.name}</div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              专业层次
            </div>
            <div className="text-base font-semibold text-foreground">{getMajorLevelText(metadata?.majorLevel)}</div>
          </div>
        </div>

        {metadata?.feature && (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              专业特色
            </div>
            <div className="text-sm text-foreground leading-relaxed">{metadata.feature}</div>
          </div>
        )}
      </div>

      {/* Career Information Section */}
      {metadata?.professionsVOS && metadata.professionsVOS.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            职业信息
          </h3>

          {/* 职业层次和需求信息 */}
          {(metadata?.careerLevel || metadata?.demandType || metadata?.demandArea) && (
            <div className="grid grid-cols-3 gap-4">
              {metadata?.careerLevel && (
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    职业层次
                  </div>
                  <div className="text-base font-semibold text-foreground">{metadata.careerLevel}</div>
                </div>
              )}
              {metadata?.demandType && (
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    需求类型
                  </div>
                  <div className="text-base font-semibold text-foreground">{metadata.demandType}</div>
                </div>
              )}
              {metadata?.demandArea && (
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    需求区域
                  </div>
                  <div className="text-base font-semibold text-foreground">{metadata.demandArea}</div>
                </div>
              )}
            </div>
          )}

          {/* 职业方向列表 */}
          <div className="space-y-3">
            {metadata.professionsVOS.map((professionVO: any, index: number) => {
              const professionPath = professionVO.profession
                ?.map((p: any) => p.name)
                .join(" / ") || "未设置"

              return (
                <div key={professionVO.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">职业方向 {index + 1}</span>
                    {professionVO.profession && professionVO.profession.length > 0 && (
                      <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-xs font-medium text-primary">
                        {professionVO.profession[professionVO.profession.length - 1]?.code || ""}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        职业方向
                      </div>
                      <div className="text-sm text-foreground font-medium">{professionPath}</div>
                    </div>

                    {professionVO.task && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          工作任务
                        </div>
                        <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{professionVO.task}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Training Information Section */}
      {metadata?.position && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            培养信息
          </h3>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              培养定位
            </div>
            <div className="text-sm text-foreground leading-relaxed">{metadata.position}</div>
          </div>
        </div>
      )}

      {/* Graduation Requirements Section */}
      {metadata?.requiresVOS && metadata.requiresVOS.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            毕业要求
          </h3>

          <div className="space-y-3">
            {metadata.requiresVOS.map((req: any, reqIndex: number) => (
              <div key={req.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                    {reqIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground mb-2">{req.description}</div>

                    {req.children && req.children.length > 0 && (
                      <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          指标点
                        </div>
                        {req.children.map((indicator: any, idx: number) => (
                          <div key={indicator.id} className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                              {reqIndex + 1}.{idx + 1}
                            </span>
                            <div className="text-xs text-foreground leading-relaxed">{indicator.description}</div>
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
      {!metadata?.code &&
        !metadata?.majorClass &&
        !metadata?.feature &&
        (!metadata?.professionsVOS || metadata.professionsVOS.length === 0) &&
        !metadata?.position &&
        (!metadata?.requiresVOS || metadata.requiresVOS.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无详细信息</p>
            <p className="text-xs">点击右上角编辑按钮完善专业信息</p>
          </div>
        )}
    </div>
  )
}
