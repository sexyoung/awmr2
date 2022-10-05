import { db } from "~/utils/db.server";

export const whereCase = async (request: Request) => {
  const url = new URL(request.url)
  const projectId = +url.searchParams.get('projectId')!;
  const area = url.searchParams.get('area');

  const startDate = new Date(+new Date(url.searchParams.get('startDate') + ' 00:00:00'!));
  const endDate = new Date(+new Date(url.searchParams.get('endDate') + ' 23:59:59'!));

  const meterIdList = (await db.meter.findMany({
    select: { id: true },
    where: {
      projectId, area
    }
  })).map(({ id }) => id);

  return {
    AND: [
      {meterId: {in: meterIdList}},
      {createdAt: {lte: endDate}},
      {createdAt: {gte: startDate}},
    ]
  }
}