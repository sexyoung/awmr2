import { db } from "~/utils/db.server";

export async function toggle({id, isActive}: {id: number, isActive: boolean}) {
  await db.meter.update({
    where: { id },
    data: { isActive },
  });
}

export async function update({id, data}: {id: number, data: any}) {
  await db.meter.update({
    where: { id },
    data,
  });
}