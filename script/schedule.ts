import {config} from 'dotenv';
import {resolve} from 'path'
import { cache } from '~/routes/d/record/cache';
import { Redis } from "~/utils/redis.server";

config({path: resolve(__dirname, "../.env")});

(async () => {
  await cache({ isForce: true });

  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const summaryAll = await redis.hGetAll('record:summary:search:');
  console.log('summaryAll', summaryAll);
  
  // const projectListItems = await db.project.findMany({
  //   orderBy: { createdAt: "desc" },
  // });
  // console.log(projectListItems);
  await redis.disconnect();
})();
