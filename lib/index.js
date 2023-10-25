const { klona } = require('klona');
const { STATUS_CODES } = require('http');
const { green, yellow, red } = require('colorette');
const createLog = require('./log');
const sentryOnLog = require('./sentry');
const { NODE_ENV } = process.env;


if (NODE_ENV === 'development') {
  const util = require('util');
  util.inspect.defaultOptions.showHidden = false;
  util.inspect.defaultOptions.depth = 7;
  util.inspect.defaultOptions.colors = true;
  util.inspect.defaultOptions.maxArrayLength = null;
}


const STATUS_MESSAGES = Object.entries(STATUS_CODES)
  .reduce((acc, [key, val]) => {
    acc[val] = parseInt(key);
    return acc;
  }, {});


function toLevel(statusCode) {
  return statusCode >= 500
    ? 'error'
    : statusCode >= 400
      ? 'warn'
      : 'info';
}


function toEntry(req, res, err) {
  const { startTime, id, ip, method, path, href, params, query, body } = req;
  const { statusCode, statusMessage } = res;
  const duration = new Date() - startTime;

  return {
    duration,
    req: {
      id,
      ip,
      method,
      path,
      href,
      headers: req.headers,
      params,
      query,
      body
    },
    res: {
      statusCode,
      statusMessage,
      headers: res.headers,
      ...(err && {
        locals: klona(res.locals) // clone so this isn't circular
      })
    }
  };
}


module.exports = (options) => {
  const opts = {
    pretty: false,
    sentryDsn: null,
    toErrorPath: (req, res) => '',
    ...options
  };

  const { pretty, toErrorPath, sentryDsn } = opts;

  if (sentryDsn) {
    opts.onLog = sentryOnLog(sentryDsn);
  }

  const log = createLog(opts);

  process
    .on('unhandledRejection', (err) => {
      log.error('Unhandled Rejection', err);
    })
    .on('uncaughtException', (err) => {
      log.fatal('Uncaught Exception', err);
      process.exit(1);
    });

  return (req, res, next) => {
    req.startTime = new Date();
    req.id = req.get('X-Request-Id');
    req.log = log;

    req.on('end', () => {
      if (req.errorWasLogged) {
        // ignore because error was already logged
        return;
      }

      const { statusCode } = res;
      const level = toLevel(statusCode);
      const entry = toEntry(req, res);

      if (pretty) {
        const { method, href } = req;
        const { duration } = entry;
        const statusColor = statusCode < 400 ? green : statusCode < 500 ? yellow : red;
        const durationColor = duration <= 100 ? green : duration < 1000 ? yellow : red;
        log[level](...[method, statusColor(statusCode), href, durationColor(`${duration}ms`)]);
      } else {
        log[level](res.statusMessage, entry);
      }
    });

    res.error = (err) => {
      req.errorWasLogged = true;
      res.status(STATUS_MESSAGES[err.message] || 500);

      const level = toLevel(res.statusCode);
      const entry = toEntry(req, res, err);

      log[level](err, entry);

      res.render(toErrorPath(req, res), {
        problem: `${err.name}: ${err.message}`,
        stack: err.stack
          .split('\n')
          .map((line) => line.replace(/(\/.+\:\d+\:\d+)/, `<a href=\"vscode://file$1\">$1</a>`))
          .join('\n'),
        ...entry
      });
    };

    next();
  };
}
