"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { api } from "@/lib/api"
import type { TreeNode } from "@/types"

interface SearchResult {
  node: TreeNode
  path: TreeNode[]
}

export function useTreeSearch(semesterId?: number | null) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchCache, setSearchCache] = useState<Map<string, SearchResult[]>>(new Map())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 执行搜索
  const performSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const cacheKey = `${semesterId === null || semesterId === undefined ? "all" : semesterId}:${keyword}`

    // 检查缓存
    if (searchCache.has(cacheKey)) {
      console.log(`[v0] useTreeSearch: 使用缓存结果 for "${keyword}"`)
      setSearchResults(searchCache.get(cacheKey) || [])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await api.tree.searchTree(keyword, semesterId)
      if (response.data) {
        setSearchResults(response.data)
        // 缓存结果
        setSearchCache((prev) => new Map(prev).set(cacheKey, response.data || []))
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("[v0] useTreeSearch: 搜索出错:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchCache, semesterId])

  // 防抖搜索
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      performSearch(term)
    }, 300) // 300ms防抖延迟
  }, [performSearch])

  // 清空搜索
  const clearSearch = useCallback(() => {
    setSearchTerm("")
    setSearchResults([])
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setSearchResults([])
    setSearchCache(new Map())
  }, [semesterId])

  return {
    searchTerm,
    setSearchTerm: handleSearchChange,
    isSearching,
    searchResults,
    clearSearch,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length,
  }
}
