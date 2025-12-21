/**
 * 用户输入数据提取工具
 *
 * 热插拔设计：
 * - 实现 IMessageParserService 接口
 * - 当前使用规则匹配，后续可替换为 LLM API
 */

import type {
  IMessageParserService,
  CourseBasicInfo,
  ChapterData,
  PointData,
  KsaData,
  UserIntent,
} from '../types'
import { COURSE_TYPES, INTENT_KEYWORDS } from '../constants'

// ============================================================================
// 正则表达式模式
// ============================================================================

const PATTERNS = {
  // 课程名称：引号内的内容，或"叫/名为/名称是"后面的内容
  courseName: /(?:["「『]([^"」』]+)["」』])|(?:(?:叫|名为|名称是|课程名?)\s*[:：]?\s*([^\s,，。]+))/,

  // 学时提取：数字+学时/课时
  hours: /(\d+)\s*(?:学时|课时)/g,
  theoryHours: /理论\s*[:：]?\s*(\d+)\s*(?:学时|课时)?/,
  practiceHours: /(?:实践|实验|实训)\s*[:：]?\s*(\d+)\s*(?:学时|课时)?/,

  // 章节模式
  chapter: /(?:第?([一二三四五六七八九十\d]+)[章节]|项目(\d+)|模块([一二三四五六七八九十\d]+))\s*[:：]?\s*([^\d\n,，;；]+?)(?:\s*(\d+)\s*(?:学时|课时))?/g,

  // 课点模式
  point: /(?:课点|知识点|要点)\s*\d*\s*[:：]?\s*(.+?)(?:[,，;；\n]|$)/g,

  // KSA 模式
  ksa: /(?:(知识|技能|态度)[方面]?\s*[-:：]?\s*(.+?)(?:[;；\n]|$))/g,
}

// ============================================================================
// 工具函数
// ============================================================================

/** 中文数字转阿拉伯数字 */
function chineseToNumber(chinese: string): number {
  const map: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  }
  if (map[chinese]) return map[chinese]
  if (/^\d+$/.test(chinese)) return parseInt(chinese, 10)
  return 0
}

/** 根据名称匹配课程类型 */
function matchCourseType(input: string): number | undefined {
  const lowerInput = input.toLowerCase()
  for (const type of COURSE_TYPES) {
    if (lowerInput.includes(type.name) || type.name.includes(input)) {
      return type.id
    }
  }
  // 关键词匹配
  if (/通识|公共|基础素质/.test(input)) return 1
  if (/学科基础|专业基础/.test(input)) return 2
  if (/专业课|核心课/.test(input)) return 3
  if (/实践|实训|实习/.test(input)) return 4
  if (/综合|素质|拓展/.test(input)) return 5
  return undefined
}

/** 提取所有数字 */
function extractNumbers(input: string): number[] {
  const matches = input.match(/\d+/g)
  return matches ? matches.map(Number) : []
}

// ============================================================================
// 解析服务实现
// ============================================================================

export class RuleBasedMessageParser implements IMessageParserService {
  extractBasicInfo(input: string): Partial<CourseBasicInfo> {
    const result: Partial<CourseBasicInfo> = {}

    // 提取课程名称
    const nameMatch = input.match(PATTERNS.courseName)
    if (nameMatch) {
      result.name = nameMatch[1] || nameMatch[2]
    }

    // 提取课程类型
    const typeId = matchCourseType(input)
    if (typeId) {
      result.typeId = typeId
      result.typeName = COURSE_TYPES.find(t => t.id === typeId)?.name
    }

    // 提取理论学时
    const theoryMatch = input.match(PATTERNS.theoryHours)
    if (theoryMatch) {
      result.theoryPeriod = parseInt(theoryMatch[1], 10)
    }

    // 提取实践学时
    const practiceMatch = input.match(PATTERNS.practiceHours)
    if (practiceMatch) {
      result.practicePeriod = parseInt(practiceMatch[1], 10)
    }

    // 如果没有明确区分，尝试从"XX学时"中提取
    if (result.theoryPeriod === undefined && result.practicePeriod === undefined) {
      const hoursMatches = [...input.matchAll(PATTERNS.hours)]
      if (hoursMatches.length === 1) {
        // 只有一个学时数，视为总学时，默认全部理论
        result.theoryPeriod = parseInt(hoursMatches[0][1], 10)
        result.practicePeriod = 0
      } else if (hoursMatches.length >= 2) {
        // 有两个数字，第一个理论，第二个实践
        result.theoryPeriod = parseInt(hoursMatches[0][1], 10)
        result.practicePeriod = parseInt(hoursMatches[1][1], 10)
      }
    }

    // 提取课程简介（去除已识别的信息后的剩余文本）
    let intro = input
    if (result.name) intro = intro.replace(result.name, '')
    if (result.typeName) intro = intro.replace(result.typeName, '')
    intro = intro.replace(/\d+\s*(?:学时|课时)/g, '')
    intro = intro.replace(/(?:理论|实践|实验|实训)\s*[:：]?\s*/g, '')
    intro = intro.replace(/(?:叫|名为|名称是|课程名?)\s*[:：]?\s*/g, '')
    intro = intro.replace(/["「『」』"]/g, '')
    intro = intro.trim()

    if (intro.length > 10) {
      result.introduction = intro
    }

    return result
  }

