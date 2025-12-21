/**
 * 课程开发流程状态管理 Hook
 *
 * 核心逻辑：
 * 1. 状态机管理流程阶段
 * 2. 处理用户输入并生成 AI 回复
 * 3. 管理收集的课程数据
 * 4. 生成思考过程动画
 */

import { useState, useCallback, useRef } from 'react'
import type {
  CourseDevStage,
  CourseDevData,
  ChatMessage,
  ThinkingStep,
  QuickOption,
  CourseExportData,
} from '../types'
import {
  STAGES,
  STAGE_PROMPTS,
  WELCOME_OPTIONS,
  COURSE_TYPE_OPTIONS,
  CONFIRM_OPTIONS,
  PREVIEW_OPTIONS,
  COMPLETE_OPTIONS,
  INITIAL_COURSE_DATA,
  getNextStage,
  getPrevStage,
  COURSE_TYPES,
  BASIC_INFO_FIELDS,
  generateFieldPrompt,
  type FieldConfig,
} from '../constants'
import { getCourseDataService } from '../utils/mock-data-provider'
import { getMessageParserService } from '../utils/data-extractor'
import {
  generateCourseMarkdown,
  generateStagePreview,
  convertToExportData,
  downloadJson,
  copyToClipboard,
} from '../utils/markdown-generator'

// ============================================================================
// 工具函数
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 查找基本信息中第一个缺失的字段
 * @param basicInfo 当前已收集的基本信息
 * @returns 缺失的字段配置，如果全部填充则返回 null
 */
function findMissingBasicInfoField(basicInfo: Partial<import('../types').CourseBasicInfo>): FieldConfig | null {
  for (const field of BASIC_INFO_FIELDS) {
    const value = basicInfo[field.key]
    // 判断字段是否已填充：undefined、null、空字符串均视为未填充
    if (value === undefined || value === null || value === '') {
      return field
    }
  }
  return null
}

/**
 * 检查基本信息是否完整
 */
function isBasicInfoComplete(basicInfo: Partial<import('../types').CourseBasicInfo>): boolean {
  return findMissingBasicInfoField(basicInfo) === null
}

// ============================================================================
// Hook 返回类型
// ============================================================================

