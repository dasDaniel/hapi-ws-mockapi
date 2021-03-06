const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');

const MemorySync = require('lowdb/adapters/Memory')
const low = require('lowdb')
const db = low(new MemorySync());

db.defaults(require('./db.json')).write();

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 7000;

const server = Hapi.server({
  host: HOST,
  port: PORT,
  routes: {
    validate: {
      failAction: async (request, h, err) => {
        throw Boom.badRequest(err.message);
      }
    }
  }
});


const userSchema = Joi.object({
  first_name: Joi.string().min(3).max(64).required(),
  last_name: Joi.string().min(3).max(64).required(),
  email: Joi.string().min(3).max(64).required(),
  ip_address: Joi.string().min(7).max(15),
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

server.route({
  method: 'POST',
  path: '/user',
  config: {
    validate: {
      payload: userSchema,
    }
  },
  handler: function (request, h) {
    const { first_name, last_name, email, ip_address } = request.payload;
    const id = Math.round(Math.random() * 10000); // not the safest way to generate a unique id...
    const user = { id, first_name, last_name, email, ip_address };

    db.get('users').push(user).write();
    return db.get('users').find({ id }).value();
  }
});

server.route({
  method: 'DELETE',
  path: '/user/{userid}',
  handler: function (request, h) {
    const { userid } = request.params;
    const user = db.get('users').find({ id: parseInt(userid, 10) });
    if (user.value() !== undefined) {
      db.get('users').remove({ id: parseInt(userid, 10) }).write();
      return { message: `user id ${userid} was deleted` }
    }
    return h.response({ error: `user id ${userid} not found` }).code(400)
  }
});

server.route({
  method: 'PUT',
  path: '/user/{userid}',
  config: {
    validate: {
      payload: userSchema,
    }
  },
  handler: function (request, h) {
    const { first_name, last_name, email, ip_address } = request.payload;
    const { userid } = request.params;
    const id = parseInt(userid, 10);
    const user = db.get('users').find({ id });
    if (user.value() !== undefined) {
      user.assign({ id, first_name, last_name, email, ip_address }).write();
      return db.get('users').find({ id }).value();
    }
    return h.response({ error: `user id ${id} not found` }).code(400)
  }
});

server.start();

console.info(`Server started at ${server.info.uri}`);
