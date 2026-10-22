"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarDays, Info } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { getStoredAuthUser } from "@/lib/api/auth-config"
import { usePermission } from "@/shared/hooks/use-permission"
import { useSemesterStore } from "@/shared/stores/semester-store"
import { DepartmentDashboard } from "@/modules/dashboard/components/department/department-dashboard"
import { FocusSelect } from "@/modules/dashboard/components/focus-select"
import { MajorDashboard } from "@/modules/dashboard/components/major/major-dashboard"
import { SchoolDashboard } from "@/modules/dashboard/components/school/school-dashboard"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { TeacherDashboard } from "@/modules/dashboard/components/teacher/teacher-dashboard"
import { TierSwitcher } from "@/modules/dashboard/components/tier-switcher"
import { fetchTree } from "@/modules/dashboard/data/dashboard-api"
import { buildOrgIndex, type OrgIndex } from "@/modules/dashboard/data/org-index"
import { resolveSemesterComparisons } from "@/modules/dashboard/data/semesters"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"
import { resolveAllowedTiers, resolveOwnTier, resolveReturnPath } from "@/modules/dashboard/tiers"
import type { DashboardTier } from "@/modules/dashboard/types"

interface DashboardFocus {
  departmentId: string | null
  majorId: string | null
}

/** 课程数最多的一项；并列时取列表中靠前的；列表为空返回 null */
function pickLargest<T extends { id: string }>(items: readonly T[], courseCountOf: (item: T) => number): string | null {
  let bestId: string | null = null
  let bestCount = -1
  items.forEach((item) => {
    const count = courseCountOf(item)
    if (count > bestCount) {
      bestId = item.id
      bestCount = count
    }
  })
  return bestId
}

/**
 * 解析当前下钻对象：用户选过且仍在本学期组织树里的院系 / 专业优先；
 * 还没选过，或切换学期后原选择已不存在时，默认看课程最多的院系、专业。
 */
function resolveFocus(index: OrgIndex, requestedDepartmentId: string | null, requestedMajorId: string | null): DashboardFocus {
  const coursesByMajor = new Map<string, number>()
  index.courses.forEach((course) => {
    const current = coursesByMajor.get(course.majorId)
    coursesByMajor.set(course.majorId, current === undefined ? 1 : current + 1)
  })
  const majorCourseCount = (majorId: string) => {
    const count = coursesByMajor.get(majorId)
    return count === undefined ? 0 : count
  }

  const departmentId =
    requestedDepartmentId !== null && index.departmentById.has(requestedDepartmentId)
      ? requestedDepartmentId
      : pickLargest(index.departments, (department) =>
          index.majors
            .filter((major) => major.departmentId === department.id)
            .reduce((sum, major) => sum + majorCourseCount(major.id), 0),
        )
  if (departmentId === null) return { departmentId: null, majorId: null }

  const majors = index.majors.filter((major) => major.departmentId === departmentId)
  const majorId =
    requestedMajorId !== null && majors.some((major) => major.id === requestedMajorId)
      ? requestedMajorId
      : pickLargest(majors, (major) => majorCourseCount(major.id))
  return { departmentId, majorId }
}

