export enum Role {
  ENG = "ENG", /** @title Engineer (工程師) */
  ENM = "ENM", // Engineer Manager (工程師主管)
  OFW = "OFW", // Office Worker    (文書)
  ADM = "ADM", // Admin            (管理者)
}
export const RoleMap = {
  [Role.ENG]: '工程師',
  [Role.ENM]: '工程師主管',
  [Role.OFW]: '文書',
  [Role.ADM]: '管理員',
}