#!/usr/bin/env node

/**
 * 生成完整的层级化Mock数据脚本
 *
 * 数据结构:
 * - 1所大学(齐齐哈尔工程学院) + 5个工作坊(第71-75期四真三化工作坊)
 * - 每个一级节点: 3个院系/班组
 * - 每个院系: 5个专业(包含完整的专业表单字段)
 * - 每个专业: 5门课程(包含完整的课程表单字段)
 *
 * 总计: 6个一级节点, 18个院系, 90个专业, 450门课程
 *
 * 注意: 数据量已优化以适应localStorage的5-10MB存储限制
 *
 * 使用方法:
 *   node scripts/generate-complete-mock-data.js
 *
 * 验证数据:
 *   node scripts/verify-mock-data.js
 *
 * 加载新数据:
 *   在浏览器控制台执行: localStorage.clear(); location.reload();
 */

const fs = require('fs');
const path = require('path');

// ==================== 基础数据库 ====================

// 院系名称库
const departmentNames = [
  '信息工程学院', '机械工程学院', '电气工程学院', '土木工程学院', '经济管理学院',
  '外国语学院', '艺术设计学院', '建筑工程学院', '汽车工程学院', '材料工程学院',
  '化学工程学院', '生物工程学院', '环境工程学院', '能源工程学院', '交通工程学院',
  '食品工程学院', '纺织工程学院', '轻工学院', '农业工程学院', '水利工程学院',
  '数学与统计学院', '物理与光电学院', '人文学院', '马克思主义学院', '体育学院',
  '音乐学院', '美术学院', '传媒学院', '法学院', '医学院'
];

// 专业名称库
const majorNames = [
  '计算机科学与技术', '软件工程', '网络工程', '物联网工程', '数据科学与大数据技术',
  '人工智能', '信息安全', '数字媒体技术', '机械设计制造及其自动化', '机械电子工程',
  '车辆工程', '工业设计', '电气工程及其自动化', '自动化', '电子信息工程',
  '通信工程', '土木工程', '建筑学', '工程管理', '工程造价',
  '会计学', '财务管理', '市场营销', '国际经济与贸易', '金融学',
  '英语', '日语', '商务英语', '视觉传达设计', '环境设计',
  '产品设计', '数字媒体艺术', '材料科学与工程', '高分子材料与工程', '化学工程与工艺',
  '生物工程', '生物技术', '环境工程', '环保设备工程', '新能源科学与工程',
  '能源与动力工程', '交通运输', '交通工程', '物流工程', '食品科学与工程',
  '食品质量与安全', '纺织工程', '服装设计与工程', '轻化工程', '农业机械化及其自动化'
];

// 课程名称库
const courseNames = [
  '高等数学', '线性代数', '概率论与数理统计', '离散数学', '大学物理',
  '大学英语', '思想道德与法治', '中国近现代史纲要', '马克思主义基本原理', '毛泽东思想和中国特色社会主义理论体系概论',
  '程序设计基础', 'C语言程序设计', 'Java程序设计', 'Python程序设计', '数据结构',
  '算法设计与分析', '操作系统', '计算机网络', '数据库原理', '软件工程',
  '计算机组成原理', '编译原理', '人工智能', '机器学习', '深度学习',
  '计算机图形学', 'Web开发技术', '移动应用开发', '云计算技术', '大数据技术',
  '信息安全', '网络安全', '密码学', '区块链技术', '物联网技术',
  '嵌入式系统', '单片机原理', '数字电路', '模拟电路', '信号与系统',
  '通信原理', '数字信号处理', '微机原理', '自动控制原理', '机器人技术',
  '工程制图', '机械原理', '机械设计', '材料力学', '理论力学',
  '流体力学', '热力学', '电工电子技术', '工程力学', '结构力学',
  '建筑材料', '建筑构造', '建筑设计', '城市规划', '工程测量',
  '管理学原理', '经济学原理', '会计学基础', '财务管理', '市场营销学',
  '人力资源管理', '组织行为学', '战略管理', '项目管理', '质量管理'
];

// 办学特色模板
const educationalFeatures = [
  '本专业注重理论与实践相结合，培养具有创新精神和实践能力的高素质应用型人才。拥有先进的实验室设备和校企合作基地，为学生提供丰富的实践机会。师资力量雄厚，教学质量优异，毕业生就业率连续多年保持在95%以上。',
  '专业建设紧密对接产业需求，课程体系科学合理，实践教学体系完善。与多家知名企业建立深度合作关系，实施校企双导师制。注重学生创新创业能力培养，设有专业创新实验室和创业孵化基地。',
  '依托学校优势学科资源，形成了鲜明的专业特色。采用项目驱动式教学模式，强化学生工程实践能力。建有省级实验教学示范中心，拥有完善的实践教学条件。毕业生深受用人单位欢迎，就业质量高。',
  '专业师资队伍结构合理，拥有多名行业专家和企业导师。课程设置紧跟行业发展趋势，注重前沿技术的引入。建立了完善的实习实训体系，与行业龙头企业开展深度合作。学生在各类专业竞赛中屡获佳绩。',
  '坚持以学生为中心的教育理念，注重个性化培养。实施导师制，为每位学生配备专业导师。建有现代化的实验实训平台，为学生提供充足的实践机会。积极开展国际交流合作，拓宽学生国际视野。'
];

