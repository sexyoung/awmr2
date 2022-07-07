import { LoaderFunction } from "@remix-run/node";
import { isAdmin } from "~/api/user";

export const loader: LoaderFunction = async ({ request }) => {
  await isAdmin(request);
};

const HomePage = () => {
  return (
    <div>登入後首頁</div>
  )
}

export default HomePage