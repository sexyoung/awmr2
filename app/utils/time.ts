export const formatYmd = (date: Date = new Date()): string => {
  return date.toLocaleDateString().slice(0, 10);
};

export const getTomorrow = () => new Date(new Date().valueOf() + 1000 * 60 * 60 * 24);

export const getUntilTomorrowSecond = () => {
  const nowTs = +new Date();
  const tomorrowTs = +new Date(formatYmd(getTomorrow()));
  return ~~((tomorrowTs - nowTs) / 1000);
}