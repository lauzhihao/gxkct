export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue

  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored) as T
    }
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
  }
  return defaultValue
}

export function safeLocalStorageSet<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
    return false
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error)
    return false
  }
}

export function safeLocalStorageGetString(key: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
    return null
  }
}

export function safeLocalStorageSetString(key: string, value: string): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
    return false
  }
}
