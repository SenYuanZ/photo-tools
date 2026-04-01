const toMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isTimeRangeValid = (
  startTime: string,
  endTime: string,
): boolean => {
  return toMinutes(endTime) > toMinutes(startTime);
};

export const isTimeOverlap = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean => {
  const lStart = toMinutes(leftStart);
  const lEnd = toMinutes(leftEnd);
  const rStart = toMinutes(rightStart);
  const rEnd = toMinutes(rightEnd);
  return lStart < rEnd && rStart < lEnd;
};
