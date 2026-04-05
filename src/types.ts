export interface CounterItem {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface Project {
  id: string;
  name: string;
  items: CounterItem[];
  createdAt: number;
}

export interface Template {
  id: string;
  name: string;
  items: Omit<CounterItem, "id" | "count">[];
}
