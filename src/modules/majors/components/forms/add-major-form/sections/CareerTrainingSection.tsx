/**
 * 职业培养信息Section
 * 负责需求状况、省份选择、培养定位等信息的输入
 */

"use client"

import { useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { ChevronDown, Search, X } from "lucide-react"

interface CareerTrainingSectionProps {
  demandStatus: string
  selectedProvince: string
  provinceSearch: string
  provincePopoverOpen: boolean
  position: string
  setDemandStatus: (value: string) => void
  setSelectedProvince: (value: string) => void
  setProvinceSearch: (value: string) => void
  setProvincePopoverOpen: (value: boolean) => void
  setPosition: (value: string) => void
}

const provinces = [
  "北京市",
  "天津市",
  "河北省",
  "山西省",
  "内蒙古自治区",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "上海市",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "广西壮族自治区",
  "海南省",
  "重庆市",
  "四川省",
  "贵州省",
  "云南省",
  "西藏自治区",
  "陕西省",
  "甘肃省",
  "青海省",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "台湾省",
  "香港特别行政区",
  "澳门特别行政区",
]

export function CareerTrainingSection({
  demandStatus,
  selectedProvince,
  provinceSearch,
  provincePopoverOpen,
  position,
  setDemandStatus,
  setSelectedProvince,
  setProvinceSearch,
  setProvincePopoverOpen,
  setPosition,
}: CareerTrainingSectionProps) {
  const filteredProvinces = useMemo(
    () => provinces.filter((province) => province.toLowerCase().includes(provinceSearch.toLowerCase())),
    [provinceSearch]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-sm bg-[var(--naive-primary)]" />
        <h3 className="text-base font-semibold text-foreground">职业培养信息</h3>
      </div>
      <div className="border-t border-dashed border-border" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>需求状况</Label>
          <div className="flex gap-2">
            <div className="flex gap-2 w-1/2">
              <Button
                type="button"
                variant={demandStatus === "全部状况" ? "default" : "outline"}
                onClick={() => {
                  setDemandStatus("全部状况")
                  setSelectedProvince("")
                }}
                className="flex-1"
              >
                全部状况
              </Button>
              <Button
                type="button"
                variant={demandStatus === "全国紧缺" ? "default" : "outline"}
                onClick={() => {
                  setDemandStatus("全国紧缺")
                  setSelectedProvince("")
                }}
                className="flex-1"
              >
                全国紧缺
              </Button>
              <Button
                type="button"
                variant={demandStatus === "地方紧缺" ? "default" : "outline"}
                onClick={() => setDemandStatus("地方紧缺")}
                className="flex-1"
              >
                地方紧缺
              </Button>
            </div>
            {demandStatus === "地方紧缺" && (
              <div className="w-1/2">
                <Popover open={provincePopoverOpen} onOpenChange={setProvincePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-transparent">
                      <span className="truncate">{selectedProvince || "请选择省份"}</span>
                      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="flex flex-col">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="搜索省份..."
                            value={provinceSearch}
                            onChange={(e) => setProvinceSearch(e.target.value)}
                            className="pl-8 h-9"
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {filteredProvinces.length > 0 ? (
                          filteredProvinces.map((province) => (
                            <button
                              key={province}
                              onClick={() => {
                                setSelectedProvince(province)
                                setProvincePopoverOpen(false)
                                setProvinceSearch("")
                              }}
                              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-accent hover:text-white ${
                                selectedProvince === province ? "bg-[var(--naive-primary)] text-white" : ""
                              }`}
                            >
                              {province}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                            未找到匹配的省份
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">培养定位</Label>
          <div className="relative">
            <Textarea
              id="position"
              placeholder="描述专业的培养定位和人才培养目标"
              rows={4}
              value={position}
              onChange={(e) => setPosition(e.target.value.slice(0, 500))}
              maxLength={500}
              className="pr-20"
            />
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{position.length}/500</span>
              {position && (
                <button
                  type="button"
                  onClick={() => setPosition("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
