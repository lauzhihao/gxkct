#!/usr/bin/env node

/**
 * 验证Mock数据结构的完整性
 */

const fs = require('fs');
const path = require('path');

const mockDataDir = path.join(__dirname, '..', 'mock-data');

// 读取数据文件
const universities = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'universities.json'), 'utf-8'));
const departments = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'departments.json'), 'utf-8'));
const majors = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'majors.json'), 'utf-8'));
const courses = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'courses.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('Mock数据结构验证');
console.log('='.repeat(80));
console.log();

// 验证大学数据
console.log('【大学/工作坊数据】');
const sampleUniv = universities[0];
console.log('样本数据字段:');
console.log('  - id:', sampleUniv.id);
console.log('  - name:', sampleUniv.name);
console.log('  - type:', sampleUniv.type);
console.log('  - code:', sampleUniv.code);
console.log('  - metadata.code:', sampleUniv.metadata?.code);
console.log('  - metadata.address:', sampleUniv.metadata?.address);
console.log('  - metadata.website:', sampleUniv.metadata?.website);
console.log('  - metadata.description:', sampleUniv.metadata?.description ? '✓' : '✗');
console.log();

// 验证院系数据
console.log('【院系数据】');
const sampleDept = departments[0];
console.log('样本数据字段:');
console.log('  - id:', sampleDept.id);
console.log('  - name:', sampleDept.name);
console.log('  - type:', sampleDept.type);
console.log('  - code:', sampleDept.code);
console.log('  - universityId:', sampleDept.universityId);
console.log('  - metadata.code:', sampleDept.metadata?.code);
console.log('  - metadata.description:', sampleDept.metadata?.description ? '✓' : '✗');
console.log('  - metadata.dean:', sampleDept.metadata?.dean);
console.log();

// 验证专业数据
console.log('【专业数据】');
const sampleMajor = majors[0];
console.log('样本数据字段:');
console.log('  - id:', sampleMajor.id);
console.log('  - name:', sampleMajor.name);
console.log('  - type:', sampleMajor.type);
console.log('  - code:', sampleMajor.code);
console.log('  - departmentId:', sampleMajor.departmentId);
console.log('  - degree:', sampleMajor.degree);
console.log('  - duration:', sampleMajor.duration);
console.log('  - description:', sampleMajor.description ? '✓' : '✗');
console.log('  - objectives:', Array.isArray(sampleMajor.objectives) ? `✓ (${sampleMajor.objectives.length}条)` : '✗');
console.log('  - metadata.code:', sampleMajor.metadata?.code);
console.log('  - metadata.level:', sampleMajor.metadata?.level);
console.log('  - metadata.careerInfo:', Array.isArray(sampleMajor.metadata?.careerInfo) ? `✓ (${sampleMajor.metadata.careerInfo.length}条)` : '✗');
console.log('  - metadata.trainingObjectives:', sampleMajor.metadata?.trainingObjectives ? '✓' : '✗');
console.log('  - metadata.graduationRequirements:', Array.isArray(sampleMajor.metadata?.graduationRequirements) ? `✓ (${sampleMajor.metadata.graduationRequirements.length}条)` : '✗');
console.log();

// 验证课程数据
console.log('【课程数据】');
const sampleCourse = courses[0];
console.log('样本数据字段:');
console.log('  - id:', sampleCourse.id);
console.log('  - name:', sampleCourse.name);
console.log('  - type:', sampleCourse.type);
console.log('  - code:', sampleCourse.code);
console.log('  - majorId:', sampleCourse.majorId);
console.log('  - semester:', sampleCourse.semester);
console.log('  - credits:', sampleCourse.credits);
console.log('  - hours:', sampleCourse.hours);
console.log('  - description:', sampleCourse.description ? '✓' : '✗');
console.log('  - objectives:', Array.isArray(sampleCourse.objectives) ? `✓ (${sampleCourse.objectives.length}条)` : '✗');
console.log('  - coursePoints:', Array.isArray(sampleCourse.coursePoints) ? `✓ (${sampleCourse.coursePoints.length}条)` : '✗');
console.log('  - metadata.openingDate:', sampleCourse.metadata?.openingDate);
console.log('  - metadata.courseType:', sampleCourse.metadata?.courseType);
console.log('  - metadata.courseNature:', sampleCourse.metadata?.courseNature);
console.log('  - metadata.credits:', sampleCourse.metadata?.credits);
console.log('  - metadata.hours:', sampleCourse.metadata?.hours);
console.log('  - metadata.teachingObjectives:', Array.isArray(sampleCourse.metadata?.teachingObjectives) ? `✓ (${sampleCourse.metadata.teachingObjectives.length}条)` : '✗');
console.log('  - metadata.coursePoints:', Array.isArray(sampleCourse.metadata?.coursePoints) ? `✓ (${sampleCourse.metadata.coursePoints.length}条)` : '✗');
console.log('  - metadata.chapters:', Array.isArray(sampleCourse.metadata?.chapters) ? `✓ (${sampleCourse.metadata.chapters.length}条)` : '✗');
console.log();

