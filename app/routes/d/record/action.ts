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
    let updateMeter: {[key: string]: any} = {};
    [
      'updateMeter[waterId]',
      'updateMeter[meterId]',
      'updateMeter[address]',
      'updateMeter[location]',
      'updateMeter[note]',
    ].forEach(key => {
      if(form.get(key)) {
        updateMeter[key.slice(12, -1)] = form.get(key) as string;
      }
    });

    // 如果有更新地址的話要順便更新經緯度
    if(updateMeter.address) {
      updateMeter = {
        ...updateMeter,
        ...(await MeterUploadAction.coordinate(toSBC(updateMeter.address)))
      };
    }

    // 更新水表，如果有修改的話
    const {projectId, area} = await meterApi.update({ id: meterId, data: updateMeter});

    const [Y, M, D] = formatYmd().split('/');

    await api.create({
      userId,
      status,
      meterId,
      content: form.get('content') as string,
      ...(form.get('picture') ? {picture: `/${Y}-${M}/${D}/${form.get('picture')}`}: {}),
    });

    const search = (form.get('search') || "") as string;
    const showRecord = !!form.get('showRecord') ? '1': '';
    const projectIdList = (form.get('projectIdList') || "") as string;

    const redis = new Redis(process.env.REDIS_URL);
    await redis.connect();
    await redis.sAdd('job', `${projectId}:${area}:${projectIdList}:${search}:${showRecord}`);
    await redis.disconnect();
    return json('OK');
  }
}