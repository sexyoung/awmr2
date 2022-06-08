import { json } from "@remix-run/node";

export function badRequest<T>(data: T) {
  return json(data, { status: 400 });
}