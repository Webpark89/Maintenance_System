# FixFlow CMMS - Database Schema & Backend API Specifications

เอกสารนี้จัดทำขึ้นเพื่อเตรียมความพร้อมสำหรับการพัฒนาระบบฝั่ง **Backend (Node.js/Express, Go, NestJS หรือ Python)** และ **Database (PostgreSQL / MySQL)** รองรับระบบสิทธิ์การใช้งานของ **ช่างซ่อม (Technician)** และ **หัวหน้าช่าง (Supervisor)**

---

## 🗄️ 1. Relational Database Schema Design (PostgreSQL / MySQL)

### 1.1 Table: `users` (ตารางผู้ใช้งานและบทบาท)
```sql
CREATE TYPE user_role AS ENUM ('requester', 'technician', 'supervisor');

CREATE TABLE users (
    emp_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'technician',
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    skills JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Table: `assets` (ตารางทะเบียนเครื่องจักร & QR Tag)
```sql
CREATE TABLE assets (
    asset_id VARCHAR(50) PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    machine_number VARCHAR(100) NOT NULL,
    machine_zone VARCHAR(100) NOT NULL,
    location_building VARCHAR(100) NOT NULL,
    location_floor VARCHAR(50),
    location_line VARCHAR(50),
    access_required BOOLEAN DEFAULT FALSE,
    access_time_window VARCHAR(100) DEFAULT '08:00-17:00',
    suggested_job_type VARCHAR(100) DEFAULT 'mechanical',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Table: `work_requests` (ตารางใบแจ้งซ่อม)
```sql
CREATE TYPE work_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE work_status AS ENUM ('open', 'assess', 'waiting', 'doing', 'done', 'qc1', 'qc2', 'complete');

CREATE TABLE work_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    asset_id VARCHAR(50) REFERENCES assets(asset_id),
    asset_name VARCHAR(255) NOT NULL,
    asset_location VARCHAR(255) NOT NULL,
    issue_summary TEXT NOT NULL,
    priority work_priority NOT NULL DEFAULT 'medium',
    status work_status NOT NULL DEFAULT 'open',
    sub_status VARCHAR(100) NOT NULL DEFAULT 'reported',
    reported_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reported_by VARCHAR(255) NOT NULL,
    reported_by_id VARCHAR(50) REFERENCES users(emp_id),
    reported_by_department VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    assigned_to VARCHAR(50) REFERENCES users(emp_id),
    is_locked BOOLEAN DEFAULT FALSE, -- ล็อกการแก้ไขย้อนหลังเมื่อ status = 'complete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.4 Table: `cancellation_requests` (ตารางขอยกเลิกงานซ่อม - ช่างยื่นให้ Supervisor อนุมัติ)
```sql
CREATE TYPE cancellation_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE cancellation_requests (
    cancellation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) NOT NULL REFERENCES work_requests(request_id) ON DELETE CASCADE,
    requested_by_id VARCHAR(50) NOT NULL REFERENCES users(emp_id),
    requested_by_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status cancellation_status DEFAULT 'pending',
    approved_by_id VARCHAR(50) REFERENCES users(emp_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.5 Table: `stock_requisitions` & `requisition_items` (ตารางการเบิกอะไหล่ & อนุมัติเบิกมูลค่าสูง)
```sql
CREATE TABLE stock_requisitions (
    requisition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) NOT NULL REFERENCES work_requests(request_id) ON DELETE CASCADE,
    total_price DECIMAL(12, 2) DEFAULT 0.00,
    parts_ready BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE, -- True หากยอดรวม >= 10,000 บาท
    approval_status VARCHAR(50) DEFAULT 'none', -- 'none', 'pending', 'approved', 'rejected'
    approved_by_id VARCHAR(50) REFERENCES users(emp_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requisition_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL REFERENCES stock_requisitions(requisition_id) ON DELETE CASCADE,
    part_id VARCHAR(50) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.6 Table: `status_timelines` (Audit Log บันทึกประวัติการเปลี่ยนสถานะและการกระทำ)
```sql
CREATE TABLE status_timelines (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) NOT NULL REFERENCES work_requests(request_id) ON DELETE CASCADE,
    status work_status NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    updated_by_role VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 2. RESTful API Endpoints Specification

### 👥 User & Assignment Endpoints
* `GET /api/technicians` - ดึงรายชื่อช่างซ่อมในทีมทั้งหมด (สำหรับ Supervisor เลือกมอบหมายงาน)
* `PATCH /api/requests/:id/assign` - มอบหมาย/เปลี่ยนตัวช่างผู้รับผิดชอบ (เฉพาะ Supervisor)
  ```json
  // Request Body
  {
    "assigned_to": "TECH002",
    "supervisor_id": "SUP001"
  }
  ```

### 🚫 Cancellation & Deletion Endpoints
* `POST /api/requests/:id/cancel-request` - ช่างซ่อมยื่นขอยกเลิกงานซ่อม
  ```json
  // Request Body
  {
    "reason": "ข้อมูลซ้ำซ้อน ผู้แจ้งยกเลิกการแจ้งซ่อม",
    "requested_by": "TECH001"
  }
  ```
* `POST /api/requests/:id/approve-cancellation` - Supervisor กดอนุมัติ/ปฏิเสธการยกเลิกงาน
  ```json
  // Request Body
  {
    "approved": true,
    "note": "อนุมัติยกเลิกตามคำขอ",
    "supervisor_id": "SUP001"
  }
  ```
* `DELETE /api/requests/:id` - Supervisor ลบใบแจ้งซ่อมโดยตรง (เฉพาะ Supervisor)

### 💰 High-Cost Requisition Approval Endpoints
* `POST /api/requests/:id/requisitions/approve` - Supervisor อนุมัติการเบิกอะไหล่มูลค่าสูง (>= ฿10,000)
  ```json
  // Request Body
  {
    "approved": true,
    "supervisor_id": "SUP001"
  }
  ```

### 🔒 Lock Middleware Rules (Role-based Lock)
* เมื่อ `work_requests.status = 'complete'`:
  - Middleware จะบล็อก Request ประเภท `PUT`, `PATCH`, `POST` สำหรับ Role `technician` ใน Endpoint การแก้ไข Assessment, อะไหล่, และสถานะย้อนหลัง (HTTP 403 Forbidden: "Completed work requests are locked from editing to prevent KPI falsification.")
