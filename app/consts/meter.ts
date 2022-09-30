/** @description 水錶種類 */
export enum Type {
  DRT = 0, // 直接錶
  TTL = 1, // 總錶
  BCH = 2, // 分錶
}

/** @description 供水狀況 */
export enum Suppy {
  NOM = 1, // 正常
  END = 3, // 中止
  PAU = 5, // 停水
}

/** @description 水錶口徑: 匯出的時候會用到 */
export enum Caliber {
  A = 13,
  B = 20,
  C = 25,
  D = 40,
  E = 50,
  F = 75,
  G = 100,
  H = 150,
  I = 200,
  J = 250,
  K = 300,
}
