import md5 from "js-md5";
import { WebhookEvent, validateSignature, Client } from '@line/bot-sdk';
import { ActionFunction, json } from "@remix-run/node";
import { db } from '~/utils/db.server';
import { formatYmd } from "~/utils/time";

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN as string,
  channelSecret: process.env.LINE_CHANNEL_SECRET as string,
};

const client = new Client(config);

export const action: ActionFunction = async ({ request }) => {
  const signature = request.headers.get("X-Line-Signature") as string;
  const payload = await request.json();

  if(!validateSignature( JSON.stringify(payload), config.channelSecret, signature)) {
    return json({ status: 500 });
  }

  Promise
    .all(payload.events.map(handleEvent))
    .then((result) => json(result));

  return json({ status: 200, body: 'ok' });
}

async function handleEvent(event: WebhookEvent) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 有分還沒驗證跟已驗證要登入的
  if(/((?=(09))[0-9]{10})$/.test(event.message.text)) {
    const user = await db.user.findFirst({where: {phone: event.message.text}});
    if(!user) return;
    if(user.lineID) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `嗨 ${user.fullname} ，這手機號碼已連結過，請管理員解除後才能再重新設定`
      });
    }
    await db.user.update({
      where: {id: user.id},
      data: {lineID: event.source.userId},
    });
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `嗨 ${user.fullname} ，連結成功，試試「登入系統」吧`
    });
  } else if(event.message.text === "登入系統") {
    const user = await db.user.findUnique({where: {lineID: event.source.userId}});
    if(!user) return;
    if(!user.isDailyLink) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `嗨 ${user.fullname} 你的帳號沒有綁定line登入`
      });
    }
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `${process.env.DOMAIN}/link-login?hash=${md5(`${formatYmd()}${user.id}${user.name}${+user.createdAt}`)}`
    });
  }
}