console.log('='.repeat(80));
console.log('数据完整性检查');
console.log('='.repeat(80));
console.log();

// 检查关联关系
let errors = 0;

// 检查院系是否都有对应的大学
departments.forEach(dept => {
  const univ = universities.find(u => u.id === dept.universityId);
  if (!univ) {
    console.log(`✗ 院系 ${dept.id} 的大学ID ${dept.universityId} 不存在`);
    errors++;
  }
});

// 检查专业是否都有对应的院系
majors.forEach(major => {
  const dept = departments.find(d => d.id === major.departmentId);
  if (!dept) {
    console.log(`✗ 专业 ${major.id} 的院系ID ${major.departmentId} 不存在`);
    errors++;
  }
});

// 检查课程是否都有对应的专业
courses.forEach(course => {
  const major = majors.find(m => m.id === course.majorId);
  if (!major) {
    console.log(`✗ 课程 ${course.id} 的专业ID ${course.majorId} 不存在`);
    errors++;
  }
});

if (errors === 0) {
  console.log('✓ 所有数据关联关系正确');
} else {
  console.log(`✗ 发现 ${errors} 个关联错误`);
}

console.log();
console.log('='.repeat(80));
console.log('统计信息');
console.log('='.repeat(80));
console.log(`大学/工作坊: ${universities.length} 个`);
console.log(`院系/班组: ${departments.length} 个`);
console.log(`专业: ${majors.length} 个`);
console.log(`课程: ${courses.length} 门`);
console.log();

// 统计专业字段完整性
let majorsWithCareerInfo = 0;
let majorsWithGraduationReqs = 0;
majors.forEach(major => {
  if (major.metadata?.careerInfo && major.metadata.careerInfo.length > 0) {
    majorsWithCareerInfo++;
  }
  if (major.metadata?.graduationRequirements && major.metadata.graduationRequirements.length > 0) {
    majorsWithGraduationReqs++;
  }
});

console.log('专业数据完整性:');
console.log(`  - 包含职业信息: ${majorsWithCareerInfo}/${majors.length} (${(majorsWithCareerInfo/majors.length*100).toFixed(1)}%)`);
console.log(`  - 包含毕业要求: ${majorsWithGraduationReqs}/${majors.length} (${(majorsWithGraduationReqs/majors.length*100).toFixed(1)}%)`);
console.log();

// 统计课程字段完整性
let coursesWithObjectives = 0;
let coursesWithPoints = 0;
let coursesWithChapters = 0;
courses.forEach(course => {
  if (course.metadata?.teachingObjectives && course.metadata.teachingObjectives.length > 0) {
    coursesWithObjectives++;
  }
  if (course.metadata?.coursePoints && course.metadata.coursePoints.length > 0) {
    coursesWithPoints++;
  }
  if (course.metadata?.chapters && course.metadata.chapters.length > 0) {
    coursesWithChapters++;
  }
});

console.log('课程数据完整性:');
console.log(`  - 包含教学目标: ${coursesWithObjectives}/${courses.length} (${(coursesWithObjectives/courses.length*100).toFixed(1)}%)`);
console.log(`  - 包含课点信息: ${coursesWithPoints}/${courses.length} (${(coursesWithPoints/courses.length*100).toFixed(1)}%)`);
console.log(`  - 包含章节信息: ${coursesWithChapters}/${courses.length} (${(coursesWithChapters/courses.length*100).toFixed(1)}%)`);
console.log();

console.log('='.repeat(80));
console.log('✅ 验证完成');
console.log('='.repeat(80));

