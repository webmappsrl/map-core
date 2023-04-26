/* examples:
import Log from '../utils;
...

@Log({prefix: 'map.page'})
private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
  ....
  }
*/

interface LoggerParams {
  type?: 'log' | 'trace' | 'warn' | 'info' | 'debug';
  inputs?: boolean;
  outputs?: boolean;
  prefix?: string;
}

const defaultParams: Partial<LoggerParams> = {
  type: 'debug',
  inputs: true,
  outputs: true,
};
const divider = '*'.repeat(200);
export function Log(params?: LoggerParams) {
  const options: Required<LoggerParams> = {
    type: params?.type ?? defaultParams.type,
    inputs: params?.inputs ?? defaultParams.inputs,
    outputs: params?.outputs ?? defaultParams.outputs,
    prefix: params?.prefix ?? defaultParams.prefix,
  };

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const result = original.apply(this, args);
      const f = console[options.type];
      const start = new Date().getTime();

      console.group();
      f(divider);
      if (options.prefix) {
        f(`PREFIX: ${options.prefix}`);
      }
      f(`FUNCTION: ${propertyKey}`);
      if (options.inputs && args.length > 0) {
        f(`Logged inputs:`);
        console.table(args);
      }
      if (options.outputs && result) {
        f(`Logged outputs:`);
        console.table(result);
      }
      const time = `${(new Date().getTime() - start) / 1000}`;
      f(`computed in ${time} seconds`);
      f(divider);
      console.groupEnd();

      return result;
    };
  };
}
