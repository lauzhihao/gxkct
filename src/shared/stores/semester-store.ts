import { create } from "zustand"
import { getStoredSemesterContext, setStoredSemesterContext } from "@/lib/api/auth-config"
import type { SemesterBrief, StoredSemesterContext } from "@/types"

interface InitializeSemesterStateInput {
  currentSemesterId: number | null
  selectedSemesterId: number | null
  semesterList: SemesterBrief[]
}

interface SemesterStoreState {
  currentSemesterId: number | null
  selectedSemesterId: number | null
  semesterList: SemesterBrief[]
  hasHydrated: boolean
  initializeFromStoredContext: (context: StoredSemesterContext | null) => void
  syncFromAuthContext: (context: StoredSemesterContext) => void
  setSelectedSemesterId: (semesterId: number | null) => void
  updateSemesterList: (semesterList: SemesterBrief[]) => void
  updateCurrentSemesterId: (semesterId: number | null) => void
  clear: () => void
}

export function resolvePreferredSelectedSemesterId(input: InitializeSemesterStateInput): number | null {
  const { currentSemesterId, selectedSemesterId, semesterList } = input
  const availableSemesterIds = new Set<number>()

  semesterList.forEach((semester) => {
    availableSemesterIds.add(Number(semester.id))
  })

  // [MOD] 逻辑重构：严格按照用户要求的优先级
  // 1. 优先保留用户手动切换的“查看视图”
  const targetSelectedId = selectedSemesterId !== null ? Number(selectedSemesterId) : null
  if (targetSelectedId !== null && availableSemesterIds.has(targetSelectedId)) {
    return targetSelectedId
  }

  // 2. 如果没有手动选中的，则使用接口返回的 isCurrent === true 的项
  const serverCurrentSemester = semesterList.find(s => s.isCurrent === true || Number(s.isCurrent) === 1)
  if (serverCurrentSemester) {
    return Number(serverCurrentSemester.id)
  }

  // 3. 兜底逻辑：使用 currentSemesterId
  const targetCurrentId = currentSemesterId !== null ? Number(currentSemesterId) : null
  if (targetCurrentId !== null && availableSemesterIds.has(targetCurrentId)) {
    return targetCurrentId
  }

  if (semesterList.length > 0) {
    return Number(semesterList[0].id)
  }

  return null
}

function persistSemesterContext(state: Pick<SemesterStoreState, "currentSemesterId" | "selectedSemesterId" | "semesterList">): void {
  setStoredSemesterContext({
    currentSemesterId: state.currentSemesterId,
    selectedSemesterId: state.selectedSemesterId,
    semesterList: state.semesterList,
  })
}

const initialStoredContext = getStoredSemesterContext()
const initialSemesterList = initialStoredContext ? initialStoredContext.semesterList : []
const initialCurrentSemesterId = initialStoredContext ? initialStoredContext.currentSemesterId : null
const initialSelectedSemesterId = resolvePreferredSelectedSemesterId({
  currentSemesterId: initialCurrentSemesterId,
  selectedSemesterId: initialStoredContext ? initialStoredContext.selectedSemesterId : null,
  semesterList: initialSemesterList,
})

export const useSemesterStore = create<SemesterStoreState>()((set, get) => ({
  currentSemesterId: initialCurrentSemesterId,
  selectedSemesterId: initialSelectedSemesterId,
  semesterList: initialSemesterList,
  hasHydrated: Boolean(initialStoredContext),
  initializeFromStoredContext: (context) => {
    if (!context) {
      set({
        currentSemesterId: null,
        selectedSemesterId: null,
        semesterList: [],
        hasHydrated: true,
      })
      return
    }

    const nextSelectedSemesterId = resolvePreferredSelectedSemesterId({
      currentSemesterId: context.currentSemesterId,
      selectedSemesterId: context.selectedSemesterId,
      semesterList: context.semesterList,
    })

    const nextState = {
      currentSemesterId: context.currentSemesterId,
      selectedSemesterId: nextSelectedSemesterId,
      semesterList: context.semesterList,
      hasHydrated: true,
    }

    set(nextState)
    persistSemesterContext(nextState)
  },
  syncFromAuthContext: (context) => {
    const nextSelectedSemesterId = resolvePreferredSelectedSemesterId({
      currentSemesterId: context.currentSemesterId,
      selectedSemesterId: context.selectedSemesterId,
      semesterList: context.semesterList,
    })

    const nextState = {
      currentSemesterId: context.currentSemesterId,
      selectedSemesterId: nextSelectedSemesterId,
      semesterList: context.semesterList,
      hasHydrated: true,
    }

    set(nextState)
    persistSemesterContext(nextState)
  },
  setSelectedSemesterId: (semesterId) => {
    const state = get()
    const availableSemesterIds = new Set<number>()

    state.semesterList.forEach((semester) => {
      availableSemesterIds.add(semester.id)
    })

    const nextSelectedSemesterId = semesterId !== null && availableSemesterIds.has(semesterId)
      ? semesterId
      : resolvePreferredSelectedSemesterId({
          currentSemesterId: state.currentSemesterId,
          selectedSemesterId: state.selectedSemesterId,
          semesterList: state.semesterList,
        })

    const nextState = {
      currentSemesterId: state.currentSemesterId,
      selectedSemesterId: nextSelectedSemesterId,
      semesterList: state.semesterList,
      hasHydrated: state.hasHydrated,
    }

    set(nextState)
    persistSemesterContext(nextState)
  },
  updateSemesterList: (semesterList) => {
    const state = get()
    const nextSelectedSemesterId = resolvePreferredSelectedSemesterId({
      currentSemesterId: state.currentSemesterId,
      selectedSemesterId: state.selectedSemesterId,
      semesterList,
    })

    const nextState = {
      currentSemesterId: state.currentSemesterId,
      selectedSemesterId: nextSelectedSemesterId,
      semesterList,
      hasHydrated: true,
    }

    set(nextState)
    persistSemesterContext(nextState)
  },
  updateCurrentSemesterId: (semesterId) => {
    const state = get()
    const nextSelectedSemesterId = resolvePreferredSelectedSemesterId({
      currentSemesterId: semesterId,
      selectedSemesterId: semesterId,
      semesterList: state.semesterList,
    })

    const nextState = {
      currentSemesterId: semesterId,
      selectedSemesterId: nextSelectedSemesterId,
      semesterList: state.semesterList,
      hasHydrated: true,
    }

    set(nextState)
    persistSemesterContext(nextState)
  },
  clear: () => {
    set({
      currentSemesterId: null,
      selectedSemesterId: null,
      semesterList: [],
      hasHydrated: true,
    })
  },
}))
