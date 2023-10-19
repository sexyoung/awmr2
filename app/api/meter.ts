import { db } from "~/utils/db.server";

export async function toggle({id, isActive}: {id: number, isActive: boolean}) {
  await db.meter.update({
    where: { id },
    data: { isActive },
  });
}

export async function update({id, data}: {id: number, data: any}) {
  return await db.meter.update({
    where: { id },
    data,
  });
}

export async function updateArea({fromArea, toArea}: {fromArea: string, toArea: string}) {
  return await db.meter.updateMany({
    where: { area: fromArea },
    data: {
      area: toArea
    },
  });
}