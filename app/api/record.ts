import { Status } from "~/consts/reocrd";
import { db } from "~/utils/db.server";
import { formatYmd, getTomorrow } from "~/utils/time";

export type RecordCount = {
  success?: number;
  notRecord?: number;
  lastRecordTime?: Date;
}

type SumFunc = {
  (meterIdList: number[], isAllDate?: boolean): Promise<RecordCount>
}

type SumByPidFunc = {
  (projectId: number): Promise<RecordCount>
}

export const sumByPid: SumByPidFunc = async (projectId: number) => {

  // const t = +new Date();
  const uniRecordIdList = (await db.record.groupBy({
    by: ['meterId'],
    _max: { id: true },
    where: {meter: {projectId}}
  })).map(rc => rc._max.id || 0);

  const recordCount = await db.record.groupBy({
    by: ['status'],
    _count: { status: true },
    where: {id: {in: uniRecordIdList}},
  });

  const lastRecord = await db.record.findFirst({
    where: {id: {in: uniRecordIdList}},
    orderBy: { createdAt: 'desc'}
  });

  const result = recordCount.reduce((obj, status) => {
    return {
      ...obj,
      [status.status]: status._count.status
    }
  }, {} as RecordCount);
  // 這整體下來要3秒
  // console.log('t', +new Date() - t);

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

export const sum: SumFunc = async (meterIdList, isAllDate = false) => {
  const recordCount = await db.record.groupBy({
    by: ['status'],
    _count: { status: true },
    where: {
      meterId: { in: meterIdList },
      ...(isAllDate ? {}: {
        createdAt: {
          gte: new Date(formatYmd(new Date())),
          lt: new Date(formatYmd(getTomorrow())),
        }
      })
    }
  });

  const lastRecord = await db.record.findFirst({
    where: {
      meterId: { in: meterIdList },
      ...(isAllDate ? {}: {
        createdAt: {
          gte: new Date(formatYmd(new Date())),
          lt: new Date(formatYmd(getTomorrow())),
        }
      })
    },
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