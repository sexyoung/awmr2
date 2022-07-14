import { Record } from "@prisma/client";
import { Status } from "~/consts/reocrd";
import { db } from "~/utils/db.server";

export type RecordCount = {
  success?: number;
  notRecord?: number;
  lastRecordTime?: Date;
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

  const lastRecord = await db.record.findFirst({
    where: { meterId: { in: meterIdList }},
    orderBy: { createdAt: 'desc'}
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
    lastRecordTime: lastRecord?.createdAt,
  };
}

export async function create(data: {userId: number; meterId: number; status: Status ; content: string}) {
  await db.record.create({ data });
}

export async function destroy(id: number) {
  await db.record.delete({ where: { id } });
}