// 职业方向数据
const careerDirections = {
  "信息技术": {
    "软件开发": {
      "前端开发": ["Web前端", "移动端开发", "小程序开发"],
      "后端开发": ["Java开发", "Python开发", "Node.js开发"],
      "全栈开发": ["MERN栈", "MEAN栈", "Vue全栈"]
    },
    "数据分析": {
      "数据挖掘": ["机器学习", "深度学习", "数据建模"],
      "商业智能": ["BI分析", "数据可视化", "报表开发"]
    },
    "网络运维": {
      "系统运维": ["Linux运维", "云平台运维", "DevOps"],
      "网络安全": ["安全测试", "渗透测试", "安全运维"]
    }
  },
  "制造业": {
    "机械设计": {
      "产品设计": ["工业设计", "结构设计", "模具设计"],
      "工艺设计": ["加工工艺", "装配工艺", "检测工艺"]
    },
    "自动化": {
      "工业自动化": ["PLC编程", "机器人编程", "自动化系统集成"],
      "智能制造": ["数字化工厂", "智能生产线", "工业互联网"]
    }
  },
  "商业服务": {
    "财务管理": {
      "会计核算": ["财务会计", "成本会计", "税务会计"],
      "财务分析": ["财务报表分析", "投资分析", "风险管理"]
    },
    "市场营销": {
      "数字营销": ["新媒体运营", "电商运营", "内容营销"],
      "品牌管理": ["品牌策划", "品牌推广", "客户关系管理"]
    }
  }
};

// 工作任务模板
const taskTemplates = [
  '负责系统需求分析、方案设计、编码实现和测试工作；参与技术选型和架构设计；编写技术文档；进行代码审查和优化。',
  '进行数据采集、清洗、分析和可视化；建立数据模型；撰写分析报告；为业务决策提供数据支持。',
  '负责产品设计、建模和仿真；编制技术文档；参与产品测试和优化；协调生产制造工作。',
  '制定营销策略和推广方案；进行市场调研和竞品分析；管理客户关系；组织营销活动。',
  '进行财务核算和报表编制；开展财务分析和预算管理；参与投资决策；进行税务筹划。',
  '负责系统运维和故障处理；进行性能监控和优化；制定运维规范；保障系统稳定运行。',
  '进行工艺设计和优化；编制工艺文件；指导生产操作；解决生产技术问题。',
  '开展教学设计和课程开发；组织教学活动；进行学生辅导；参与教学研究。'
];

// 培养目标模板
const trainingObjectivesTemplates = [
  '本专业培养德智体美劳全面发展，掌握扎实的专业理论知识和实践技能，具有创新精神、实践能力和国际视野，能够在相关领域从事技术开发、系统设计、项目管理等工作的高素质应用型人才。',
  '培养适应社会主义现代化建设需要，具有良好的职业道德和人文素养，系统掌握专业基础理论和专业技能，具备较强的创新能力和实践能力，能够在行业企业从事专业技术工作的应用型专门人才。',
  '本专业旨在培养具有扎实的理论基础、较强的实践能力和创新精神，能够适应行业发展需求，在相关领域从事研究、开发、管理等工作的高级专门人才。毕业生应具备良好的团队协作能力和终身学习能力。',
  '培养德才兼备，具有社会责任感和职业素养，掌握系统的专业知识和技能，具备解决复杂工程问题的能力，能够在相关行业从事设计、开发、管理等工作的工程技术人才。',
  '本专业培养适应区域经济社会发展需要，具有创新创业精神和实践能力，掌握专业核心知识和技能，能够在相关领域从事技术应用、项目实施、运营管理等工作的高素质技术技能人才。'
];

// 省份列表
const provinces = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
  '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省',
  '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区',
  '海南省', '重庆市', '四川省', '贵州省', '云南省',
  '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'
];

// 职业层级
const careerLevels = ['初级', '中级', '高级', '专家级'];

// 课程性质选项
const courseNatureOptions = ['公共基础课', '专业基础课', '专业核心课', '专业拓展课', '实践课程'];

// 课程类型
const courseTypes = ['必修', '选修'];

// 学期列表
const semesters = ['第一学期', '第二学期', '第三学期', '第四学期', '第五学期', '第六学期', '第七学期', '第八学期'];

// ==================== 工具函数 ====================

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(prefix, index) {
  return `${prefix}-${index}`;
}

