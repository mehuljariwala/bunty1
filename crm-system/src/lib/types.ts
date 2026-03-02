export type RateValues = Record<string, Record<string, string>>;

export interface Party {
  id: string;
  name: string;
  address: string;
  addressGu?: string;
  addressHi?: string;
  route: string;
  userId: string;
  password: string;
  status: "Enable" | "Disable";
  rates: RateValues;
}

export interface RouteDoc {
  id: string;
  name: string;
  code: string;
  area: string;
  description: string;
  active: boolean;
  parties: number;
  createdAt: string;
}

export interface OrderItem {
  category: string;
  material: string;
  color: string;
  orderedQty: number;
  deliveredQty: number;
}

export interface Order {
  id: string;
  csvId: number;
  partyName: string;
  partyAddress: string;
  partyAddressGu?: string;
  route: string;
  orderDate: string;
  type: "Running" | "Complete";
  items?: OrderItem[];
  grandTotalOrdered?: number;
  grandTotalDelivered?: number;
}

export interface SubAdmin {
  id: string;
  csvId: number;
  name: string;
  password: string;
  email: string;
  createdAt: string;
  allowedPages?: string[];
}

export interface PhotoRecord {
  id: string;
  orderId: string;
  orderCsvId: number;
  partyName: string;
  route: string;
  orderDate: string;
  sequenceNumber: number;
  orderSnapshot: Order;
  capturedAt: string;
  status?: "pending" | "complete";
}

export interface Color {
  id: string;
  name: string;
  code: string;
  hex: string;
  category: string;
  subCategory: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  runningColor: boolean;
  sortOrder: number;
  createdAt: string;
}
