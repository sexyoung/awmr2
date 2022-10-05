import { LoaderFunction } from "@remix-run/node";
import { cache as areaCache } from "~/api/cache/area.cache";
import { cache as projCache } from "~/api/cache/project.cache";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({params: { projectId = 0 }}) => {
  /** 成功後才需要更新 */
  await projCache(+projectId!);

  // 更新小區抄錶成功/失敗數字
  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
    where: { projectId: +projectId! },
  });
  for (let i = 0; i < areaListItems.length; i++) {
    const area = areaListItems[i];
    await areaCache(area.area as string, area._count.area);
  }
  return null;
}