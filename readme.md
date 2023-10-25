# Reporter

Middleware for Dylan which provides logging, error handling, and Sentry capturing.

## Install

`npm install @dylanjs/reporter`

## Usage

``` js
const reporter = require('@dylanjs/reporter');
app.use(reporter({
  level: 20,
  pretty: true,
  sentryDsn: 'https://foo.ingest.sentry.io/boo',
  toErrorPath: (req, res) => './path/to/error/template',
  defaults: () => {
    return {
      time: new Date().toISOString()
    };
  }
}));
```

## Levels
DEBUG (10) anything else that's too verbose to be included in "info" level
INFO (20) detail on regular operation
WARN (30) a note on something that should be looked into eventually
ERROR (40) error on request. app still usable. should be looked into soon
FATAL (50) app is unusable. should be looked into ASAP
