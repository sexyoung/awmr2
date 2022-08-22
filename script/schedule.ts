import {config} from 'dotenv';
import {resolve} from 'path'
import { db } from "../app/utils/db.server";
import { Redis } from "../app/utils/redis.server";

config({
  path: resolve(__dirname, "../.env")
});

(async () => {

  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  const summaryAll = await redis.hGetAll('record:summary:search:all');
  console.log('summaryAll', summaryAll);
  
  // const projectListItems = await db.project.findMany({
  //   orderBy: { createdAt: "desc" },
  // });
  // console.log(projectListItems);
  await redis.disconnect();
})();
