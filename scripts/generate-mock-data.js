// 生成大量Mock数据的脚本
// 结构：1所学校 + 5个工作坊 -> 每个6个院系 -> 每个院系30个专业 -> 每个专业20-30门课程

const fs = require("fs")
const path = require("path")

// 工具函数：生成随机数
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 工具函数：从数组中随机选择
function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)]
}

// 数据模板
const workshopNames = [
  "第75期四真三化工作坊",
  "第76期教学创新工作坊",
  "第77期课程思政工作坊",
  "第78期数字化教学工作坊",
  "第79期教学质量提升工作坊",
]

const departmentNames = [
  "计算机科学与技术学院",
  "软件工程学院",
  "人工智能学院",
  "网络空间安全学院",
  "数据科学学院",
  "机械工程学院",
  "电气工程学院",
  "自动化学院",
  "材料科学学院",
  "化学工程学院",
  "土木工程学院",
  "建筑学院",
  "环境工程学院",
  "能源工程学院",
  "交通运输学院",
  "经济管理学院",
  "工商管理学院",
  "会计学院",
  "金融学院",
  "国际贸易学院",
  "外国语学院",
  "新闻传播学院",
  "艺术设计学院",
  "音乐学院",
  "体育学院",
  "数学学院",
  "物理学院",
  "化学学院",
  "生物学院",
  "医学院",
]

const majorPrefixes = [
  "软件工程",
  "计算机科学与技术",
  "人工智能",
  "数据科学与大数据技术",
  "网络工程",
  "信息安全",
  "物联网工程",
  "数字媒体技术",
  "智能科学与技术",
  "电子信息工程",
  "通信工程",
  "自动化",
  "机械设计制造及其自动化",
  "电气工程及其自动化",
  "车辆工程",
  "土木工程",
  "建筑学",
  "工程管理",
  "工商管理",
  "市场营销",
  "会计学",
  "财务管理",
  "金融学",
  "国际经济与贸易",
  "英语",
  "日语",
  "新闻学",
  "广告学",
  "视觉传达设计",
  "环境设计",
]

const coursePrefixes = [
  "数据结构与算法",
  "操作系统",
  "计算机网络",
  "数据库原理",
  "软件工程",
  "人工智能基础",
  "机器学习",
  "深度学习",
  "计算机视觉",
  "自然语言处理",
  "Web开发技术",
  "移动应用开发",
  "云计算技术",
  "大数据技术",
  "区块链技术",
  "信息安全",
  "密码学",
  "网络安全",
  "系统分析与设计",
  "项目管理",
  "高等数学",
  "线性代数",
  "概率论与数理统计",
  "离散数学",
  "数字逻辑",
  "编译原理",
  "计算机组成原理",
  "微机原理",
  "嵌入式系统",
  "物联网技术",
]

const courseTypes = ["必修", "选修", "实践"]
const semesters = ["第一学期", "第二学期", "第三学期", "第四学期", "第五学期", "第六学期", "第七学期", "第八学期"]

// 生成数据
console.log("[v0] 开始生成Mock数据...")

const universities = []
const departments = []
const majors = []
const courses = []

// 1. 生成1所学校
const university = {
  id: "univ-1",
  name: "齐齐哈尔工程学院",
  type: "university",
  isStarred: true,
  metadata: {
    description: "齐齐哈尔工程学院是一所综合性工程院校",
    address: "黑龙江省齐齐哈尔市",
    established: "1958",
  },
}
universities.push(university)

// 2. 生成5个工作坊
workshopNames.forEach((name, index) => {
  universities.push({
    id: `workshop-${index + 1}`,
    name: name,
    type: "university",
    isStarred: false,
    metadata: {
      description: `${name}专注于教学方法创新与实践`,
      type: "工作坊",
      period: `2024年第${index + 1}期`,
    },
  })
})

console.log(`[v0] 生成了 ${universities.length} 个一级节点（学校+工作坊）`)

// 3. 为每个一级节点生成5个院系
let deptCounter = 1
universities.forEach((univ) => {
  for (let i = 0; i < 5; i++) {
    const deptName = departmentNames[(deptCounter - 1) % departmentNames.length]
    departments.push({
      id: `dept-${deptCounter}`,
      universityId: univ.id,
      name: deptName,
      type: "department",
      metadata: {
        description: `${deptName}致力于培养专业领域的高级人才`,
        dean: `${String.fromCharCode(65 + (deptCounter % 26))}教授`,
        studentCount: randomInt(500, 2000),
      },
    })
    deptCounter++
  }
})

