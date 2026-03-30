"use client"

import { useCallback, useState } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      if (!item) {
        return initialValue
      }

      try {
        return JSON.parse(item)
      } catch {
        // 如果不是有效的JSON，直接返回字符串值（兼容旧的非JSON格式数据）
        return item as T
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((previousValue) => {
        const valueToStore = value instanceof Function ? value(previousValue) : value

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }

        return valueToStore
      })
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error)
    }
  }, [key])

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error)
    }
  }, [initialValue, key])

  return [storedValue, setValue, removeValue] as const
}
