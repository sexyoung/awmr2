import { Meter} from "@prisma/client";
import { ActionFunction, json } from "@remix-run/node";
import * as api from "~/api/record";
import { Status } from "~/consts/reocrd";
import { requireUserId } from "~/api/user";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request";
import { toSBC, verb as MeterUploadAction } from "~/routes/d/meter/upload/action";
import * as meterApi from "~/api/meter";

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const userId = await requireUserId(request);
  const method = form.get('_method');
  form.delete('_method');
  switch (method) {
    case 'create': return verb.create(form, userId);
    case 'changeArea': return verb.changeArea(form);
    case 'deleteOut': return verb.deleteOut(form);
    default: // 新增水錶
      await api.create({
        userId,
        meterId: +form.get('meterId')!,
        status: method as Status,
        content: form.get('content') as string,
      });
  }
  return json(true);
}

const verb = {
  create: async (form: FormData, userId: number): Promise<Response> => {
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

    return json(true);

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
}