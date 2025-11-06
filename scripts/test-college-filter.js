#!/usr/bin/env node

/**
 * 测试collegeType过滤逻辑
 */

const fs = require('fs');
const path = require('path');

const mockDataDir = path.join(__dirname, '..', 'mock-data');

// 读取colleges.json
const collegesData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'colleges.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('测试collegeType过滤逻辑');
console.log('='.repeat(80));
console.log();

if (collegesData.code !== "0" || !collegesData.data) {
  console.log('✗ 错误: colleges.json数据格式错误');
  process.exit(1);
}

const { colleges } = collegesData.data;

// 过滤出collegeType为"1"的数据
const filteredColleges = colleges.filter((item) => item.college.collegeType === "1");

console.log('【过滤前】');
console.log('  - 总数:', colleges.length);
console.log();

console.log('【过滤后 (collegeType="1")】');
console.log('  - 数量:', filteredColleges.length);
console.log();

console.log('【过滤后的colleges列表】');
filteredColleges.forEach((item, index) => {
  console.log(`${index + 1}. ${item.college.name} (ID: ${item.college.id})`);
  console.log(`   - collegeType: ${item.college.collegeType}`);
  console.log(`   - departments数量: ${item.departments.length}`);
  console.log(`   - permissionId: ${item.permissionId}`);
  console.log();
});

// 去重处理
const collegeMap = new Map();
filteredColleges.forEach((item) => {
  const collegeId = item.college.id;
  if (!collegeMap.has(collegeId)) {
    collegeMap.set(collegeId, item);
  } else {
    const existing = collegeMap.get(collegeId);
    const existingDeptIds = new Set(existing.departments.map(d => d.id));
    const newDepts = item.departments.filter(d => !existingDeptIds.has(d.id));
    existing.departments.push(...newDepts);
  }
});

console.log('【去重后】');
console.log('  - 唯一college数量:', collegeMap.size);
console.log();

console.log('【最终树形结构预览】');
Array.from(collegeMap.values()).forEach((item, index) => {
  console.log(`${index + 1}. ${item.college.name} (ID: ${item.college.id})`);
  console.log(`   - departments: ${item.departments.length}个`);
  item.departments.forEach((dept, deptIndex) => {
    console.log(`     ${deptIndex + 1}. ${dept.name} (ID: ${dept.id})`);
  });
  console.log();
});

console.log('='.repeat(80));
console.log('✅ 测试完成');
console.log('='.repeat(80));

