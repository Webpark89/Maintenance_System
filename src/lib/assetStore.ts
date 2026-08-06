import { useState, useEffect } from "react";
import { api } from "./api";

export type AssetMachine = {
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
  suggested_job_type: "mechanical" | "electrical-control" | "pneumatic-hydraulic" | "other";
  status: "active" | "maintenance";
  created_at?: string;
};

export const FALLBACK_ASSET_MACHINES: AssetMachine[] = [
  {
    asset_id: "MCH-PR-2041",
    asset_name: "Hydraulic Press Line 3 (เครื่องปั๊มขึ้นรูป)",
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
  },
  {
    asset_id: "ELC-DB-5510",
    asset_name: "ตู้ควบคุมไฟฟ้า Main DB-01",
    asset_type: "ตู้ควบคุมไฟฟ้า",
    machine_number: "DB-5510",
    machine_zone: "ELECTRICAL-ROOM",
    location_building: "อาคาร B",
    location_floor: "ชั้น 2",
    location_line: "ห้องไฟฟ้า",
    access_required: true,
    access_time_window: "09:00-16:30",
    suggested_job_type: "electrical-control",
    status: "active",
  },
  {
    asset_id: "CNV-ASSY-08",
    asset_name: "Conveyor Assembly Line #8",
    asset_type: "Conveyor Assembly",
    machine_number: "CNV-08",
    machine_zone: "ASSEMBLY",
    location_building: "อาคารผลิตหลัก",
    location_floor: "ชั้น 1",
    location_line: "Assembly #8",
    access_required: false,
    access_time_window: "เข้าได้ตลอดเวลา",
    suggested_job_type: "mechanical",
    status: "maintenance",
  },
  {
    asset_id: "MC-CNC-001",
    asset_name: "เครื่องกัด CNC 5 แกน (Haas VF-2SS)",
    asset_type: "CNC Milling",
    machine_number: "CNC-001",
    machine_zone: "ZONE-A",
    location_building: "อาคาร A",
    location_floor: "ชั้น 1",
    location_line: "โซนการผลิต 1",
    access_required: false,
    access_time_window: "08:00-17:00",
    suggested_job_type: "mechanical",
    status: "maintenance",
  },
  {
    asset_id: "MC-ARM-002",
    asset_name: "หุ่นยนต์เชื่อมพ่นสี (KUKA KR-10)",
    asset_type: "Robotic Arm",
    machine_number: "ARM-002",
    machine_zone: "ZONE-B",
    location_building: "อาคาร B",
    location_floor: "ชั้น 1",
    location_line: "ไลน์ประกอบ",
    access_required: true,
    access_time_window: "08:00-17:00",
    suggested_job_type: "electrical-control",
    status: "maintenance",
  },
  {
    asset_id: "PMP-HYD-003",
    asset_name: "ปั๊มไฮดรอลิกกำลังสูง (Bosch Rexroth)",
    asset_type: "Hydraulic Pump",
    machine_number: "PMP-003",
    machine_zone: "PUMP-ROOM",
    location_building: "อาคาร A",
    location_floor: "ชั้น 1",
    location_line: "ห้องปั๊มน้ำ",
    access_required: false,
    access_time_window: "เข้าได้ตลอดเวลา",
    suggested_job_type: "pneumatic-hydraulic",
    status: "active",
  },
];

export async function fetchAssetsFromApi(): Promise<AssetMachine[]> {
  try {
    const res = await api.get("/assets");
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data.data.map((item: any) => ({
        asset_id: item.asset_code,
        asset_name: item.name,
        asset_type: item.category || "เครื่องกล",
        machine_number: item.model || item.serial_number || "MCH-01",
        machine_zone: "ZONE-A",
        location_building: item.location || "อาคารผลิตหลัก",
        location_floor: "ชั้น 1",
        location_line: "Line 1",
        access_required: false,
        access_time_window: "08:00-17:00",
        suggested_job_type: (item.category as any) || "mechanical",
        status: item.status === "operational" ? "active" : "maintenance",
        created_at: item.created_at,
      }));
    }
    return FALLBACK_ASSET_MACHINES;
  } catch (error) {
    console.warn("Fetch assets from API failed, using Self-Healing fallback catalog:", error);
    return FALLBACK_ASSET_MACHINES;
  }
}

export async function createAssetApi(data: {
  asset_code: string;
  name: string;
  location: string;
  category: string;
  brand?: string;
  model?: string;
  serial_number?: string;
}) {
  const res = await api.post("/assets", data);
  return res.data;
}

export const assetStore = {
  add: (data: any) => {
    createAssetApi({
      asset_code: data.asset_id,
      name: data.asset_name,
      location: `${data.location_building} ${data.location_floor}`,
      category: data.suggested_job_type || 'mechanical',
    });
  },
  update: () => {},
  delete: () => {},
};

export function useAssets() {
  const [assets, setAssets] = useState<AssetMachine[]>(FALLBACK_ASSET_MACHINES);

  useEffect(() => {
    let isMounted = true;
    fetchAssetsFromApi().then((data) => {
      if (isMounted && data.length > 0) {
        setAssets(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return assets;
}
