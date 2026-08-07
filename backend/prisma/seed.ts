import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting Full Comprehensive Database Seed...');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // 1. Departments Seed
  const deptMaint = await prisma.departments.upsert({
    where: { dept_code: 'DEPT-MAINT' },
    update: {},
    create: { dept_code: 'DEPT-MAINT', dept_name: 'แผนกซ่อมบำรุงโรงงาน' },
  });

  const deptProd = await prisma.departments.upsert({
    where: { dept_code: 'DEPT-PROD' },
    update: {},
    create: { dept_code: 'DEPT-PROD', dept_name: 'ฝ่ายผลิตและประกอบ' },
  });

  // 2. Users Seed
  const tech1 = await prisma.users.upsert({
    where: { emp_id: 'TECH001' },
    update: { password_hash: passwordHash },
    create: {
      emp_id: 'TECH001',
      name: 'บอส',
      password_hash: passwordHash,
      role: 'technician',
      department_id: deptMaint.id,
      skills: ['Electrical', 'PLC', 'Control Systems'],
    },
  });

  const tech2 = await prisma.users.upsert({
    where: { emp_id: 'TECH002' },
    update: { password_hash: passwordHash },
    create: {
      emp_id: 'TECH002',
      name: 'ตะวัน',
      password_hash: passwordHash,
      role: 'technician',
      department_id: deptMaint.id,
      skills: ['Mechanical', 'Pneumatics', 'Hydraulics'],
    },
  });

  const super1 = await prisma.users.upsert({
    where: { emp_id: 'SUP001' },
    update: { password_hash: passwordHash },
    create: {
      emp_id: 'SUP001',
      name: 'อาร์ม',
      password_hash: passwordHash,
      role: 'supervisor',
      department_id: deptMaint.id,
      skills: ['Management', 'QC', 'Safety'],
    },
  });

  const req1 = await prisma.users.upsert({
    where: { emp_id: 'REQ042' },
    update: { password_hash: passwordHash },
    create: {
      emp_id: 'REQ042',
      name: 'โฟกัส',
      password_hash: passwordHash,
      role: 'requester',
      department_id: deptProd.id,
      skills: ['Production Line 1'],
    },
  });

  // 3. Assets Seed (6 Machine Assets)
  const asset1 = await prisma.assets.upsert({
    where: { asset_code: 'MCH-PR-2041' },
    update: {},
    create: {
      asset_code: 'MCH-PR-2041',
      name: 'Hydraulic Press Line 3 (เครื่องปั๊มขึ้นรูป)',
      category: 'mechanical',
      brand: 'Komatsu',
      model: 'HP-2041',
      serial_number: 'KM-2041-99',
      location: 'อาคาร B ชั้น 2 Line 3',
      status: 'operational',
    },
  });

  const asset2 = await prisma.assets.upsert({
    where: { asset_code: 'ELC-DB-5510' },
    update: {},
    create: {
      asset_code: 'ELC-DB-5510',
      name: 'ตู้ควบคุมไฟฟ้า Main DB-01',
      category: 'electrical-control',
      brand: 'Schneider',
      model: 'DB-5510',
      serial_number: 'SCH-5510-01',
      location: 'อาคาร B ชั้น 2 ห้องไฟฟ้า',
      status: 'operational',
    },
  });

  const asset3 = await prisma.assets.upsert({
    where: { asset_code: 'CNV-ASSY-08' },
    update: {},
    create: {
      asset_code: 'CNV-ASSY-08',
      name: 'Conveyor Assembly Line #8',
      category: 'mechanical',
      brand: 'Tsubaki',
      model: 'CNV-08',
      serial_number: 'TSB-08-2024',
      location: 'อาคารผลิตหลัก ชั้น 1 Assembly #8',
      status: 'maintenance',
    },
  });

  const asset4 = await prisma.assets.upsert({
    where: { asset_code: 'MC-CNC-001' },
    update: {},
    create: {
      asset_code: 'MC-CNC-001',
      name: 'เครื่องกัด CNC 5 แกน (Haas VF-2SS)',
      category: 'mechanical',
      brand: 'Haas',
      model: 'CNC-001',
      serial_number: 'SN-2023-9981',
      location: 'อาคาร A ชั้น 1 โซนการผลิต 1',
      status: 'breakdown',
    },
  });

  const asset5 = await prisma.assets.upsert({
    where: { asset_code: 'MC-ARM-002' },
    update: {},
    create: {
      asset_code: 'MC-ARM-002',
      name: 'หุ่นยนต์เชื่อมพ่นสี (KUKA KR-10)',
      category: 'electrical-control',
      brand: 'KUKA',
      model: 'ARM-002',
      serial_number: 'SN-2022-4412',
      location: 'อาคาร B ชั้น 1 ไลน์ประกอบ',
      status: 'breakdown',
    },
  });

  const asset6 = await prisma.assets.upsert({
    where: { asset_code: 'PMP-HYD-003' },
    update: {},
    create: {
      asset_code: 'PMP-HYD-003',
      name: 'ปั๊มไฮดรอลิกกำลังสูง (Bosch Rexroth)',
      category: 'pneumatic-hydraulic',
      brand: 'Bosch Rexroth',
      model: 'PMP-003',
      serial_number: 'SN-2021-1102',
      location: 'อาคาร A ชั้น 1 ห้องปั๊มน้ำ',
      status: 'operational',
    },
  });

  // 4. Spare Parts Seed
  const part1 = await prisma.spare_parts.upsert({
    where: { part_code: 'SP-HYD-004' },
    update: {},
    create: { part_code: 'SP-HYD-004', name: 'ซีลยางกันน้ำมัน 50mm', unit_price: 350.00, stock_qty: 24, unit: 'ชิ้น' },
  });

  const part2 = await prisma.spare_parts.upsert({
    where: { part_code: 'SP-ELC-112' },
    update: {},
    create: { part_code: 'SP-ELC-112', name: 'เบรกเกอร์ 3P 100A', unit_price: 2450.00, stock_qty: 6, unit: 'ตัว' },
  });

  const part3 = await prisma.spare_parts.upsert({
    where: { part_code: 'SP-BRG-201' },
    update: {},
    create: { part_code: 'SP-BRG-201', name: 'ตลับลูกปืน 6204ZZ', unit_price: 680.00, stock_qty: 18, unit: 'ลูก' },
  });

  // 5. Maintenance Requests Seed (Comprehensive Status Workflows)
  const reqWO1 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0001' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0001',
      asset_id: asset1.id,
      reported_by_id: req1.id,
      assigned_technician_id: tech1.id,
      category: 'mechanical',
      priority: 'high',
      status: 'doing',
      problem_title: 'ปั๊มไฮดรอลิกรั่วและมีเสียงดังผิดปกติ',
      description: 'พบน้ำมันไฮดรอลิกหยดบริเวณฐานเครื่อง Press แรงดันตกขณะทำงาน',
      estimated_hours: 4.00,
      actual_hours: 3.50,
      root_cause: 'O-ring ซีลแรงดันสูงเสื่อมสภาพตามอายุการใช้งาน',
      action_taken: 'เปลี่ยน O-ring ใหม่และเปลี่ยนถ่ายน้ำมันไฮดรอลิก ISO VG 46',
      preventive_note: 'เพิ่มจุดตรวจเช็คซีล O-ring ในตาราง PM ทุก 3 เดือน',
    },
  });

  const reqWO2 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0002' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0002',
      asset_id: asset2.id,
      reported_by_id: req1.id,
      assigned_technician_id: tech1.id,
      category: 'electrical-control',
      priority: 'critical',
      status: 'waiting',
      problem_title: 'Magnetic Contactor ตู้ควบคุมตัดบ่อย',
      description: 'Magnetic Contactor อุณหภูมิสูงผิดปกติ ทำให้ Breaker ตัดวงจร',
      estimated_hours: 2.00,
    },
  });

  const reqWO3 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0003' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0003',
      asset_id: asset3.id,
      reported_by_id: req1.id,
      assigned_technician_id: tech2.id,
      category: 'mechanical',
      priority: 'medium',
      status: 'complete',
      problem_title: 'โซ่ลำเลียง Conveyor หย่อนและตึงไม่เท่ากัน',
      description: 'สายพานกระตุกขณะลำเลียงชิ้นงาน',
      estimated_hours: 1.50,
      actual_hours: 1.50,
      root_cause: 'สลักตั้งโซ่หลวม',
      action_taken: 'ปรับตั้งความตึงโซ่และขันล็อกสลักใหม่',
      preventive_note: 'หยอดน้ำมันลื่นโซ่สัปดาห์ละครั้ง',
    },
  });

  const reqWO4 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0004' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0004',
      asset_id: asset4.id,
      reported_by_id: req1.id,
      assigned_technician_id: null,
      category: 'mechanical',
      priority: 'high',
      status: 'open',
      problem_title: 'หัวกัด CNC Vibration สูงผิดปกติ',
      description: 'พบเสียงสั่นสะเทือนขณะกัดชิ้นงานอลูมิเนียม',
    },
  });

  const reqWO5 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0005' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0005',
      asset_id: asset5.id,
      reported_by_id: req1.id,
      assigned_technician_id: tech1.id,
      category: 'electrical-control',
      priority: 'medium',
      status: 'assess',
      problem_title: 'หุ่นยนต์เชื่อมพ่นสี Alarm Error Code E-502',
      description: 'แขนกลหยุดทำงานกะทันหันขณะพ่นสีชิ้นงาน',
    },
  });

  const reqWO6 = await prisma.maintenance_requests.upsert({
    where: { work_order_no: 'WO-20260806-0006' },
    update: {},
    create: {
      work_order_no: 'WO-20260806-0006',
      asset_id: asset6.id,
      reported_by_id: req1.id,
      assigned_technician_id: tech2.id,
      category: 'pneumatic-hydraulic',
      priority: 'low',
      status: 'done',
      problem_title: 'เปลี่ยนไส้กรองและตรวจสอบแรงดันปั๊มไฮดรอลิก',
      description: 'ตรวจเช็คตามรอบบำรุงรักษาและทำความสะอาด',
      estimated_hours: 1.00,
      actual_hours: 1.00,
    },
  });

  // 6. Dual Signatures Seed
  await prisma.dual_signatures.upsert({
    where: { request_id: reqWO6.id },
    update: {},
    create: {
      request_id: reqWO6.id,
      approver1_name: 'ประเสริฐ (หัวหน้าช่าง)',
      approver1_role: 'Supervisor',
      approver1_department: 'แผนกซ่อมบำรุง',
      approver1_sig_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      approver1_signed_at: new Date(),
      approver2_name: 'นภดล (ฝ่ายผลิต)',
      approver2_role: 'ผู้แจ้งซ่อม',
      approver2_department: 'ฝ่ายผลิต',
      approver2_signed_at: new Date(),
      approver2_sig_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      note: 'ตรวจรับงานซ่อมและทดสอบรันเครื่องปกติแล้ว',
    },
  });

  console.log('✅ Comprehensive Seed completed successfully into PostgreSQL Database!');
}

seed()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
