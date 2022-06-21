import { Link } from "@remix-run/react";
import { FC } from "react";
export type Props = {
  href: string;
  pathname: string;
  page?: number;
  pageTotal?: number;
}

export const Pagination: FC<Props> = ({
  href,
  pathname,
  page = 1,
  pageTotal = 1,
}) => {
  const { searchParams } = new URL(href);
  let prev = +searchParams.get('page')! - 1;
  let next = +searchParams.get('page')! + 1;
  prev = prev < 1 ? 1: prev;
  next = next > pageTotal ? pageTotal: next;
  const keys = Array.from(searchParams.keys())
    .filter(k => k !== 'page')
    .map(key => `key=${searchParams.get(key)}`)
    .join('&');

  return (
    <div>
      <h3>Pagination</h3>
      <Link to={`${pathname}?${keys}&page=1`}>首頁</Link>
      <Link to={`${pathname}?${keys}&page=${prev}`}>上頁</Link>
      <span>page: {page}/{pageTotal}</span>
      <Link to={`${pathname}?${keys}&page=${next}`}>下頁</Link>
      <Link to={`${pathname}?${keys}&page=${pageTotal}`}>底頁</Link>
    </div>
  )
}