function generateMajorCode() {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function generateCourseCode(index) {
  return `COURSE${String(index).padStart(4, '0')}`;
}

// ==================== 毕业要求数据库 ====================

const graduationRequirements = [
  {
    content: '工程知识：能够将数学、自然科学、工程基础和专业知识用于解决复杂工程问题。',
    indicators: [
      '能运用数学、自然科学和工程科学的基本原理，识别和表达复杂工程问题',
      '能针对具体的对象建立数学模型并求解',
      '能够将相关知识和数学模型方法用于推演、分析专业工程问题',
      '能够将相关知识和数学模型方法用于复杂工程问题解决方案的比较与综合'
    ]
  },
  {
    content: '问题分析：能够应用数学、自然科学和工程科学的基本原理，识别、表达、并通过文献研究分析复杂工程问题，以获得有效结论。',
    indicators: [
      '能运用相关科学原理，识别和判断复杂工程问题的关键环节',
      '能基于相关科学原理和数学模型方法正确表达复杂工程问题',
      '能认识到解决问题有多种方案可选择，会通过文献研究寻求可替代的解决方案',
      '能运用基本原理，借助文献研究，分析过程的影响因素，获得有效结论'
    ]
  },
  {
    content: '设计/开发解决方案：能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元（部件）或工艺流程，并能够在设计环节中体现创新意识，考虑社会、健康、安全、法律、文化以及环境等因素。',
    indicators: [
      '掌握工程设计和产品开发全周期、全流程的基本设计/开发方法和技术，了解影响设计目标和技术方案的各种因素',
      '能够针对特定需求，完成单元（部件）的设计',
      '能够进行系统或工艺流程设计，在设计中体现创新意识',
      '在设计中能够综合考虑社会、健康、安全、法律、文化以及环境等因素'
    ]
  },
  {
    content: '研究：能够基于科学原理并采用科学方法对复杂工程问题进行研究，包括设计实验、分析与解释数据、并通过信息综合得到合理有效的结论。',
    indicators: [
      '能够基于科学原理，通过文献研究或相关方法，调研和分析复杂工程问题的解决方案',
      '能够根据对象特征，选择研究路线，设计实验方案',
      '能够根据实验方案构建实验系统，安全地开展实验，正确地采集实验数据',
      '能对实验结果进行分析和解释，并通过信息综合得到合理有效的结论'
    ]
  },
  {
    content: '使用现代工具：能够针对复杂工程问题，开发、选择与使用恰当的技术、资源、现代工程工具和信息技术工具，包括对复杂工程问题的预测与模拟，并能够理解其局限性。',
    indicators: [
      '了解专业常用的现代仪器、信息技术工具、工程工具和模拟软件的使用原理和方法，并理解其局限性',
      '能够选择与使用恰当的仪器、信息资源、工程工具和专业模拟软件，对复杂工程问题进行分析、计算与设计',
      '能够针对具体的对象，开发或选用满足特定需求的现代工具，模拟和预测专业问题，并能够分析其局限性'
    ]
  },
  {
    content: '工程与社会：能够基于工程相关背景知识进行合理分析，评价专业工程实践和复杂工程问题解决方案对社会、健康、安全、法律以及文化的影响，并理解应承担的责任。',
    indicators: [
      '了解专业相关领域的技术标准体系、知识产权、产业政策和法律法规，理解不同社会文化对工程活动的影响',
      '能分析和评价专业工程实践对社会、健康、安全、法律、文化的影响，以及这些制约因素对项目实施的影响，并理解应承担的责任'
    ]
  },
  {
    content: '环境和可持续发展：能够理解和评价针对复杂工程问题的工程实践对环境、社会可持续发展的影响。',
    indicators: [
      '知晓和理解环境保护和可持续发展的理念和内涵',
      '能够站在环境保护和可持续发展的角度思考专业工程实践的可持续性，评价产品周期中可能对人类和环境造成的损害和隐患'
    ]
  },
  {
    content: '职业规范：具有人文社会科学素养、社会责任感，能够在工程实践中理解并遵守工程职业道德和规范，履行责任。',
    indicators: [
      '有正确价值观，理解个人与社会的关系，了解中国国情',
      '理解诚实公正、诚信守则的工程职业道德和规范，并能在工程实践中自觉遵守',
      '理解工程师对公众的安全、健康和福祉，以及环境保护的社会责任，能够在工程实践中自觉履行责任'
    ]
  },
  {
    content: '个人和团队：能够在多学科背景下的团队中承担个体、团队成员以及负责人的角色。',
    indicators: [
      '能与其他学科的成员有效沟通，合作共事',
      '能够在团队中独立或合作开展工作',
      '能够组织、协调和指挥团队开展工作'
    ]
  },
  {
    content: '沟通：能够就复杂工程问题与业界同行及社会公众进行有效沟通和交流，包括撰写报告和设计文稿、陈述发言、清晰表达或回应指令。并具备一定的国际视野，能够在跨文化背景下进行沟通和交流。',
    indicators: [
      '能就专业问题，以口头、文稿、图表等方式，准确表达自己的观点，回应质疑，理解与业界同行和社会公众交流的差异性',
      '了解专业领域的国际发展趋势、研究热点，理解和尊重世界不同文化的差异性和多样性',
      '具备跨文化交流的语言和书面表达能力，能就专业问题，在跨文化背景下进行基本沟通和交流'
    ]
  },
  {
    content: '项目管理：理解并掌握工程管理原理与经济决策方法，并能在多学科环境中应用。',
    indicators: [
      '掌握工程项目中涉及的管理与经济决策方法',
      '了解工程及产品全周期、全流程的成本构成，理解其中涉及的工程管理与经济决策问题',
      '能在多学科环境下，在设计开发解决方案的过程中，运用工程管理与经济决策方法'
    ]
  },
  {
    content: '终身学习：具有自主学习和终身学习的意识，有不断学习和适应发展的能力。',
    indicators: [
      '能在社会发展的大背景下，认识到自主和终身学习的必要性',
      '具有自主学习的能力，包括对技术问题的理解能力，归纳总结的能力和提出问题的能力等'
    ]
  }
];

// ==================== 教学目标模板 ====================

const teachingObjectiveTemplates = [
  {
    content: '知识目标：掌握本课程的基本概念、基本原理和基本方法',
    points: [
      '理解并掌握课程的核心概念和基本理论',
      '能够运用所学知识分析和解决实际问题',
      '建立系统的知识体系和理论框架'
    ]
  },
  {
    content: '能力目标：培养学生的实践能力、创新能力和综合应用能力',
    points: [
      '具备独立分析问题和解决问题的能力',
      '能够运用专业工具和方法完成实际任务',
      '培养团队协作和沟通交流能力'
    ]
  },
  {
    content: '素质目标：培养学生的职业素养、工程伦理和社会责任感',
    points: [
      '树立正确的职业价值观和工程伦理观',
      '培养严谨的科学态度和创新精神',
      '增强社会责任感和可持续发展意识'
    ]
  }
];

// ==================== 课点信息模板 ====================

const coursePointTemplates = [
  {
    content: '基础理论知识点',
    infoPoints: [
      { type: 'K', content: '掌握基本概念和定义' },
      { type: 'K', content: '理解核心原理和方法' },
      { type: 'S', content: '能够运用理论分析问题' },
      { type: 'A', content: '培养严谨的学习态度' }
    ]
  },
  {
    content: '实践应用知识点',
    infoPoints: [
      { type: 'K', content: '了解实际应用场景' },
      { type: 'S', content: '掌握实践操作技能' },
      { type: 'S', content: '能够独立完成实践任务' },
      { type: 'A', content: '培养动手实践能力' }
    ]
  },
  {
    content: '综合能力知识点',
    infoPoints: [
      { type: 'K', content: '理解知识的综合应用' },
      { type: 'S', content: '具备问题分析能力' },
      { type: 'S', content: '具备方案设计能力' },
      { type: 'A', content: '培养创新思维' }
    ]
  }
];

// ==================== 章节模板 ====================

const chapterTemplates = [
  { prefix: '第一章', topics: ['绪论', '概述', '导论', '基础知识'], theory: [4, 6], practice: [2, 4] },
  { prefix: '第二章', topics: ['基本概念', '基础理论', '基本原理', '理论基础'], theory: [6, 8], practice: [4, 6] },
  { prefix: '第三章', topics: ['核心技术', '关键方法', '重要理论', '核心内容'], theory: [8, 10], practice: [6, 8] },
  { prefix: '第四章', topics: ['应用实践', '案例分析', '实践应用', '综合应用'], theory: [6, 8], practice: [8, 10] },
  { prefix: '第五章', topics: ['高级主题', '前沿技术', '拓展内容', '深入研究'], theory: [4, 6], practice: [4, 6] },
  { prefix: '项目一', topics: ['综合实训', '项目实践', '课程设计', '实战演练'], theory: [2, 4], practice: [12, 16] },
  { prefix: '项目二', topics: ['创新实践', '综合项目', '毕业设计', '实践创新'], theory: [2, 4], practice: [12, 16] }
];

// ==================== 数据生成函数 ====================

/**
 * 生成职业信息
 */
function generateCareerInfo(count = 2) {
  const careerInfoList = [];
  const categories = Object.keys(careerDirections);

  for (let i = 0; i < count; i++) {
    const category1 = randomChoice(categories);
    const category2Options = Object.keys(careerDirections[category1]);
    const category2 = randomChoice(category2Options);
    const category3Options = Object.keys(careerDirections[category1][category2]);
    const category3 = randomChoice(category3Options);
    const category4Options = careerDirections[category1][category2][category3];
    const category4 = randomChoice(category4Options);

    careerInfoList.push({
      id: String(i + 1),
      level: randomChoice(careerLevels),
      direction: {
        category1,
        category2,
        category3,
        category4
      },
      tasks: randomChoice(taskTemplates)
    });
  }

  return careerInfoList;
}

/**
 * 生成需求状况
 */
function generateDemandStatus() {
  const statuses = ['全部状况', '全国紧缺', '地方紧缺'];
  const status = randomChoice(statuses);

  if (status === '地方紧缺') {
    return {
      demandStatus: status,
      selectedProvince: randomChoice(provinces)
    };
  }

  return {
    demandStatus: status,
    selectedProvince: ''
  };
}

/**
 * 生成毕业要求
 */
function generateGraduationRequirements() {
  const requirementCount = randomInt(5, 8);
  const selectedRequirements = [];
  const usedIndices = new Set();

  while (selectedRequirements.length < requirementCount && selectedRequirements.length < graduationRequirements.length) {
    const index = Math.floor(Math.random() * graduationRequirements.length);
    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      selectedRequirements.push({
        id: String(selectedRequirements.length + 1),
        ...graduationRequirements[index]
      });
    }
  }

  return selectedRequirements;
}

