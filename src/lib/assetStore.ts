import { useSyncExternalStore } from "react";

export interface AssetMachine {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  machine_number: string;
  machine_zone: string;
  location_building: string;
  location_floor: string;
  location_line: string;
  access_required: boolean;
  access_time_window: string;
  suggested_job_type: "electrical-control" | "mechanical" | "pneumatic-hydraulic" | "lubrication-fluid" | "other";
  status: "active" | "maintenance" | "inactive";
  created_at: string;
}

type Listener = () => void;

const INITIAL_ASSETS: AssetMachine[] = [
  {
    asset_id: "MCH-PR-2041",
    asset_name: "Hydraulic Press Machine #3",
    asset_type: "Hydraulic Press",
    machine_number: "HP-2041",
    machine_zone: "ZONE-B2",
    location_building: "อาคาร B",
    location_floor: "ชั้น 2",
    location_line: "Line 3",
    access_required: true,
    access_time_window: "08:00-17:00",
    suggested_job_type: "mechanical",
    status: "active",
    created_at: "2026-01-10T08:00:00.000Z",
  },
  {
    asset_id: "ELC-DB-5510",
    asset_name: "Main Distribution Board (MDB-2)",
    asset_type: "ตู้ควบคุมไฟฟ้า",
    machine_number: "DB-5510",
    machine_zone: "ELECTRICAL-ROOM",
    location_building: "อาคาร B",
    location_floor: "ชั้น 2",
    location_line: "ห้องไฟฟ้าหลัก",
    access_required: true,
    access_time_window: "09:00-16:30",
    suggested_job_type: "electrical-control",
    status: "active",
    created_at: "2026-01-12T09:30:00.000Z",
  },
  {
    asset_id: "CNV-ASSY-08",
    asset_name: "Assembly Belt Conveyor #8",
    asset_type: "Conveyor Assembly",
    machine_number: "CNV-08",
    machine_zone: "ASSEMBLY",
    location_building: "อาคารผลิตหลัก",
    location_floor: "ชั้น 1",
    location_line: "Assembly Line 8",
    access_required: false,
    access_time_window: "เข้าได้ตลอดเวลา",
    suggested_job_type: "mechanical",
    status: "active",
    created_at: "2026-01-15T11:00:00.000Z",
  },
  {
    asset_id: "AC-OFF-019",
    asset_name: "Chiller VRV Air Condition",
    asset_type: "ระบบปรับอากาศ central",
    machine_number: "AC-019",
    machine_zone: "MEETING-ROOM",
    location_building: "อาคารสำนักงาน",
    location_floor: "ชั้น 3",
    location_line: "ห้องประชุมใหญ่",
    access_required: false,
    access_time_window: "08:30-18:00",
    suggested_job_type: "other",
    status: "active",
    created_at: "2026-02-01T14:20:00.000Z",
  },
  {
    asset_id: "MCH-CNC-12",
    asset_name: "5-Axis CNC Milling Machine",
    asset_type: "CNC Machine",
    machine_number: "CNC-12",
    machine_zone: "MACHINING-ZONE",
    location_building: "อาคารโรงกลึง",
    location_floor: "ชั้น 1",
    location_line: "CNC Line A",
    access_required: true,
    access_time_window: "08:00-17:00",
    suggested_job_type: "mechanical",
    status: "active",
    created_at: "2026-02-10T10:15:00.000Z",
  },
  {
    asset_id: "PLB-WC-302",
    asset_name: "Water Pump System Floor 3",
    asset_type: "ระบบปั๊มน้ำอาคาร",
    machine_number: "PUMP-302",
    machine_zone: "UTILITY",
    location_building: "อาคารสำนักงาน",
    location_floor: "ชั้น 3",
    location_line: "ห้องสุขาชาย",
    access_required: false,
    access_time_window: "เข้าได้ตลอดเวลา",
    suggested_job_type: "other",
    status: "active",
    created_at: "2026-03-01T09:00:00.000Z",
  },
];

let assetsState: AssetMachine[] = INITIAL_ASSETS;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export const assetStore = {
  getAll(): AssetMachine[] {
    return assetsState;
  },
  getById(id: string): AssetMachine | undefined {
    return assetsState.find((a) => a.asset_id === id);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add(input: Omit<AssetMachine, "created_at">): AssetMachine {
    const newAsset: AssetMachine = {
      ...input,
      created_at: new Date().toISOString(),
    };
    assetsState = [newAsset, ...assetsState];
    emit();
    return newAsset;
  },
  update(id: string, patch: Partial<AssetMachine>) {
    assetsState = assetsState.map((a) => (a.asset_id === id ? { ...a, ...patch } : a));
    emit();
  },
  delete(id: string) {
    assetsState = assetsState.filter((a) => a.asset_id !== id);
    emit();
  },
};

export function useAssets(): AssetMachine[] {
  return useSyncExternalStore(
    (l) => assetStore.subscribe(l),
    () => assetStore.getAll(),
    () => assetStore.getAll()
  );
}
