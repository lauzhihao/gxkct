/**
 * 职业信息管理Hook
 * 负责管理职业信息的CRUD操作和搜索逻辑
 */

import { useState, useCallback } from "react"
import type { CareerInfo, WorkCategory, SearchResult } from "@/modules/majors/types"
import { api } from "@/lib/api"

export interface UseCareerInfoResult {
  // 状态
  careerInfoList: CareerInfo[]
  careerSearchMap: Record<string, string>
  careerPopoverOpenMap: Record<string, boolean>

  // 更新方法
  setCareerInfoList: (value: CareerInfo[]) => void
  setCareerSearchMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setCareerPopoverOpenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>

  // 业务操作方法
  addCareerInfo: () => void
  removeCareerInfo: (id: string) => void
  updateCareerInfo: (id: string, field: string, value: unknown) => void
  handleCareerDirectionSelect: (
    careerInfoId: string,
    category1: string,
    category2: string,
    category3: string,
    category4: string
  ) => void

  // 工具方法
  getCategory2Options: (category1Label: string) => WorkCategory[]
  getCategory3Options: (category1Label: string, category2Label: string) => WorkCategory[]
  getCategory4Options: (category1Label: string, category2Label: string, category3Label: string) => WorkCategory[]
  searchCareerDirection: (searchText: string) => SearchResult[]
  getOccupationCode: (category1: string, category2: string, category3: string, category4: string) => string | null
}

export function useCareerInfo(initialData: MajorMetadata | undefined, worksData: WorkCategory[]): UseCareerInfoResult {
  // 从 professionsVOS 或 careerInfo 加载职业信息
  const loadCareerInfoList = () => {
    // 直接访问 initialData 的属性（已扁平化）
    if (initialData?.professionsVOS && initialData.professionsVOS.length > 0) {
      return initialData.professionsVOS.map((professionVO, index: number) => ({
        id: String(professionVO.id || index + 1),
        level: "中级",
        direction: {
          category1: professionVO.profession?.[0]?.name || "",
          category2: professionVO.profession?.[1]?.name || "",
          category3: professionVO.profession?.[2]?.name || "",
          category4: professionVO.profession?.[3]?.name || "",
        },
        tasks: professionVO.task || "",
      }))
    } else if (initialData?.careerInfo) {
      return initialData.careerInfo
    } else {
      return [
        {
          id: "1",
          level: "中级",
          direction: { category1: "", category2: "", category3: "", category4: "" },
          tasks: "",
        },
      ]
    }
  }

  const [careerInfoList, setCareerInfoList] = useState<CareerInfo[]>(loadCareerInfoList())
  const [careerSearchMap, setCareerSearchMap] = useState<{ [key: string]: string }>({})
  const [careerPopoverOpenMap, setCareerPopoverOpenMap] = useState<{ [key: string]: boolean }>({})

  const addCareerInfo = () => {
    setCareerInfoList([
      {
        id: Date.now().toString(),
        level: "中级",
        direction: { category1: "", category2: "", category3: "", category4: "" },
        tasks: "",
      },
      ...careerInfoList,
    ])
  }

  const removeCareerInfo = (id: string) => {
    if (careerInfoList.length > 1) {
      setCareerInfoList(careerInfoList.filter((item) => item.id !== id))
    }
  }

  const updateCareerInfo = (id: string, field: string, value: unknown) => {
    setCareerInfoList(careerInfoList.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // 根据选择的分类获取子分类
  const getCategory2Options = (category1Label: string): WorkCategory[] => {
    const category1 = worksData.find((item) => item.label === category1Label)
    return category1?.children || []
  }

  const getCategory3Options = (category1Label: string, category2Label: string): WorkCategory[] => {
    const category1 = worksData.find((item) => item.label === category1Label)
    const category2 = category1?.children.find((item) => item.label === category2Label)
    return category2?.children || []
  }

  const getCategory4Options = (
    category1Label: string,
    category2Label: string,
    category3Label: string
  ): WorkCategory[] => {
    const category1 = worksData.find((item) => item.label === category1Label)
    const category2 = category1?.children.find((item) => item.label === category2Label)
    const category3 = category2?.children.find((item) => item.label === category3Label)
    return category3?.children || []
  }

  // 搜索职业方向（递归搜索所有层级，只返回第4级的完整路径）
  const searchCareerDirection = (searchText: string): SearchResult[] => {
    if (!searchText.trim()) return []

    const results: SearchResult[] = []
    const lowerSearch = searchText.toLowerCase()

    worksData.forEach((cat1) => {
      cat1.children?.forEach((cat2) => {
        cat2.children?.forEach((cat3) => {
          cat3.children?.forEach((cat4) => {
            let matchLevel = 0
            let matchedText = ""

            if (cat4.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 4
              matchedText = cat4.label
            } else if (cat3.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 3
              matchedText = cat3.label
            } else if (cat2.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 2
              matchedText = cat2.label
            } else if (cat1.label.toLowerCase().includes(lowerSearch)) {
              matchLevel = 1
              matchedText = cat1.label
            }

            if (matchLevel > 0) {
              results.push({
                category1: cat1,
                category2: cat2,
                category3: cat3,
                category4: cat4,
                matchedText,
                matchLevel,
              })
            }
          })
        })
      })
    })

    return results
  }

  // 获取职业代码
  const getOccupationCode = useCallback(
    (category1: string, category2: string, category3: string, category4: string): string | null => {
      const cat1 = worksData.find((item) => item.label === category1)
      if (!cat1) return null

      const cat2 = cat1.children?.find((item) => item.label === category2)
      if (!cat2) return null

      const cat3 = cat2.children?.find((item) => item.label === category3)
      if (!cat3) return null

      const cat4 = cat3.children?.find((item) => item.label === category4)
      if (!cat4) return null

      return cat4.value
    },
    [worksData]
  )

  // 选择职业方向后调用接口获取工作职责
  const handleCareerDirectionSelect = useCallback(
    (careerInfoId: string, category1: string, category2: string, category3: string, category4: string) => {
      // 先更新职业方向
      setCareerInfoList((prevList) =>
        prevList.map((item) =>
          item.id === careerInfoId
            ? {
                ...item,
                direction: {
                  category1,
                  category2,
                  category3,
                  category4,
                },
              }
            : item
        )
      )

      // 获取职业代码
      const occupationCode = getOccupationCode(category1, category2, category3, category4)
      if (occupationCode) {
        // 异步调用接口获取工作职责
        api.occupation
          .getOccupationBook(occupationCode)
          .then((response) => {
            if (response.data) {
              const taskText = response.data.task || "暂未设置工作任务。"
              setCareerInfoList((prevList) =>
                prevList.map((item) => (item.id === careerInfoId ? { ...item, tasks: taskText } : item))
              )
            }
          })
          .catch((error) => {
            console.error("获取职业信息失败:", error)
          })
      }
    },
    [getOccupationCode]
  )

  return {
    careerInfoList,
    careerSearchMap,
    careerPopoverOpenMap,
    setCareerInfoList,
    setCareerSearchMap,
    setCareerPopoverOpenMap,
    addCareerInfo,
    removeCareerInfo,
    updateCareerInfo,
    handleCareerDirectionSelect,
    getCategory2Options,
    getCategory3Options,
    getCategory4Options,
    searchCareerDirection,
    getOccupationCode,
  }
}
