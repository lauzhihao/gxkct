/**
 * Markdown 文档生成工具
 *
 * 将收集的课程数据转换为可读的 Markdown 格式
 * 用于在 UI 中展示课程信息摘要
 */

import type { CourseDevData, CourseExportData, PointData } from '../types'
import { COURSE_TYPES } from '../constants'

const POINT_PLACEHOLDER_TITLE_PATTERN = /^课点\s*\d+$/

function isPointPlaceholderTitle(title: string): boolean {
  return POINT_PLACEHOLDER_TITLE_PATTERN.test(title.trim())
}

function getPointDisplayName(point: PointData): string {
  const normalizedTitle = point.title.trim()
  const normalizedDescription = point.description.trim()

  if (normalizedTitle && !isPointPlaceholderTitle(normalizedTitle)) {
    return normalizedTitle
  }

  if (normalizedDescription) {
    return normalizedDescription
  }

  if (normalizedTitle) {
    return normalizedTitle
  }

  return '未命名课点'
}

function getPointDisplayDescription(point: PointData): string {
  const normalizedDescription = point.description.trim()
  const displayName = getPointDisplayName(point)

  if (!normalizedDescription || normalizedDescription === displayName) {
    return ''
  }

  return normalizedDescription
}

function formatPointPreviewText(point: PointData): string {
  const displayName = getPointDisplayName(point)
  const displayDescription = getPointDisplayDescription(point)

  if (!displayDescription) {
    return displayName
  }

  return `${displayName}：${displayDescription}`
}

function truncateText(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input
  }

  return `${input.substring(0, maxLength)}...`
}

// ============================================================================
// Markdown 生成函数
// ============================================================================

/**
 * 生成完整的课程 Markdown 文档
 */
export function generateCourseMarkdown(data: CourseDevData): string {
  const sections: string[] = []

  // 标题
  const courseName = data.basicInfo.name || '未命名课程'
  sections.push(`# ${courseName}`)
  sections.push('')

  // 基本信息
  sections.push(generateBasicInfoSection(data))

  // 章节结构
  if (data.chapters.length > 0) {
    sections.push(generateChaptersSection(data))
  }

  // 课点
  if (data.points.length > 0) {
    sections.push(generatePointsSection(data))
  }

  // KSA
  if (data.ksas.length > 0) {
    sections.push(generateKsaSection(data))
  }

  return sections.join('\n')
}

/**
 * 生成基本信息部分
 */
