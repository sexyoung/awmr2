import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Redis } from "~/utils/redis.server";

export const loader: LoaderFunction = async ({ request }) => {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.connect();
  
  // await redis.get('abc:def:ghi');
  // await hGetAll('area:19:南寮');
  return (await redis.hGetAll('area:abc'));
}

export default () => {
  const data = useLoaderData();
  console.log(data);
  return (
    <div>test</div>
  )
}
