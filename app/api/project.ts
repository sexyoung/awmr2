import { Project } from "@prisma/client";
import type { NewProjectForm } from "~/type/project";
import { db } from "~/utils/db.server";
import { cache, cacheAll, deleteCache } from "./cache/project.cache";
import { deleteCache as deleteAreaCache } from "./cache/area.cache";

import { RecordCount } from "./record";

export async function create({ name, code, isActive }: NewProjectForm) {
  const project = await db.project.create({
    data: {
      name,
      code,
      isActive: Boolean(isActive),
    },
  });
  await cache(project.id);
  return project;
}

export async function toggle({id, isActive}: {id: number, isActive: boolean}) {
  await db.project.update({
    where: { id },
    data: { isActive },
  });
  await cache(id);
}

export async function remove({id}: {id: number}) {
  await db.project.delete({
    where: { id },
  });
  // 刪除該標案快取
  await deleteCache(id);
  // 也要刪除旗下小區快取
  await deleteAreaCache(id);
}

export type ProjectData = Array<Project & {
  total: number;
  areaCount: number;
  notActiveCount: number;
} & RecordCount>

export async function query(take?: number) {
  // 先取得快照裡的全部標案資料
  const cacheProject = await cacheAll();
  // console.log(cacheProject);
  
  cacheProject.sort((a: any, b: any) => a.code > b.code ? 1: -1);
  return take ? cacheProject.slice(0, take): cacheProject;
}