export function DashboardView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { permissionId } = usePermission()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const semesterList = useSemesterStore((state) => state.semesterList)
  // 页面在挂载后才渲染本组件，可以直接读取本地登录信息
  const authUser = useMemo(() => getStoredAuthUser(), [])
  const collegeId = authUser !== null ? authUser.collegeId : null

  const allowedTiers = resolveAllowedTiers(permissionId)
  // 校级账号看得到全校课程，院系层才给出全校排名与全校对比
  const schoolScopeVisible = resolveOwnTier(permissionId) === "school"
  const comparisons = useMemo(
    () => resolveSemesterComparisons(semesterList, selectedSemesterId),
    [semesterList, selectedSemesterId],
  )
  const [requestedTier, setRequestedTier] = useState<DashboardTier | null>(null)
  const tier = requestedTier !== null && allowedTiers.includes(requestedTier) ? requestedTier : allowedTiers[0]
  const [requestedDepartmentId, setRequestedDepartmentId] = useState<string | null>(null)
  const [requestedMajorId, setRequestedMajorId] = useState<string | null>(null)

  const needsFocus = tier === "department" || tier === "major"
  const orgQuery = useDashboardQuery(
    collegeId !== null && needsFocus ? `org|${collegeId}|${selectedSemesterId}` : null,
    async () => {
      if (collegeId === null) throw new Error("Auth user has no college")
      return buildOrgIndex(await fetchTree(collegeId, selectedSemesterId))
    },
  )
  const orgIndex = needsFocus && orgQuery.state.status === "ready" ? orgQuery.state.data : null
  const focus = orgIndex !== null ? resolveFocus(orgIndex, requestedDepartmentId, requestedMajorId) : null

  const selectedSemester = semesterList.find((semester) => semester.id === selectedSemesterId)
  const semesterLabel = selectedSemester !== undefined ? selectedSemester.name : "未选择学期"

  const drillMajor = (majorId: string) => {
    setRequestedMajorId(majorId)
    setRequestedTier("major")
  }

  let body: ReactNode
  if (authUser === null) {
    body = <p className="py-10 text-center text-sm text-muted-foreground">未读取到登录信息，请重新登录后再打开看板</p>
  } else if (tier === "school") {
    body = <SchoolDashboard collegeId={authUser.collegeId} semesterId={selectedSemesterId} comparisons={comparisons} />
  } else if (tier === "teacher") {
    body = (
      <TeacherDashboard
        collegeId={authUser.collegeId}
        semesterId={selectedSemesterId}
        comparisons={comparisons}
        identity={{ userId: authUser.id, userName: authUser.userName, email: authUser.email }}
      />
    )
  } else if (orgQuery.state.status !== "ready") {
    body = <LoadState state={orgQuery.state} loadingText="正在读取组织结构" onRetry={orgQuery.retry} />
  } else if (focus === null || focus.departmentId === null) {
    body = <p className="py-10 text-center text-sm text-muted-foreground">本学期没有可查看的院系</p>
  } else if (tier === "department") {
    body = (
      <DepartmentDashboard
        collegeId={authUser.collegeId}
        semesterId={selectedSemesterId}
        comparisons={comparisons}
        departmentId={focus.departmentId}
        schoolScopeVisible={schoolScopeVisible}
        onDrillMajor={drillMajor}
      />
    )
  } else if (focus.majorId === null) {
    body = <p className="py-10 text-center text-sm text-muted-foreground">本学期该院系没有专业</p>
  } else {
    body = (
      <MajorDashboard
        collegeId={authUser.collegeId}
        semesterId={selectedSemesterId}
        comparisons={comparisons}
        majorId={focus.majorId}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">数据看板</h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {semesterLabel}
          </span>
          {orgIndex !== null && focus !== null && focus.departmentId !== null ? (
            <FocusSelect
              label="院系"
              value={focus.departmentId}
              options={orgIndex.departments.map((department) => ({ value: department.id, label: department.name }))}
              onChange={(departmentId) => {
                setRequestedDepartmentId(departmentId)
                setRequestedMajorId(null)
              }}
            />
          ) : null}
          {tier === "major" && orgIndex !== null && focus !== null && focus.majorId !== null ? (
            <FocusSelect
              label="专业"
              value={focus.majorId}
              options={orgIndex.majors
                .filter((major) => major.departmentId === focus.departmentId)
                .map((major) => ({ value: major.id, label: major.name }))}
              onChange={setRequestedMajorId}
            />
          ) : null}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3.5" aria-hidden />
            N/A 表示暂取不到的指标，悬停可看原因
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {allowedTiers.length > 1 ? <TierSwitcher tiers={allowedTiers} value={tier} onChange={setRequestedTier} /> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(resolveReturnPath(searchParams.get("from")))}
          >
            <ArrowLeft className="size-4" aria-hidden />
            返回
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{body}</div>
    </div>
  )
}
