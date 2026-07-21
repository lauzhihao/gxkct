/**
 * Mock 数据提供服务
 *
 * 热插拔设计：
 * - 实现 ICourseDataService 接口
 * - 后续可替换为真实 API 调用
 * - 模拟向量检索 + LLM 加工的延迟效果
 */

import type {
  ICourseDataService,
  CourseType,
  ChapterData,
  PointData,
  KsaData,
  CourseExportData,
} from '../types'
import { COURSE_TYPES } from '../constants'

// ============================================================================
// Mock 数据（从 mock-data 目录提取的示例数据）
// ============================================================================

/** 课点库（模拟向量数据库） */
const MOCK_POINTS_DB: Array<PointData & { keywords: string[] }> = [
  // 测量学相关
  { title: '课点1', description: '测量学的内容和内涵', keywords: ['测量', '测绘', '基础'] },
  { title: '课点2', description: '地面点的确定', keywords: ['测量', '定位', '坐标'] },
  { title: '课点3', description: '测量工作的程序及基本内容', keywords: ['测量', '程序', '流程'] },
  { title: '课点4', description: '高程测量的概述', keywords: ['高程', '测量', '水准'] },
  { title: '课点5', description: '水准测量原理', keywords: ['水准', '测量', '原理'] },
  { title: '课点6', description: '水准仪及水准工具的认识与使用', keywords: ['水准仪', '仪器', '使用'] },
  { title: '课点7', description: '普通水准测量的方法及成果整理', keywords: ['水准', '测量', '方法'] },
  { title: '课点8', description: '普通水准测量实践', keywords: ['水准', '实践', '实验'] },
  { title: '课点9', description: '水准路线测量原理', keywords: ['水准', '路线', '原理'] },
  { title: '课点10', description: '水准路线内业计算', keywords: ['水准', '计算', '内业'] },
  { title: '课点11', description: '闭合水准路线测量实践', keywords: ['闭合', '水准', '实践'] },
  { title: '课点12', description: '水准仪的检验和校正', keywords: ['水准仪', '检验', '校正'] },
  { title: '课点13', description: '四等水准路线原理', keywords: ['四等', '水准', '原理'] },
  { title: '课点14', description: '电子经纬仪认识与使用', keywords: ['经纬仪', '电子', '使用'] },
  { title: '课点15', description: '四等水准路线测量方法', keywords: ['四等', '水准', '方法'] },
  { title: '课点16', description: '四等水准路线测量内业计算', keywords: ['四等', '计算', '内业'] },
  { title: '课点17', description: '四等水准路线实践', keywords: ['四等', '实践', '水准'] },
  { title: '课点18', description: '高程点测设', keywords: ['高程', '测设', '定位'] },
  { title: '课点19', description: '水平角的观测原理', keywords: ['水平角', '观测', '原理'] },
  { title: '课点20', description: '竖直角的观测原理', keywords: ['竖直角', '观测', '原理'] },
  { title: '课点21', description: '经纬仪认识与使用', keywords: ['经纬仪', '仪器', '使用'] },
  { title: '课点22', description: '水平角观测方法', keywords: ['水平角', '观测', '方法'] },
  { title: '课点23', description: '竖直角观测方法', keywords: ['竖直角', '观测', '方法'] },
  { title: '课点24', description: '竖直指标差', keywords: ['竖直', '指标', '误差'] },
  { title: '课点25', description: '水平角测量实践', keywords: ['水平角', '实践', '测量'] },
  // 通用课点
  { title: '基础理论', description: '学科基础理论知识', keywords: ['理论', '基础', '概念'] },
  { title: '实践操作', description: '实际操作技能训练', keywords: ['实践', '操作', '技能'] },
  { title: '案例分析', description: '典型案例分析研究', keywords: ['案例', '分析', '研究'] },
  { title: '综合应用', description: '知识综合应用能力', keywords: ['综合', '应用', '能力'] },
]