/**
 * 生成教学目标
 */
function generateTeachingObjectives() {
  return teachingObjectiveTemplates.map((template, index) => ({
    id: String(index + 1),
    content: template.content,
    points: template.points
  }));
}

/**
 * 生成课点信息
 */
function generateCoursePoints() {
  const pointCount = randomInt(3, 5);
  const points = [];

  for (let i = 0; i < pointCount; i++) {
    const template = randomChoice(coursePointTemplates);
    points.push({
      id: String(i + 1),
      content: template.content,
      infoPoints: template.infoPoints.map((ip, idx) => ({
        id: `${ip.type}${idx + 1}`,
        type: ip.type,
        content: ip.content
      }))
    });
  }

  return points;
}

/**
 * 生成章节
 */
function generateChapters() {
  const chapterCount = randomInt(5, 7);
  const chapters = [];

  for (let i = 0; i < chapterCount; i++) {
    const template = randomChoice(chapterTemplates);
    const topic = randomChoice(template.topics);
    chapters.push({
      id: String(i + 1),
      name: `${template.prefix} ${topic}`,
      theoryHours: randomInt(template.theory[0], template.theory[1]),
      practiceHours: randomInt(template.practice[0], template.practice[1])
    });
  }

  return chapters;
}

/**
 * 生成课程数据
 */
