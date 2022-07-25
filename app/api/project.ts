import { Project } from "@prisma/client";
import type { NewProjectForm } from "~/type/project";
import { db } from "~/utils/db.server";

import { RecordCount, sum } from "./record";

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

export type ProjectData = Array<Project & {
  total: number;
  areaCount: number;
  notActiveCount: number;
} & RecordCount>

export async function query(take?: number) {
  const projectListItems = await db.project.findMany({
    take,
    orderBy: { createdAt: "desc" },
  });

  const data: ProjectData = await Promise.all(projectListItems.map(async project => {
    // 取得 meter id
    const meterListItems = await db.meter.findMany({
      select: { id: true, isActive: true },
      where: { projectId: project.id },
    });
    const meterIdList = meterListItems.map(({ id }) => id);
    const notActiveCount = meterListItems.filter(({ isActive }) => !isActive).length;
    const areaCount = (await db.meter.groupBy({
      by: ['area'],
      _count: { area: true },
      where: { projectId: project.id }
    })).length;
    return {
      ...project,
      notActiveCount,
      total: meterIdList.length,
      ...await sum(meterIdList),
      areaCount,
    }
  }));

  data.sort((a, b) => {
    const ad = +(a.lastRecordTime || 0);
    const bd = +(b.lastRecordTime || 0);
    return bd - ad;
  });

  return take ? data.slice(0, take): data;
}