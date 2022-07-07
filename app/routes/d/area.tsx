import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { RecordCount, sum } from "~/api/record";
import { isAdmin } from "~/api/user";
import { db } from "~/utils/db.server";

type LoaderData = {
  areaListItems: ({
    projectName: string;
    area: string;
    total: number;
  } & RecordCount)[]
}

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
  const data: LoaderData = {
    areaListItems: []
  }
  const areaListItems = await db.meter.groupBy({
    by: ['area'],
    _count: {
      area: true,
    },
  });

  for (let i = 0; i < areaListItems.length; i++) {
    const area = areaListItems[i];
    const m = await db.meter.findFirst({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' }
    });
    if(!m) return;
    const p = await db.project.findUnique({ where: { id: m.projectId} });
    if(!p) return;

    const meterIdList = (await db.meter.findMany({
      where: { area: area.area },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    })).map(m => m.id);
    
    data.areaListItems.push({
      projectName: p.name,
      area: m.area || "",
      total: area._count.area,
      ...await sum(meterIdList),
    });
  }

  return json(data);
};

const AreaPage = () => {
  const { areaListItems } = useLoaderData<LoaderData>();
  
  return (
    <div>
      <h2>小區頁</h2>
      {areaListItems.map(area =>
        <div key={area.area}>
          專案: {area.projectName} /
          小區: {area.area} /
          登記: {area.success} /
          未登: {area.notRecord} /
          錶數: {area.total}
        </div>
      )}
    </div>
  )
}

export default AreaPage