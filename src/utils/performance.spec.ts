import {endTime, perf, startTime} from './performance';

describe('performance', () => {
  it('endTime: should calculate and log the time difference between start and end times for a given URL', () => {
    const url = 'https://example.com';
    startTime(url);
    const elapsedTime = endTime(url);

    expect(perf[url]).toBeDefined();
    expect(perf[url].start).toBeDefined();
    expect(perf[url].end).toBeDefined();
    expect(perf[url].time).toBeDefined();
    expect(elapsedTime).toBe(perf[url].time);
  });

  it('endTime: should include the prefix in the log message if provided', () => {
    const url = 'https://example.com';
    const prefix = 'TEST';
    const consoleWarnSpy = spyOn(console, 'warn');
    startTime(url);
    endTime(url, prefix);

    expect(consoleWarnSpy).toHaveBeenCalledWith(`${prefix}: ${url} ${perf[url].time / 1000}`);
  });
});
