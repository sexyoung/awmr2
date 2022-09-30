import { Meter} from "@prisma/client";
import { ActionFunction, json, redirect } from "@remix-run/node";
import * as api from "~/api/record";
import { Status } from "~/consts/reocrd";
import { Redis } from "~/utils/redis.server";
import { requireUserId } from "~/api/user";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request";
import { toSBC, verb as MeterUploadAction } from "~/routes/d/meter/upload/action";
import * as meterApi from "~/api/meter";
import { cache, REDIS_PREFIX } from "./cache";
import { cache as areaCache } from "~/api/cache/area.cache";
import { cache as projCache } from "~/api/cache/project.cache";
import { showCostTime, startTime } from "~/utils/helper";
import { formatYmd } from "~/utils/time";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const userId = await requireUserId(request);
  const method = form.get('_method');
  form.delete('_method');
  switch (method) {
    case 'create': return verb.createWithMeter(form, userId); // 新增未存在水錶
    case 'changeArea': return verb.changeArea(form);
    case 'deleteOut': return verb.deleteOut(form);
    case Status.success:
    case Status.notRecord:
      return verb.record(form, userId, method);
  }
  return json(true);
}

const verb = {
  createWithMeter: async (form: FormData, userId: number): Promise<Response> => {
    const meterId = form.get('meterId') as string;
    const waterId = form.get('waterId') as string;
    const projectId = +form.get('projectId')! as number;
    const type = +form.get('type')! as number;
    const suppy = +form.get('suppy')! as number;

    const {status, content, ...fields} = [...form.keys()].reduce((obj, key) => ({
      ...obj,
      [key]: form.get(key),
    }), {} as {[key: string]: any});

    /** 要先檢查是否已經有這個水號或錶號 */
    const meterIdExists = await db.meter.count({ where: { meterId }}) > 0;
    const waterIdExists = await db.meter.count({ where: { waterId }}) > 0;
    const fieldErrors = {
      meterId: meterIdExists && "duplicate meterId",
      waterId: waterIdExists && "duplicate waterId",
    };
    if (Object.values(fieldErrors).some(Boolean)) return badRequest({ fieldErrors, fields });

    const latlng = await MeterUploadAction.coordinate(toSBC(fields.address));

    const meter = await db.meter.create({
      data: {...fields, projectId, type, suppy, ...latlng, isActive: false} as Meter
    });

    await db.record.create({ data: {userId, meterId: meter.id, status, content}});

    return redirect(`/d/record`);;

    // return json({...fields, ...latlng});
    // return json({status, content});
  },
  changeArea: async (form: FormData): Promise<Response> => {
    await meterApi.update({id: +form.get('meterId')!, data: {
      area: form.get('area'),
    }})
    await api.destroy(+form.get('recordId')!);
    return json(true);
  },
  deleteOut: async (form: FormData): Promise<Response> => {
    api.destroy(+form.get('recordId')!);
    return json(true);
  },
  record: async (form: FormData, userId: number, status: Status) => {
    const meterId = +form.get('meterId')!;

    const [Y, M, D] = formatYmd().split('/');

    await api.create({
      userId,
      status,
      meterId,
      content: form.get('content') as string,
      ...(form.get('picture') ? {picture: `/${Y}-${M}/${D}/${form.get('picture')}`}: {}),
    });

    const search = (form.get('search') || "") as string;
    const showRecord = !!form.get('showRecord');
    const projectIdList = (form.get('projectIdList') || "") as string;
    const redis = new Redis(process.env.REDIS_URL);
    await redis.connect();

    const projectIdListArr = projectIdList.split(',').map(p => +p);
    projectIdListArr.sort((a, b) => a - b);

    const keys = await redis.keys(`${REDIS_PREFIX}:*${projectIdListArr.join(',')}*:search:`);
    
    // const keys = [...new Set([
    //   `${REDIS_PREFIX}:*${projectIdList}*:search:${search}`,
    //   `${REDIS_PREFIX}:*${projectIdList}*:search:`,
    //   // `${REDIS_PREFIX}::search:`, // ← 加了這個會花8秒 (但非工程師會用到，需找時間批次處理)
    // ])];
    // 先把特定搜尋與全域的 summary 先更新
    // 然後要在排程中把 record:summary:{包括18的}:search:* 全部更新 (每個約 0.5s)

    // startTime();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const projectIdListStr = key.split(':')[2];
      const search = key.split(':')[4];
      await cache({
        search,
        showRecord,
        isForce: true,
        projectIdList: projectIdListStr ? projectIdListStr.split(',').map(Number): [],
      });
      // showCostTime(`${key} 總耗時: `);
    }

    db.meter.findUnique({where: {id: meterId}}).then(async meter => {
      // 更新 project
      projCache(meter!.projectId);

      // 更新小區抄錶成功/失敗數字
      const areaListItems = await db.meter.groupBy({
        by: ['area'],
        _count: {
          area: true,
        },
        where: { area: meter!.area! },
      });
      await areaCache(meter!.area!, areaListItems[0]._count.area);
    });

    const summary = await redis.hGetAll(`${REDIS_PREFIX}:${projectIdList}:search:${search}`);
    await redis.disconnect();
    return {
      meterCount: +summary.meterCount,
      meterCountSummary: +summary.meterCountSummary,
      successCount: +summary.successCount,
      notRecordCount: +summary.notRecordCount,
    };
  }
}