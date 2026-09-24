"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { usePermission } from "@/shared/hooks/use-permission"
import { useSemesterStore } from "@/shared/stores/semester-store"
import { DashboardBreadcrumb } from "@/modules/dashboard/components/dashboard-breadcrumb"
import { DepartmentDashboard } from "@/modules/dashboard/components/department/department-dashboard"
import { MajorDashboard } from "@/modules/dashboard/components/major/major-dashboard"
import { SchoolDashboard } from "@/modules/dashboard/components/school/school-dashboard"
import { SampleDataBadge } from "@/modules/dashboard/components/shared/sample-data-badge"
import { TeacherDashboard } from "@/modules/dashboard/components/teacher/teacher-dashboard"
import { TierSwitcher } from "@/modules/dashboard/components/tier-switcher"
import { resolveDefaultTier, resolveReturnPath } from "@/modules/dashboard/tiers"
import type { DashboardFocus, DashboardTier } from "@/modules/dashboard/types"

/** 示例数据阶段的默认下钻对象 */
const DEFAULT_FOCUS: DashboardFocus = { departmentName: "信息工程学院", majorName: "软件技术" }

export function DashboardView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { permissionId } = usePermission()
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId)
  const semesterList = useSemesterStore((state) => state.semesterList)

  const [tier, setTier] = useState<DashboardTier>(() => resolveDefaultTier(permissionId))
  const [focus, setFocus] = useState<DashboardFocus>(DEFAULT_FOCUS)
  const tierTouchedRef = useRef(false)

  // 权限编码在挂载后才从本地存储读到时，按身份重新定一次默认层级（用户手动切过则不覆盖）
  useEffect(() => {
    if (!tierTouchedRef.current) setTier(resolveDefaultTier(permissionId))
  }, [permissionId])

  const selectedSemester = semesterList.find((semester) => semester.id === selectedSemesterId)
  const semesterLabel = selectedSemester !== undefined ? selectedSemester.name : "未选择学期"
  const seed = selectedSemesterId !== null ? selectedSemesterId : 0

  const changeTier = (next: DashboardTier) => {
    tierTouchedRef.current = true
    setTier(next)
  }

  const drillDepartment = (departmentName: string) => {
    setFocus({ departmentName, majorName: DEFAULT_FOCUS.majorName })
    changeTier("department")
  }

  const drillMajor = (majorName: string) => {
    setFocus((current) => ({ ...current, majorName }))
    changeTier("major")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">数据看板</h2>
          <SampleDataBadge />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {semesterLabel}
          </span>
          <DashboardBreadcrumb tier={tier} focus={focus} onNavigate={changeTier} />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <TierSwitcher value={tier} onChange={changeTier} />
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

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tier === "school" ? <SchoolDashboard seed={seed} onDrillDepartment={drillDepartment} /> : null}
        {tier === "department" ? (
          <DepartmentDashboard seed={seed} departmentName={focus.departmentName} onDrillMajor={drillMajor} />
        ) : null}
        {tier === "major" ? <MajorDashboard seed={seed} departmentName={focus.departmentName} majorName={focus.majorName} /> : null}
        {tier === "teacher" ? <TeacherDashboard seed={seed} /> : null}
      </div>
    </div>
  )
}
