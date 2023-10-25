const util = require('util');
const { configure } = require('safe-stable-stringify');
const { bold, magenta, cyan, yellow, red } = require('colorette');
const stringify = configure({ deterministic: false });


function createLog(opts) {
  const { level, pretty, prettyOptions, defaults, onLog } = {
    level: 20,
    pretty: false,
    prettyOptions: {
      colors: true,
      depth: Infinity,
      maxArrayLength: Infinity,
      maxStringLength: Infinity,
      breakLength: 80,
      compact: 3
    },
    defaults: () => ({}),
    onLog: (err, entry) => {},
    ...opts,
  };

  function output(int) {
    return (...args) => {
      if (level <= int) {
        const { name, method, label } = LEVELS[int];

        if (pretty) {
          console[method](label, util.formatWithOptions(prettyOptions, ...args));
        } else {
          const entry = {
            level: name,
            ...defaults(),
            ...toPairs(args)
          };

          console[method](stringify(entry));
          onLog(args.find(isError), entry);
        }
      }

      return methods;
    };
  }

  const methods = {
    debug: output(10),
    info: output(20),
    warn: output(30),
    error: output(40),
    fatal: output(50)
  };

  return methods;
}


const LEVELS = {
  10: { name: 'debug', method: 'debug', label: bold(magenta('DEBUG')) },
  20: { name: 'info', method: 'info', label: bold(cyan('INFO')) },
  30: { name: 'warn', method: 'warn', label: bold(yellow('WARN')) },
  40: { name: 'error', method: 'error', label: bold(red('ERROR')) },
  50: { name: 'fatal', method: 'error', label: bold(red('FATAL')) }
};


function isObject(val) {
  return val?.constructor === Object;
}


function isError(val) {
  return val?.constructor === Error;
}


function toPairs(inputs) {
  return inputs
    .reduce((obj, arg) => {
      if (typeof arg === 'string') {
        return { ...obj, message: arg };
      }

      if (isObject(arg)) {
        return { ...obj, ...arg };
      }

      if (isError(arg)) {
        const { name, message, stack } = arg;
        return { ...obj, name, message, stack };
      }

      return obj;
    }, {});
}


module.exports = (opts) => createLog(opts);
