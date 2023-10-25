const sentry = require('@sentry/node');
const { ExtraErrorData } = require('@sentry/integrations');
const { NODE_ENV } = process.env;


module.exports = (sentryDsn) => {
  sentry.init({
    dsn: sentryDsn,
    environment: NODE_ENV,
    integrations: [new ExtraErrorData({ depth: 7 })],
    normalizeDepth: 7,
    enabled: true
  });

  return (err, entry = {}) => {
    if (err) {
      if (entry.req) {
        // captured exception from reporter middleware
        const { id, method, href } = entry.req;
        const name = `${method} ${href}`;

        sentry.setTag('request_id', id);
        sentry.configureScope((scope) => scope.setTransactionName(name));
        sentry.captureException(err, {
          fingerprint: [name, err.message],
          extra: {
            req: entry.req,
            res: entry.res,
            duration: entry.duration
          }
        });
      } else {
        // errors outside of the request lifecycle
        sentry.captureException(err, {
          fingerprint: [err.message],
          extra: entry
        });
      }
    }
  }
};