console.log(`[v0] 生成了 ${departments.length} 个二级节点（院系）`)

// 4. 为每个院系生成30个专业
let majorCounter = 1
departments.forEach((dept) => {
  for (let i = 0; i < 30; i++) {
    const majorName = `${majorPrefixes[majorCounter % majorPrefixes.length]}${i > 0 ? `(方向${i})` : ""}`
    majors.push({
      id: `major-${majorCounter}`,
      departmentId: dept.id,
      name: majorName,
      type: "major",
      metadata: {
        description: `${majorName}专业培养具有扎实理论基础和实践能力的专业人才`,
        duration: "4年",
        degree: randomChoice(["工学学士", "理学学士", "管理学学士", "文学学士"]),
        studentCount: randomInt(50, 200),
      },
    })
    majorCounter++
  }
})

console.log(`[v0] 生成了 ${majors.length} 个三级节点（专业）`)

// 5. 为每个专业生成20-30门课程
let courseCounter = 1
majors.forEach((major) => {
  const courseCount = randomInt(20, 30)
  for (let i = 0; i < courseCount; i++) {
    const courseName = `${coursePrefixes[courseCounter % coursePrefixes.length]}${i > 0 ? ` ${String.fromCharCode(65 + (i % 26))}` : ""}`
    const credits = randomChoice([2, 3, 4, 5])
    const hours = credits * 16

    courses.push({
      id: `course-${courseCounter}`,
      majorId: major.id,
      name: courseName,
      type: "course",
      metadata: {
        code: `CS${1000 + courseCounter}`,
        credits: credits,
        hours: hours,
        semester: randomChoice(semesters),
        courseType: randomChoice(courseTypes),
        coursePoints: [
          `掌握${courseName}的基本概念和原理`,
          `能够运用${courseName}解决实际问题`,
          `培养${courseName}相关的实践能力`,
        ],
        teachingObjectives: [
          `理解${courseName}的核心知识体系`,
          `掌握${courseName}的基本方法和技能`,
          `培养创新思维和问题解决能力`,
        ],
        chapters: [
          { id: 1, title: "第一章：概述", hours: Math.floor(hours * 0.1) },
          { id: 2, title: "第二章：基础理论", hours: Math.floor(hours * 0.2) },
          { id: 3, title: "第三章：核心技术", hours: Math.floor(hours * 0.3) },
          { id: 4, title: "第四章：实践应用", hours: Math.floor(hours * 0.25) },
          { id: 5, title: "第五章：综合案例", hours: Math.floor(hours * 0.15) },
        ],
        resources: [
          { type: "教材", name: `${courseName}教程`, author: "张三" },
          { type: "参考书", name: `${courseName}实践指南`, author: "李四" },
        ],
        teachingMaterials: [
          { type: "PPT", count: 10 },
          { type: "视频", count: 5 },
          { type: "习题", count: 20 },
        ],
      },
    })
    courseCounter++
  }
})

console.log(`[v0] 生成了 ${courses.length} 个四级节点（课程）`)

// 6. 写入文件
const mockDataDir = path.join(process.cwd(), "mock-data")

if (!fs.existsSync(mockDataDir)) {
  fs.mkdirSync(mockDataDir, { recursive: true })
}

fs.writeFileSync(path.join(mockDataDir, "universities.json"), JSON.stringify(universities, null, 2))

fs.writeFileSync(path.join(mockDataDir, "departments.json"), JSON.stringify(departments, null, 2))

fs.writeFileSync(path.join(mockDataDir, "majors.json"), JSON.stringify(majors, null, 2))

fs.writeFileSync(path.join(mockDataDir, "courses.json"), JSON.stringify(courses, null, 2))

console.log("[v0] Mock数据生成完成！")
console.log(`[v0] 统计：`)
console.log(`  - 一级节点（学校+工作坊）: ${universities.length}`)
console.log(`  - 二级节点（院系）: ${departments.length}`)
console.log(`  - 三级节点（专业）: ${majors.length}`)
console.log(`  - 四级节点（课程）: ${courses.length}`)
console.log(`[v0] 总节点数: ${universities.length + departments.length + majors.length + courses.length}`)
