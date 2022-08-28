import { db } from "~/utils/db.server";
import { Project } from "@prisma/client";
import { Redis } from "~/utils/redis.server";

import { RecordCount, sumByPid } from "../record";

const REDIS_PREFIX = 'project';

/** @todo: 屆時可能會有很多沒用到的標案，需要定期刪除 */
export async function cacheAll() {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const allRecord = await redis.get(`${REDIS_PREFIX}:record`);
  if(!allRecord) return await cache();

  return JSON.parse(allRecord);
}

export type ProjectData = Array<Project & {
  total: number;
  areaCount: number;
  notActiveCount: number;
} & RecordCount>

export async function cache() {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  const data: ProjectData = await Promise.all(projectListItems.map(async project => {
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
      ...await sumByPid(project.id),
      areaCount,
    }
  }));

  data.sort((a, b) => {
    const ad = +(a.lastRecordTime || 0);
    const bd = +(b.lastRecordTime || 0);
    return bd - ad;
  });

  await redis.set(`${REDIS_PREFIX}:record`, JSON.stringify(data));
  await redis.disconnect();

  return data;
}