export interface UseCourseDevFlowReturn {
  /** 当前阶段 */
  stage: CourseDevStage
  /** 聊天消息列表 */
  messages: ChatMessage[]
  /** 收集的课程数据 */
  courseData: CourseDevData
  /** 是否正在处理 */
  isProcessing: boolean
  /** 当前思考步骤 */
  thinkingSteps: ThinkingStep[]
  /** 当前快捷选项 */
  quickOptions: QuickOption[]
  /** 发送用户消息 */
  sendMessage: (content: string) => Promise<void>
  /** 选择快捷选项 */
  selectOption: (option: QuickOption) => Promise<void>
  /** 返回上一步 */
  goBack: () => void
  /** 重置流程 */
  reset: () => void
  /** 获取导出数据 */
  getExportData: () => CourseExportData
  /** 下载 JSON */
  downloadJson: () => void
  /** 复制到剪贴板 */
  copyToClipboard: () => Promise<boolean>
  /** 获取 Markdown 预览 */
  getMarkdownPreview: () => string
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useCourseDevFlow(): UseCourseDevFlowReturn {
  // 状态
  const [stage, setStage] = useState<CourseDevStage>('welcome')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [courseData, setCourseData] = useState<CourseDevData>(INITIAL_COURSE_DATA)
  const [isProcessing, setIsProcessing] = useState(false)
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [quickOptions, setQuickOptions] = useState<QuickOption[]>(WELCOME_OPTIONS)

  // 服务引用
  const dataService = useRef(getCourseDataService())
  const parserService = useRef(getMessageParserService())

  // ============================================================================
  // 消息管理
  // ============================================================================

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  const updateLastAssistantMessage = useCallback((updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const lastIndex = prev.findLastIndex(m => m.role === 'assistant')
      if (lastIndex === -1) return prev
      const updated = [...prev]
      updated[lastIndex] = { ...updated[lastIndex], ...updates }
      return updated
    })
  }, [])

  // ============================================================================
  // 思考过程模拟
  // ============================================================================

  const simulateThinking = useCallback(async (hints: string[]): Promise<void> => {
    if (hints.length === 0) return

    const steps: ThinkingStep[] = hints.map((content, index) => ({
      id: `thinking-${index}`,
      content,
      status: 'pending' as const,
    }))

    setThinkingSteps(steps)

    for (let i = 0; i < steps.length; i++) {
      // 更新当前步骤为处理中
      setThinkingSteps(prev =>
        prev.map((s, idx) => ({
          ...s,
          status: idx === i ? 'processing' : idx < i ? 'done' : 'pending',
        }))
      )
      await delay(600 + Math.random() * 400)

      // 更新为完成
      setThinkingSteps(prev =>
        prev.map((s, idx) => ({
          ...s,
          status: idx <= i ? 'done' : 'pending',
        }))
      )
    }

    await delay(300)
    setThinkingSteps([])
  }, [])

  /**
   * 快速思考动画（100-300ms）
   */
  const simulateQuickThinking = useCallback(async (): Promise<void> => {
    const thinkingStep: ThinkingStep = {
      id: 'quick-thinking',
      content: '正在处理...',
      status: 'processing',
    }
    setThinkingSteps([thinkingStep])
    await delay(100 + Math.random() * 200)
    setThinkingSteps([{ ...thinkingStep, status: 'done' }])
    await delay(100)
    setThinkingSteps([])
  }, [])

  /**
   * 模拟流式输出消息
   * @param content 完整消息内容
   * @param options 快捷选项（流式完成后显示）
   */
  const addStreamingMessage = useCallback(async (
    content: string,
    options?: QuickOption[]
  ): Promise<void> => {
    // 添加空消息，标记为流式输出中
    const messageId = generateId()
    const newMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    setMessages(prev => [...prev, newMessage])

    // 按字符逐步显示（每批 2-4 个字符，间隔 20-40ms）
    let currentContent = ''
    const chars = content.split('')
    let i = 0

    while (i < chars.length) {
      // 每批随机 2-4 个字符
      const batchSize = Math.min(2 + Math.floor(Math.random() * 3), chars.length - i)
      currentContent += chars.slice(i, i + batchSize).join('')
      i += batchSize

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: currentContent } : m
      ))

      await delay(20 + Math.random() * 20)
    }

    // 流式输出完成
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isStreaming: false } : m
    ))

    // 设置快捷选项
    if (options) {
      setQuickOptions(options)
    }
  }, [])

  // ============================================================================
  // 阶段转换逻辑
  // ============================================================================

  const generateStageResponse = useCallback(async (
    targetStage: CourseDevStage,
    context?: string
  ): Promise<{ content: string; options: QuickOption[] }> => {
    const prompt = STAGE_PROMPTS[targetStage]
    let content = ''
    let options: QuickOption[] = []

    // 模拟思考过程
    await simulateThinking(prompt.thinkingHints)

    switch (targetStage) {
      case 'welcome':
        content = `${prompt.greeting}\n\n${prompt.instruction}`
        options = WELCOME_OPTIONS
        break

      case 'basic_info': {
        // 检查是否有缺失的字段，逐个询问
        const missingField = findMissingBasicInfoField(courseData.basicInfo)
        if (missingField) {
          content = generateFieldPrompt(courseData.basicInfo.name, missingField)
          // 如果是选择类型字段，展示选项；否则等待用户输入
          options = missingField.type === 'select' && missingField.options ? missingField.options : []
        } else {
          // 所有字段已填充，进入下一阶段
          content = `${prompt.greeting}\n\n${prompt.instruction}\n\n${prompt.example ? `> ${prompt.example}` : ''}`
          options = []
        }
        break
      }

      case 'chapters': {
        content = `${prompt.greeting}\n\n${prompt.instruction}`

        // 如果有课程类型，推荐章节模板
        if (courseData.basicInfo.typeId) {
          const templates = await dataService.current.getChapterTemplates(courseData.basicInfo.typeId)
          if (templates.length > 0) {
            content += '\n\n我为你推荐了一个章节模板，你可以选择使用或自行输入：'
            options = [
              { id: 'use_template', label: '使用推荐模板', value: 'template', description: `${templates.length}个章节` },
              { id: 'custom', label: '自行输入', value: 'custom', description: '手动输入章节信息' },
            ]
          }
        }

        if (options.length === 0) {
          content += `\n\n${prompt.example ? `> ${prompt.example}` : ''}`
          options = CONFIRM_OPTIONS
        }
        break
      }

      case 'points': {
        content = `${prompt.greeting}\n\n${prompt.instruction}`

        // 检索推荐课点
        const keyword = courseData.basicInfo.name || ''
        const recommendedPoints = await dataService.current.searchPoints(keyword, courseData.basicInfo.typeId)

        if (recommendedPoints.length > 0) {
          content += '\n\n根据课程内容，我为你推荐了以下课点：'
          recommendedPoints.slice(0, 5).forEach((p, i) => {
            content += `\n${i + 1}. ${p.description}`
          })
          content += '\n\n你可以选择采用这些推荐，或自行输入课点。'

          options = [
            { id: 'use_recommended', label: '采用推荐课点', value: 'recommended', description: `${recommendedPoints.length}个课点` },
            { id: 'add_more', label: '在此基础上补充', value: 'add_more', description: '添加更多课点' },
            { id: 'custom', label: '自行输入', value: 'custom', description: '完全自定义' },
          ]
        } else {
          options = CONFIRM_OPTIONS
        }
        break
      }

      case 'ksa': {
        content = `${prompt.greeting}\n\n${prompt.instruction}`

        // 检索推荐 KSA
        const keyword = courseData.basicInfo.name || ''
        const recommendedKsas = await dataService.current.searchKsas(keyword, courseData.basicInfo.typeId)

        if (recommendedKsas.length > 0) {
          const k = recommendedKsas.filter(x => x.type === 'K')
          const s = recommendedKsas.filter(x => x.type === 'S')
          const a = recommendedKsas.filter(x => x.type === 'A')

          content += '\n\n根据课程内容，我推荐以下 KSA 目标：'
          if (k.length > 0) {
            content += '\n\n**知识(K)**：'
            k.slice(0, 2).forEach(item => {
              content += `\n- ${item.description}`
            })
          }
          if (s.length > 0) {
            content += '\n\n**技能(S)**：'
            s.slice(0, 2).forEach(item => {
              content += `\n- ${item.description}`
            })
          }
          if (a.length > 0) {
            content += '\n\n**态度(A)**：'
            a.slice(0, 2).forEach(item => {
              content += `\n- ${item.description}`
            })
          }

          options = [
            { id: 'use_recommended', label: '采用推荐KSA', value: 'recommended', description: `${recommendedKsas.length}项` },
            { id: 'add_more', label: '在此基础上补充', value: 'add_more', description: '添加更多KSA' },
            { id: 'custom', label: '自行输入', value: 'custom', description: '完全自定义' },
          ]
        } else {
          content += `\n\n${prompt.example ? `> ${prompt.example}` : ''}`
          options = CONFIRM_OPTIONS
        }
        break
      }

      case 'preview': {
        const markdown = generateCourseMarkdown(courseData)
        content = `${prompt.greeting}\n\n${prompt.instruction}\n\n---\n\n${markdown}`
        options = PREVIEW_OPTIONS
        break
      }

      case 'complete':
        content = `${prompt.greeting}\n\n${prompt.instruction}\n\n课程数据已准备就绪，可以导出使用。`
        options = COMPLETE_OPTIONS
        break
    }

    return { content, options }
  }, [courseData, simulateThinking])

  // ============================================================================
  // 处理用户输入
  // ============================================================================

  /**
   * 处理用户输入
   * @returns true 表示已在此函数内处理完响应，sendMessage 不需要再生成响应
   */
  const processUserInput = useCallback(async (input: string): Promise<boolean> => {
    const intent = parserService.current.parseIntent(input)

    switch (stage) {
      case 'welcome':
        // 欢迎阶段，任何输入都进入下一步
        setStage('basic_info')
        break

      case 'basic_info': {
        const trimmedInput = input.trim()
        const extracted: Partial<import('../types').CourseBasicInfo> = {}

        // 检查是否是"帮我开发《课程名》"格式的完整课程介绍
        const courseDevMatch = trimmedInput.match(/^帮我开发《([^》]+)》/)
        if (courseDevMatch) {
          // 提取课程名称
          extracted.name = courseDevMatch[1]

          // 提取课程类型："它是xxx课"
          const typeMatch = trimmedInput.match(/它是([^，。,\.]+?课)/)
          if (typeMatch) {
            const typeText = typeMatch[1]
            // 匹配课程类型
            for (const type of COURSE_TYPES) {
              if (typeText.includes(type.name) || type.name.includes(typeText.replace('课', ''))) {
                extracted.typeId = type.id
                extracted.typeName = type.name
                break
              }
            }
            // 如果没有精确匹配，尝试关键词匹配
            if (!extracted.typeId) {
              if (/通识|公共|基础素质/.test(typeText)) {
                extracted.typeId = 1
                extracted.typeName = '通识教育课'
              } else if (/学科基础|专业基础/.test(typeText)) {
                extracted.typeId = 2
                extracted.typeName = '学科基础课'
              } else if (/专业|核心/.test(typeText)) {
                extracted.typeId = 3
                extracted.typeName = '专业课'
              } else if (/实践|实训|实习/.test(typeText)) {
                extracted.typeId = 4
                extracted.typeName = '集中实践教学环节'
              } else if (/综合|素质|拓展/.test(typeText)) {
                extracted.typeId = 5
                extracted.typeName = '综合教育'
              }
            }
          }

          // 提取课程简介：查找描述性内容
          // 尝试匹配"主要讲授/教授/介绍xxx"或"培养xxx"等描述
          const introPatterns = [
            /主要(?:讲授|教授|介绍|学习|内容[是为]?)([^。]+)/,
            /(?:旨在|目的是|用于)([^。]+)/,
            /培养([^。]+)/,
          ]
          for (const pattern of introPatterns) {
            const introMatch = trimmedInput.match(pattern)
            if (introMatch) {
              extracted.introduction = introMatch[1].trim()
              break
            }
          }
          // 如果没有匹配到特定模式，使用《》后面的内容作为简介
          if (!extracted.introduction) {
            const afterName = trimmedInput.substring(trimmedInput.indexOf('》') + 1).trim()
            // 去除"它是xxx课"部分
            const cleanIntro = afterName.replace(/[，,]?它是[^，。,\.]+?课[，,]?/, '').trim()
            if (cleanIntro.length > 5) {
              extracted.introduction = cleanIntro
            }
          }
        } else {
          // 普通输入：查找当前缺失的字段，直接填充
          const currentMissingField = findMissingBasicInfoField(courseData.basicInfo)
          if (currentMissingField && trimmedInput) {
            switch (currentMissingField.key) {
              case 'name':
                extracted.name = trimmedInput
                break
              case 'introduction':
                extracted.introduction = trimmedInput
                break
              case 'theoryPeriod': {
                const num = parseInt(trimmedInput.replace(/[^\d]/g, ''), 10)
                extracted.theoryPeriod = isNaN(num) ? 0 : num
                break
              }
              case 'practicePeriod': {
                const num = parseInt(trimmedInput.replace(/[^\d]/g, ''), 10)
                extracted.practicePeriod = isNaN(num) ? 0 : num
                break
              }
            }
          }
        }

        // 合并已有数据和新提取的数据
        const updatedBasicInfo = { ...courseData.basicInfo, ...extracted }
        setCourseData(prev => ({
          ...prev,
          basicInfo: updatedBasicInfo,
        }))

        // 检查是否所有字段已填充
        if (isBasicInfoComplete(updatedBasicInfo)) {
          // 所有字段已填充，进入下一阶段
          setStage('chapters')

          // 显示思考过程并生成下一阶段的响应
          await simulateQuickThinking()
          const response = await generateStageResponse('chapters')
          await addStreamingMessage(response.content, response.options)

          return true // 已处理响应
        } else {
          // 查找下一个缺失的字段
          const missingField = findMissingBasicInfoField(updatedBasicInfo)
          if (missingField) {
            // 生成已提取信息的确认消息
            let confirmMsg = '收到！'
            if (extracted.name) confirmMsg += `课程名称是"${extracted.name}"。`
            if (extracted.typeId) {
              const typeName = COURSE_TYPES.find(t => t.id === extracted.typeId)?.name
              confirmMsg += `课程类型是"${typeName}"。`
            }
            if (extracted.introduction) confirmMsg += `课程简介已记录。`
            if (extracted.theoryPeriod !== undefined) confirmMsg += `理论学时${extracted.theoryPeriod}学时。`
            if (extracted.practicePeriod !== undefined) confirmMsg += `实践学时${extracted.practicePeriod}学时。`

            // 生成四真三化格式的询问
            const fieldPrompt = generateFieldPrompt(updatedBasicInfo.name, missingField)

            // 显示思考过程，然后流式输出回复
            await simulateQuickThinking()
            const options = missingField.type === 'select' && missingField.options ? missingField.options : []
            await addStreamingMessage(`${confirmMsg}\n\n${fieldPrompt}`, options)

            return true // 已处理响应
          }
        }
        break
      }

      case 'chapters': {
        if (intent.type === 'confirm') {
          setStage('points')
          await simulateQuickThinking()
          const response = await generateStageResponse('points')
          await addStreamingMessage(response.content, response.options)
          return true
        } else {
          const chapters = parserService.current.extractChapters(input)
          if (chapters.length > 0) {
            setCourseData(prev => ({
              ...prev,
              chapters: [...prev.chapters, ...chapters],
            }))
            const preview = generateStagePreview({ ...courseData, chapters: [...courseData.chapters, ...chapters] }, 'chapters')
            await simulateQuickThinking()
            await addStreamingMessage(`已添加章节信息：\n\n${preview}\n\n是否继续添加，还是进入下一步？`, CONFIRM_OPTIONS)
            return true // 已处理响应
          }
        }
        break
      }

      case 'points': {
        if (intent.type === 'confirm') {
          setStage('ksa')
          await simulateQuickThinking()
          const response = await generateStageResponse('ksa')
          await addStreamingMessage(response.content, response.options)
          return true
        } else {
          const points = parserService.current.extractPoints(input)
          if (points.length > 0) {
            setCourseData(prev => ({
              ...prev,
              points: [...prev.points, ...points],
            }))
            const preview = generateStagePreview({ ...courseData, points: [...courseData.points, ...points] }, 'points')
            await simulateQuickThinking()
            await addStreamingMessage(`已添加课点：\n\n${preview}\n\n是否继续添加，还是进入下一步？`, CONFIRM_OPTIONS)
            return true // 已处理响应
          }
        }
        break
      }

      case 'ksa': {
        if (intent.type === 'confirm') {
          setStage('preview')
          await simulateQuickThinking()
          const response = await generateStageResponse('preview')
          await addStreamingMessage(response.content, response.options)
          return true
        } else {
          const ksas = parserService.current.extractKsas(input)
          if (ksas.length > 0) {
            setCourseData(prev => ({
              ...prev,
              ksas: [...prev.ksas, ...ksas],
            }))
            const preview = generateStagePreview({ ...courseData, ksas: [...courseData.ksas, ...ksas] }, 'ksa')
            await simulateQuickThinking()
            await addStreamingMessage(`已添加 KSA：\n\n${preview}\n\n是否继续添加，还是进入下一步？`, CONFIRM_OPTIONS)
            return true // 已处理响应
          }
        }
        break
      }

      case 'preview':
        if (intent.type === 'confirm') {
          setStage('complete')
          await simulateQuickThinking()
          const response = await generateStageResponse('complete')
          await addStreamingMessage(response.content, response.options)
          return true
        }
        break

      case 'complete':
        // 完成阶段的处理在 selectOption 中
        break
    }

    return false // 需要 sendMessage 继续生成响应
  }, [stage, courseData, addMessage, simulateQuickThinking, addStreamingMessage, generateStageResponse])

  // ============================================================================
  // 主要操作
  // ============================================================================

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isProcessing) return

    setIsProcessing(true)

    // 添加用户消息
    addMessage({ role: 'user', content })

    try {
      // 处理输入，返回 true 表示已在 processUserInput 中处理完响应
      const handled = await processUserInput(content)

      // 如果已处理，直接返回
      if (handled) {
        return
      }

      // 如果阶段变化，显示思考过程并流式输出响应
      const newStage = stage // 这里需要在 processUserInput 之后获取最新的 stage
      await simulateQuickThinking()
      const response = await generateStageResponse(newStage)
      await addStreamingMessage(response.content, response.options)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, addMessage, processUserInput, generateStageResponse, stage, simulateQuickThinking, addStreamingMessage])

  const selectOption = useCallback(async (option: QuickOption): Promise<void> => {
    if (isProcessing) return

    setIsProcessing(true)

    // 添加用户选择消息
    addMessage({ role: 'user', content: option.label })

    try {
      let nextStage = stage

      switch (stage) {
        case 'welcome':
          if (option.value === 'start') {
            nextStage = 'basic_info'
          }
          break

        case 'basic_info':
          // 处理课程类型选择
          if (option.id.startsWith('type_')) {
            const typeId = parseInt(option.value, 10)
            const typeName = COURSE_TYPES.find(t => t.id === typeId)?.name

            // 更新课程数据
            const updatedBasicInfo = { ...courseData.basicInfo, typeId, typeName }
            setCourseData(prev => ({
              ...prev,
              basicInfo: updatedBasicInfo,
            }))

            // 检查是否所有字段已填充
            if (isBasicInfoComplete(updatedBasicInfo)) {
              nextStage = 'chapters'
            } else {
              // 查找下一个缺失的字段
              const missingField = findMissingBasicInfoField(updatedBasicInfo)
              if (missingField) {
                const fieldPrompt = generateFieldPrompt(updatedBasicInfo.name, missingField)
                const options = missingField.type === 'select' && missingField.options ? missingField.options : []

                // 显示思考过程，然后流式输出回复
                await simulateQuickThinking()
                await addStreamingMessage(`好的，课程类型是"${typeName}"。\n\n${fieldPrompt}`, options)

                setIsProcessing(false)
                return
              }
            }
          }
          break

        case 'chapters':
          if (option.value === 'template') {
            // 使用推荐模板
            const templates = await dataService.current.getChapterTemplates(courseData.basicInfo.typeId || 2)
            setCourseData(prev => ({ ...prev, chapters: templates }))
            nextStage = 'points'
          } else if (option.value === 'custom') {
            await simulateQuickThinking()
            await addStreamingMessage('请输入章节信息，格式如：第一章 绑论 2学时理论，第二章 基础技能 4学时理论8学时实践...', [])
            setIsProcessing(false)
            return
          } else if (option.value === 'confirm') {
            nextStage = 'points'
          }
          break

        case 'points':
          if (option.value === 'recommended') {
            const keyword = courseData.basicInfo.name || ''
            const points = await dataService.current.searchPoints(keyword, courseData.basicInfo.typeId)
            setCourseData(prev => ({ ...prev, points }))
            nextStage = 'ksa'
          } else if (option.value === 'add_more') {
            const keyword = courseData.basicInfo.name || ''
            const points = await dataService.current.searchPoints(keyword, courseData.basicInfo.typeId)
            setCourseData(prev => ({ ...prev, points }))
            await simulateQuickThinking()
            await addStreamingMessage('已采用推荐课点。请输入需要补充的课点：', [])
            setIsProcessing(false)
            return
          } else if (option.value === 'custom') {
            await simulateQuickThinking()
            await addStreamingMessage('请输入课点，多个课点可用逗号或换行分隔：', [])
            setIsProcessing(false)
            return
          } else if (option.value === 'confirm') {
            nextStage = 'ksa'
          }
          break

        case 'ksa':
          if (option.value === 'recommended') {
            const keyword = courseData.basicInfo.name || ''
            const ksas = await dataService.current.searchKsas(keyword, courseData.basicInfo.typeId)
            setCourseData(prev => ({ ...prev, ksas }))
            nextStage = 'preview'
          } else if (option.value === 'add_more') {
            const keyword = courseData.basicInfo.name || ''
            const ksas = await dataService.current.searchKsas(keyword, courseData.basicInfo.typeId)
            setCourseData(prev => ({ ...prev, ksas }))
            await simulateQuickThinking()
            await addStreamingMessage('已采用推荐 KSA。请输入需要补充的内容（格式：知识-xxx，技能-xxx，态度-xxx）：', [])
            setIsProcessing(false)
            return
          } else if (option.value === 'custom') {
            await simulateQuickThinking()
            await addStreamingMessage('请输入 KSA 内容，格式如：知识-掌握xxx原理，技能-能够xxx操作，态度-具备xxx精神', [])
            setIsProcessing(false)
            return
          } else if (option.value === 'confirm') {
            nextStage = 'preview'
          }
          break

        case 'preview':
          if (option.value === 'complete') {
            nextStage = 'complete'
          } else if (option.value.startsWith('edit_')) {
            const section = option.value.replace('edit_', '')
            const stageMap: Record<string, CourseDevStage> = {
              basic: 'basic_info',
              chapters: 'chapters',
              points: 'points',
              ksa: 'ksa',
            }
            nextStage = stageMap[section] || 'basic_info'
          }
          break

        case 'complete':
          if (option.value === 'copy') {
            const success = await copyToClipboard(courseData)
            await simulateQuickThinking()
            await addStreamingMessage(success ? '课程数据已复制到剪贴板！' : '复制失败，请重试。', COMPLETE_OPTIONS)
            setIsProcessing(false)
            return
          } else if (option.value === 'download') {
            downloadJson(courseData)
            await simulateQuickThinking()
            await addStreamingMessage('JSON 文件已开始下载！', COMPLETE_OPTIONS)
            setIsProcessing(false)
            return
          } else if (option.value === 'new') {
            // 重置流程
            setCourseData(INITIAL_COURSE_DATA)
            setMessages([])
            nextStage = 'welcome'
          }
          break
      }

      // 切换阶段并生成响应
      if (nextStage !== stage) {
        setStage(nextStage)
        await simulateQuickThinking()
        const response = await generateStageResponse(nextStage)
        await addStreamingMessage(response.content, response.options)
      }
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, stage, courseData, addMessage, generateStageResponse, simulateQuickThinking, addStreamingMessage])

  const goBack = useCallback(() => {
    const prevStage = getPrevStage(stage)
    if (prevStage) {
      setStage(prevStage)
      generateStageResponse(prevStage).then(response => {
        addMessage({
          role: 'assistant',
          content: `好的，让我们回到${STAGES.find(s => s.id === prevStage)?.name}。\n\n${response.content}`,
          stage: prevStage,
        })
        setQuickOptions(response.options)
      })
    }
  }, [stage, addMessage, generateStageResponse])

  const reset = useCallback(() => {
    setStage('welcome')
    setMessages([])
    setCourseData(INITIAL_COURSE_DATA)
    setThinkingSteps([])
    setQuickOptions(WELCOME_OPTIONS)
  }, [])

  const getExportData = useCallback(() => {
    return convertToExportData(courseData)
  }, [courseData])

  const handleDownloadJson = useCallback(() => {
    downloadJson(courseData)
  }, [courseData])

  const handleCopyToClipboard = useCallback(async () => {
    return copyToClipboard(courseData)
  }, [courseData])

  const getMarkdownPreview = useCallback(() => {
    return generateCourseMarkdown(courseData)
  }, [courseData])

  // ============================================================================
  // 初始化
  // ============================================================================

  // 首次加载时生成欢迎消息
  if (messages.length === 0) {
    const prompt = STAGE_PROMPTS.welcome
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `${prompt.greeting}\n\n${prompt.instruction}`,
      timestamp: Date.now(),
      stage: 'welcome',
    }])
  }

  return {
    stage,
    messages,
    courseData,
    isProcessing,
    thinkingSteps,
    quickOptions,
    sendMessage,
    selectOption,
    goBack,
    reset,
    getExportData,
    downloadJson: handleDownloadJson,
    copyToClipboard: handleCopyToClipboard,
    getMarkdownPreview,
  }
}
