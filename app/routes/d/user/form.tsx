import { User } from "@prisma/client"
import { RoleMap } from "~/consts/role";
import { Role } from "@prisma/client";

type IProps = {
  titleList: Role[]
  user?: User;
  isDisabled?: boolean;
}

export const UserForm: React.FC<IProps> = ({ user, titleList = [], isDisabled = false }) => {
  return (
    <>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx1 gap10">密碼 <input className="input fx1" type="password" name="password" disabled={isDisabled} /></div>
        <div className="df aic fx1 gap10">本名 <input className="input fx1" type="text" name="fullname" defaultValue={user?.fullname || ""} disabled={isDisabled} /></div>
        <div className="df aic fx1 gap10">權限
          <select className="input fx1" name="title" defaultValue={user?.title || ""} disabled={isDisabled}>
            {titleList.map(title =>
              <option key={title} value={Role[title]}>{RoleMap[Role[title]]}</option>
            )}
            {isDisabled && user && <option key={user.title} value={Role[user.title]}>{RoleMap[Role[user.title]]}</option>}
          </select>
        </div>
      </div>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx1 gap10">信箱 <input className="input fx1" type="email" name="email" defaultValue={user?.email || ""} disabled={isDisabled} /></div>
        <div className="df aic fx1 gap10">電話 <input className="input fx1" type="text" name="phone" defaultValue={user?.phone || ""} disabled={isDisabled} /></div>
        <div className="df aic fx1 gap10">備註 <input className="input fx1" type="text" name="note" defaultValue={user?.note || ""} disabled={isDisabled} /></div>
      </div>
      <div className="df gap10" style={{maxWidth: 650, margin: '10px auto'}}>
        <div className="df aic fx2 gap10">
          line登入:
          <input type="checkbox" name="isDailyLink" defaultChecked={Boolean(user?.isDailyLink) || false} value="1" disabled={isDisabled} />
        </div>
        <div className="df aic fx1 gap10 jce">
          {!isDisabled &&
            <button className="btn primary">{user ? '更新': '新增'}</button>
          }
        </div>
      </div>
    </>
  )
}
