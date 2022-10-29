/**
 * record, area, project cache 在抄表後會放進排程
 * 每分鐘都會檢查是否有更新工作，若有則執行更新
 */
import { json, LoaderFunction, redirect } from "@remix-run/node";
import { db } from '~/utils/db.server';
import { Redis } from "~/utils/redis.server";
import { cache, REDIS_PREFIX } from "~/routes/d/record/cache";
import { cache as areaCache } from "~/api/cache/area.cache";
import { cache as projCache } from "~/api/cache/project.cache";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || '';
  if(key !== process.env.CACHE_KEY) {
    throw redirect('https://www.google.com');
  }

  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const jobList = await redis.sMembers(`job`);

  for (let i = 0; i < jobList.length; i++) {
    const job = jobList[i];
    const [projectId, area, projectIdList, search, showRecord] = job.split(':');
    // console.log([projectId, area, projectIdList, search, showRecord]);
    
    const projectIdListArr = projectIdList.split(',').map(p => +p);
    projectIdListArr.sort((a, b) => a - b);

    const keys = await redis.keys(`${REDIS_PREFIX}:*${projectIdListArr.join(',')}*:search:`);
    // startTime();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const projectIdListStr = key.split(':')[2];
      const search = key.split(':')[4];
      await cache({
        search,
        showRecord: Boolean(showRecord),
        isForce: true,
        projectIdList: projectIdListStr ? projectIdListStr.split(',').map(Number): [],
      });
      // showCostTime(`${key} 總耗時: `);
    }
  
    // 更新 project
    projCache(+projectId);

    // 更新小區抄錶成功/失敗數字
    const areaListItems = await db.meter.groupBy({
      by: ['area'],
      _count: {
        area: true,
      },
      where: { area: area },
    });
    await areaCache(area, areaListItems[0]._count.area);
  }

  await redis.del('job');
  await redis.disconnect();
  return json('OK');
}