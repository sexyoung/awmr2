import { Link } from "@remix-run/react";
import { FC } from "react";
export type Props = {
  href: string;
  pageTotal: number;
}

export const Pagination: FC<Props> = ({
  href,
  pageTotal = 1,
}) => {
  const { searchParams, pathname } = new URL(href);
  const page = +searchParams.get("page")! || 1;
  
  let prev = page - 1;
  let next = page + 1;
  prev = prev < 1 ? 1: prev;
  next = next > pageTotal ? pageTotal: next;
  const keys = Array.from(searchParams.keys())
    .filter(k => k !== 'page')
    .map(key => `${key}=${searchParams.get(key)}`)
    .join('&');

  return (
    <div>
      <Link to={`${pathname}?${keys}&page=1`}>首頁</Link>
      <Link to={`${pathname}?${keys}&page=${prev}`}>上頁</Link>
      <span>page: {page}/{pageTotal}</span>
      <Link to={`${pathname}?${keys}&page=${next}`}>下頁</Link>
      <Link to={`${pathname}?${keys}&page=${pageTotal}`}>底頁</Link>
    </div>
  )
}