/** KSA 库 */
const MOCK_KSA_DB: Array<KsaData & { keywords: string[] }> = [
  // 态度 (A)
  { type: 'A', title: 'A', description: '精益求精、工匠精神', keywords: ['态度', '精神', '工匠'] },
  { type: 'A', title: 'A', description: '国家-军事及科技强国', keywords: ['态度', '国家', '科技'] },
  { type: 'A', title: 'A', description: '辨析意识', keywords: ['态度', '辨析', '思维'] },
  { type: 'A', title: 'A', description: '认真严谨的工作态度', keywords: ['态度', '严谨', '工作'] },
  { type: 'A', title: 'A', description: '团队协作精神', keywords: ['态度', '团队', '协作'] },
  { type: 'A', title: 'A', description: '职业道德与责任感', keywords: ['态度', '职业', '责任'] },
  // 知识 (K)
  { type: 'K', title: 'K', description: '水准测量内业计算方法', keywords: ['知识', '水准', '计算'] },
  { type: 'K', title: 'K', description: '水准测量的误差分析', keywords: ['知识', '误差', '分析'] },
  { type: 'K', title: 'K', description: '了解水准仪的检验和校正', keywords: ['知识', '水准仪', '检验'] },
  { type: 'K', title: 'K', description: '掌握电子水准仪的构造和使用方法', keywords: ['知识', '电子', '水准仪'] },
  { type: 'K', title: 'K', description: '掌握水平角的概念及计算', keywords: ['知识', '水平角', '概念'] },
  { type: 'K', title: 'K', description: '理解测量学基本原理', keywords: ['知识', '测量', '原理'] },
  { type: 'K', title: 'K', description: '掌握坐标系统与投影方法', keywords: ['知识', '坐标', '投影'] },
  // 技能 (S)
  { type: 'S', title: 'S', description: '能够独立操作水准仪', keywords: ['技能', '水准仪', '操作'] },
  { type: 'S', title: 'S', description: '能够进行外业测量作业', keywords: ['技能', '外业', '测量'] },
  { type: 'S', title: 'S', description: '能够处理测量数据', keywords: ['技能', '数据', '处理'] },
  { type: 'S', title: 'S', description: '能够绘制地形图', keywords: ['技能', '地形图', '绘制'] },
  { type: 'S', title: 'S', description: '能够进行施工放样', keywords: ['技能', '施工', '放样'] },
]

/** 章节模板库（按课程类型） */
const CHAPTER_TEMPLATES: Record<number, ChapterData[]> = {
  // 通识教育课
  1: [
    { name: '第一章 导论', theoryPeriod: 2, practicePeriod: 0 },
    { name: '第二章 基础概念', theoryPeriod: 4, practicePeriod: 0 },
    { name: '第三章 核心理论', theoryPeriod: 4, practicePeriod: 2 },
    { name: '第四章 应用拓展', theoryPeriod: 4, practicePeriod: 2 },
    { name: '第五章 总结与展望', theoryPeriod: 2, practicePeriod: 0 },
  ],
  // 学科基础课
  2: [
    { name: '章节1：绑论', theoryPeriod: 2, practicePeriod: 0 },
    { name: '项目1：基础技能训练', theoryPeriod: 4, practicePeriod: 8 },
    { name: '项目2：核心技术实践', theoryPeriod: 4, practicePeriod: 4 },
    { name: '项目3：综合应用', theoryPeriod: 10, practicePeriod: 0 },
    { name: '项目4：实战演练', theoryPeriod: 4, practicePeriod: 4 },
  ],
  // 专业课
  3: [
    { name: '模块一：专业基础', theoryPeriod: 8, practicePeriod: 4 },
    { name: '模块二：核心技术', theoryPeriod: 12, practicePeriod: 8 },
    { name: '模块三：高级应用', theoryPeriod: 8, practicePeriod: 8 },
    { name: '模块四：项目实战', theoryPeriod: 4, practicePeriod: 12 },
  ],
  // 集中实践教学环节
  4: [
    { name: '实践准备', theoryPeriod: 4, practicePeriod: 0 },
    { name: '基础实践', theoryPeriod: 0, practicePeriod: 16 },
    { name: '综合实践', theoryPeriod: 0, practicePeriod: 24 },
    { name: '成果展示', theoryPeriod: 2, practicePeriod: 2 },
  ],
  // 综合教育
  5: [
    { name: '第一单元 认知拓展', theoryPeriod: 4, practicePeriod: 2 },
    { name: '第二单元 素质提升', theoryPeriod: 4, practicePeriod: 4 },
    { name: '第三单元 创新实践', theoryPeriod: 2, practicePeriod: 6 },
  ],
}

