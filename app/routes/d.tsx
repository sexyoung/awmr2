import { Outlet, Link } from "@remix-run/react";

export default function DashBoard() {
  return (
    <div>
      <ul>
        <li><Link to="/login">登入</Link></li>
        <li><Link to="/d">首頁</Link></li>
        <li><Link to="/d/area">小區查詢</Link></li>
        <li><Link to="/d/project">標案管理</Link></li>
        <li><Link to="/d/meter/upload">上傳水錶</Link></li>
        <li><Link to="/d/meter">水錶查詢</Link></li>
        <li><Link to="/d/record">水錶登錄</Link></li>
        <li><Link to="/d/record/history">登錄記錄</Link></li>
        <li><Link to="/d/record/out">區外要求</Link></li>
      </ul>
      <Outlet />
    </div>
  );
}
