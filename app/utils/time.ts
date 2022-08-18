export const formatYmd = (date: Date): string => {
  return date.toLocaleDateString().slice(0, 10);
};

export const getTomorrow = () => new Date(new Date().valueOf() + 1000 * 60 * 60 * 24);