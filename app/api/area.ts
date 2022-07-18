import { Meter, Project } from "@prisma/client";
import { db } from "~/utils/db.server";
import { RecordCount, sum } from "./record";

export type AreaData = ({
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

  // 統計每個小區有幾個水錶
  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
    where
  });

  for (let i = 0; i < areaListItems.length; i++) {
    // 找到小區裡的第一個水錶
    const area = areaListItems[i];
    
    const m = await db.meter.findFirst({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' }
    }) as Meter;

    const p = await db.project.findUnique({
      where: { id: m.projectId}
    }) as Project;

    const meterIdList = (await db.meter.findMany({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    })).map(m => m.id);
    
    data.push({
      projectName: p.name,
      area: m.area || "",
      total: area._count.area,
      ...await sum(meterIdList),
    });
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