import type { NewProjectForm, Project } from "~/type/project";
import { db } from "~/utils/db.server";

export async function create({ name, code, isActive }: NewProjectForm) {
  const project = await db.project.create({
    data: {
      name,
      code,
      isActive: Boolean(isActive),
    },
  });
  return project;
}

export async function toggle({id, isActive}: {id: number, isActive: boolean}) {
  await db.project.update({
    where: { id },
    data: { isActive },
  });
}

export async function remove({id}: {id: number}) {
  await db.project.delete({
    where: { id },
  });
}