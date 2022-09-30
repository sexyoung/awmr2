export type NewProjectForm = {
  name: string;
  code?: string;
  isActive?: string;
}

export type Project = {
  id: number;
  name: string;
  code: string | null;
  isActive: boolean;
}