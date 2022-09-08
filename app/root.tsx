import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import stylesUrl from "~/styles/app.css";

export const links: LinksFunction = () => {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "1" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap" },
    { rel: "stylesheet", href: stylesUrl }
  ]
}

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  "format-detection": "telephone=no",
  viewport: "width=device-width,initial-scale=1,maximum-scale=1, user-scalable=0",
});

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
