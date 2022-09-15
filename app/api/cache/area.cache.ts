import { Meter, Prisma, Project } from "@prisma/client";
import { db } from "~/utils/db.server";
// import { showCostTime, startTime } from "~/utils/helper";
import { Redis } from "~/utils/redis.server";
import { getUntilTomorrowSecond } from "~/utils/time";
import { sum } from "../record";

const REDIS_PREFIX = 'area';

/** @todo: 屆時可能會有很多沒用到的小區，需要定期刪除 */
export async function cacheAll() {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const allRecord = await redis.hGetAll(`${REDIS_PREFIX}:record`);
  const result: {[x: string]: any} = {}

  for (const key in allRecord) {
    if (Object.prototype.hasOwnProperty.call(allRecord, key)) {
      result[key] = JSON.parse(allRecord[key]);
    }
  }

  return result;
}

// 每日 00:00 時需執行 isCount0 = true 的指令 約花1分半
export async function cache(area: string, total: number, isCount0: boolean = false) {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  // startTime();

  const m = await db.meter.findFirst({
    where: { area },
    orderBy: { createdAt: 'desc' }
  }) as Meter;
  // showCostTime('找第一個水錶'); // <--- 花時間

  const p = await db.project.findUnique({
    where: { id: m.projectId}
  }) as Project;
  // showCostTime('找標案');

  const meterIdList = isCount0 ? []: (await db.meter.findMany({
    where: { area },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  })).map(m => m.id);
  // showCostTime('找水錶id'); // <--- 花時間

  const areaSummary = {
    projectId: p.id,
    projectName: p.name,
    area: m.area || "",
    total,
    ...await sum(meterIdList), // <--- 花時間
  }

  const expireTime = getUntilTomorrowSecond();

  await redis.hSet(`${REDIS_PREFIX}:record`, area as string, JSON.stringify(areaSummary), expireTime);
  await redis.disconnect();
  return areaSummary;
}

export async function deleteCache(projectId: number = 0) {
  const allRecord = await cacheAll();
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  for (let i = 0; i < Object.keys(allRecord).length; i++) {
    const area = Object.keys(allRecord)[i];
    if(allRecord[area].projectId === projectId) {
      await redis.hDel(`${REDIS_PREFIX}:record`, area);
    }
  }
  await redis.disconnect();
}