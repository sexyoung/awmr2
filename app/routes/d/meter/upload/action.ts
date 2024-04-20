import { Prisma } from "@prisma/client";
import { ActionFunction, json } from "@remix-run/node";
import { db } from "~/utils/db.server";

type UploadRecord = {
  waterId: string;
  meterId: string;
}

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  switch (form.get('_method')) {
    case 'check': return verb.check(form);
    case 'upload': return verb.upload(form);
    // case 'coordinate': return verb.coordinate();
  }
  return json(null);
}

export const toSBC = (str: string) => {
  let result = "";
  for(let i=0; i<str.length; i++) {
    let cCode = str.charCodeAt(i);
    /** @ts-ignore */
    cCode -= ( cCode >= 0xFF01 && cCode<=0xFF5E && 65248 );
    cCode = cCode === 0x03000 ? 0x0020: cCode;
    result += String.fromCharCode(cCode);
  }
  return result;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const verb = {
  check: async (form: FormData): Promise<Response> => {
    const data: UploadRecord[] = JSON.parse(form.get('data') as string);
    // 用水號+錶號找看資料庫有沒有這些水錶
    // 如果有，即回傳這些資料，如果沒有，就略過這些資料
    const meterListItem = await db.meter.findMany({
      where: { meterId: { in: data.map(item => item.meterId) }}
    });
  
    return json(meterListItem.map(item => item.meterId));
  },

  coordinate: async (address: string = '台北市內湖區新湖三路189號'): Promise<{lat: number, lng: number}> => {
    const key = process.env.MAP8_KEY;
    const res = await (await fetch(`https://api.map8.zone/v2/place/geocode?address=${toSBC(address)}&key=${key}`)).json();
    if(res.status === 'UNKNOWN_ERROR') return {lat: 0, lng: 0};
    
    return res.results[0].geometry.location;
  },

  // 儲存已水錶
  upload: async (form: FormData): Promise<Response> => {
    const {address, ...meter} = JSON.parse(form.get('data') as string);
    const latlng = await verb.coordinate(address);
    // await delay(800);
    try {
      /** 2023/7/22
       * 上傳水表時需要:
       * 同水號異表號: 可覆蓋！
       * 異水號同表號: 不可覆蓋！
       * 所以只要同表號就不能蓋掉
       */
      
      const meterListItem = await db.meter.findUnique({
        where: {
          waterId: meter.waterId
        }
      });

      if(!meterListItem) {
        await db.meter.create({
          data: {...meter, ...latlng, address: toSBC(address)}
        });
      } else {
        await db.meter.update({
          where: {waterId: meter.waterId},
          data: {...meter, ...latlng, address: toSBC(address)}
        });
      }
      return json({...meter, ...latlng});
      // return json(true);
    } catch(e) {
      return json({
        message: (e as Prisma.PrismaClientValidationError).message,
      }, { status: 500 })
    }
  },
}