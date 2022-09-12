import { db } from "~/utils/db.server";
import { Redis } from "~/utils/redis.server";
import { formatYmd, getTomorrow, getUntilTomorrowSecond } from "~/utils/time";

/** record:summary:{projIdList}:search:${keyword} */
export const REDIS_PREFIX = 'record:summary';

type Cache = {
  search?: string;
  isForce?: boolean;
  showRecord?: boolean;
  projectIdList?: number[];
}

export async function cache({
  search = '',
  isForce = false,
  showRecord = false,
  projectIdList = [],
}: Cache) {

  const projStr = projectIdList.join(',');

  // 預設排除今日登記
  const where = {
    ...(showRecord ? {}: {
      Record: { // 要快取
        every: {
          createdAt: {
            lt: new Date(formatYmd(new Date())),
          }
        }
      }
    }),
    AND: [
      {isActive: true},
      (projectIdList.length ? {
        projectId: { in: projectIdList }
      } : {}),
    ],
    OR: [
      {area: { contains: search }},
      {address: { contains: search }},
      {meterId: { contains: search }},
      {waterId: { contains: search }},
      {location: { contains: search }},
      {note: { contains: search }},
    ]
  }

  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  if(!isForce) {
    const summary = await redis.hGetAll(`${REDIS_PREFIX}:${projStr}:search:${search}`);
    if(Object.entries(summary).length) {
      await redis.disconnect();
      return {
        where,
        meterCount: +summary.meterCount,
        meterCountSummary: +summary.meterCountSummary,
        successCount: +summary.successCount,
        notRecordCount: +summary.notRecordCount,
      }
    }
  }

  const {Record, ...summary} = where;
  let meterCount = await db.meter.count({ where });
  let meterCountSummary = await db.meter.count({ where: summary });
  let successCount = (await db.record.groupBy({
    where: {
      status: 'success',
      createdAt: {
        gte: new Date(formatYmd(new Date())),
        lt: new Date(formatYmd(getTomorrow())),
      },
      meter: {...summary},
    },
    by: ['meterId'],
    _count: { meterId: true }
  })).length;
  let notRecordCount = (await db.record.groupBy({
    where: {
      status: 'notRecord',
      createdAt: {
        gte: new Date(formatYmd(new Date())),
        lt: new Date(formatYmd(getTomorrow())),
      },
      meter: {...summary},
    },
    by: ['meterId'],
    _count: { meterId: true }
  })).length;

  const expireTime = getUntilTomorrowSecond();
  /** 到了明天00:00 會自已清掉 */
  await redis.hSet(`${REDIS_PREFIX}:${projStr}:search:${search}`, 'meterCount', meterCount, expireTime);
  await redis.hSet(`${REDIS_PREFIX}:${projStr}:search:${search}`, 'meterCountSummary', meterCountSummary, expireTime);
  await redis.hSet(`${REDIS_PREFIX}:${projStr}:search:${search}`, 'successCount', successCount, expireTime);
  await redis.hSet(`${REDIS_PREFIX}:${projStr}:search:${search}`, 'notRecordCount', notRecordCount, expireTime);
  
  await redis.disconnect();
  return {
    where,
    meterCount,
    meterCountSummary,
    successCount,
    notRecordCount,
  }
}