function generateCourse(courseIndex, majorId, departmentId, localIndex) {
  // 只在课程名称后面添加后缀作为区分，其他字段保持一致
  const courseName = `数据结构与算法@${departmentId}_${majorId}-${localIndex}`;
  const openingDate = '2024-09-01';
  const courseType = '必修';
  const courseNature = '专业核心课';

  // 教学目标数组
  const teachingObjectives = [
    {
      id: '1',
      content: '知识目标：掌握本课程的基本概念、基本原理和基本方法',
      points: [
        '理解并掌握课程的核心概念和基本理论',
        '能够运用所学知识分析和解决实际问题',
        '建立系统的知识体系和理论框架'
      ]
    },
    {
      id: '2',
      content: '能力目标：培养学生的实践能力、创新能力和综合应用能力',
      points: [
        '具备独立分析问题和解决问题的能力',
        '能够运用专业工具和方法完成实际任务',
        '培养团队协作和沟通交流能力'
      ]
    },
    {
      id: '3',
      content: '素质目标：培养学生的职业素养、工程伦理和社会责任感',
      points: [
        '树立正确的职业价值观和工程伦理观',
        '培养严谨的科学态度和创新精神',
        '增强社会责任感和可持续发展意识'
      ]
    }
  ];

  // 课点信息数组
  const coursePoints = [
    {
      id: '1',
      content: '基础理论知识点',
      infoPoints: [
        {
          id: 'K1',
          type: 'K',
          content: '掌握基本概念和定义'
        },
        {
          id: 'K2',
          type: 'K',
          content: '理解核心原理和方法'
        },
        {
          id: 'S1',
          type: 'S',
          content: '能够运用理论分析问题'
        },
        {
          id: 'A1',
          type: 'A',
          content: '培养严谨的学习态度'
        }
      ]
    },
    {
      id: '2',
      content: '实践应用知识点',
      infoPoints: [
        {
          id: 'K1',
          type: 'K',
          content: '了解实际应用场景'
        },
        {
          id: 'S1',
          type: 'S',
          content: '掌握实践操作技能'
        },
        {
          id: 'S2',
          type: 'S',
          content: '能够独立完成实践任务'
        },
        {
          id: 'A1',
          type: 'A',
          content: '培养动手实践能力'
        }
      ]
    },
    {
      id: '3',
      content: '综合能力知识点',
      infoPoints: [
        {
          id: 'K1',
          type: 'K',
          content: '理解知识的综合应用'
        },
        {
          id: 'S1',
          type: 'S',
          content: '具备问题分析能力'
        },
        {
          id: 'S2',
          type: 'S',
          content: '具备方案设计能力'
        },
        {
          id: 'A1',
          type: 'A',
          content: '培养创新思维'
        }
      ]
    }
  ];

  // 章节数组
  const chapters = [
    {
      id: '1',
      name: '第一章 数据结构基础',
      theoryHours: 6,
      practiceHours: 4
    },
    {
      id: '2',
      name: '第二章 线性表',
      theoryHours: 8,
      practiceHours: 6
    },
    {
      id: '3',
      name: '第三章 栈和队列',
      theoryHours: 8,
      practiceHours: 6
    },
    {
      id: '4',
      name: '第四章 树和二叉树',
      theoryHours: 10,
      practiceHours: 8
    },
    {
      id: '5',
      name: '第五章 图',
      theoryHours: 10,
      practiceHours: 8
    },
    {
      id: '6',
      name: '第六章 查找算法',
      theoryHours: 8,
      practiceHours: 6
    },
    {
      id: '7',
      name: '第七章 排序算法',
      theoryHours: 8,
      practiceHours: 6
    }
  ];

  return {
    id: `course-${courseIndex}`,
    majorId: majorId,
    name: courseName,
    type: 'course',
    isStarred: Math.random() > 0.9,
    children: [],
    metadata: {
      openingDate,
      courseType,
      courseNature,
      teachingObjectives,
      coursePoints,
      chapters
    }
  };
}

/**
 * 生成专业数据
 */
function generateMajor(majorIndex, departmentId, departmentName, localIndex) {
  // 只在专业名称后面添加后缀作为区分，其他字段保持一致
  const majorName = `计算机科学与技术@${departmentId}-${localIndex}`;
  const majorCode = '080901';
  const level = '本科';
  const educationalFeature = '本专业培养具有良好的科学素养，系统地掌握计算机科学与技术的基本理论、基本知识和基本技能，能在科研部门、教育单位、企业、事业、技术和行政管理部门等单位从事计算机教学、科学研究和应用的计算机科学与技术学科的高级专门科学技术人才。';

  // 职业信息数组
  const careerInfo = [
    {
      id: '1',
      level: '中级',
      direction: {
        category1: '信息技术',
        category2: '软件开发',
        category3: '前端开发',
        category4: 'Web前端'
      },
      tasks: '负责Web应用的前端开发，包括页面设计、交互实现、性能优化等工作'
    },
    {
      id: '2',
      level: '高级',
      direction: {
        category1: '信息技术',
        category2: '软件开发',
        category3: '后端开发',
        category4: 'Java开发'
      },
      tasks: '负责后端系统架构设计、核心业务逻辑开发、数据库设计与优化、系统性能调优等工作'
    }
  ];

  const demandStatus = '全国紧缺';
  const selectedProvince = '';
  const trainingObjectives = '本专业培养德智体美劳全面发展，掌握数学与自然科学基础知识以及计算机、网络与信息系统相关的基本理论、基本知识、基本技能和基本方法，具有较强的专业能力和良好的综合素质，能胜任计算机科学研究、计算机系统设计、开发与应用等工作的高级专门人才。';

  // 毕业要求数组
  const graduationReqs = [
    {
      id: '1',
      content: '工程知识：能够将数学、自然科学、工程基础和专业知识用于解决复杂工程问题',
      indicators: [
        '能运用数学、自然科学和工程科学的语言工具进行问题表述',
        '能针对具体的对象建立数学模型并求解',
        '能够将相关知识和数学模型方法用于推演、分析专业工程问题'
      ]
    },
    {
      id: '2',
      content: '问题分析：能够应用数学、自然科学和工程科学的基本原理，识别、表达、并通过文献研究分析复杂工程问题',
      indicators: [
        '能运用相关科学原理，识别和判断复杂工程问题的关键环节',
        '能基于相关科学原理和数学模型方法正确表达复杂工程问题',
        '能认识到解决问题有多种方案可选择，会通过文献研究寻求可替代的解决方案'
      ]
    },
    {
      id: '3',
      content: '设计/开发解决方案：能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或流程',
      indicators: [
        '掌握工程设计和产品开发全周期、全流程的基本设计/开发方法和技术',
        '能够针对特定需求，完成单元（部件）的设计',
        '能够进行系统或工艺流程设计，在设计中体现创新意识'
      ]
    }
  ];

  return {
    id: `major-${majorIndex}`,
    departmentId: departmentId,
    name: majorName,
    type: 'major',
    description: educationalFeature,
    isStarred: Math.random() > 0.85,
    children: [],
    metadata: {
      code: majorCode,
      level: level,
      careerInfo: careerInfo,
      demandStatus: demandStatus,
      selectedProvince: selectedProvince,
      trainingObjectives: trainingObjectives,
      graduationRequirements: graduationReqs
    }
  };
}

