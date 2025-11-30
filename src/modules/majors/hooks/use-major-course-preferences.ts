import { useEffect, useState } from "react"
import { majorPreferencesApi } from "@/modules/majors/api/majorPreferencesApi"

export function useMajorCoursePreferences() {
  const [showMyCourses, setShowMyCourses] = useState(false)

  useEffect(() => {
    const loadPreference = async () => {
      const response = await majorPreferencesApi.getShowMyCourses()
      if (response.data !== null) {
        setShowMyCourses(response.data as boolean)
      }
    }
    loadPreference()
  }, [])

  useEffect(() => {
    majorPreferencesApi.setShowMyCourses(showMyCourses)
  }, [showMyCourses])

  return { showMyCourses, setShowMyCourses }
}
