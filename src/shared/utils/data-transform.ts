/**
 * 数据转换工具函数
 * 提供枚举映射、数据格式化等通用功能
 */

/**
 * 枚举映射选项
 */
export interface EnumMapOptions {
  /** 默认值，当找不到映射时返回 */
  defaultValue?: string
  /** 是否严格模式，严格模式下找不到映射会抛出错误 */
  strict?: boolean
}

/**
 * 通用枚举映射函数
 * @param value - 要映射的值
 * @param mapping - 映射表
 * @param options - 映射选项
 * @returns 映射后的值
 */
export function mapEnum<T extends string | number>(
  value: T | null | undefined,
  mapping: Record<string | number, string>,
  options: EnumMapOptions = {}
): string {
  const { defaultValue = '未设置', strict = false } = options

  if (value === null || value === undefined) {
    return defaultValue
  }

  const mappedValue = mapping[value]

  if (mappedValue === undefined) {
    if (strict) {
      throw new Error(`无法找到值 ${value} 的映射`)
    }
    return defaultValue
  }

  return mappedValue
}

/**
 * 课程类型映射（必修/选修）
 */
export const COURSE_TYPE_MAP: Record<number, string> = {
  1: '必修',
  2: '选修',
}

/**
 * 获取课程类型文本
 * @param classId - 课程类型ID
 * @returns 课程类型文本
 */
export function getCourseType(classId: number | null | undefined): string {
  return mapEnum(classId, COURSE_TYPE_MAP)
}

/**
 * 课程性质映射
 * 注意：此映射需要从 course-types.json 动态加载
 * 这里提供一个工厂函数来创建映射
 */
export function createCourseNameMapper(courseTypesData: Array<{ id: number; name: string }>) {
  const mapping: Record<number, string> = {}
  courseTypesData.forEach((item) => {
    mapping[item.id] = item.name
  })

  return (typeId: number | null | undefined): string => {
    return mapEnum(typeId, mapping)
  }
}

/**
 * 学期映射
 */
export const SEMESTER_MAP: Record<string, string> = {
  'spring': '春季学期',
  'fall': '秋季学期',
  'summer': '夏季学期',
}

/**
 * 获取学期文本
 * @param semester - 学期代码
 * @returns 学期文本
 */
export function getSemester(semester: string | null | undefined): string {
  return mapEnum(semester, SEMESTER_MAP)
}

/**
 * 学位类型映射
 */
export const DEGREE_TYPE_MAP: Record<string, string> = {
  'bachelor': '学士',
  'master': '硕士',
  'doctor': '博士',
}

/**
 * 获取学位类型文本
 * @param degreeType - 学位类型代码
 * @returns 学位类型文本
 */
export function getDegreeType(degreeType: string | null | undefined): string {
  return mapEnum(degreeType, DEGREE_TYPE_MAP)
}

/**
 * 任务状态映射
 */
export const TASK_STATUS_MAP: Record<string, string> = {
  'not_started': '未开始',
  'in_progress': '进行中',
  'completed': '已完成',
  'archived': '已归档',
}

/**
 * 获取任务状态文本
 * @param status - 状态代码
 * @returns 状态文本
 */
export function getTaskStatus(status: string | null | undefined): string {
  return mapEnum(status, TASK_STATUS_MAP)
}

/**
 * 支撑强度映射
 */
export const SUPPORT_STRENGTH_MAP: Record<string, string> = {
  'strong': '强支撑',
  'weak': '弱支撑',
  'none': '无支撑',
}

/**
 * 获取支撑强度文本
 * @param strength - 支撑强度
 * @returns 支撑强度文本
 */
export function getSupportStrength(strength: string | null | undefined): string {
  return mapEnum(strength, SUPPORT_STRENGTH_MAP)
}

/**
 * 评价等级映射
 */
export const EVALUATION_LEVEL_MAP: Record<string, string> = {
  'A': '优秀',
  'B': '良好',
  'C': '合格',
  'D': '不合格',
}

/**
 * 获取评价等级文本
 * @param level - 等级
 * @returns 等级文本
 */
export function getEvaluationLevel(level: string | null | undefined): string {
  return mapEnum(level, EVALUATION_LEVEL_MAP)
}

/**
 * 数组转逗号分隔字符串
 * @param array - 数组
 * @param separator - 分隔符，默认为 ', '
 * @returns 拼接后的字符串
 */
export function joinArray(
  array: (string | number)[] | null | undefined,
  separator: string = ', '
): string {
  if (!array || array.length === 0) {
    return '无'
  }
  return array.join(separator)
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param decimals - 小数位数，默认为2
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number | null | undefined, decimals: number = 2): string {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * 格式化百分比
 * @param value - 数值（0-1 或 0-100）
 * @param total - 总数（如果value是绝对值）
 * @param decimals - 小数位数，默认为1
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(
  value: number | null | undefined,
  total?: number,
  decimals: number = 1
): string {
  if (value === null || value === undefined) {
    return '0%'
  }

  let percentage: number

  if (total !== undefined && total > 0) {
    percentage = (value / total) * 100
  } else if (value <= 1) {
    percentage = value * 100
  } else {
    percentage = value
  }

  return `${percentage.toFixed(decimals)}%`
}

/**
 * 安全的JSON解析
 * @param jsonString - JSON字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  if (!jsonString) {
    return defaultValue
  }

  try {
    return JSON.parse(jsonString) as T
  } catch {
    return defaultValue
  }
}
