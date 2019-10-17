const Hapi = require('@hapi/hapi');

const MemorySync = require('lowdb/adapters/Memory')
const low = require('lowdb')
const db = low(new MemorySync());

db.defaults(require('./db.json')).write();

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 7000;

const server = Hapi.server({
  host: HOST,
  port: PORT,
});

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, h) {
    return { message: 'Hello World!' };
  }
});

server.route({
  method: 'GET',
  path: '/user',
  handler: function (request, h) {
    return db.get('users').value();
  }
});

server.route({
  method: 'GET',
  path: '/user/{userid}',
  handler: function (request, h) {
    const { userid } = request.params;
    const user = db.get('users').find({ id: parseInt(userid, 10) });
    if (user.value() !== undefined) {
      return user.value();
    }
    return h.response({ error: `user id ${userid} not found` }).code(400)
  }
});

server.start();

console.info(`Server started at ${server.info.uri}`);
