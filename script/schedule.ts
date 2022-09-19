import {config} from 'dotenv';
import {resolve} from 'path'
import { cache } from '~/routes/d/record/cache';
import { db } from '~/utils/db.server';
import { Redis } from "~/utils/redis.server";
import { cache as areaCache } from "~/api/cache/area.cache";

config({path: resolve(__dirname, "../.env")});

(async () => {
  await cache({ isForce: true });

  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();

  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: { area: true },
  });

  for (let i = 0; i < areaListItems.length; i++) {
    const area = areaListItems[i];
    await areaCache(area.area as string, area._count.area, true);
  }

  await redis.disconnect();
})();
