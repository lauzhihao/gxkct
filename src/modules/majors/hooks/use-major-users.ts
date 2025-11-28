import { useCallback, useEffect, useState } from "react"
import { majorUsersApi } from "@/modules/majors/api/majorUsersApi"

export interface MajorUserRecord {
  id: string
  name: string
  email: string
  role: string
  enabled: boolean
}

const DEFAULT_USERS: MajorUserRecord[] = [
  { id: "1", name: "李教授", role: "专业管理员", email: "li@example.com", enabled: true },
  { id: "2", name: "王老师", role: "任课教师", email: "wang@example.com", enabled: true },
  { id: "3", name: "张老师", role: "任课教师", email: "zhang@example.com", enabled: true },
]

export function useMajorUsers(majorId: string) {
  const [users, setUsers] = useState<MajorUserRecord[]>(DEFAULT_USERS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      if (!majorId) return
      setIsLoading(true)
      try {
        const response = await majorUsersApi.getUsers(majorId)
        if (response.data) {
          setUsers(response.data)
        } else {
          setUsers(DEFAULT_USERS)
          await majorUsersApi.updateUsers(majorId, DEFAULT_USERS)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [majorId])

  const persistUsers = useCallback(
    async (nextUsers: MajorUserRecord[]) => {
      setUsers(nextUsers)
      await majorUsersApi.updateUsers(majorId, nextUsers)
    },
    [majorId],
  )

  return {
    users,
    isLoading,
    persistUsers,
  }
}
