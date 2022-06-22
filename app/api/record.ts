import { Status } from "~/consts/reocrd";
import { db } from "~/utils/db.server";

export type RecordCount = {
  success?: number;
  notRecord?: number;
}

type SumFunc = {
  (meterIdList: number[]): Promise<RecordCount>
}

export const sum: SumFunc = async (meterIdList) => {
  const recordCount = await db.record.groupBy({
    by: ['status'],
    _count: { status: true },
    where: { meterId: { in: meterIdList }}
  });

  const result = recordCount.reduce((obj, status) => {
    return {
      ...obj,
      [status.status]: status._count.status
    }
  }, {} as RecordCount);

  const {
    success = 0,
    notRecord = 0,
  } = result;

  return {
    success,
    notRecord,
  };
}

export async function create(data: {userId: number; meterId: number; status: Status ; content: string}) {
  await db.record.create({ data });
}