export interface GraduateRequireNode {
  id: number
  description: string
  children: GraduateRequireNode[]
}

export interface MajorMatrixItem {
  courseUnitName: string
  graduateRequireId: number
  relate: number
}

export interface ProjectListItem {
  id: number
  name: string
  theoryPeriod: number | string
  practicePeriod: number | string
}

export interface RelateInfo {
  relate: number
}

export interface PointInfo {
  title: string
  description: string
}

export interface ProjectMatrixItem {
  id: number
  projectId: number
  graduateRequireId: number
  relate: RelateInfo
  point: PointInfo
  study: string
  teach: string
  product: string
  week: string
  period: string
}

export interface KsaInfo {
  title: string
  level: string
  description: string
}

export interface PointMatrixItem {
  projectMatrixId: number
  taskGoalId: number
  relate: RelateInfo
  ksa: KsaInfo
}

export interface TaskGoal {
  id: number
  description: string
  product: string
}

export interface TaskGoalGroup {
  goals: TaskGoal[]
}

export interface RevisableCell {
  label: string
  revisableType: "none" | "row" | "column"
  marker: number[]
}

export interface RevisableRow {
  data: RevisableCell[]
}

export interface RevisableLeaf {
  label: string
  data: string | null
}

export interface RevisableNestedRow {
  label: string
  data: RevisableLeaf[]
}

export interface RevisableGroup {
  label: string
  data: RevisableNestedRow[]
}

export interface RevisableTableValue {
  label: string
  data: RevisableGroup[]
}

export interface HeaderOption {
  text: string
  format: string
  show?: boolean
}

export interface FooterOption {
  text: string
  show?: boolean
}

export interface ColumnOption {
  label: string
  id?: number
  width?: number
  children: ColumnOption[] | null
  data?: { label: string }[] | null
}

export interface TableOption {
  name: string
  header: HeaderOption
  footer?: FooterOption
  style: {
    dataAlign: "left" | "center" | "right"
  }
  column: ColumnOption[]
  showHeader?: boolean
  extraLabel?: string
  dataFormat?: RevisableGroup
  rowDataCoverter?: (value: RevisableGroup[]) => RevisableRow[]
  addDelData?: (
    origin: RevisableGroup[],
    marker: number[],
    type: "add" | "del",
    direct: number
  ) => RevisableGroup[]
  spanFormat?: (
    value: RevisableGroup[]
  ) => { location: [number, number]; status: [number, number]; covers: [number, number][] }[]
}

export interface AdditionalInfoResponse {
  score: string | null
  year: string | null
  yearPeriod: string | null
  lecturer: string | null
  phone: string | null
  email: string | null
  department: string | null
  classname: string | null
  students: string | null
  classroom: string | null
  schedule: RevisableTableValue | null
  textbooks: string | null
  textreferences: string | null
  attend: string | null
  assignment: string | null
  criterion: string | null
  practice: string | null
  textgroup: string | null
  paper: string | null
  others: string | null
  examtype: number | null
  examway: string | null
  examdetail: string | null
  exampercent: RevisableTableValue | null
}
