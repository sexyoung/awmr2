import { User } from "@prisma/client"
import { Role, RoleMap } from "~/consts/role"

type IProps = {
  user?: User
}

export const UserForm: React.FC<IProps> = ({ user }) => {
  return (
    <>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx1 gap10">密碼 <input className="input fx1" type="password" name="password" /></div>
        <div className="df aic fx1 gap10">本名 <input className="input fx1" type="text" name="fullname" defaultValue={user?.fullname || ""} /></div>
        <div className="df aic fx1 gap10">權限 <select className="input fx1" name="title" defaultValue={user?.title || ""}>
            <option value={Role.ENG}>{RoleMap[Role.ENG]}</option>
            <option value={Role.ENM}>{RoleMap[Role.ENM]}</option>
            <option value={Role.OFW}>{RoleMap[Role.OFW]}</option>
            <option value={Role.ADM}>{RoleMap[Role.ADM]}</option>
          </select>
        </div>
      </div>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx1 gap10">信箱 <input className="input fx1" type="email" name="email" defaultValue={user?.email || ""} /></div>
        <div className="df aic fx1 gap10">電話 <input className="input fx1" type="text" name="phone" defaultValue={user?.phone || ""} /></div>
        <div className="df aic fx1 gap10">備註 <input className="input fx1" type="text" name="note" defaultValue={user?.note || ""} /></div>
      </div>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx2 gap10">
          line登入:
          <input type="checkbox" name="isDailyLink" defaultChecked={Boolean(user?.isDailyLink) || false} value="1" />
        </div>
        <div className="df aic fx1 gap10 jce">
          <button className="btn primary">{user ? '更新': '新增'}</button>
        </div>
      </div>
    </>
  )
}