function generateBasicInfoSection(data: CourseDevData): string {
  const lines: string[] = []
  lines.push('## 基本信息')
  lines.push('')

  const { basicInfo } = data

  if (basicInfo.typeName || basicInfo.typeId) {
    const typeName = basicInfo.typeName || COURSE_TYPES.find(t => t.id === basicInfo.typeId)?.name || '未指定'
    lines.push(`- **课程类型**：${typeName}`)
  }

  if (basicInfo.theoryPeriod !== undefined || basicInfo.practicePeriod !== undefined) {
    const theory = basicInfo.theoryPeriod ?? 0
    const practice = basicInfo.practicePeriod ?? 0
    const total = theory + practice
    lines.push(`- **总学时**：${total} 学时（理论 ${theory} + 实践 ${practice}）`)
  }

  if (basicInfo.introduction) {
    lines.push('')
    lines.push('### 课程简介')
    lines.push('')
    lines.push(basicInfo.introduction)
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * 生成章节结构部分
 */
function generateChaptersSection(data: CourseDevData): string {
  const lines: string[] = []
  lines.push('## 章节结构')
  lines.push('')

  // 表格头
  lines.push('| 序号 | 章节名称 | 理论学时 | 实践学时 |')
  lines.push('|:----:|:---------|:--------:|:--------:|')

  // 表格内容
  data.chapters.forEach((chapter, index) => {
    lines.push(`| ${index + 1} | ${chapter.name} | ${chapter.theoryPeriod} | ${chapter.practicePeriod} |`)
  })

  // 汇总
  const totalTheory = data.chapters.reduce((sum, ch) => sum + ch.theoryPeriod, 0)
  const totalPractice = data.chapters.reduce((sum, ch) => sum + ch.practicePeriod, 0)
  lines.push(`| | **合计** | **${totalTheory}** | **${totalPractice}** |`)

  lines.push('')
  return lines.join('\n')
}

/**
 * 生成课点部分
 */
function generatePointsSection(data: CourseDevData): string {
  const lines: string[] = []
  lines.push('## 课程知识点')
  lines.push('')

  data.points.forEach((point, index) => {
    const displayName = getPointDisplayName(point)
    const displayDescription = getPointDisplayDescription(point)

    if (displayDescription) {
      lines.push(`${index + 1}. **${displayName}**：${displayDescription}`)
      return
    }

    lines.push(`${index + 1}. **${displayName}**`)
  })

  lines.push('')
  lines.push(`> 共 ${data.points.length} 个知识点`)
  lines.push('')
  return lines.join('\n')
}

/**
 * 生成 KSA 部分
 */
function generateKsaSection(data: CourseDevData): string {
  const lines: string[] = []
  lines.push('## KSA 目标')
  lines.push('')

  // 按类型分组
  const knowledge = data.ksas.filter(k => k.type === 'K')
  const skills = data.ksas.filter(k => k.type === 'S')
  const attitudes = data.ksas.filter(k => k.type === 'A')

  if (knowledge.length > 0) {
    lines.push('### 知识 (Knowledge)')
    lines.push('')
    knowledge.forEach((k, i) => {
      lines.push(`${i + 1}. ${k.description}`)
    })
    lines.push('')
  }

  if (skills.length > 0) {
    lines.push('### 技能 (Skill)')
    lines.push('')
    skills.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.description}`)
    })
    lines.push('')
  }

  if (attitudes.length > 0) {
    lines.push('### 态度 (Attitude)')
    lines.push('')
    attitudes.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.description}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// 增量预览生成
// ============================================================================

/**
 * 生成当前阶段的预览摘要
 */
export function generateStagePreview(data: CourseDevData, currentStage: string): string {
  const lines: string[] = []

  switch (currentStage) {
    case 'basic_info':
      if (data.basicInfo.name) {
        lines.push(`**课程名称**：${data.basicInfo.name}`)
      }
      if (data.basicInfo.typeName) {
        lines.push(`**课程类型**：${data.basicInfo.typeName}`)
      }
      if (data.basicInfo.theoryPeriod !== undefined) {
        lines.push(`**理论学时**：${data.basicInfo.theoryPeriod}`)
      }
      if (data.basicInfo.practicePeriod !== undefined) {
        lines.push(`**实践学时**：${data.basicInfo.practicePeriod}`)
      }
      if (data.basicInfo.introduction) {
        lines.push('')
        lines.push(`**简介**：${data.basicInfo.introduction.substring(0, 100)}${data.basicInfo.introduction.length > 100 ? '...' : ''}`)
      }
      break

    case 'chapters':
      if (data.chapters.length > 0) {
        lines.push(`已添加 ${data.chapters.length} 个章节：`)
        lines.push('')
        data.chapters.slice(0, 5).forEach((ch, i) => {
          lines.push(`${i + 1}. ${ch.name}（${ch.theoryPeriod}+${ch.practicePeriod}学时）`)
        })
        if (data.chapters.length > 5) {
          lines.push(`...及另外 ${data.chapters.length - 5} 个章节`)
        }
      }
      break

    case 'points':
      if (data.points.length > 0) {
        lines.push(`已添加 ${data.points.length} 个课点：`)
        lines.push('')
        data.points.slice(0, 5).forEach((p, i) => {
          lines.push(`${i + 1}. ${truncateText(formatPointPreviewText(p), 30)}`)
        })
        if (data.points.length > 5) {
          lines.push(`...及另外 ${data.points.length - 5} 个课点`)
        }
      }
      break

    case 'ksa':
      if (data.ksas.length > 0) {
        const k = data.ksas.filter(x => x.type === 'K').length
        const s = data.ksas.filter(x => x.type === 'S').length
        const a = data.ksas.filter(x => x.type === 'A').length
        lines.push(`已添加 ${data.ksas.length} 个 KSA 目标：`)
        lines.push(`- 知识(K)：${k} 项`)
        lines.push(`- 技能(S)：${s} 项`)
        lines.push(`- 态度(A)：${a} 项`)
      }
      break
  }

  return lines.join('\n')
}

// ============================================================================
// JSON 导出
// ============================================================================

/**
 * 转换为后端接口所需的 JSON 格式
 */
export function convertToExportData(data: CourseDevData): CourseExportData {
  return {
    course: {
      name: data.basicInfo.name || '',
      typeId: data.basicInfo.typeId || 2,
      introduction: data.basicInfo.introduction || '',
      theoryPeriod: data.basicInfo.theoryPeriod || 0,
      practicePeriod: data.basicInfo.practicePeriod || 0,
      courseMatrixVOS: data.chapters.map(ch => ({
        name: ch.name,
        theoryPeriod: ch.theoryPeriod.toString(),
        practicePeriod: ch.practicePeriod.toString(),
      })),
    },
    pointksa: {
      points: data.points.map(p => ({
        title: getPointDisplayName(p),
        description: p.description,
      })),
      ksas: data.ksas.map((k, index) => ({
        title: k.type,
        description: k.description,
        level: index + 1,
      })),
    },
  }
}

/**
 * 生成格式化的 JSON 字符串
 */
export function generateExportJson(data: CourseDevData): string {
  const exportData = convertToExportData(data)
  return JSON.stringify(exportData, null, 2)
}

/**
 * 下载 JSON 文件
 */
export function downloadJson(data: CourseDevData, filename?: string): void {
  const json = generateExportJson(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `course-${data.basicInfo.name || 'export'}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(data: CourseDevData): Promise<boolean> {
  try {
    const json = generateExportJson(data)
    await navigator.clipboard.writeText(json)
    return true
  } catch {
    return false
  }
}