  extractChapters(input: string): ChapterData[] {
    const chapters: ChapterData[] = []

    // 尝试按行分割
    const lines = input.split(/[,，;；\n]/).filter(line => line.trim())

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // 尝试匹配章节格式
      const chapterMatch = trimmed.match(
        /(?:第?([一二三四五六七八九十\d]+)[章节项目模块]?)\s*[:：]?\s*(.+)/
      )

      if (chapterMatch) {
        const name = chapterMatch[2].trim()
        const numbers = extractNumbers(trimmed)

        chapters.push({
          name: trimmed.includes('章') || trimmed.includes('节')
            ? `第${chapterMatch[1]}章 ${name.replace(/\d+\s*(?:学时|课时)?/g, '').trim()}`
            : name.replace(/\d+\s*(?:学时|课时)?/g, '').trim(),
          theoryPeriod: numbers[0] || 2,
          practicePeriod: numbers[1] || 0,
        })
      } else if (trimmed.length > 2) {
        // 没有明确格式，作为章节名称
        const numbers = extractNumbers(trimmed)
        chapters.push({
          name: trimmed.replace(/\d+\s*(?:学时|课时)?/g, '').trim(),
          theoryPeriod: numbers[0] || 2,
          practicePeriod: numbers[1] || 0,
        })
      }
    }

    return chapters
  }

  extractPoints(input: string): PointData[] {
    const points: PointData[] = []
    const seen = new Set<string>()

    // 按行或分隔符分割
    const items = input.split(/[,，;；\n、]/).filter(item => item.trim())

    for (let i = 0; i < items.length; i++) {
      let item = items[i].trim()
      if (!item || item.length < 2) continue

      // 移除前缀编号
      item = item.replace(/^[\d一二三四五六七八九十]+[.、)）:：]\s*/, '')
      item = item.replace(/^(?:课点|知识点|要点)\s*\d*\s*[:：]?\s*/, '')

      if (item && !seen.has(item)) {
        seen.add(item)
        points.push({
          title: `课点${i + 1}`,
          description: item,
        })
      }
    }

    return points
  }

  extractKsas(input: string): KsaData[] {
    const ksas: KsaData[] = []
    const typeMap: Record<string, 'K' | 'S' | 'A'> = {
      '知识': 'K',
      '技能': 'S',
      '态度': 'A',
    }

    // 尝试按类型关键词分割
    const sections = input.split(/(?=知识|技能|态度)/)

    for (const section of sections) {
      const trimmed = section.trim()
      if (!trimmed) continue

      // 判断类型
      let type: 'K' | 'S' | 'A' | null = null
      for (const [keyword, t] of Object.entries(typeMap)) {
        if (trimmed.startsWith(keyword)) {
          type = t
          break
        }
      }

      if (type) {
        // 提取该类型下的所有项
        const content = trimmed.replace(/^(?:知识|技能|态度)[方面]?\s*[-:：]?\s*/, '')
        const items = content.split(/[,，;；、]/).filter(item => item.trim())

        for (const item of items) {
          const desc = item.trim()
          if (desc && desc.length > 2) {
            ksas.push({
              type,
              title: type,
              description: desc,
            })
          }
        }
      }
    }

    // 如果没有按类型分割成功，尝试按行处理
    if (ksas.length === 0) {
      const lines = input.split(/[,，;；\n]/).filter(line => line.trim())
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length < 3) continue

        // 尝试从内容推断类型
        let type: 'K' | 'S' | 'A' = 'K' // 默认知识
        if (/能够|会|掌握.*操作|实践|运用/.test(trimmed)) {
          type = 'S'
        } else if (/精神|态度|意识|素养|责任/.test(trimmed)) {
          type = 'A'
        }

        ksas.push({
          type,
          title: type,
          description: trimmed.replace(/^[KSA知识技能态度]\s*[-:：]?\s*/, ''),
        })
      }
    }

    return ksas
  }

  parseIntent(input: string): UserIntent {
    const trimmed = input.trim().toLowerCase()

    // 检查确认意图
    if (INTENT_KEYWORDS.confirm.some(kw => trimmed.includes(kw))) {
      return { type: 'confirm' }
    }

    // 检查拒绝/修改意图
    if (INTENT_KEYWORDS.reject.some(kw => trimmed.includes(kw))) {
      return { type: 'reject' }
    }

    // 检查返回意图
    if (INTENT_KEYWORDS.back.some(kw => trimmed.includes(kw))) {
      return { type: 'back' }
    }

    // 检查跳过意图
    if (INTENT_KEYWORDS.skip.some(kw => trimmed.includes(kw))) {
      return { type: 'skip' }
    }

    // 检查选项选择（A/B/C/D 或 1/2/3/4）
    const optionMatch = trimmed.match(/^[abcd1234]$/i)
    if (optionMatch) {
      const indexMap: Record<string, number> = {
        'a': 0, '1': 0,
        'b': 1, '2': 1,
        'c': 2, '3': 2,
        'd': 3, '4': 3,
      }
      return { type: 'select', index: indexMap[trimmed] }
    }

    // 默认为自由输入
    return { type: 'input', content: input }
  }
}

// ============================================================================
// 默认导出
// ============================================================================

export const ruleBasedParser = new RuleBasedMessageParser()

/**
 * 获取消息解析服务
 * 热插拔：修改此函数返回 LLM 服务实例
 */
export function getMessageParserService(): IMessageParserService {
  // TODO: 后续替换为 LLM API 服务
  // return new LLMMessageParserService()
  return ruleBasedParser
}
