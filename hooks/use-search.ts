"use client"

import { useState, useMemo, useCallback } from "react"

export function useSearch<T>(items: T[], searchFields: (item: T) => string[]) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items

    const lowerSearchTerm = searchTerm.toLowerCase()
    return items.filter((item) => {
      const fields = searchFields(item)
      return fields.some((field) => field.toLowerCase().includes(lowerSearchTerm))
    })
  }, [items, searchTerm, searchFields])

  const clearSearch = useCallback(() => {
    setSearchTerm("")
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch,
    hasResults: filteredItems.length > 0,
    resultCount: filteredItems.length,
  }
}
