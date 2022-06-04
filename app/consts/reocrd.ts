export enum Status {
  success   = "success",   // 成功
  notRecord = "notRecord", // 沒有記錄
}

export enum NotRecordReason {
  Abort       = "Abort",      // 中止
  Stop        = "Stop",       // 停水
  NoOne       = "NoOne",      // 無人
  Empty       = "Empty",      // 空屋
  Car         = "Car",        // 車擋
  Heavy       = "Heavy",      // 重壓
  NoExist     = "NoExist",    // 查無
  EvilDog     = "EvilDog",    // 惡犬
  OutOfArea   = "OutOfArea",  // 區域外
  NoEntrance  = "NoEntrance", // 無法進入
  Other       = "Other",      // 其他
}

/** @description 記錄內容 */
export type Content = number | NotRecordReason;
