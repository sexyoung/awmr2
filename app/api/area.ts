import { db } from "~/utils/db.server";
// import { showCostTime, startTime } from "~/utils/helper";
import { cacheAll, cache } from "./cache/area.cache";
import { RecordCount } from "./record";

export type AreaData = ({
  projectId: number;
  projectName: string;
  area: string;
  total: number;
} & RecordCount)[];

type Params = {
  where?: any;
  take?: number;
  skip?: number;
}

export async function query({ take = 0, where = {}, skip = 0 }: Params) {
  const data: AreaData = [];

  // startTime();

  // 統計每個小區有幾個水錶
  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
    where
  });
  // showCostTime('統計每個小區有幾個水錶');

  // 先取得快照裡的全部小區資料
  const cacheArea = await cacheAll();

  for (let i = 0; i < areaListItems.length; i++) {
    const area = areaListItems[i];
    if(!cacheArea[area.area as string]) {
      data.push(await cache(area.area!, area._count.area));
    } else {
      data.push(cacheArea[area.area as string]);
    }
  }

  data.sort((a, b) => {
    const ad = +(a.lastRecordTime || 0);
    const bd = +(b.lastRecordTime || 0);
    return bd - ad;
  });

  return {
    count: areaListItems.length,
    data: take ? data.slice(skip, skip+take): data,
  }
}