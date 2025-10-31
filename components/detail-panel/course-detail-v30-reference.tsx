"use client"

import {
  Building2,
  GraduationCap,
  BookOpen,
  FileText,
  Clock,
  Award,
  User,
  FolderOpen,
  BarChart3,
  ClipboardCheck,
  Download,
  MessageSquare,
  TrendingUp,
  Folder,
  ChevronRight,
  File,
  ArrowLeft,
  Eye,
  Star,
  Users,
  BookMarked,
  Pencil,
  Plus,
  X,
  Check,
  Loader2,
  Trash2,
  Search,
  RotateCcw,
  Calendar,
  Filter,
  Grid3x3,
  Target,
  Edit,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, // Added AlertDialog imports
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch" // Import Switch
import { Card, CardContent } from "@/components/ui/card" // Import Card components

import { AddMajorForm } from "./add-major-form"
import { AddCourseForm } from "./add-course-form"

// Mock function for success notification
const showSuccess = (message: string) => {
  console.log(`Success: ${message}`)
  // In a real app, you'd use a toast library here
}

interface DetailPanelProps {
  node: any
  treeData: any
  onNodeSelect: (node: any) => void
  onAddDepartment?: (universityId: string, newDepartment: any) => void
  onAddMajor?: (departmentId: string, newMajor: any) => void // Add onAddMajor prop
  onUpdateNode?: (nodeId: string, updates: any) => void
  onDeleteNode?: (nodeId: string) => void
  onSetCurrentSchool?: (schoolId: string) => void // Added prop based on update
}

interface FileData {
  name: string
  size: string
  date: string
  type: string
  uploader: string
  version: string
}

export function DetailPanel({
  node,
  treeData,
  onNodeSelect,
  onAddDepartment,
  onAddMajor, // Destructure onAddMajor prop
  onUpdateNode,
  onDeleteNode,
  onSetCurrentSchool, // Added prop based on update
}: DetailPanelProps) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [newDeptName, setNewDeptName] = useState("")
  const [newDeptDesc, setNewDeptDesc] = useState("")
  const [newDeptDirector, setNewDeptDirector] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditingDepartment, setIsEditingDepartment] = useState(false)
  const [newMajorName, setNewMajorName] = useState("")
  const [newMajorDesc, setNewMajorDesc] = useState("")
  const [newMajorDirector, setNewMajorDirector] = useState("")
  const [isMajorDialogOpen, setIsMajorDialogOpen] = useState(false)

  const [isAddingMajor, setIsAddingMajor] = useState(false)
  const [isEditingMajor, setIsEditingMajor] = useState(false)

  const [isAddingCourse, setIsAddingCourse] = useState(false)
  const [isEditingCourse, setIsEditingCourse] = useState(false)

  const [isEditingMatrix, setIsEditingMatrix] = useState(false)
  const [matrixSupportLevels, setMatrixSupportLevels] = useState<Record<string, string>>({})
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)

  const [isEditingCourseMatrix, setIsEditingCourseMatrix] = useState(false)
  const [courseMatrixData, setCourseMatrixData] = useState<
    Record<string, Array<{ id: string; name: string; support: "strong" | "weak" }>>
  >({})
  const [isSavingCourseMatrix, setIsSavingCourseMatrix] = useState(false)
  const [isAddCoursePointDialogOpen, setIsAddCoursePointDialogOpen] = useState(false)
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    objectiveId: string
    pointId: string
    chapterId: string
  } | null>(null)
  const [selectedCoursePoints, setSelectedCoursePoints] = useState<Record<string, "strong" | "weak">>({})

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserName, setNewUserName] = useState("") // Fixed redeclaration and undeclared variable
  const [newUserRole, setNewUserRole] = useState("专业管理员")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [showAllUsers, setShowAllUsers] = useState(false)

  const [users, setUsers] = useState<
    Array<{
      id: string
      name: string
      role: string
      email: string
      enabled: boolean
    }>
  >([])

  const [showMyCoursesOnly, setShowMyCoursesOnly] = useState(false)
  const [showCourseSearch, setShowCourseSearch] = useState(false)
  const [courseListSearch, setCourseListSearch] = useState("")
  const [teachingObjectivesSearch, setTeachingObjectivesSearch] = useState("")
  const [coursePointsSearch, setCoursePointsSearch] = useState("")
  const [chaptersSearch, setChaptersSearch] = useState("")

  const [projectMatrixData, setProjectMatrixData] = useState<
    Record<
      string,
      Record<string, { learningMethod: string; teachingMethod: string; output: string; weeks: string; hours: string }>
    >
  >({})
  const [isEditingProjectMatrix, setIsEditingProjectMatrix] = useState(false)
  const [isSavingProjectMatrix, setIsSavingProjectMatrix] = useState(false)
  const [taskObjectivesDialogOpen, setTaskObjectivesDialogOpen] = useState(false)
  const [selectedChapterForTasks, setSelectedChapterForTasks] = useState<string | null>(null)
  const [chapterTaskObjectives, setChapterTaskObjectives] = useState<
    Record<string, Array<{ id: string; objective: string; standard: string }>>
  >({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [newTaskObjective, setNewTaskObjective] = useState("")
  const [newTaskStandard, setNewTaskStandard] = useState("")

  const [ksaDialogOpen, setKsaDialogOpen] = useState(false)
  const [selectedKsaCell, setSelectedKsaCell] = useState<{
    chapterId: string
    coursePointId: string
    taskId: string
  } | null>(null)
  const [ksaData, setKsaData] = useState<Record<string, { knowledge: string; skills: string; attitude: string }>>({})

  // Declare handleOpenKsaDialog and handleSaveKsa here
  const handleOpenKsaDialog = (chapterId: string, coursePointId: string, taskId: string) => {
    setSelectedKsaCell({ chapterId, coursePointId, taskId })
    setKsaDialogOpen(true)
  }

  const handleSaveKsa = () => {
    if (selectedKsaCell && onUpdateNode) {
      // In a real application, you would send ksaData to your backend here.
      // For now, we'll just close the dialog.
      console.log(
        "Saving KSA data:",
        ksaData[`${selectedKsaCell.chapterId}-${selectedKsaCell.coursePointId}-${selectedKsaCell.taskId}`],
      )
    }
    setKsaDialogOpen(false)
    setSelectedKsaCell(null)
  }

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      const savedData = localStorage.getItem(`courseMatrix-${node.id}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setCourseMatrixData(parsed)
        } catch (error) {
          console.error("Failed to load course matrix data:", error)
        }
      } else if (node?.metadata?.courseMatrixData) {
        setCourseMatrixData(node.metadata.courseMatrixData)
      }
    }
  }, [node?.id, node?.type])

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      const savedProjectMatrix = localStorage.getItem(`projectMatrix-${node.id}`)
      const savedTaskObjectives = localStorage.getItem(`chapterTaskObjectives-${node.id}`)
      if (savedProjectMatrix) {
        try {
          setProjectMatrixData(JSON.parse(savedProjectMatrix))
        } catch (error) {
          console.error("Failed to load project matrix data:", error)
        }
      }
      if (savedTaskObjectives) {
        try {
          setChapterTaskObjectives(JSON.parse(savedTaskObjectives))
        } catch (error) {
          console.error("Failed to load task objectives data:", error)
        }
      }
    }
  }, [node?.id, node?.type])

  useEffect(() => {
    if (node && node.type === "major") {
      const storageKey = `users_${node.id}`
      const storedUsers = localStorage.getItem(storageKey)
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers))
      } else {
        // Initialize with mock data
        const initialUsers = [
          { id: "1", name: "李教授", role: "专业管理员", email: "li@example.com", enabled: true },
          { id: "2", name: "王老师", role: "任课教师", email: "wang@example.com", enabled: true },
          { id: "3", name: "张老师", role: "任课教师", email: "zhang@example.com", enabled: true },
          { id: "4", name: "刘老师", role: "任课教师", email: "liu@example.com", enabled: true },
          { id: "5", name: "陈老师", role: "教学督导", email: "chen@example.com", enabled: false },
        ]
        setUsers(initialUsers)
        localStorage.setItem(storageKey, JSON.stringify(initialUsers))
      }
    }
  }, [node])

  useEffect(() => {
    if (node && node.type === "major") {
      const storageKey = `showMyCourses_${node.id}`
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        setShowMyCoursesOnly(stored === "true")
      }
    }
  }, [node])

  const handleMyCoursesToggle = (checked: boolean) => {
    setShowMyCoursesOnly(checked)
    if (node && node.type === "major") {
      const storageKey = `showMyCourses_${node.id}`
      localStorage.setItem(storageKey, checked.toString())
    }
  }

  useEffect(() => {
    if (!isEditingMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveMatrix(true) // Pass true to indicate auto-save
    }, 10000) // 10 seconds

    return () => clearInterval(autoSaveInterval)
  }, [isEditingMatrix, matrixSupportLevels])

  useEffect(() => {
    if (!isEditingCourseMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveCourseMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingCourseMatrix, courseMatrixData])

  useEffect(() => {
    if (!isEditingProjectMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveProjectMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingProjectMatrix, projectMatrixData, chapterTaskObjectives])

  const handleOpenTaskObjectivesDialog = (chapterId: string) => {
    setSelectedChapterForTasks(chapterId)
    setTaskObjectivesDialogOpen(true)
  }

  const handleAddTaskObjective = () => {
    if (!selectedChapterForTasks || !newTaskObjective.trim() || !newTaskStandard.trim()) return

    const newTask = {
      id: `task-${Date.now()}`,
      objective: newTaskObjective,
      standard: newTaskStandard,
    }

    setChapterTaskObjectives((prev) => ({
      ...prev,
      [selectedChapterForTasks]: [...(prev[selectedChapterForTasks] || []), newTask],
    }))

    setNewTaskObjective("")
    setNewTaskStandard("")
  }

  const handleEditTaskObjective = (taskId: string) => {
    if (!selectedChapterForTasks) return
    const tasks = chapterTaskObjectives[selectedChapterForTasks] || []
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      setEditingTaskId(taskId)
      setNewTaskObjective(task.objective)
      setNewTaskStandard(task.standard)
    }
  }

  const handleUpdateTaskObjective = () => {
    if (!selectedChapterForTasks || !editingTaskId || !newTaskObjective.trim() || !newTaskStandard.trim()) return

    setChapterTaskObjectives((prev) => ({
      ...prev,
      [selectedChapterForTasks]: (prev[selectedChapterForTasks] || []).map((task) =>
        task.id === editingTaskId ? { ...task, objective: newTaskObjective, standard: newTaskStandard } : task,
      ),
    }))

    setEditingTaskId(null)
    setNewTaskObjective("")
    setNewTaskStandard("")
  }

  const handleDeleteTaskObjective = (taskId: string) => {
    if (!selectedChapterForTasks) return

    setChapterTaskObjectives((prev) => ({
      ...prev,
      [selectedChapterForTasks]: (prev[selectedChapterForTasks] || []).filter((task) => task.id !== taskId),
    }))
  }

  const handleSaveProjectMatrix = async (isAutoSave = false) => {
    setIsSavingProjectMatrix(true)

    if (node?.id) {
      localStorage.setItem(`projectMatrix-${node.id}`, JSON.stringify(projectMatrixData))
      localStorage.setItem(`chapterTaskObjectives-${node.id}`, JSON.stringify(chapterTaskObjectives))
    }

    if (onUpdateNode) {
      onUpdateNode(node.id, {
        metadata: {
          ...node.metadata,
          projectMatrixData,
          chapterTaskObjectives,
        },
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSavingProjectMatrix(false)

    if (!isAutoSave) {
      setIsEditingProjectMatrix(false)
    }
  }

  const handleCancelProjectMatrix = () => {
    if (node?.metadata?.projectMatrixData) {
      setProjectMatrixData(node.metadata.projectMatrixData)
    } else {
      setProjectMatrixData({})
    }
    if (node?.metadata?.chapterTaskObjectives) {
      setChapterTaskObjectives(node.metadata.chapterTaskObjectives)
    } else {
      setChapterTaskObjectives({})
    }
    setIsEditingProjectMatrix(false)
  }

  const handleSupportLevelChange = (reqId: number, indicatorIdx: number, value: string) => {
    const key = `${reqId}-${indicatorIdx}`
    setMatrixSupportLevels((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveMatrix = async (isAutoSave = false) => {
    setIsSavingMatrix(true)

    if (onUpdateNode) {
      onUpdateNode(node.id, {
        metadata: {
          ...node.metadata,
          matrixSupportLevels,
        },
      })
    }

    // Simulate async save operation
    await new Promise((resolve) => setTimeout(resolve, 500))

    setIsSavingMatrix(false)

    // Only exit edit mode if it's a manual save
    if (!isAutoSave) {
      setIsEditingMatrix(false)
    }
  }

  const handleSaveCourseMatrix = async (isAutoSave = false) => {
    setIsSavingCourseMatrix(true)

    // Save to localStorage
    if (node?.id) {
      localStorage.setItem(`courseMatrix-${node.id}`, JSON.stringify(courseMatrixData))
    }

    if (onUpdateNode) {
      onUpdateNode(node.id, {
        metadata: {
          ...node.metadata,
          courseMatrixData,
        },
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSavingCourseMatrix(false)

    if (!isAutoSave) {
      setIsEditingCourseMatrix(false)
    }
  }

  const handleCancelMatrix = () => {
    // Reset to original values
    if (node?.metadata?.matrixSupportLevels) {
      setMatrixSupportLevels(node.metadata.matrixSupportLevels)
    } else {
      setMatrixSupportLevels({})
    }
    setIsEditingMatrix(false)
  }

  const handleCancelCourseMatrix = () => {
    if (node?.metadata?.courseMatrixData) {
      setCourseMatrixData(node.metadata.courseMatrixData)
    } else {
      setCourseMatrixData({})
    }
    setIsEditingCourseMatrix(false)
  }

  const handleAddCoursePoint = (objectiveId: string, pointId: string, chapterId: string) => {
    setSelectedMatrixCell({ objectiveId, pointId, chapterId })
    setSelectedCoursePoints({}) // Clear previous selections
    setIsAddCoursePointDialogOpen(true)
  }

  const handleToggleCoursePointSelection = (coursePointId: string, support: "strong" | "weak") => {
    setSelectedCoursePoints((prev) => {
      const newSelections = { ...prev }
      // If already selected with same support, remove it
      if (newSelections[coursePointId] === support) {
        delete newSelections[coursePointId]
      } else {
        // Otherwise, set or update the support level
        newSelections[coursePointId] = support
      }
      return newSelections
    })
  }

  const handleConfirmCoursePointSelection = () => {
    if (!selectedMatrixCell || Object.keys(selectedCoursePoints).length === 0) {
      setIsAddCoursePointDialogOpen(false)
      setSelectedMatrixCell(null)
      return
    }

    const key = `${selectedMatrixCell.objectiveId}-${selectedMatrixCell.pointId}-${selectedMatrixCell.chapterId}`

    const coursePointsMap = new Map()
    if (node?.metadata?.coursePoints) {
      node.metadata.coursePoints.forEach((cp: any, idx: number) => {
        const id = cp.id || `cp-${idx}`
        const title = cp.title || cp.content || `课点 ${idx + 1}`
        const description = cp.description || cp.content || ""
        coursePointsMap.set(id, { title, description })
      })
    }

    setCourseMatrixData((prev) => {
      const existing = prev[key] || []
      const newPoints = Object.entries(selectedCoursePoints).map(([id, support]) => {
        const pointData = coursePointsMap.get(id) || { title: id, description: "" }
        return {
          id,
          name: pointData.title,
          description: pointData.description,
          support,
        }
      })

      // Merge with existing, avoiding duplicates
      const merged = [...existing]
      newPoints.forEach((newPoint) => {
        const existingIndex = merged.findIndex((cp) => cp.id === newPoint.id)
        if (existingIndex >= 0) {
          // Update existing
          merged[existingIndex] = newPoint
        } else {
          // Add new
          merged.push(newPoint)
        }
      })

      return {
        ...prev,
        [key]: merged,
      }
    })

    setIsAddCoursePointDialogOpen(false)
    setSelectedMatrixCell(null)
    setSelectedCoursePoints({})
  }

  const handleRemoveCoursePoint = (objectiveId: string, pointId: string, chapterId: string, coursePointId: string) => {
    const key = `${objectiveId}-${pointId}-${chapterId}`
    setCourseMatrixData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((cp) => cp.id !== coursePointId),
    }))
  }

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) return text
    const parts = text.split(new RegExp(`(${keyword})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  const handleSaveUser = () => {
    if (!node || !newUserEmail || !newUserName) return

    const storageKey = `users_${node.id}`
    let updatedUsers

    if (editingUserId) {
      // Edit existing user
      updatedUsers = users.map((user) =>
        user.id === editingUserId ? { ...user, name: newUserName, email: newUserEmail, role: newUserRole } : user,
      )
      showSuccess("用户信息已更新")
    } else {
      // Add new user
      const newUser = {
        id: Date.now().toString(),
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        enabled: true,
      }
      updatedUsers = [...users, newUser]
      showSuccess("用户添加成功")
    }

    setUsers(updatedUsers)
    localStorage.setItem(storageKey, JSON.stringify(updatedUsers))

    // Reset form
    setIsAddUserDialogOpen(false)
    setNewUserEmail("")
    setNewUserName("")
    setNewUserRole("专业管理员")
    setEditingUserId(null)
  }

  const handleToggleUserEnabled = (userId: string) => {
    if (!node) return

    const storageKey = `users_${node.id}`
    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, enabled: !user.enabled } : user))
    setUsers(updatedUsers)
    localStorage.setItem(storageKey, JSON.stringify(updatedUsers))
  }

  const handleEditUser = (user: (typeof users)[0]) => {
    setEditingUserId(user.id)
    setNewUserEmail(user.email)
    setNewUserName(user.name)
    setNewUserRole(user.role)
    setIsAddUserDialogOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    if (!node) return

    const storageKey = `users_${node.id}`
    const updatedUsers = users.filter((user) => user.id !== userId)
    setUsers(updatedUsers)
    localStorage.setItem(storageKey, JSON.stringify(updatedUsers))
    showSuccess("用户已删除")
  }

  const handleResetPassword = (userId: string) => {
    if (!node) return
    // Here you would typically call an API to reset the password
    // For now, we'll just show a success message
    showSuccess("密码重置成功，新密码已发送至用户邮箱")
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()),
  )

  const displayedUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, 10)

  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">选择一个节点查看详情</p>
          <p className="text-sm mt-2">点击左侧树形结构中的任意节点</p>
        </div>
      </div>
    )
  }

  const getIcon = () => {
    switch (node.type) {
      case "university":
        return Building2
      case "department":
        return GraduationCap
      case "major":
        return BookOpen
      case "course":
        return FileText
      default:
        return FileText
    }
  }

  const Icon = getIcon()

  const getTypeLabel = () => {
    switch (node.type) {
      case "university":
        return node.name.includes("工作坊") ? "工作坊" : "学校"
      case "department":
        return "院系"
      case "major":
        return "专业"
      case "course":
        return "课程"
      default:
        return ""
    }
  }

  const courseResources = [
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
    { id: "others", name: "其他课程资源", count: 5 },
  ]

  const mockFiles: Record<string, Array<FileData>> = {
    "talent-plan": [
      {
        name: "2024级人才培养方案.pdf",
        size: "2.3 MB",
        date: "2024-03-15",
        type: "PDF文档",
        uploader: "张教授",
        version: "v2.1",
      },
      {
        name: "2023级人才培养方案.pdf",
        size: "2.1 MB",
        date: "2023-09-01",
        type: "PDF文档",
        uploader: "张教授",
        version: "v2.0",
      },
      {
        name: "培养方案修订说明.docx",
        size: "156 KB",
        date: "2024-03-10",
        type: "Word文档",
        uploader: "李主任",
        version: "v1.0",
      },
    ],
    syllabus: [
      {
        name: "数据库基础课程大纲.pdf",
        size: "1.2 MB",
        date: "2024-02-20",
        type: "PDF文档",
        uploader: "王老师",
        version: "v1.5",
      },
    ],
    "course-intro": [],
    analysis: [
      {
        name: "第一学期学情分析.pdf",
        size: "890 KB",
        date: "2024-01-15",
        type: "PDF文档",
        uploader: "王老师",
        version: "v1.0",
      },
      {
        name: "第二学期学情分析.pdf",
        size: "920 KB",
        date: "2024-06-20",
        type: "PDF文档",
        uploader: "王老师",
        version: "v1.0",
      },
      {
        name: "学生成绩分布图.xlsx",
        size: "245 KB",
        date: "2024-06-25",
        type: "Excel表格",
        uploader: "王老师",
        version: "v1.0",
      },
      {
        name: "学习行为分析报告.pdf",
        size: "1.5 MB",
        date: "2024-06-30",
        type: "PDF文档",
        uploader: "王老师",
        version: "v1.2",
      },
      {
        name: "课程反馈汇总.docx",
        size: "380 KB",
        date: "2024-07-05",
        type: "Word文档",
        uploader: "王老师",
        version: "v1.0",
      },
    ],
    courseware: [
      {
        name: "第1章-数据库概述.pptx",
        size: "3.2 MB",
        date: "2024-02-25",
        type: "PPT课件",
        uploader: "王老师",
        version: "v1.3",
      },
      {
        name: "第2章-关系数据库.pptx",
        size: "4.1 MB",
        date: "2024-03-05",
        type: "PPT课件",
        uploader: "王老师",
        version: "v1.2",
      },
      {
        name: "第3章-SQL语言基础.pptx",
        size: "5.3 MB",
        date: "2024-03-15",
        type: "PPT课件",
        uploader: "王老师",
        version: "v1.4",
      },
      {
        name: "第4章-数据查询.pptx",
        size: "4.8 MB",
        date: "2024-03-25",
        type: "PPT课件",
        uploader: "王老师",
        version: "v1.1",
      },
      {
        name: "第5章-数据更新.pptx",
        size: "3.9 MB",
        date: "2024-04-05",
        type: "PPT课件",
        uploader: "王老师",
        version: "v1.0",
      },
    ],
  }

  const mockScoring = {
    selfEvaluation: {
      total: 85,
      indicators: [
        { name: "内容完整性", score: 90, weight: "30%" },
        { name: "格式规范性", score: 85, weight: "20%" },
        { name: "创新性", score: 80, weight: "25%" },
        { name: "实用性", score: 85, weight: "25%" },
      ],
    },
    professionalEvaluation: {
      total: 88,
      indicators: [
        { name: "专业深度", score: 90, weight: "35%" },
        { name: "知识准确性", score: 92, weight: "30%" },
        { name: "教学适用性", score: 85, weight: "20%" },
        { name: "资源质量", score: 85, weight: "15%" },
      ],
    },
    supervisionEvaluation: {
      total: 90,
      indicators: [
        { name: "教学目标达成", score: 92, weight: "30%" },
        { name: "教学方法创新", score: 88, weight: "25%" },
        { name: "学生反馈", score: 90, weight: "25%" },
        { name: "整体质量", score: 92, weight: "20%" },
      ],
    },
  }

  const mockMajorDetails = {
    code: "080901",
    name: "计算机科学与技术",
    level: "本科",
    educationalFeatures:
      "本专业注重理论与实践相结合，培养具有扎实计算机基础理论和较强工程实践能力的高素质应用型人才。专业特色包括：校企合作深度融合、项目驱动教学模式、国际化培养视野。",
    director: "李教授",
    careerInfo: [
      {
        id: "1",
        level: "中级",
        direction: {
          category1: "信息技术",
          category2: "软件开发",
          category3: "前端开发",
          category4: "Web前端",
        },
        tasks: "负责Web应用的前端开发，包括页面设计、交互实现、性能优化等工作。",
      },
      {
        id: "2",
        level: "高级",
        direction: {
          category1: "信息技术",
          category2: "软件开发",
          category3: "后端开发",
          category4: "Java开发",
        },
        tasks: "负责后端系统架构设计、核心业务逻辑开发、数据库设计与优化、系统性能调优等工作。",
      },
    ],
    demandStatus: "地方紧缺",
    selectedProvince: "浙江省",
    trainingObjectives:
      "本专业培养德智体美劳全面发展，掌握计算机科学与技术的基本理论、基本知识和基本技能，具有较强的实践能力和创新精神，能在IT企业、政府机关、科研院所等单位从事计算机应用系统的设计、开发、维护和管理等工作的高素质应用型人才。",
    graduationRequirements: [
      {
        id: 1,
        content: "思想道德修养：具备良好的思想道德素质和职业道德",
        indicators: ["树立正确的世界观、人生观、价值观", "具有良好的职业道德和社会责任感", "遵守法律法规和职业规范"],
      },
      {
        id: 2,
        content: "专业知识掌握：掌握计算机科学与技术的基本理论和专业知识",
        indicators: [
          "掌握计算机科学的基本理论和基础知识",
          "掌握计算机系统的分析和设计方法",
          "了解计算机科学与技术的发展动态",
        ],
      },
      {
        id: 3,
        content: "实践能力：具备软件开发、系统设计与实现的实践能力",
        indicators: ["具有软件设计与开发的基本能力", "具有计算机系统集成与应用的能力", "具有解决实际工程问题的能力"],
      },
      {
        id: 4,
        content: "创新能力：具有创新意识和持续学习能力",
        indicators: ["具有创新思维和创新意识", "具有自主学习和终身学习的能力", "具有适应技术发展的能力"],
      },
      {
        id: 5,
        content: "团队协作：具备良好的沟通能力和团队协作精神",
        indicators: ["具有良好的语言表达和文字表达能力", "具有团队协作和组织管理能力", "具有跨文化交流和国际视野"],
      },
    ],
    careerDirection: "软件工程师、系统架构师、数据库管理员、前端开发工程师、后端开发工程师、全栈工程师",
    careerDemand:
      "随着信息技术的快速发展，计算机科学与技术专业人才需求持续增长。企业对具备扎实理论基础和实践能力的毕业生需求旺盛，特别是在人工智能、大数据、云计算等新兴领域。",
    jobResponsibilities:
      "负责软件系统的需求分析、设计、开发、测试和维护；参与技术方案的制定和评审；解决系统运行中的技术问题；编写技术文档；参与团队技术交流和知识分享。",
  }

  const formatCount = (count: number) => {
    if (count === 0) return "0"
    if (count > 99) return "99+"
    return count.toString()
  }

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId)
    setSelectedFile(null)
  }

  const handleBackToFolders = () => {
    setCurrentFolder(null)
    setSelectedFile(null)
  }

  const handleFileClick = (file: FileData) => {
    setSelectedFile(file)
  }

  const handleBackToFiles = () => {
    setSelectedFile(null)
  }

  const getCurrentFolderData = () => {
    if (!currentFolder) return null
    const folder = courseResources.find((r) => r.id === currentFolder)
    const files = mockFiles[currentFolder] || []
    return { folder, files }
  }

  const countChildren = (node: any, type: string): number => {
    if (!node.children) return 0
    let count = 0
    for (const child of node.children) {
      if (child.type === type) count++
      count += countChildren(child, type)
    }
    return count
  }

  const handleCreateDepartment = () => {
    if (!newDeptName.trim() || !onAddDepartment) return

    if (isEditingDepartment && onUpdateNode) {
      onUpdateNode(node.id, {
        name: newDeptName,
        description: newDeptDesc || undefined,
      })
    } else if (onAddDepartment) {
      onAddDepartment(node.id, {
        name: newDeptName,
        type: "department" as const,
        description: newDeptDesc || undefined,
        children: [],
      })
    }

    // Reset form and close dialog
    setNewDeptName("")
    setNewDeptDesc("")
    setNewDeptDirector("")
    setIsDialogOpen(false)
    setIsEditingDepartment(false)
  }

  const handleEditDepartment = () => {
    setNewDeptName(node.name)
    setNewDeptDesc(node.description || "")
    setNewDeptDirector("") // Director is not editable in this version
    setIsEditingDepartment(true)
    setIsDialogOpen(true)
  }

  const handleCreateMajor = () => {
    if (!newMajorName.trim() || !onAddMajor) return

    onAddMajor(node.id, {
      name: newMajorName,
      type: "major" as const,
      description: newMajorDesc || undefined,
      children: [],
    })

    // Reset form and close dialog
    setNewMajorName("")
    setNewMajorDesc("")
    setNewMajorDirector("")
    setIsMajorDialogOpen(false)
  }

  const handleAddMajorFormSubmit = (majorData: any) => {
    if (onAddMajor) {
      onAddMajor(node.id, majorData)
      setIsAddingMajor(false)
    }
  }

  const handleEditMajorFormSubmit = (majorData: any) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, majorData)
      setIsEditingMajor(false)
    }
  }

  const handleCreateCourse = (courseData: any) => {
    if (node) {
      const updatedNode = {
        ...node,
        children: [...(node.children || []), { ...courseData, id: Date.now().toString() }],
      }
      onUpdateNode(node.id, { children: updatedNode.children }) // Corrected to update node's children
      setIsAddingCourse(false)
    }
  }

  const handleEditCourseFormSubmit = (courseData: any) => {
    if (onUpdateNode) {
      onUpdateNode(node.id, courseData)
      setIsEditingCourse(false)
    }
  }

  const handleDeleteNode = (nodeId: string) => {
    if (onDeleteNode) {
      onDeleteNode(nodeId)
    }
    // Optionally clear the selected node if the deleted one was the current one
    if (node?.id === nodeId) {
      onNodeSelect(null)
    }
  }

  if (isEditingCourse && node?.type === "course") {
    return (
      <AddCourseForm
        majorId={node.parentId || node.id}
        onCancel={() => setIsEditingCourse(false)}
        onSubmit={handleEditCourseFormSubmit}
        initialData={node}
        isEditMode={true}
      />
    )
  }

  if (isEditingMajor && node.type === "major") {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6">
        <AddMajorForm
          departmentId={node.id}
          onCancel={() => setIsEditingMajor(false)}
          onSubmit={handleEditMajorFormSubmit}
          initialData={node}
          isEditMode={true}
        />
      </div>
    )
  }

  if (isAddingCourse && node?.type === "major") {
    return <AddCourseForm majorId={node.id} onCancel={() => setIsAddingCourse(false)} onSubmit={handleCreateCourse} />
  }

  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-md shadow-2xl p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">选择一个节点查看详情</p>
          <p className="text-sm mt-2">点击左侧树形结构中的任意节点</p>
        </div>
      </div>
    )
  }

  const renderStatisticsCards = () => {
    if (node.type === "department" && (!node.children || node.children.length === 0)) {
      return (
        <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              专业总览
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground mb-4">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">暂未设置专业</p>
            </div>
            <Button className="gap-2" onClick={() => setIsAddingMajor(true)}>
              <Plus className="w-4 h-4" />
              立即新增
            </Button>
          </div>
        </div>
      )
    }

    if (!node.children || node.children.length === 0) return null

    const getCardIcon = (type: string) => {
      switch (type) {
        case "department":
          return GraduationCap
        case "major":
          return BookOpen
        case "course":
          return FileText
        default:
          return FileText
      }
    }

    const getTypeLabel = (type: string) => {
      switch (type) {
        case "department":
          return "院系"
        case "major":
          return "专业"
        case "course":
          return "课程"
        default:
          return ""
      }
    }

    const getAdminName = (index: number) => {
      const admins = ["张教授", "李主任", "王老师", "刘院长", "陈教授", "赵老师", "孙主任", "周教授", "吴老师"]
      return admins[index % admins.length]
    }

    return (
      <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {node.type === "university" && "院系总览"}
            {node.type === "department" && "专业总览"}
            {node.type === "major" && "课程总览"}
          </h3>
          {node.type === "university" && onSetCurrentSchool && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-2 hover:bg-primary/10">
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-primary font-medium">新增院系</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{isEditingDepartment ? "编辑院系" : "新增院系"}</DialogTitle>
                  <DialogDescription>
                    {isEditingDepartment ? "修改院系基本信息" : "填写院系基本信息，创建新的院系节点"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dept-name">院系名称</Label>
                    <Input
                      id="dept-name"
                      placeholder="例如：信息学院"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dept-desc">院系简介</Label>
                    <Textarea
                      id="dept-desc"
                      placeholder="简要描述院系的培养方向和特色"
                      rows={3}
                      value={newDeptDesc}
                      onChange={(e) => setNewDeptDesc(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dept-director">负责人</Label>
                    <Input
                      id="dept-director"
                      placeholder="例如：张教授"
                      value={newDeptDirector}
                      onChange={(e) => setNewDeptDirector(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="gap-2"
                    onClick={handleCreateDepartment}
                    disabled={!newDeptName.trim()}
                  >
                    {isEditingDepartment ? (
                      <>
                        <Pencil className="w-4 h-4" />
                        保存修改
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        创建院系
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {node.type === "department" && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 hover:bg-primary/10"
              onClick={() => setIsAddingMajor(true)}
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">新增专业</span>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {node.children.map((child: any, index: number) => {
            const Icon = getCardIcon(child.type)
            const childCount = child.children ? child.children.length : 0
            const courseCount = countChildren(child, "course")

            return (
              <button
                key={child.id}
                onClick={() => onNodeSelect(child)}
                className={cn(
                  "relative flex flex-col p-5 rounded-xl border transition-all duration-200 min-h-[165px]",
                  "bg-white/40 backdrop-blur-md border-primary/20",
                  "hover:bg-white/60 hover:shadow-lg hover:scale-105 hover:border-primary/40",
                  "group cursor-pointer",
                )}
              >
                <div className="absolute top-3 left-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      "bg-white/50 backdrop-blur-sm",
                      "border border-primary/30",
                      "group-hover:bg-white/70 group-hover:border-primary/50",
                      "transition-all duration-200",
                    )}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <div className="px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/30 text-xs font-medium text-primary">
                    {getTypeLabel(child.type)}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-center px-12">
                    <div className="font-semibold text-foreground text-lg text-center line-clamp-2 leading-tight">
                      {child.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center mt-1">
                    {child.type !== "course" && (
                      <>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{childCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookMarked className="w-3 h-3" />
                          <span>{courseCount}</span>
                        </div>
                      </>
                    )}
                    {child.type === "course" && child.metadata && (
                      <>
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>{child.metadata.credits}学分</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{child.metadata.hours}学时</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-3 left-3">
                  <div className="flex items-center gap-[6px] px-[8px] py-[2px] rounded bg-primary border border-primary">
                    <User className="w-[13px] h-[13px] text-white" />
                    <span className="text-[13px] text-white font-medium">{getAdminName(index)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div
          className={cn(
            "flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-accent/20",
            "border border-primary/30 shadow-lg",
          )}
        >
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-medium text-primary mb-2">
            {getTypeLabel()}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{node.name}</h2>
          {node.description && <p className="text-muted-foreground">{node.description}</p>}
        </div>
        {node.type === "university" && onSetCurrentSchool && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetCurrentSchool(node.id)}
            className="gap-2 hover:bg-primary/10"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">设为当前学校</span>
          </Button>
        )}
        {node.type === "major" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingMajor(true)}
              className="gap-2 hover:bg-primary/10"
            >
              <Pencil className="w-4 h-4 text-primary" />
            </Button>
            {onDeleteNode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteNode(node.id)}
                className="gap-2 hover:bg-red-500/10 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        {node.type === "department" && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditDepartment} className="gap-2 hover:bg-primary/10">
              <Pencil className="w-4 h-4 text-primary" />
            </Button>
            {onDeleteNode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteNode(node.id)}
                className="gap-2 hover:bg-red-500/10 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        {node.type === "course" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingCourse(true)}
              className="gap-2 hover:bg-primary/10"
            >
              <Pencil className="w-4 h-4 text-primary" />
            </Button>
            {onDeleteNode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteNode(node.id)}
                className="gap-2 hover:bg-red-500/10 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {(node.type === "university" || node.type === "department") && renderStatisticsCards()}

      {node.type === "major" && (
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
            <TabsTrigger value="details" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              专业详情
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              专业矩阵
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程管理
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              成员管理
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Major Details */}
          <TabsContent value="details" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  基本信息
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="text-sm text-muted-foreground mb-2">专业代码</div>
                    <div className="text-base font-semibold text-foreground">{node.metadata?.code || "未设置"}</div>
                  </div>

                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="text-sm text-muted-foreground mb-2">专业名称</div>
                    <div className="text-base font-semibold text-foreground">{node.name}</div>
                  </div>

                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="text-sm text-muted-foreground mb-2">专业层次</div>
                    <div className="text-base font-semibold text-foreground">{node.metadata?.level || "未设置"}</div>
                  </div>
                </div>

                {node.metadata?.director && (
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      负责人
                    </div>
                    <div className="text-base font-semibold text-foreground">{node.metadata.director}</div>
                  </div>
                )}

                {node.description && (
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="text-sm text-muted-foreground mb-2">办学特色</div>
                    <div className="text-sm text-foreground leading-relaxed">{node.description}</div>
                  </div>
                )}
              </div>

              {/* Career Information Section */}
              {node.metadata?.careerInfo && node.metadata.careerInfo.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    职业信息
                  </h3>

                  <div className="space-y-3">
                    {node.metadata.careerInfo.map((career: any, index: number) => (
                      <div key={career.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">职业方向 {index + 1}</span>
                          <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-sm font-medium text-primary">
                            {career.level}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">职业方向</div>
                            <div className="text-sm text-foreground font-medium">
                              {career.direction?.category1 &&
                              career.direction?.category2 &&
                              career.direction?.category3 &&
                              career.direction?.category4
                                ? `${career.direction.category1} / ${career.direction.category2} / ${career.direction.category3} / ${career.direction.category4}`
                                : "未设置"}
                            </div>
                          </div>

                          {career.tasks && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">工作任务</div>
                              <div className="text-sm text-foreground leading-relaxed">{career.tasks}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Information Section */}
              {(node.metadata?.demandStatus || node.metadata?.trainingObjectives) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    培养信息
                  </h3>

                  {node.metadata?.demandStatus && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border bg-card/50 p-4">
                        <div className="text-sm text-muted-foreground mb-2">需求状况</div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-sm font-medium text-accent">
                            {node.metadata.demandStatus}
                          </span>
                          {node.metadata.selectedProvince && (
                            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium text-primary">
                              {node.metadata.selectedProvince}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {node.metadata?.trainingObjectives && (
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <div className="text-sm text-muted-foreground mb-2">培养目标</div>
                      <div className="text-sm text-foreground leading-relaxed">{node.metadata.trainingObjectives}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Graduation Requirements Section */}
              {node.metadata?.graduationRequirements && node.metadata.graduationRequirements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    毕业要求
                  </h3>

                  <div className="space-y-3">
                    {node.metadata.graduationRequirements.map((req: any, reqIndex: number) => (
                      <div key={req.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                            {reqIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground mb-2">{req.content}</div>

                            {req.indicators && req.indicators.length > 0 && (
                              <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                                <div className="text-xs text-muted-foreground mb-2">指标点</div>
                                {req.indicators.map((indicator: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                                      {reqIndex + 1}.{idx + 1}
                                    </span>
                                    <div className="text-xs text-foreground leading-relaxed">{indicator}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show message if no detailed data */}
              {!node.metadata?.code &&
                !node.description &&
                (!node.metadata?.careerInfo || node.metadata.careerInfo.length === 0) &&
                !node.metadata?.trainingObjectives &&
                (!node.metadata?.graduationRequirements || node.metadata.graduationRequirements.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-2">暂无详细信息</p>
                    <p className="text-xs">点击右上角编辑按钮完善专业信息</p>
                  </div>
                )}
            </div>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  专业矩阵
                </h3>
                {!isEditingMatrix ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingMatrix(true)}
                    className="gap-2 bg-transparent"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    编辑矩阵
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelMatrix}
                      className="gap-2 bg-transparent"
                      disabled={isSavingMatrix}
                    >
                      <X className="w-3.5 h-3.5" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveMatrix(false)}
                      className="gap-2"
                      disabled={isSavingMatrix}
                    >
                      {isSavingMatrix ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          保存中
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          保存
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {node.metadata?.graduationRequirements && node.metadata.graduationRequirements.length > 0 ? (
                <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="text-left p-3 text-muted-foreground font-medium w-[35%]">毕业要求</th>
                          <th className="text-left p-3 text-muted-foreground font-medium w-[45%]">指标点</th>
                          <th className="text-center p-3 text-muted-foreground font-medium w-[20%]">支撑度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {node.metadata.graduationRequirements.map((req: any, reqIndex: number) => {
                          const indicators = req.indicators || []
                          const rowCount = indicators.length || 1

                          return indicators.length > 0 ? (
                            indicators.map((indicator: string, indicatorIdx: number) => {
                              const key = `${req.id}-${indicatorIdx}`
                              const supportLevel = matrixSupportLevels[key] || "未设置"

                              return (
                                <tr key={key} className="border-b border-border hover:bg-white/50 transition-colors">
                                  {indicatorIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-3 align-top border-r border-border bg-secondary/20"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                          {reqIndex + 1}
                                        </div>
                                        <div className="flex-1 text-sm text-foreground leading-relaxed">
                                          {req.content}
                                        </div>
                                      </div>
                                    </td>
                                  )}

                                  {/* Indicator Point */}
                                  <td className="p-3 border-r border-border">
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm text-muted-foreground flex-shrink-0 mt-0.5">
                                        {reqIndex + 1}.{indicatorIdx + 1}
                                      </span>
                                      <div className="text-sm text-foreground leading-relaxed">{indicator}</div>
                                    </div>
                                  </td>

                                  {/* Support Level */}
                                  <td className="p-3 text-center">
                                    {isEditingMatrix ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => handleSupportLevelChange(req.id, indicatorIdx, "强支撑")}
                                          className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                            "border hover:shadow-sm",
                                            supportLevel === "强支撑"
                                              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                              : "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100",
                                          )}
                                        >
                                          强支撑
                                        </button>
                                        <button
                                          onClick={() => handleSupportLevelChange(req.id, indicatorIdx, "弱支撑")}
                                          className={cn(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                                            "border hover:shadow-sm",
                                            supportLevel === "弱支撑"
                                              ? "bg-green-500 text-white border-green-500 shadow-sm"
                                              : "bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100",
                                          )}
                                        >
                                          弱支撑
                                        </button>
                                      </div>
                                    ) : (
                                      <span
                                        className={cn(
                                          "inline-block px-3 py-1 rounded-full text-xs font-medium",
                                          supportLevel === "强支撑" &&
                                            "bg-orange-100 border border-orange-300 text-orange-700",
                                          supportLevel === "弱支撑" &&
                                            "bg-green-100 border border-green-300 text-green-700",
                                          supportLevel === "未设置" &&
                                            "bg-muted/50 border border-border text-muted-foreground",
                                        )}
                                      >
                                        {supportLevel}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr key={req.id} className="border-b border-border hover:bg-white/50 transition-colors">
                              <td className="p-3 border-r border-border bg-secondary/20">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                    {reqIndex + 1}
                                  </div>
                                  <div className="flex-1 text-sm text-foreground leading-relaxed">{req.content}</div>
                                </div>
                              </td>
                              <td className="p-3 text-center text-muted-foreground text-sm" colSpan={2}>
                                暂无指标点
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-2">暂无毕业要求数据</p>
                  <p className="text-xs">请先在专业详情中添加毕业要求</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  课程管理
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="my-courses-checkbox"
                      checked={showMyCoursesOnly}
                      onChange={(e) => handleMyCoursesToggle(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="my-courses-checkbox" className="text-sm text-foreground cursor-pointer">
                      我的课程
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 cursor-pointer bg-transparent"
                    onClick={() => setShowCourseSearch(!showCourseSearch)}
                  >
                    <Filter className="w-4 h-4" />
                    筛选
                  </Button>
                  <Button size="sm" className="gap-2 cursor-pointer" onClick={() => setIsAddingCourse(true)}>
                    <Plus className="w-4 h-4" />
                    创建课程
                  </Button>
                </div>
              </div>

              {showCourseSearch && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="搜索课程名称..."
                      value={courseListSearch}
                      onChange={(e) => setCourseListSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              {!node.children || node.children.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-muted-foreground mb-4">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-1">暂未设置课程</p>
                    <p className="text-xs text-muted-foreground">开始创建课程，完善专业课程体系</p>
                  </div>
                  <Button className="gap-2 cursor-pointer" onClick={() => setIsAddingCourse(true)}>
                    <Plus className="w-4 h-4" />
                    立即新增
                  </Button>
                </div>
              ) : (
                // Course grid
                <div className="grid grid-cols-3 gap-4">
                  {node.children
                    .filter((course: any, index: number) => {
                      // Filter by "My Courses"
                      if (showMyCoursesOnly) {
                        const getAdminName = (index: number) => {
                          const admins = [
                            "张教授",
                            "李主任",
                            "王老师",
                            "刘院长",
                            "陈教授",
                            "赵老师",
                            "孙主任",
                            "周教授",
                            "吴老师",
                          ]
                          return admins[index % admins.length]
                        }
                        const currentUserName = "张教授"
                        if (getAdminName(index) !== currentUserName) return false
                      }
                      // Filter by search keyword
                      if (courseListSearch) {
                        const searchLower = courseListSearch.toLowerCase()
                        return course.name?.toLowerCase().includes(searchLower)
                      }
                      return true
                    })
                    .map((course: any, index: number) => {
                      const getAdminName = (index: number) => {
                        const admins = [
                          "张教授",
                          "李主任",
                          "王老师",
                          "刘院长",
                          "陈教授",
                          "赵老师",
                          "孙主任",
                          "周教授",
                          "吴老师",
                        ]
                        return admins[index % admins.length]
                      }

                      return (
                        <button
                          key={course.id}
                          onClick={() => onNodeSelect(course)}
                          className={cn(
                            "relative flex flex-col p-5 rounded-xl border transition-all duration-200 min-h-[165px]",
                            "bg-white/40 backdrop-blur-md border-primary/20",
                            "hover:bg-white/60 hover:shadow-lg hover:scale-105 hover:border-primary/40",
                            "group cursor-pointer",
                          )}
                        >
                          <div className="absolute top-3 left-3">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                "bg-white/50 backdrop-blur-sm",
                                "border border-primary/30",
                                "group-hover:bg-white/70 group-hover:border-primary/50",
                                "transition-all duration-200",
                              )}
                            >
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                          </div>

                          <div className="absolute top-3 right-3">
                            <div className="px-2 py-0.5 rounded-full bg-white/60 backdrop-blur-sm border border-primary/30 text-xs font-medium text-primary">
                              课程
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center justify-center px-12">
                              <div className="font-semibold text-foreground text-lg text-center line-clamp-2 leading-tight">
                                {course.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center mt-1">
                              {course.metadata && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    <span>{course.metadata.credits}学分</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{course.metadata.hours}学时</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="absolute bottom-3 left-3">
                            <div className="flex items-center gap-[6px] px-[8px] py-[2px] rounded bg-primary border border-primary">
                              <User className="w-[13px] h-[13px] text-white" />
                              <span className="text-[13px] text-white font-medium">{getAdminName(index)}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 p-6">
            <div className="space-y-6">
              {/* Header with title and add button */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">成员管理</h3>
                <Button
                  onClick={() => {
                    setEditingUserId(null)
                    setNewUserEmail("")
                    setNewUserName("")
                    setNewUserRole("专业管理员")
                    setIsAddUserDialogOpen(true)
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加用户
                </Button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-3xl font-bold text-blue-600">{users.length}</div>
                      <div className="text-sm text-blue-700">总成员数</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-3xl font-bold text-green-600">
                        {users.filter((u) => u.role === "专业管理员").length}
                      </div>
                      <div className="text-sm text-green-700">管理人员</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-3xl font-bold text-purple-600">
                        {users.filter((u) => u.role === "任课教师").length}
                      </div>
                      <div className="text-sm text-purple-700">任课教师</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Member List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium text-foreground">成员列表</h4>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索姓名或邮箱..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {displayedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-border hover:bg-white/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          <span className="px-2 py-1 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium text-primary">
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              user.enabled ? "text-muted-foreground" : "text-red-600",
                            )}
                          >
                            禁用
                          </span>
                          <Switch
                            checked={user.enabled}
                            onCheckedChange={() => handleToggleUserEnabled(user.id)}
                            className="cursor-pointer"
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              user.enabled ? "text-green-600" : "text-muted-foreground",
                            )}
                          >
                            启用
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} className="gap-2">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="gap-2 text-orange-600 hover:text-orange-700">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认重置密码</AlertDialogTitle>
                              <AlertDialogDescription>
                                确认要重置用户 {user.name} 的密码？新密码将发送至用户邮箱。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleResetPassword(user.id)}>
                                确认重置
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                              <AlertDialogDescription>
                                确认要删除用户 {user.name}？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>确认删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length > 10 && !showAllUsers && (
                    <Button variant="outline" onClick={() => setShowAllUsers(true)} className="w-full gap-2">
                      展示更多 ({filteredUsers.length - 10} 个用户)
                    </Button>
                  )}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">没有找到匹配的用户</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {node.type === "course" && node.metadata && (
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full h-10 bg-secondary/50 backdrop-blur-sm border-b border-border rounded-none p-0">
            <TabsTrigger value="info" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程信息
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程资源
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              课程矩阵
            </TabsTrigger>
            <TabsTrigger value="projectMatrix" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              项目矩阵
            </TabsTrigger>
            <TabsTrigger value="supervision" className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors">
              督导评分
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4 px-6 pb-6">
            {/* Section 1: Basic Information - Always visible */}
            <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-sm bg-primary" />
                <h3 className="text-base font-semibold text-foreground">课程基本信息</h3>
              </div>
              <div className="border-t border-dashed border-border mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">开课日期:</span>
                  <span className="font-medium text-foreground">{node.metadata?.openingDate || "未设置"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">课程类型:</span>
                  <span className="font-medium text-foreground">{node.metadata?.courseType || "未设置"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">课程名称:</span>
                  <span className="font-medium text-foreground">{node.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">课程性质:</span>
                  <span className="font-medium text-foreground">{node.metadata?.courseNature || "未设置"}</span>
                </div>
              </div>
            </div>

            <Accordion type="multiple" className="space-y-4">
              {/* Section 2: Teaching Objectives */}
              <AccordionItem
                value="teaching-objectives"
                className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
              >
                <AccordionTrigger className="px-5 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <h3 className="text-base font-semibold text-foreground">课程教学目标</h3>
                    {node.metadata?.teachingObjectives && node.metadata.teachingObjectives.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({node.metadata.teachingObjectives.length} 个目标)
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="border-t border-dashed border-border mb-4" />
                  <div className="mb-4">
                    <div className="relative w-[30%]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="搜索教学目标..."
                        value={teachingObjectivesSearch}
                        onChange={(e) => setTeachingObjectivesSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  {node.metadata?.teachingObjectives && node.metadata.teachingObjectives.length > 0 ? (
                    (() => {
                      const filteredObjectives = node.metadata.teachingObjectives.filter((objective: any) => {
                        if (!teachingObjectivesSearch) return true
                        const searchLower = teachingObjectivesSearch.toLowerCase()
                        const contentMatch = objective.content?.toLowerCase().includes(searchLower)
                        const pointsMatch = objective.points?.some((point: string) =>
                          point.toLowerCase().includes(searchLower),
                        )
                        return contentMatch || pointsMatch
                      })

                      if (filteredObjectives.length === 0) {
                        return <div className="text-center py-8 text-muted-foreground text-sm">无相关结果</div>
                      }

                      return (
                        <div className="space-y-4">
                          {filteredObjectives.map((objective: any, objIndex: number) => (
                            <div
                              key={objIndex}
                              className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                  {objIndex + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {highlightKeyword(objective.content || "未设置", teachingObjectivesSearch)}
                                  </p>
                                  {objective.points && objective.points.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {objective.points.map((point: string, pointIndex: number) => (
                                        <div key={pointIndex} className="flex items-start gap-2 text-sm">
                                          <span className="text-muted-foreground">•</span>
                                          <span className="text-muted-foreground">
                                            {highlightKeyword(point, teachingObjectivesSearch)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">暂无教学目标</div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Section 3: Course Points Library */}
              <AccordionItem
                value="course-points"
                className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
              >
                <AccordionTrigger className="px-5 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <h3 className="text-base font-semibold text-foreground">课点信息库</h3>
                    {node.metadata?.coursePoints && node.metadata.coursePoints.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({node.metadata.coursePoints.length} 个课点)
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="border-t border-dashed border-border mb-4" />
                  <div className="mb-4">
                    <div className="relative w-[30%]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="搜索课点信息..."
                        value={coursePointsSearch}
                        onChange={(e) => setCoursePointsSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  {node.metadata?.coursePoints && node.metadata.coursePoints.length > 0 ? (
                    (() => {
                      const filteredPoints = node.metadata.coursePoints.filter((point: any) => {
                        if (!coursePointsSearch) return true
                        const searchLower = coursePointsSearch.toLowerCase()
                        const contentMatch = point.content?.toLowerCase().includes(searchLower)
                        const infoPointsMatch = point.infoPoints?.some((infoPoint: string) =>
                          infoPoint.toLowerCase().includes(searchLower),
                        )
                        return contentMatch || infoPointsMatch
                      })

                      if (filteredPoints.length === 0) {
                        return <div className="text-center py-8 text-muted-foreground text-sm">无相关结果</div>
                      }

                      return (
                        <div className="space-y-4">
                          {filteredPoints.map((point: any, pointIndex: number) => (
                            <div
                              key={pointIndex}
                              className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                  {pointIndex + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {highlightKeyword(point.content || "未设置", coursePointsSearch)}
                                  </p>
                                  {point.infoPoints && point.infoPoints.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {point.infoPoints.map((infoPoint: string, infoIndex: number) => (
                                        <div key={infoIndex} className="flex items-start gap-2 text-sm">
                                          <span className="text-muted-foreground">•</span>
                                          <span className="text-muted-foreground">
                                            {highlightKeyword(infoPoint, coursePointsSearch)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">暂无课点信息</div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Chapter and Project List */}
              <AccordionItem
                value="chapters"
                className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm"
              >
                <AccordionTrigger className="px-5 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <h3 className="text-base font-semibold text-foreground">章节项目列表</h3>
                    {node.metadata?.chapters && node.metadata.chapters.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">({node.metadata.chapters.length} 项)</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-6">
                  <div className="border-t border-dashed border-border mb-4" />
                  <div className="mb-4">
                    <div className="relative w-[30%]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="搜索章节项目..."
                        value={chaptersSearch}
                        onChange={(e) => setChaptersSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  {node.metadata?.chapters && node.metadata.chapters.length > 0 ? (
                    (() => {
                      const filteredChapters = node.metadata.chapters.filter((chapter: any) => {
                        if (!chaptersSearch) return true
                        const searchLower = chaptersSearch.toLowerCase()
                        return chapter.name?.toLowerCase().includes(searchLower)
                      })

                      if (filteredChapters.length === 0) {
                        return (
                          <div className="rounded-lg border border-border overflow-hidden mb-4">
                            <table className="w-full">
                              <thead className="bg-secondary/50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                    序号
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                    名称
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                    理论学时
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                    实践学时
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    暂无相关结果
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )
                      }

                      // Calculate statistics based on filtered results
                      const chapterCount = filteredChapters.filter((ch: any) => ch.name?.includes("章")).length
                      const projectCount = filteredChapters.filter((ch: any) => ch.name?.includes("项目")).length
                      const totalTheoryHours = filteredChapters.reduce(
                        (sum: number, ch: any) => sum + (ch.theoryHours || 0),
                        0,
                      )
                      const totalPracticeHours = filteredChapters.reduce(
                        (sum: number, ch: any) => sum + (ch.practiceHours || 0),
                        0,
                      )
                      const totalHours = totalTheoryHours + totalPracticeHours

                      return (
                        <div className="rounded-lg border border-border overflow-hidden mb-4">
                          <table className="w-full">
                            <thead className="bg-secondary/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                  序号
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                  名称
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                                  理论学时
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">实践学时</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredChapters.map((chapter: any, index: number) => (
                                <tr key={chapter.id || index} className="border-t border-border hover:bg-secondary/30">
                                  <td className="px-4 py-3 text-sm text-foreground border-r border-border">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground border-r border-border">
                                    {highlightKeyword(chapter.name || "未命名", chaptersSearch)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground border-r border-border">
                                    {chapter.theoryHours || 0} 学时
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {chapter.practiceHours || 0} 学时
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-primary/30 bg-primary/5">
                                <td
                                  colSpan={2}
                                  className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border"
                                >
                                  统计：{chapterCount} 个章节，{projectCount} 个项目
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                                  {totalTheoryHours} 学时
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-foreground">
                                  {totalPracticeHours} 学时
                                  <span className="ml-2 text-muted-foreground">(合计：{totalHours} 学时)</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">暂无章节项目</div>
                  )}
                  {/* No change needed here, the mb-4 is already present */}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={handleBackToFolders}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        课程资源
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <button
                        onClick={handleBackToFiles}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {getCurrentFolderData()?.folder?.name}
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{selectedFile.name}</span>
                    </div>
                  ) : currentFolder ? (
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={handleBackToFolders}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        课程资源
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{getCurrentFolderData()?.folder?.name}</span>
                    </div>
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground">课程资源</h3>
                  )}
                </div>
                {!selectedFile && (
                  <Button size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    打包下载
                  </Button>
                )}
              </div>

              {selectedFile ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Left side: File details and preview */}
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Button size="sm" variant="ghost" onClick={handleBackToFiles} className="gap-2">
                          <ArrowLeft className="w-4 h-4" />
                          返回
                        </Button>
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                          <File className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground mb-1 break-words">
                            {selectedFile.name}
                          </h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>文件类型: {selectedFile.type}</div>
                            <div>文件大小: {selectedFile.size}</div>
                            <div>上传时间: {selectedFile.date}</div>
                            <div>上传者: {selectedFile.uploader}</div>
                            <div>版本: {selectedFile.version}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gap-2">
                          <Eye className="w-4 h-4" />
                          预览
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-2 bg-transparent">
                          <Download className="w-4 h-4" />
                          下载
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        文件预览
                      </h4>
                      <div className="aspect-[4/3] rounded-lg bg-secondary/50 border border-border flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">预览区域</p>
                          <p className="text-xs mt-1">支持 PDF、图片、视频等格式</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Scoring sections */}
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        自我评分
                      </h4>
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-primary">{mockScoring.selfEvaluation.total}</div>
                        <div className="text-xs text-muted-foreground">总分</div>
                      </div>
                      <div className="space-y-3">
                        {mockScoring.selfEvaluation.indicators.map((indicator, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground">
                                {indicator.name}
                                <span className="text-muted-foreground ml-1">({indicator.weight})</span>
                              </span>
                              <span className="font-medium text-primary">{indicator.score}分</span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${indicator.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-accent" />
                        专业评分
                      </h4>
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-accent">{mockScoring.professionalEvaluation.total}</div>
                        <div className="text-xs text-muted-foreground">总分</div>
                      </div>
                      <div className="space-y-3">
                        {mockScoring.professionalEvaluation.indicators.map((indicator, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground">
                                {indicator.name}
                                <span className="text-muted-foreground ml-1">({indicator.weight})</span>
                              </span>
                              <span className="font-medium text-accent">{indicator.score}分</span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${indicator.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card/50 p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-green-600" />
                        督导评分
                      </h4>
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-green-600">
                          {mockScoring.supervisionEvaluation.total}
                        </div>
                        <div className="text-xs text-muted-foreground">总分</div>
                      </div>
                      <div className="space-y-3">
                        {mockScoring.supervisionEvaluation.indicators.map((indicator, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground">
                                {indicator.name}
                                <span className="text-muted-foreground ml-1">({indicator.weight})</span>
                              </span>
                              <span className="font-medium text-green-600">{indicator.score}分</span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${indicator.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : !currentFolder ? (
                // Folder grid view
                <div className="grid grid-cols-3 gap-3">
                  {courseResources.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleFolderClick(resource.id)}
                      className="relative flex flex-col items-center gap-3 p-4 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 hover:shadow-md transition-all group"
                    >
                      <Folder className="w-12 h-12 text-primary/70 group-hover:text-primary transition-colors" />
                      <span className="text-sm text-foreground text-center line-clamp-2 leading-tight">
                        {resource.name}
                      </span>
                      <div
                        className={cn(
                          "absolute top-2 right-2 min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium",
                          resource.count === 0
                            ? "bg-muted/50 text-muted-foreground border border-border"
                            : "bg-primary/20 text-primary border border-primary/30",
                        )}
                      >
                        {formatCount(resource.count)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                // File list view
                <div className="space-y-2">
                  {getCurrentFolderData()?.files && getCurrentFolderData()!.files.length > 0 ? (
                    getCurrentFolderData()!.files.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => handleFileClick(file)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm text-foreground truncate">{file.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {file.size} · {file.date}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">该文件夹暂无内容</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-white/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  课程矩阵
                </h3>
                {!isEditingCourseMatrix ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingCourseMatrix(true)}
                    className="gap-2 bg-transparent"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    编辑矩阵
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelCourseMatrix}
                      className="gap-2 bg-transparent"
                      disabled={isSavingCourseMatrix}
                    >
                      <X className="w-3.5 h-3.5" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveCourseMatrix(false)}
                      className="gap-2"
                      disabled={isSavingCourseMatrix}
                    >
                      {isSavingCourseMatrix ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          保存中
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          保存
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {node.metadata?.teachingObjectives &&
              node.metadata?.chapters &&
              node.metadata.teachingObjectives.length > 0 &&
              node.metadata.chapters.length > 0 ? (
                <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="text-left p-3 text-muted-foreground font-medium w-[20%] border-r border-border sticky left-0 bg-secondary/50 z-10">
                            教学目标
                          </th>
                          <th className="text-left p-3 text-muted-foreground font-medium w-[20%] border-r border-border sticky left-[200px] bg-secondary/50 z-10">
                            指标点
                          </th>
                          {node.metadata.chapters.map((chapter: any, idx: number) => (
                            <th
                              key={chapter.id || idx}
                              className="text-center p-3 text-muted-foreground font-medium border-r border-border last:border-r-0 min-w-[150px]"
                            >
                              {chapter.name || `章节${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {node.metadata.teachingObjectives.map((objective: any, objIdx: number) => {
                          const points = objective.points || []
                          const rowCount = points.length || 1

                          const coursePointIndexMap = new Map()
                          if (node?.metadata?.coursePoints) {
                            node.metadata.coursePoints.forEach((cp: any, idx: number) => {
                              const id = cp.id || `cp-${idx}`
                              coursePointIndexMap.set(id, idx + 1)
                            })
                          }

                          return points.length > 0 ? (
                            points.map((point: any, pointIdx: number) => {
                              const objectiveId = objective.id || `obj-${objIdx}`
                              const pointId =
                                typeof point === "string"
                                  ? `point-${objIdx}-${pointIdx}`
                                  : point.id || `point-${objIdx}-${pointIdx}`
                              const pointContent =
                                typeof point === "string" ? point : point.content || point.name || point

                              return (
                                <tr
                                  key={`${objectiveId}-${pointIdx}`}
                                  className="border-b border-border hover:bg-white/50 transition-colors"
                                >
                                  {pointIdx === 0 && (
                                    <td
                                      rowSpan={rowCount}
                                      className="p-3 align-top border-r border-border bg-secondary/20 sticky left-0 z-10"
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                          {objIdx + 1}
                                        </div>
                                        <div className="flex-1 text-sm text-foreground leading-relaxed">
                                          {objective.content || objective.name || "未设置"}
                                        </div>
                                      </div>
                                    </td>
                                  )}

                                  <td className="p-3 border-r border-border sticky left-[200px] bg-white/80 z-10">
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm text-muted-foreground flex-shrink-0 mt-0.5">
                                        {objIdx + 1}.{pointIdx + 1}
                                      </span>
                                      <div className="text-sm text-foreground leading-relaxed">{pointContent}</div>
                                    </div>
                                  </td>

                                  {node.metadata.chapters.map((chapter: any, chapterIdx: number) => {
                                    const chapterId = chapter.id || `chapter-${chapterIdx}`
                                    const key = `${objectiveId}-${pointId}-${chapterId}`
                                    const coursePoints = courseMatrixData[key] || []

                                    return (
                                      <td
                                        key={chapterId}
                                        className="p-3 text-center border-r border-border last:border-r-0"
                                      >
                                        {isEditingCourseMatrix ? (
                                          <div className="flex flex-col items-center gap-2">
                                            {coursePoints.length > 0 && (
                                              <div className="flex flex-wrap gap-1 justify-center">
                                                {coursePoints.map((cp) => (
                                                  <div key={cp.id} className="relative group/tooltip">
                                                    <span
                                                      className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer",
                                                        cp.support === "strong" &&
                                                          "bg-orange-100 border border-orange-300 text-orange-700",
                                                        cp.support === "weak" &&
                                                          "bg-green-100 border border-green-300 text-green-700",
                                                      )}
                                                    >
                                                      {coursePointIndexMap.get(cp.id) || cp.id}
                                                      <button
                                                        onClick={() =>
                                                          handleRemoveCoursePoint(
                                                            objectiveId,
                                                            pointId,
                                                            chapterId,
                                                            cp.id,
                                                          )
                                                        }
                                                        className="hover:text-red-600 transition-colors"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </span>
                                                    <div
                                                      className={cn(
                                                        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50",
                                                        cp.support === "strong" && "bg-orange-600",
                                                        cp.support === "weak" && "bg-green-600",
                                                      )}
                                                    >
                                                      {cp.description || cp.name}
                                                      <div
                                                        className={cn(
                                                          "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent",
                                                          cp.support === "strong" && "border-t-orange-600",
                                                          cp.support === "weak" && "border-t-green-600",
                                                        )}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <button
                                              onClick={() => handleAddCoursePoint(objectiveId, pointId, chapterId)}
                                              className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group"
                                              title={`为指标点"${pointContent}"添加课点`}
                                            >
                                              <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1 justify-center">
                                            {coursePoints.length > 0 ? (
                                              coursePoints.map((cp) => (
                                                <div key={cp.id} className="relative group/tooltip">
                                                  <span
                                                    className={cn(
                                                      "inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer",
                                                      cp.support === "strong" &&
                                                        "bg-orange-100 border border-orange-300 text-orange-700",
                                                      cp.support === "weak" &&
                                                        "bg-green-100 border border-green-300 text-green-700",
                                                    )}
                                                  >
                                                    {coursePointIndexMap.get(cp.id) || cp.id}
                                                  </span>
                                                  <div
                                                    className={cn(
                                                      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50",
                                                      cp.support === "strong" && "bg-orange-600",
                                                      cp.support === "weak" && "bg-green-600",
                                                    )}
                                                  >
                                                    {cp.description || cp.name}
                                                    <div
                                                      className={cn(
                                                        "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent",
                                                        cp.support === "strong" && "border-t-orange-600",
                                                        cp.support === "weak" && "border-t-green-600",
                                                      )}
                                                    ></div>
                                                  </div>
                                                </div>
                                              ))
                                            ) : (
                                              <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })
                          ) : (
                            <tr
                              key={objective.id || objIdx}
                              className="border-b border-border hover:bg-white/50 transition-colors"
                            >
                              <td className="p-3 border-r border-border bg-secondary/20 sticky left-0 z-10">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                    {objIdx + 1}
                                  </div>
                                  <div className="flex-1 text-sm text-foreground leading-relaxed">
                                    {objective.content || objective.name || "未设置"}
                                  </div>
                                </div>
                              </td>
                              <td
                                className="p-3 text-center text-muted-foreground text-sm border-r border-border sticky left-[200px] bg-white/80 z-10"
                                colSpan={1}
                              >
                                暂无指标点
                              </td>
                              {node.metadata.chapters.map((chapter: any, chapterIdx: number) => (
                                <td
                                  key={chapter.id || chapterIdx}
                                  className="p-3 text-center border-r border-border last:border-r-0"
                                >
                                  <span className="text-xs text-muted-foreground">-</span>
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-2">暂无课程矩阵数据</p>
                  <p className="text-xs">请先在课程信息中添加教学目标和章节信息</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projectMatrix" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Grid3x3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">项目矩阵</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">管理每个章节/项目的教学任务目标和实施细节</p>
                  </div>
                </div>
                {isEditingProjectMatrix ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelProjectMatrix}
                      disabled={isSavingProjectMatrix}
                      className="gap-2 bg-transparent"
                    >
                      <X className="w-3.5 h-3.5" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveProjectMatrix(false)}
                      disabled={isSavingProjectMatrix}
                      className="gap-2"
                    >
                      {isSavingProjectMatrix ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          保存中
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          保存
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setIsEditingProjectMatrix(true)} className="gap-2">
                    <Edit className="w-4 h-4" />
                    编辑
                  </Button>
                )}
              </div>

              {node.metadata?.chapters && node.metadata.chapters.length > 0 ? (
                <Accordion type="multiple" className="space-y-3">
                  {node.metadata.chapters.map((chapter: any, chapterIdx: number) => {
                    const chapterId = chapter.id || `chapter-${chapterIdx}`
                    const chapterName = chapter.name || `章节${chapterIdx + 1}`

                    // Get course points for this chapter from course matrix
                    const chapterCoursePoints: Array<{ id: string; title: string; description: string }> = []
                    if (node.metadata?.teachingObjectives && courseMatrixData) {
                      node.metadata.teachingObjectives.forEach((objective: any, objIdx: number) => {
                        const points = objective.points || []
                        points.forEach((point: any, pointIdx: number) => {
                          const objectiveId = objective.id || `obj-${objIdx}`
                          const pointId =
                            typeof point === "string"
                              ? `point-${objIdx}-${pointIdx}`
                              : point.id || `point-${objIdx}-${pointIdx}`
                          const key = `${objectiveId}-${pointId}-${chapterId}`
                          const coursePoints = courseMatrixData[key] || []

                          coursePoints.forEach((cp) => {
                            if (!chapterCoursePoints.find((existing) => existing.id === cp.id)) {
                              chapterCoursePoints.push({
                                id: cp.id,
                                title: cp.name,
                                description: cp.description || cp.name,
                              })
                            }
                          })
                        })
                      })
                    }

                    const taskObjectives = chapterTaskObjectives[chapterId] || []

                    return (
                      <AccordionItem key={chapterId} value={chapterId} className="border border-border rounded-lg">
                        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/30 rounded-t-lg">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                {chapterIdx + 1}
                              </div>
                              <span className="text-base font-semibold text-foreground">{chapterName}</span>
                              {chapterCoursePoints.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({chapterCoursePoints.length} 个课点)
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenTaskObjectivesDialog(chapterId)
                              }}
                              className="gap-2"
                            >
                              <Target className="w-4 h-4" />
                              教学任务目标
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5">
                          <div className="border-t border-dashed border-border mb-4" />

                          {chapterCoursePoints.length > 0 && taskObjectives.length > 0 ? (
                            <div className="rounded-lg border border-border overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="border-b border-border bg-secondary/50">
                                      <th
                                        rowSpan={2}
                                        className="text-left p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                      >
                                        课点
                                      </th>
                                      {taskObjectives.map((task) => (
                                        <th
                                          key={task.id}
                                          rowSpan={2}
                                          className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[150px]"
                                        >
                                          <div className="text-xs leading-relaxed">{task.objective}</div>
                                        </th>
                                      ))}
                                      <th
                                        rowSpan={2}
                                        className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                      >
                                        学法
                                      </th>
                                      <th
                                        rowSpan={2}
                                        className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                      >
                                        教法
                                      </th>
                                      <th
                                        rowSpan={2}
                                        className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[150px]"
                                      >
                                        课点学习产出及测量
                                      </th>
                                      <th className="text-center p-3 text-muted-foreground font-medium" colSpan={2}>
                                        教学安排
                                      </th>
                                    </tr>
                                    <tr className="border-b border-border bg-secondary/30">
                                      <th className="text-center p-2 text-xs text-muted-foreground font-medium border-r border-border">
                                        开课周数
                                      </th>
                                      <th className="text-center p-2 text-xs text-muted-foreground font-medium">
                                        学时数
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {chapterCoursePoints.map((coursePoint) => {
                                      const rowKey = `${chapterId}-${coursePoint.id}`
                                      const rowData = projectMatrixData[rowKey] || {}

                                      // Get course point index for display
                                      const coursePointIndex =
                                        node.metadata?.coursePoints?.findIndex(
                                          (cp: any) =>
                                            (cp.id || `cp-${node.metadata.coursePoints.indexOf(cp)}`) ===
                                            coursePoint.id,
                                        ) + 1 || 0

                                      return (
                                        <tr
                                          key={coursePoint.id}
                                          className="border-b border-border hover:bg-secondary/20"
                                        >
                                          <td className="p-3 border-r border-border">
                                            <div className="relative group/tooltip">
                                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 border border-blue-300 text-blue-700 cursor-pointer">
                                                {coursePointIndex}
                                              </span>
                                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50 max-w-xs">
                                                <div className="font-semibold mb-1">{coursePoint.title}</div>
                                                <div className="text-gray-300">{coursePoint.description}</div>
                                                <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                                              </div>
                                            </div>
                                          </td>
                                          {taskObjectives.map((task) => {
                                            const ksaKey = `${chapterId}-${coursePoint.id}-${task.id}`
                                            const hasKsa = ksaData[ksaKey]

                                            return (
                                              <td key={task.id} className="p-3 text-center border-r border-border">
                                                <button
                                                  onClick={() =>
                                                    handleOpenKsaDialog(chapterId, coursePoint.id, task.id)
                                                  }
                                                  className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all group",
                                                    hasKsa
                                                      ? "border-primary bg-primary/20 hover:bg-primary/30"
                                                      : "border-dashed border-primary/40 hover:border-primary hover:bg-primary/10",
                                                  )}
                                                  title="设置KSA"
                                                >
                                                  <Plus
                                                    className={cn(
                                                      "w-3 h-3",
                                                      hasKsa
                                                        ? "text-primary"
                                                        : "text-primary/60 group-hover:text-primary",
                                                    )}
                                                  />
                                                </button>
                                              </td>
                                            )
                                          })}
                                          <td className="p-2 border-r border-border">
                                            {isEditingProjectMatrix ? (
                                              <input
                                                type="text"
                                                value={rowData[`${coursePoint.id}-learningMethod`] || ""}
                                                onChange={(e) => {
                                                  setProjectMatrixData((prev) => ({
                                                    ...prev,
                                                    [rowKey]: {
                                                      ...prev[rowKey],
                                                      [`${coursePoint.id}-learningMethod`]: e.target.value,
                                                    },
                                                  }))
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="输入学法"
                                              />
                                            ) : (
                                              <span className="text-xs text-foreground">
                                                {rowData[`${coursePoint.id}-learningMethod`] || "-"}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 border-r border-border">
                                            {isEditingProjectMatrix ? (
                                              <input
                                                type="text"
                                                value={rowData[`${coursePoint.id}-teachingMethod`] || ""}
                                                onChange={(e) => {
                                                  setProjectMatrixData((prev) => ({
                                                    ...prev,
                                                    [rowKey]: {
                                                      ...prev[rowKey],
                                                      [`${coursePoint.id}-teachingMethod`]: e.target.value,
                                                    },
                                                  }))
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="输入教法"
                                              />
                                            ) : (
                                              <span className="text-xs text-foreground">
                                                {rowData[`${coursePoint.id}-teachingMethod`] || "-"}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 border-r border-border">
                                            {isEditingProjectMatrix ? (
                                              <input
                                                type="text"
                                                value={rowData[`${coursePoint.id}-output`] || ""}
                                                onChange={(e) => {
                                                  setProjectMatrixData((prev) => ({
                                                    ...prev,
                                                    [rowKey]: {
                                                      ...prev[rowKey],
                                                      [`${coursePoint.id}-output`]: e.target.value,
                                                    },
                                                  }))
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="输入产出及测量"
                                              />
                                            ) : (
                                              <span className="text-xs text-foreground">
                                                {rowData[`${coursePoint.id}-output`] || "-"}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 border-r border-border">
                                            {isEditingProjectMatrix ? (
                                              <input
                                                type="text"
                                                value={rowData[`${coursePoint.id}-weeks`] || ""}
                                                onChange={(e) => {
                                                  setProjectMatrixData((prev) => ({
                                                    ...prev,
                                                    [rowKey]: {
                                                      ...prev[rowKey],
                                                      [`${coursePoint.id}-weeks`]: e.target.value,
                                                    },
                                                  }))
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="周数"
                                              />
                                            ) : (
                                              <span className="text-xs text-foreground">
                                                {rowData[`${coursePoint.id}-weeks`] || "-"}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2">
                                            {isEditingProjectMatrix ? (
                                              <input
                                                type="text"
                                                value={rowData[`${coursePoint.id}-hours`] || ""}
                                                onChange={(e) => {
                                                  setProjectMatrixData((prev) => ({
                                                    ...prev,
                                                    [rowKey]: {
                                                      ...prev[rowKey],
                                                      [`${coursePoint.id}-hours`]: e.target.value,
                                                    },
                                                  }))
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                placeholder="学时"
                                              />
                                            ) : (
                                              <span className="text-xs text-foreground">
                                                {rowData[`${coursePoint.id}-hours`] || "-"}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Grid3x3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm mb-2">暂无项目矩阵数据</p>
                              <p className="text-xs">
                                {chapterCoursePoints.length === 0 && "请先在课程矩阵中为该章节关联课点"}
                                {chapterCoursePoints.length > 0 &&
                                  taskObjectives.length === 0 &&
                                  '请点击"教学任务目标"按钮添加任务目标'}
                              </p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-2">暂无章节项目数据</p>
                  <p className="text-xs">请先在课程信息中添加章节项目信息</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="supervision" className="space-y-4 mt-4 px-6">
            <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                督导评分
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
                    <div className="text-2xl font-bold text-primary mb-1">85</div>
                    <div className="text-xs text-muted-foreground">自评分数</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
                    <div className="text-2xl font-bold text-accent mb-1">88</div>
                    <div className="text-xs text-muted-foreground">部门评分</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
                    <div className="text-2xl font-bold text-green-600 mb-1">90</div>
                    <div className="text-xs text-muted-foreground">督导评分</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">教学内容</span>
                      <span className="text-sm text-primary font-medium">92分</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">教学方法</span>
                      <span className="text-sm text-accent font-medium">88分</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: "88%" }}></div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">资源完整性</span>
                      <span className="text-sm text-green-600 font-medium">90分</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: "90%" }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-card/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">督导评语</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    课程资源丰富，教学内容完整，教学方法多样化。建议进一步完善预习手册和增加互动案例。整体质量优秀，继续保持。
                  </p>
                </div>

                <Button size="sm" className="w-full gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  查看详细评估报告
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={isAddUserDialogOpen}
        onOpenChange={(open) => {
          setIsAddUserDialogOpen(open)
          if (!open) {
            setEditingUserId(null)
            setNewUserEmail("")
            setNewUserName("")
            setNewUserRole("专业管理员")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {editingUserId ? "编辑用户" : "添加用户"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Major Name (Read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">专业名称</label>
              <Input value={node.name} disabled className="bg-muted" />
            </div>
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">邮箱</label>
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">姓名</label>
              <Input placeholder="请输入姓名" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">角色选择</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewUserRole("专业管理员")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                    newUserRole === "专业管理员"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-foreground hover:bg-accent/50",
                  )}
                >
                  专业管理员
                </button>
                <button
                  onClick={() => setNewUserRole("任课教师")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                    newUserRole === "任课教师"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-foreground hover:bg-accent/50",
                  )}
                >
                  任课教师
                </button>
                <button
                  onClick={() => setNewUserRole("教学督导")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                    newUserRole === "教学督导"
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-border text-foreground hover:bg-accent/50",
                  )}
                >
                  教学督导
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)} className="gap-2 bg-transparent">
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button onClick={handleSaveUser} className="gap-2" disabled={!newUserEmail || !newUserName}>
              <Check className="w-4 h-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Point Selection Dialog */}
      <Dialog open={isAddCoursePointDialogOpen} onOpenChange={setIsAddCoursePointDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择课点并设置支撑度</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {node?.metadata?.coursePoints && node.metadata.coursePoints.length > 0 ? (
              node.metadata.coursePoints.map((coursePoint: any, idx: number) => {
                const cpId = coursePoint.id || `cp-${idx}`
                const cpTitle = coursePoint.title || coursePoint.content || `课点 ${idx + 1}`
                const isStrongSelected = selectedCoursePoints[cpId] === "strong"
                const isWeakSelected = selectedCoursePoints[cpId] === "weak"

                return (
                  <div
                    key={cpId}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-foreground">{cpTitle}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isStrongSelected ? "default" : "outline"}
                        onClick={() => handleToggleCoursePointSelection(cpId, "strong")}
                        className={cn(
                          "gap-1",
                          isStrongSelected && "bg-orange-500 hover:bg-orange-600 text-white border-orange-500",
                        )}
                      >
                        强支撑
                      </Button>
                      <Button
                        size="sm"
                        variant={isWeakSelected ? "default" : "outline"}
                        onClick={() => handleToggleCoursePointSelection(cpId, "weak")}
                        className={cn(
                          "gap-1",
                          isWeakSelected && "bg-green-500 hover:bg-green-600 text-white border-green-500",
                        )}
                      >
                        弱支撑
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无课点数据</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCoursePointDialogOpen(false)
                setSelectedMatrixCell(null)
                setSelectedCoursePoints({})
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmCoursePointSelection}
              disabled={Object.keys(selectedCoursePoints).length === 0}
            >
              确认 {Object.keys(selectedCoursePoints).length > 0 && `(${Object.keys(selectedCoursePoints).length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskObjectivesDialogOpen} onOpenChange={setTaskObjectivesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>教学任务目标管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">任务目标</label>
                  <input
                    type="text"
                    value={newTaskObjective}
                    onChange={(e) => setNewTaskObjective(e.target.value)}
                    placeholder="输入任务目标"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">测量评价标准</label>
                  <input
                    type="text"
                    value={newTaskStandard}
                    onChange={(e) => setNewTaskStandard(e.target.value)}
                    placeholder="输入测量评价标准"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={editingTaskId ? handleUpdateTaskObjective : handleAddTaskObjective}
                disabled={!newTaskObjective.trim() || !newTaskStandard.trim()}
                className="w-full gap-2"
              >
                {editingTaskId ? (
                  <>
                    <Edit className="w-4 h-4" />
                    更新任务目标
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    添加任务目标
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">已添加的任务目标</h4>
              {selectedChapterForTasks && chapterTaskObjectives[selectedChapterForTasks]?.length > 0 ? (
                <div className="space-y-2">
                  {chapterTaskObjectives[selectedChapterForTasks].map((task, idx) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm text-foreground font-medium">{task.objective}</div>
                        <div className="text-xs text-muted-foreground">{task.standard}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTaskObjective(task.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteTaskObjective(task.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无任务目标</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setTaskObjectivesDialogOpen(false)
                setEditingTaskId(null)
                setNewTaskObjective("")
                setNewTaskStandard("")
              }}
            >
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KSA settings dialog */}
      <Dialog open={ksaDialogOpen} onOpenChange={setKsaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>设置KSA（知识、技能、态度）</DialogTitle>
          </DialogHeader>
          {selectedKsaCell &&
            (() => {
              const ksaKey = `${selectedKsaCell.chapterId}-${selectedKsaCell.coursePointId}-${selectedKsaCell.taskId}`
              const currentKsa = ksaData[ksaKey] || { knowledge: "", skills: "", attitude: "" }

              return (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">知识（Knowledge）</label>
                    <textarea
                      value={currentKsa.knowledge}
                      onChange={(e) => {
                        setKsaData((prev) => ({
                          ...prev,
                          [ksaKey]: { ...currentKsa, knowledge: e.target.value },
                        }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                      placeholder="输入知识点内容..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">技能（Skills）</label>
                    <textarea
                      value={currentKsa.skills}
                      onChange={(e) => {
                        setKsaData((prev) => ({
                          ...prev,
                          [ksaKey]: { ...currentKsa, skills: e.target.value },
                        }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                      placeholder="输入技能内容..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">态度（Attitude）</label>
                    <textarea
                      value={currentKsa.attitude}
                      onChange={(e) => {
                        setKsaData((prev) => ({
                          ...prev,
                          [ksaKey]: { ...currentKsa, attitude: e.target.value },
                        }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                      placeholder="输入态度内容..."
                    />
                  </div>
                </div>
              )
            })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setKsaDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveKsa}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