/**
 * 生成课程资源数据
 */
function generateCourseResources(courseId) {
  // 课程资源文件夹
  const folders = [
    { id: "talent-plan", name: "人才培养方案", count: 3 },
    { id: "syllabus", name: "课程教学大纲", count: 1 },
    { id: "course-intro", name: "开课说明", count: 0 },
    { id: "analysis", name: "学情分析报告", count: 5 },
    { id: "courseware", name: "课件（分章节）", count: 12 },
    { id: "lesson-plan", name: "教案（分章节）", count: 12 },
    { id: "videos", name: "视频", count: 8 },
    { id: "cases", name: "案例", count: 15 },
    { id: "homework", name: "作业（分章节）", count: 10 },
    { id: "preview", name: "预习手册（分章节）", count: 0 },
    { id: "question-bank", name: "习题库", count: 156 },
    { id: "toolbox", name: "工具箱", count: 7 },
    { id: "others", name: "其他课程资源", count: 5 }
  ];

  // 文件数据
  const files = {
    "talent-plan": [
      { name: "2024级人才培养方案.pdf", size: "2.3 MB", date: "2024-03-15", type: "PDF文档", uploader: "张教授", version: "v2.1" },
      { name: "2023级人才培养方案.pdf", size: "2.1 MB", date: "2023-09-01", type: "PDF文档", uploader: "张教授", version: "v2.0" },
      { name: "培养方案修订说明.docx", size: "156 KB", date: "2024-03-10", type: "Word文档", uploader: "李主任", version: "v1.0" }
    ],
    "syllabus": [
      { name: "课程教学大纲.pdf", size: "1.2 MB", date: "2024-02-20", type: "PDF文档", uploader: "王老师", version: "v1.5" }
    ],
    "course-intro": [],
    "analysis": [
      { name: "第一学期学情分析.pdf", size: "890 KB", date: "2024-01-15", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "第二学期学情分析.pdf", size: "920 KB", date: "2024-06-20", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "学生成绩分布图.xlsx", size: "245 KB", date: "2024-06-25", type: "Excel表格", uploader: "王老师", version: "v1.0" },
      { name: "学习行为分析报告.pdf", size: "1.5 MB", date: "2024-06-30", type: "PDF文档", uploader: "王老师", version: "v1.2" },
      { name: "课程反馈汇总.docx", size: "380 KB", date: "2024-07-05", type: "Word文档", uploader: "王老师", version: "v1.0" }
    ],
    "courseware": [
      { name: "第1章-课程概述.pptx", size: "3.2 MB", date: "2024-02-25", type: "PPT课件", uploader: "王老师", version: "v1.3" },
      { name: "第2章-基础知识.pptx", size: "4.1 MB", date: "2024-03-05", type: "PPT课件", uploader: "王老师", version: "v1.2" },
      { name: "第3章-核心内容.pptx", size: "5.3 MB", date: "2024-03-15", type: "PPT课件", uploader: "王老师", version: "v1.4" },
      { name: "第4章-实践应用.pptx", size: "4.8 MB", date: "2024-03-25", type: "PPT课件", uploader: "王老师", version: "v1.1" },
      { name: "第5章-综合案例.pptx", size: "3.9 MB", date: "2024-04-05", type: "PPT课件", uploader: "王老师", version: "v1.0" },
      { name: "第6章-拓展内容.pptx", size: "4.2 MB", date: "2024-04-15", type: "PPT课件", uploader: "王老师", version: "v1.0" },
      { name: "第7章-项目实战.pptx", size: "5.1 MB", date: "2024-04-25", type: "PPT课件", uploader: "王老师", version: "v1.0" }
    ],
    "lesson-plan": [
      { name: "第1章-教案.docx", size: "245 KB", date: "2024-02-20", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第2章-教案.docx", size: "268 KB", date: "2024-03-01", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第3章-教案.docx", size: "312 KB", date: "2024-03-10", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第4章-教案.docx", size: "289 KB", date: "2024-03-20", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第5章-教案.docx", size: "256 KB", date: "2024-04-01", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第6章-教案.docx", size: "278 KB", date: "2024-04-10", type: "Word文档", uploader: "王老师", version: "v1.0" },
      { name: "第7章-教案.docx", size: "295 KB", date: "2024-04-20", type: "Word文档", uploader: "王老师", version: "v1.0" }
    ],
    "videos": [
      { name: "课程导学视频.mp4", size: "125 MB", date: "2024-02-15", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "第1章-知识点讲解.mp4", size: "89 MB", date: "2024-02-25", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "第2章-知识点讲解.mp4", size: "95 MB", date: "2024-03-05", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "第3章-知识点讲解.mp4", size: "112 MB", date: "2024-03-15", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "第4章-实践演示.mp4", size: "156 MB", date: "2024-03-25", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "第5章-案例分析.mp4", size: "134 MB", date: "2024-04-05", type: "视频文件", uploader: "王老师", version: "v1.0" },
      { name: "综合项目演示.mp4", size: "178 MB", date: "2024-04-25", type: "视频文件", uploader: "王老师", version: "v1.0" }
    ],
    "cases": [
      { name: "案例1-基础应用.pdf", size: "1.2 MB", date: "2024-03-01", type: "PDF文档", uploader: "李老师", version: "v1.0" },
      { name: "案例2-进阶实践.pdf", size: "1.5 MB", date: "2024-03-10", type: "PDF文档", uploader: "李老师", version: "v1.0" },
      { name: "案例3-综合应用.pdf", size: "1.8 MB", date: "2024-03-20", type: "PDF文档", uploader: "李老师", version: "v1.0" },
      { name: "案例4-项目实战.pdf", size: "2.1 MB", date: "2024-04-01", type: "PDF文档", uploader: "李老师", version: "v1.0" },
      { name: "案例5-创新应用.pdf", size: "1.9 MB", date: "2024-04-15", type: "PDF文档", uploader: "李老师", version: "v1.0" }
    ],
    "homework": [
      { name: "第1章-课后习题.pdf", size: "456 KB", date: "2024-02-28", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "第2章-课后习题.pdf", size: "512 KB", date: "2024-03-08", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "第3章-课后习题.pdf", size: "589 KB", date: "2024-03-18", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "第4章-课后习题.pdf", size: "623 KB", date: "2024-03-28", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "第5章-课后习题.pdf", size: "567 KB", date: "2024-04-08", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "综合练习题.pdf", size: "789 KB", date: "2024-04-28", type: "PDF文档", uploader: "王老师", version: "v1.0" }
    ],
    "preview": [],
    "question-bank": [
      { name: "选择题库.xlsx", size: "2.3 MB", date: "2024-02-10", type: "Excel表格", uploader: "张老师", version: "v1.0" },
      { name: "填空题库.xlsx", size: "1.8 MB", date: "2024-02-10", type: "Excel表格", uploader: "张老师", version: "v1.0" },
      { name: "简答题库.docx", size: "1.2 MB", date: "2024-02-10", type: "Word文档", uploader: "张老师", version: "v1.0" },
      { name: "编程题库.xlsx", size: "2.1 MB", date: "2024-02-10", type: "Excel表格", uploader: "张老师", version: "v1.0" }
    ],
    "toolbox": [
      { name: "开发环境配置指南.pdf", size: "1.5 MB", date: "2024-02-01", type: "PDF文档", uploader: "技术团队", version: "v1.0" },
      { name: "常用工具软件包.zip", size: "256 MB", date: "2024-02-01", type: "压缩文件", uploader: "技术团队", version: "v2.0" },
      { name: "代码规范文档.pdf", size: "890 KB", date: "2024-02-01", type: "PDF文档", uploader: "技术团队", version: "v1.0" },
      { name: "调试技巧手册.pdf", size: "1.1 MB", date: "2024-02-01", type: "PDF文档", uploader: "技术团队", version: "v1.0" }
    ],
    "others": [
      { name: "课程参考资料.pdf", size: "3.2 MB", date: "2024-02-05", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "拓展阅读材料.pdf", size: "2.8 MB", date: "2024-02-05", type: "PDF文档", uploader: "王老师", version: "v1.0" },
      { name: "行业发展报告.pdf", size: "4.5 MB", date: "2024-02-05", type: "PDF文档", uploader: "王老师", version: "v1.0" }
    ]
  };

  // 评分数据
  const scoring = {
    selfEvaluation: {
      total: 85,
      indicators: [
        { name: "内容完整性", score: 90, weight: "30%" },
        { name: "格式规范性", score: 85, weight: "20%" },
        { name: "创新性", score: 80, weight: "25%" },
        { name: "实用性", score: 85, weight: "25%" }
      ]
    },
    professionalEvaluation: {
      total: 88,
      indicators: [
        { name: "专业深度", score: 90, weight: "35%" },
        { name: "知识准确性", score: 92, weight: "30%" },
        { name: "教学适用性", score: 85, weight: "20%" },
        { name: "资源质量", score: 85, weight: "15%" }
      ]
    },
    supervisionEvaluation: {
      total: 90,
      indicators: [
        { name: "教学目标达成", score: 92, weight: "30%" },
        { name: "教学方法创新", score: 88, weight: "25%" },
        { name: "学生反馈", score: 90, weight: "25%" },
        { name: "整体质量", score: 92, weight: "20%" }
      ]
    }
  };

  return {
    folders,
    files,
    scoring
  };
}

/**
 * 生成院系数据
 */
function generateDepartment(deptIndex, universityId, universityName) {
  const deptName = randomChoice(departmentNames);
  const description = `${deptName}是${universityName}的重点学院之一，拥有雄厚的师资力量和完善的教学设施。`;

  return {
    id: `dept-${deptIndex}`,
    universityId: universityId,
    name: deptName,
    type: 'department',
    description: description,
    isStarred: Math.random() > 0.8,
    children: []
  };
}

/**
 * 生成大学数据
 */
function generateUniversities() {
  const universities = [];

  // 1所大学
  const univ1 = {
    id: 'univ-1',
    name: '齐齐哈尔工程学院',
    type: 'university',
    description: '齐齐哈尔工程学院是经黑龙江省人民政府批准、国家教育部备案、具有高等学历教育招生资格的全日制民办普通本科院校。',
    isStarred: true,
    children: []
  };
  universities.push(univ1);

  // 5个工作坊
  for (let i = 71; i <= 75; i++) {
    const workshop = {
      id: `workshop-${i}`,
      name: `第${i}期四真三化工作坊`,
      type: 'university',
      description: `第${i}期四真三化工作坊致力于培养具有创新精神和实践能力的高素质人才。`,
      isStarred: Math.random() > 0.7,
      children: []
    };
    universities.push(workshop);
  }

  return universities;
}

// ==================== 主函数 ====================

function main() {
  console.log('='.repeat(80));
  console.log('开始生成完整的层级化Mock数据');
  console.log('='.repeat(80));
  console.log();

  // 生成大学/工作坊
  console.log('[1/4] 生成大学和工作坊数据...');
  const universities = generateUniversities();
  console.log(`✓ 已生成 ${universities.length} 个一级节点`);

  // 生成院系
  console.log('[2/4] 生成院系/班组数据...');
  const departments = [];
  let deptIndex = 1;

  universities.forEach(univ => {
    for (let i = 0; i < 3; i++) {
      const dept = generateDepartment(deptIndex, univ.id, univ.name);
      departments.push(dept);
      deptIndex++;
    }
  });
  console.log(`✓ 已生成 ${departments.length} 个院系/班组`);

  // 生成专业
  console.log('[3/5] 生成专业数据(包含完整字段)...');
  const majors = [];
  let majorIndex = 1;

  departments.forEach(dept => {
    for (let i = 0; i < 5; i++) {
      const major = generateMajor(majorIndex, dept.id, dept.name, i);
      majors.push(major);
      majorIndex++;
    }
  });
  console.log(`✓ 已生成 ${majors.length} 个专业`);

  // 生成课程
  console.log('[4/5] 生成课程数据(包含完整字段)...');
  const courses = [];
  let courseIndex = 1;

  majors.forEach(major => {
    for (let i = 0; i < 5; i++) {
      const course = generateCourse(courseIndex, major.id, major.departmentId, i);
      courses.push(course);
      courseIndex++;
    }
  });
  console.log(`✓ 已生成 ${courses.length} 门课程`);

  // 生成课程资源数据
  console.log('[5/5] 生成课程资源数据...');
  const courseResources = {};
  courses.forEach(course => {
    courseResources[course.id] = generateCourseResources(course.id);
  });
  console.log(`✓ 已生成 ${Object.keys(courseResources).length} 个课程的资源数据`);

  console.log();
  console.log('='.repeat(80));
  console.log('数据生成完成，开始写入文件...');
  console.log('='.repeat(80));
  console.log();

  // 确保mock-data目录存在
  const mockDataDir = path.join(__dirname, '..', 'mock-data');
  if (!fs.existsSync(mockDataDir)) {
    fs.mkdirSync(mockDataDir, { recursive: true });
  }

  // 写入文件
  const files = [
    { name: 'universities.json', data: universities },
    { name: 'departments.json', data: departments },
    { name: 'majors.json', data: majors },
    { name: 'courses.json', data: courses }
  ];

  files.forEach(file => {
    const filePath = path.join(mockDataDir, file.name);
    fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2), 'utf-8');
    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
    console.log(`✓ ${file.name} - ${file.data.length} 条记录 (${fileSize} KB)`);
  });

  // 写入课程资源数据
  const resourcesFilePath = path.join(mockDataDir, 'course-resources.json');
  fs.writeFileSync(resourcesFilePath, JSON.stringify(courseResources, null, 2), 'utf-8');
  const resourcesFileSize = (fs.statSync(resourcesFilePath).size / 1024).toFixed(2);
  console.log(`✓ course-resources.json - ${Object.keys(courseResources).length} 个课程 (${resourcesFileSize} KB)`);

  console.log();
  console.log('='.repeat(80));
  console.log('数据统计汇总:');
  console.log('='.repeat(80));
  console.log(`一级节点(大学/工作坊): ${universities.length}`);
  console.log(`二级节点(院系/班组): ${departments.length}`);
  console.log(`三级节点(专业): ${majors.length}`);
  console.log(`四级节点(课程): ${courses.length}`);
  console.log(`课程资源数据: ${Object.keys(courseResources).length} 个课程`);
  console.log();
  console.log('专业数据包含字段:');
  console.log('  - 基本信息: 代码、名称、层次、办学特色');
  console.log('  - 职业信息: 层级、四级方向、工作任务');
  console.log('  - 需求状况: 全部/全国紧缺/地方紧缺+省份');
  console.log('  - 培养目标: 完整描述');
  console.log('  - 毕业要求: 内容+指标点列表');
  console.log();
  console.log('课程数据包含字段:');
  console.log('  - 基本信息: 开课日期、课程类型、课程名称、课程性质');
  console.log('  - 教学目标: 目标内容+要点列表');
  console.log('  - 课点信息库: 课点内容+信息点(K/S/A)');
  console.log('  - 章节项目: 名称、理论学时、实践学时');
  console.log();
  console.log('课程资源数据包含:');
  console.log('  - 13个资源文件夹(人才培养方案、教学大纲、课件、教案、视频等)');
  console.log('  - 每个文件夹包含相应的文件列表');
  console.log('  - 3类评分数据(自我评分、专业评分、督导评分)');
  console.log('='.repeat(80));
  console.log();
  console.log('✅ 所有数据已成功生成并保存到 mock-data/ 目录');
  console.log();
  console.log('⚠️  请在浏览器控制台执行以下命令以加载新数据:');
  console.log('   localStorage.clear(); location.reload();');
  console.log();
}

// 执行主函数
main();

