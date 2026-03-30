"use client"

import { useMemo } from "react"
import type { TreeNode } from "@/types"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { isCurrentUserCourseOwner } from "@/shared/utils/course-ownership"

const COURSE_EDIT_ACTION: PermissionAction = "course.detail.edit"
const COURSE_EDIT_CONTEXT = { scope: "course" as const }

export function hasCourseEditPermission(canEditCourseDetail: boolean, courseNode?: TreeNode | null): boolean {
  if (!canEditCourseDetail) {
    return false
  }

  return isCurrentUserCourseOwner(courseNode)
}

export function useCourseEditPermission(courseNode?: TreeNode | null): boolean {
  const { can } = usePermission()

  return useMemo(() => {
    const canEditCourseDetail = can(COURSE_EDIT_ACTION, COURSE_EDIT_CONTEXT)
    return hasCourseEditPermission(canEditCourseDetail, courseNode)
  }, [can, courseNode])
}
