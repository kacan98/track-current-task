export type TableColumn = {
  key: 'drag' | 'task' | 'repository' | 'heading' | 'hours' | 'action';
  label: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
};

export const TABLE_COLUMNS: readonly TableColumn[] = [
  { key: 'drag', label: '', sortable: false, width: 'w-8' },
  { key: 'task', label: 'Task' },
  { key: 'repository', label: 'Repository', hideOnMobile: true },
  { key: 'heading', label: 'Heading', hideOnMobile: true },
  { key: 'hours', label: 'Hours' },
  { key: 'action', label: 'Action', sortable: false },
] as const;