export interface performance {
  [key: string]: {
    start: number;
    end?: number;
    time?: number;
  };
}

export const perf: Performance | {} = {};

export function startTime(url: string): void {
  if (perf[url] != null) {
    console.warn(url, ': start again');
  } else {
    perf[url] = {start: new Date().getTime()};
  }
}

export function endTime(url: string, prefix = ''): any {
  perf[url].end = new Date().getTime();
  if (perf[url].start && perf[url].end) {
    perf[url].time = perf[url].end - perf[url].start;
  }
  console.warn(`${prefix}: ${url} ${perf[url].time / 1000}`);
  return perf[url].time;
}
