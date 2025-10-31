#!/usr/bin/env node

/**
 * 测试构建后的树形数据大小
 */

const fs = require('fs');
const path = require('path');

const mockDataDir = path.join(__dirname, '..', 'mock-data');

// 读取数据文件
const universitiesData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'universities.json'), 'utf-8'));
const departmentsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'departments.json'), 'utf-8'));
const majorsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'majors.json'), 'utf-8'));
const coursesData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'courses.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('测试树形数据大小');
console.log('='.repeat(80));
console.log();

// 模拟buildTreeData函数
function buildTreeData() {
  const universities = universitiesData.map((univ) => {
    const univDepartments = departmentsData
      .filter((dept) => dept.universityId === univ.id)
      .map((dept) => {
        const deptMajors = majorsData
          .filter((major) => major.departmentId === dept.id)
          .map((major) => {
            const majorCourses = coursesData
              .filter((course) => course.majorId === major.id)
              .map((course) => ({
                id: course.id,
                name: course.name,
                type: "course",
                children: [],
                metadata: {
                  code: course.code,
                  credits: course.credits,
                  hours: course.hours,
                  semester: course.semester,
                  description: course.description,
                  objectives: course.objectives,
                  coursePoints: course.coursePoints,
                  teachingMaterials: course.teachingMaterials,
                  resources: course.resources,
                },
                isStarred: course.isStarred,
              }))

            return {
              id: major.id,
              name: major.name,
              type: "major",
              children: majorCourses,
              metadata: {
                code: major.code,
                degree: major.degree,
                duration: major.duration,
                description: major.description,
                objectives: major.objectives,
              },
              isStarred: major.isStarred,
            }
          })

        return {
          id: dept.id,
          name: dept.name,
          type: "department",
          children: deptMajors,
          metadata: {
            code: dept.code,
            description: dept.description,
          },
          isStarred: dept.isStarred,
        }
      })

    return {
      id: univ.id,
      name: univ.name,
      type: "university",
      children: univDepartments,
      metadata: {
        code: univ.code,
        address: univ.address,
        website: univ.website,
        description: univ.description,
      },
      isStarred: univ.isStarred,
    }
  })

  return {
    id: "root",
    name: "根节点",
    type: "university",
    children: universities,
    metadata: {},
  }
}

// 构建树形数据
console.log('正在构建树形数据...');
const treeData = buildTreeData();

// 转换为JSON字符串
const treeDataJson = JSON.stringify(treeData);

// 计算大小
const sizeInBytes = Buffer.byteLength(treeDataJson, 'utf8');
const sizeInKB = (sizeInBytes / 1024).toFixed(2);
const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);

console.log();
console.log('树形数据统计:');
console.log(`  - 根节点子节点数: ${treeData.children.length}`);
console.log(`  - JSON字符串长度: ${treeDataJson.length.toLocaleString()} 字符`);
console.log(`  - 数据大小: ${sizeInBytes.toLocaleString()} 字节`);
console.log(`  - 数据大小: ${sizeInKB} KB`);
console.log(`  - 数据大小: ${sizeInMB} MB`);
console.log();

// localStorage限制通常是5-10MB
const localStorageLimit = 5 * 1024 * 1024; // 5MB
const percentage = (sizeInBytes / localStorageLimit * 100).toFixed(1);

console.log('localStorage兼容性:');
console.log(`  - localStorage限制: 5 MB (保守估计)`);
console.log(`  - 当前数据占用: ${percentage}%`);

if (sizeInBytes < localStorageLimit) {
  console.log(`  - ✓ 数据大小在限制范围内 (剩余 ${((localStorageLimit - sizeInBytes) / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.log(`  - ✗ 数据大小超出限制 (超出 ${((sizeInBytes - localStorageLimit) / 1024 / 1024).toFixed(2)} MB)`);
  console.log();
  console.log('建议:');
  console.log('  1. 进一步减少数据量');
  console.log('  2. 使用IndexedDB替代localStorage');
  console.log('  3. 实现数据分页加载');
}

console.log();
console.log('='.repeat(80));

