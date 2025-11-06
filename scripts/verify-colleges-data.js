#!/usr/bin/env node

/**
 * 验证colleges.json数据结构的完整性
 */

const fs = require('fs');
const path = require('path');

const mockDataDir = path.join(__dirname, '..', 'mock-data');

// 读取colleges.json
const collegesData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'colleges.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('colleges.json数据结构验证');
console.log('='.repeat(80));
console.log();

// 验证响应格式
console.log('【响应格式验证】');
console.log('  - code:', collegesData.code);
console.log('  - message:', collegesData.message);
console.log('  - success:', collegesData.success);
console.log('  - data存在:', collegesData.data ? '✓' : '✗');
console.log();

if (collegesData.code !== "0") {
  console.log('✗ 错误: code不为"0"，表示请求失败');
  process.exit(1);
}

if (!collegesData.data || !collegesData.data.colleges) {
  console.log('✗ 错误: data.colleges不存在');
  process.exit(1);
}

const { colleges, current } = collegesData.data;

console.log('【数据统计】');
console.log('  - colleges数组长度:', colleges.length);
console.log('  - current存在:', current ? '✓' : '✗');
console.log();

// 统计collegeType
const collegeTypeStats = {};
colleges.forEach(item => {
  const type = item.college.collegeType;
  collegeTypeStats[type] = (collegeTypeStats[type] || 0) + 1;
});

console.log('【collegeType统计】');
Object.entries(collegeTypeStats).forEach(([type, count]) => {
  console.log(`  - collegeType="${type}": ${count}个`);
});
console.log();

// 统计collegeType=1的数量
const type1Colleges = colleges.filter(item => item.college.collegeType === "1");
console.log('【过滤结果】');
console.log('  - collegeType="1"的数量:', type1Colleges.length);
console.log('  - 将被过滤掉的数量:', colleges.length - type1Colleges.length);
console.log();

// 统计college去重前后的数量
const collegeIds = colleges.map(item => item.college.id);
const uniqueCollegeIds = [...new Set(collegeIds)];
console.log('【去重统计】');
console.log('  - 去重前college数量:', collegeIds.length);
console.log('  - 去重后college数量:', uniqueCollegeIds.length);
console.log('  - 重复的college数量:', collegeIds.length - uniqueCollegeIds.length);
console.log();

// 找出重复的college
const duplicates = collegeIds.filter((id, index) => collegeIds.indexOf(id) !== index);
if (duplicates.length > 0) {
  console.log('【重复的college ID】');
  const uniqueDuplicates = [...new Set(duplicates)];
  uniqueDuplicates.forEach(id => {
    const count = collegeIds.filter(cid => cid === id).length;
    const college = colleges.find(item => item.college.id === id).college;
    console.log(`  - ID ${id}: "${college.name}" (出现${count}次)`);
  });
  console.log();
}

// 验证第一个college的数据结构
console.log('【样本数据结构】');
const sampleCollege = colleges[0];
console.log('college字段:');
console.log('  - id:', sampleCollege.college.id);
console.log('  - name:', sampleCollege.college.name);
console.log('  - image:', sampleCollege.college.image || '(空)');
console.log('  - collegeType:', sampleCollege.college.collegeType);
console.log();

console.log('departments字段:');
console.log('  - 数量:', sampleCollege.departments.length);
if (sampleCollege.departments.length > 0) {
  const sampleDept = sampleCollege.departments[0];
  console.log('  - 样本department:');
  console.log('    - id:', sampleDept.id);
  console.log('    - collegeId:', sampleDept.collegeId);
  console.log('    - name:', sampleDept.name);
  console.log('    - type:', sampleDept.type || '(null)');
}
console.log();

console.log('其他字段:');
console.log('  - permissionId:', sampleCollege.permissionId);
console.log('  - relativeId:', sampleCollege.relativeId);
console.log();

// 统计departments数量
let totalDepartments = 0;
colleges.forEach(item => {
  totalDepartments += item.departments.length;
});

console.log('【departments统计】');
console.log('  - 总departments数量:', totalDepartments);
console.log('  - 平均每个college的departments数量:', (totalDepartments / colleges.length).toFixed(2));
console.log();

// 验证current数据
if (current) {
  console.log('【current数据】');
  console.log('  - id:', current.id);
  console.log('  - userId:', current.userId);
  console.log('  - permissionId:', current.permissionId);
  console.log('  - relativeId:', current.relativeId);
  console.log('  - multiple:', current.multiple);
  if (current.department) {
    console.log('  - department:');
    console.log('    - id:', current.department.id);
    console.log('    - collegeId:', current.department.collegeId);
    console.log('    - name:', current.department.name);
  }
  if (current.college) {
    console.log('  - college:');
    console.log('    - id:', current.college.id);
    console.log('    - name:', current.college.name);
  }
  console.log();
}

console.log('='.repeat(80));
console.log('✅ 验证完成');
console.log('='.repeat(80));