// ============================================================================
// 模拟延迟（模拟网络请求/AI处理时间）
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 300, max = 800): Promise<void> {
  return delay(Math.random() * (max - min) + min)
}

// ============================================================================
// 简单的关键词匹配（模拟向量检索）
// ============================================================================

function matchKeywords(query: string, keywords: string[]): number {
  const queryLower = query.toLowerCase()
  let score = 0
  for (const keyword of keywords) {
    if (queryLower.includes(keyword.toLowerCase())) {
      score += 1
    }
  }
  return score
}

// ============================================================================
// Mock 服务实现
// ============================================================================

export class MockCourseDataService implements ICourseDataService {
  async getCourseTypes(): Promise<CourseType[]> {
    await randomDelay(200, 400)
    return COURSE_TYPES
  }

  async searchPoints(keyword: string, courseType?: number): Promise<PointData[]> {
    await randomDelay(500, 1000)
    void courseType

    if (!keyword.trim()) {
      // 无关键词时返回默认推荐
      return MOCK_POINTS_DB.slice(0, 8).map(point => ({
        title: point.title,
        description: point.description,
      }))
    }

    // 按关键词匹配度排序
    const scored = MOCK_POINTS_DB.map(point => ({
      ...point,
      score: matchKeywords(keyword, point.keywords) + (point.description.includes(keyword) ? 2 : 0),
    }))

    return scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(point => ({
        title: point.title,
        description: point.description,
      }))
  }

  async searchKsas(keyword: string, courseType?: number): Promise<KsaData[]> {
    await randomDelay(500, 1000)
    void courseType

    if (!keyword.trim()) {
      // 无关键词时返回各类型的默认推荐
      const defaultK = MOCK_KSA_DB.filter(k => k.type === 'K').slice(0, 3)
      const defaultS = MOCK_KSA_DB.filter(k => k.type === 'S').slice(0, 3)
      const defaultA = MOCK_KSA_DB.filter(k => k.type === 'A').slice(0, 3)
      return [...defaultK, ...defaultS, ...defaultA].map(ksa => ({
        type: ksa.type,
        title: ksa.title,
        description: ksa.description,
      }))
    }

    const scored = MOCK_KSA_DB.map(ksa => ({
      ...ksa,
      score: matchKeywords(keyword, ksa.keywords) + (ksa.description.includes(keyword) ? 2 : 0),
    }))

    return scored
      .filter(k => k.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(ksa => ({
        type: ksa.type,
        title: ksa.title,
        description: ksa.description,
      }))
  }

  async getChapterTemplates(courseType: number): Promise<ChapterData[]> {
    await randomDelay(300, 600)
    return CHAPTER_TEMPLATES[courseType] ?? CHAPTER_TEMPLATES[2]
  }

  async saveCourse(data: CourseExportData): Promise<{ success: boolean; id?: string }> {
    await randomDelay(800, 1500)
    // 模拟保存，返回成功
    console.log('[MockCourseDataService] 保存课程数据:', data)
    return { success: true, id: `course_${Date.now()}` }
  }
}

// ============================================================================
// 默认导出单例
// ============================================================================

export const mockCourseDataService = new MockCourseDataService()

/**
 * 获取课程数据服务
 * 热插拔：修改此函数返回真实服务实例
 */
export function getCourseDataService(): ICourseDataService {
  // TODO: 后续替换为真实 API 服务
  // return new RealCourseDataService()
  return mockCourseDataService
}
