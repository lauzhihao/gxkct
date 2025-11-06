#!/usr/bin/env node

/**
 * 测试departments.json数据适配逻辑
 */

const fs = require('fs');
const path = require('path');

const mockDataDir = path.join(__dirname, '..', 'mock-data');

// 读取departments.json
const departmentsData = JSON.parse(fs.readFileSync(path.join(mockDataDir, 'departments.json'), 'utf-8'));

console.log('='.repeat(80));
console.log('测试departments.json数据适配逻辑');
console.log('='.repeat(80));
console.log();

// 验证响应格式
console.log('【响应格式验证】');
console.log('  - code:', departmentsData.code);
console.log('  - message:', departmentsData.message);
console.log('  - success:', departmentsData.success);
console.log('  - data存在:', departmentsData.data ? '✓' : '✗');
console.log();

if (departmentsData.code !== "0" || !departmentsData.data) {
  console.log('✗ 错误: departments.json数据格式错误');
  process.exit(1);
}

const { lang, title, btns, departments, current, data, datatype } = departmentsData.data;

console.log('【数据统计】');
console.log('  - lang:', lang);
console.log('  - title:', title);
console.log('  - btns数量:', btns.length);
console.log('  - departments数量:', departments.length);
console.log('  - current:', current ? `${current.name} (ID: ${current.id})` : '无');
console.log('  - data数组长度:', data.length);
console.log('  - datatype:', datatype);
console.log();

console.log('【btns按钮】');
btns.forEach((btn, index) => {
  console.log(`${index + 1}. ${btn.label}`);
  console.log(`   - type: ${btn.type}`);
  console.log(`   - value: ${btn.value}`);
  console.log(`   - path: ${btn.path || '(空)'}`);
});
console.log();

console.log('【departments列表】');
departments.slice(0, 5).forEach((dept, index) => {
  console.log(`${index + 1}. ${dept.name} (ID: ${dept.id})`);
  console.log(`   - collegeId: ${dept.collegeId}`);
  console.log(`   - type: ${dept.type}`);
});
if (departments.length > 5) {
  console.log(`... 还有 ${departments.length - 5} 个departments`);
}
console.log();

console.log('【专业数据 (data数组)】');
console.log(`总共 ${data.length} 个专业`);
console.log();

// 显示前3个专业的详细信息
console.log('【前3个专业详情】');
data.slice(0, 3).forEach((item, index) => {
  console.log(`${index + 1}. ${item.self.label} (ID: ${item.self.value})`);
  console.log(`   - 所属院系: ${item.parent.label} (ID: ${item.parent.value})`);
  console.log(`   - 管理员数量: ${item.manager.length}`);
  item.manager.forEach((mgr, mgrIndex) => {
    console.log(`     ${mgrIndex + 1}. ${mgr.label} (${mgr.value})`);
  });
  console.log(`   - 按钮菜单数量: ${item.btnMenus.length}`);
  item.btnMenus.forEach((menu, menuIndex) => {
    console.log(`     ${menuIndex + 1}. ${menu.label} (${menu.value})`);
  });
  console.log();
});

// 模拟TreeNode转换
console.log('【模拟TreeNode转换】');
const majors = data.map((item) => ({
  id: `major-${item.self.value}`,
  name: item.self.label,
  type: "major",
  children: [],
  metadata: {
    majorId: item.self.value,
    parentDeptId: item.parent.value,
    parentDeptName: item.parent.label,
    managers: item.manager,
    btnMenus: item.btnMenus,
    coverMenus: item.coverMenus,
    lang: item.lang,
  },
}));

console.log(`转换后的TreeNode数量: ${majors.length}`);
console.log();

console.log('【转换后的前3个TreeNode】');
majors.slice(0, 3).forEach((major, index) => {
  console.log(`${index + 1}. ${major.name}`);
  console.log(`   - id: ${major.id}`);
  console.log(`   - type: ${major.type}`);
  console.log(`   - metadata.majorId: ${major.metadata.majorId}`);
  console.log(`   - metadata.parentDeptId: ${major.metadata.parentDeptId}`);
  console.log(`   - metadata.parentDeptName: ${major.metadata.parentDeptName}`);
  console.log(`   - metadata.managers: ${major.metadata.managers.length}个`);
  console.log(`   - metadata.btnMenus: ${major.metadata.btnMenus.length}个`);
  console.log();
});

// 按院系分组统计
console.log('【按院系分组统计】');
const majorsByDept = {};
data.forEach((item) => {
  const deptId = item.parent.value;
  const deptName = item.parent.label;
  if (!majorsByDept[deptId]) {
    majorsByDept[deptId] = {
      name: deptName,
      count: 0,
      majors: [],
    };
  }
  majorsByDept[deptId].count++;
  majorsByDept[deptId].majors.push(item.self.label);
});

Object.entries(majorsByDept).forEach(([deptId, info]) => {
  console.log(`院系: ${info.name} (ID: ${deptId})`);
  console.log(`  - 专业数量: ${info.count}`);
  console.log(`  - 专业列表: ${info.majors.slice(0, 3).join(', ')}${info.count > 3 ? ` ... 等${info.count}个` : ''}`);
  console.log();
});

console.log('='.repeat(80));
console.log('✅ 测试完成');
console.log('='.repeat(80));

