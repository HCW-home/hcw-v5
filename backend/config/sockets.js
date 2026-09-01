const jwt = require('jsonwebtoken')
module.exports.sockets = {
  transports: [
    'websocket',
  ],
  adapter: '@sailshq/socket.io-redis',
  host:  process.env.REDIS_HOST || '127.0.0.1' ,
  port: process.env.REDIS_PORT || '6379',
  pass: process.env.REDIS_PASSWORD,
  origins: '*:*',

  // socket.io v4 defaults. The previous 10s/15s pair disconnected clients on any
  // 10s stall, which is common on congested mobile links, and every reconnection
  // has to re-pass beforeConnect below. The 'heartbeat *' keys were socket.io 0.9
  // options and had no effect.
  pingTimeout: 20000,
  pingInterval: 25000,

  beforeConnect(handshake, proceed) {
    if (handshake._query && handshake._query.token) {
      jwt.verify(
        handshake._query.token,
        sails.config.globals.APP_SECRET,
        async (err, decoded) => {
          if (err) {
            sails.config.customLogger.log('error', 'JWT verification failed', null, 'server-action', null);
            return proceed(false);
          }
          const user = await User.findOne({ id: decoded.id });
          if (!user) {
            sails.config.customLogger.log('error', 'No user found', null, 'server-action', null);
            return proceed(false);
          }
          handshake.user = user;
          sails.config.customLogger.log('info', `Connecting User to Socket: ${user.id}`, null, 'server-action', user?.id);
          return proceed(undefined, true);
        }
      );
    } else {
      sails.config.customLogger.log('warn', 'No token was found', null, 'server-action', null);
      return proceed({ message: 'no Token was found' }, false);
    }
  }

}
