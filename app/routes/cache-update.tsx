import { json, LoaderFunction, redirect } from "@remix-run/node";
import { db } from '~/utils/db.server';
import { Redis } from "~/utils/redis.server";
import { cache as areaCache } from "~/api/cache/area.cache";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || '';
  if(key !== process.env.CACHE_KEY) {
    throw redirect('https://www.google.com');
  }

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
  return json('OK');
}