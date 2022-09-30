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

export async function cache(projectId: number = 0) {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  const projectListItems = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    ...(projectId ? { where: { id: projectId }}: {}),
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

  if(projectId) {
    let allRecord: ProjectData = JSON.parse(await redis.get(`${REDIS_PREFIX}:record`) as string);
    const projectIndex = allRecord.findIndex(project => project.id === projectId);
    allRecord = projectIndex === -1 ? [data[0], ...allRecord]: [
      ...allRecord.slice(0, projectIndex),
      data[0],
      ...allRecord.slice(projectIndex+1),
    ];

    allRecord.sort((a, b) => {
      const ad = +(a.lastRecordTime || 0);
      const bd = +(b.lastRecordTime || 0);
      return bd - ad;
    });

    await redis.set(`${REDIS_PREFIX}:record`, JSON.stringify(allRecord));
    return allRecord;
  }

  data.sort((a, b) => {
    const ad = +(a.lastRecordTime || 0);
    const bd = +(b.lastRecordTime || 0);
    return bd - ad;
  });

  await redis.set(`${REDIS_PREFIX}:record`, JSON.stringify(data));
  await redis.disconnect();

  return data;
}

export async function deleteCache(projectId: number = 0) {
  const allRecord: any[] = await cacheAll();
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const pIndex = allRecord.findIndex(x => x.id === projectId);
  await redis.set(`${REDIS_PREFIX}:record`, JSON.stringify([
    ...allRecord.slice(0, pIndex),
    ...allRecord.slice(pIndex + 1),
  ]));
  await redis.disconnect();
}