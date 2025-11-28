import { useEffect, useState } from "react"
import { majorPreferencesApi } from "@/modules/majors/api/majorPreferencesApi"

export function useMajorCoursePreferences(majorId: string) {
  const [showMyCourses, setShowMyCourses] = useState(false)

  useEffect(() => {
    const loadPreference = async () => {
      const response = await majorPreferencesApi.getShowMyCourses(majorId)
      if (response.data !== null) {
        setShowMyCourses(response.data as boolean)
      }
    }
    loadPreference()
  }, [majorId])

  useEffect(() => {
    majorPreferencesApi.setShowMyCourses(majorId, showMyCourses)
  }, [majorId, showMyCourses])

  return { showMyCourses, setShowMyCourses }
}
