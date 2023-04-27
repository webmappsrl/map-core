export interface performance {
  [key: string]: {
    start: number;
    end?: number;
    time?: number;
  };
}

export const perf: Performance | {} = {};

/**
 * Starts a timer for the given URL by storing the current timestamp in an object called 'perf'.
 * The timer is identified by the URL provided. If a timer with the same URL already exists,
 * a warning is logged to the console. The purpose of this function is to measure the performance
 * or duration of an operation related to the specified URL.
 *
 * @param {string} url The URL used as a key to identify the timer.
 */
export function startTime(url: string): void {
  if (perf[url] != null) {
    console.warn(url, ': start again');
  } else {
    perf[url] = {start: new Date().getTime()};
  }
}

/**
 * Calculates the time difference between the start and end times for the given URL and logs the result.
 * @param {string} url - The URL for which the time is being calculated.
 * @param {string} [prefix=''] - An optional prefix to be displayed in the log message.
 * @returns {number} The time difference in milliseconds.
 */
export function endTime(url: string, prefix = ''): any {
  perf[url].end = new Date().getTime();
  if (perf[url].start && perf[url].end) {
    perf[url].time = perf[url].end - perf[url].start;
  }
  console.warn(`${prefix}: ${url} ${perf[url].time / 1000}`);
  return perf[url].time;
}
