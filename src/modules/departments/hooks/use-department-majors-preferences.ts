import { useEffect, useState } from "react"
import { departmentPreferencesApi } from "@/modules/departments/api/departmentPreferencesApi"

export function useDepartmentMajorsPreferences() {
  const [showMyMajors, setShowMyMajors] = useState(false)

  useEffect(() => {
    const loadPreference = async () => {
      const response = await departmentPreferencesApi.getShowMyMajors()
      if (response.data !== null) {
        setShowMyMajors(response.data as boolean)
      }
    }
    loadPreference()
  }, [])

  useEffect(() => {
    departmentPreferencesApi.setShowMyMajors(showMyMajors)
  }, [showMyMajors])

  return { showMyMajors, setShowMyMajors }
}

