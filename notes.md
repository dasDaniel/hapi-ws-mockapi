## Part 1

Create repo with hapi dependency

- init repo
  `npm init`
- install hapi
  `npm i -s @hapi/hapi`
- create server js
  `touch server.js`
- add script (package.json)
  `"start": node server.js`

## Part 2

Start server

- update server.js file

  ```js
  const Hapi = require("@hapi/hapi");

  const HOST = process.env.HOST || "localhost";
  const PORT = process.env.PORT || 7000;

  const server = Hapi.server({
    host: HOST,
    port: PORT
  });

  server.start();

  console.info(`Server started at ${server.info.uri}`);
  ```

This will start a server when you run `npm run start`

_TIP_

> Server needs to be restarted after every change
> `nodemon` helps with that by watching folder and automatically restarting
> install with `sudo npm i -g nodemon`
> and run with `nodemon server.js`

## Part 3

add a route

- add code to server.js before `server.start()`
  ```js
  server.route({
    method: "GET",
    path: "/",
    handler: function(request, h) {
      return "Hello World!";
    }
  });
  ```

Using browser to navigate to _localhost:7000_ will now result in a `Hello World!` response message. No HTML is included. For rendering pages, we can add a templating plugin to handle, but we'll be focusing on building an API.

# Making something meaningful

## Part 4 

Let's create a stateful mocking server for a user manager

### 😱 Requirements
- load with initial state (users[name, email])
- have endpoints pull data
- ability to crud user
- ability to reset state
- reset state on reload


- add lowdb dependency
  `npm i -s lowdb`
- create a db.json file
- add lowdb script
  ```js
  const MemorySync = require('lowdb/adapters/Memory')
  const low = require('lowdb')
  const db = low(new MemorySync());

  db.defaults(require('./db.json')).write();
  ```
  This will load the json file to populate an in-memory database. 
  It can also be set-up to update the json file by using a file adapter, but that's not what we need for this example.
- add a route to handle list
  ```js
  server.route({
    method: 'GET',
    path: '/user',
    handler: function (request, h) {
      return db.get('users').value();
    }
  });
  ```
  This code will return all the users.

## Part 5

- create a route for single user
  ```js
  server.route({
    method: 'GET',
    path: '/user/{userid}',
    handler: function (request, h) {
      const { userid } = request.params;
      const user = db.get('users').find({ id: parseInt(userid, 10) });
      return user.value();
    }
  });
  ```
  This will find the user in our db and return it

## Part 6

- add code to handle error
  ```js
    if (user.value() !== undefined) {
      return user.value();
    }
    return h.response({ error: `user id ${userid} not found` }).code(400)
  ```
  this will return a 400 error when we try to find a user that does not exist.

## Part 7

create a new user

- create a POST route
- get data from json payload
- generate id
- create user object
- insert object into db
- query db for created object using id (redundant, but ensures that user is added)
  ```js
  server.route({
    method: 'POST',
    path: '/user',
    handler: function (request, h) {
      const { first_name, last_name, email, ip_address } = request.payload;
      const id = Math.round(Math.random() * 10000); // not the safest way to generate a unique id...
      const user = { id, first_name, last_name, email, ip_address };

      db.get('users').push(user).write();
      return db.get('users').find({ id }).value();
    }
  });
  ```

## Part 8 

Add validation to post

- install joi package
  `npm i -s @hapi/joi`
- add joi library to server.js
  `const Joi = require('@hapi/joi');`
- define user schema
  ```js
  const userSchema = Joi.object({
    first_name: Joi.string().min(3).max(64).required(),
    last_name: Joi.string().min(3).max(64).required(),
    email: Joi.string().min(3).max(64).required(),
    ip_address: Joi.string().min(7).max(15),
  });
  ```
- add validator
  ```js
  config: {
    validate: {
      payload: userSchema,
    }
  }
  ```

## Part 9

Delete a user

- add new route with lookup, delete and confirmation
  ```js
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
  ```
  Check if user exists, then remove and send success message. If user does not exist, it will return an error.
  Because the server has a in-memory state, requesting a valid id twice will fail on second call, since it is being removed. On restart, the state is reset. This can be especially helpful in automated test where you may want the state to mutate in a predictable way.

## Part 10

Update user (by id) using PUT method.

- create a new route
- use `assign` to update user database in handler
- add validation
- code: 
  ```js
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
  ```
  The PUT method implementation expects the new object to be provided as whole. (Unlike PATCH, which allows parts of object to be updated. PATCH is usually more verbose, since it can contain logic)

## Part 11

Add better response on bad schema request

- include Boom library (already a dependency of Hapi, so install not required)
  `const Boom = require('@hapi/boom');`
- add a universal route handler as object in `Hapi.server` config
  ```js
  routes: {
    validate: {
      failAction: async (request, h, err) => {
        throw Boom.badRequest(err.message);
      }
    }
  }
  ```
  Adding this to server during setup, will apply to all routes. This can also be added to routes individually.

## Part 12

Refactor user routes

- create directory 
  `mkdir routes`
- create file
  `touch routes/user.js`
- put user routes definitions in the new file inside a plugin definition
  ```js
  module.exports = {
    name: 'user-routes',
    version: '1.0.0',
    register: async function(server, options) {
      // routes
    }
  ```
- move/copy the required libraries
- move `db.json`
  refactored to only include array of users
- include the user routes plugin in server.js
  `const userRoutes = require('./routes/user');`
- register the plugin
  `server.register(userRoutes);`
  which will throw an error
  > Cannot start server before plugins finished registration
  This is because the plugin mounting is asynchronous, and we need to wait. This is done using the await method.
- wrap server in `async` call
  ```js
  (async () => {
    // server code here
  })()
  ```

_server.js_:

  ```js
  const Hapi = require('@hapi/hapi');
  const Boom = require('@hapi/boom');

  const userRoutes = require('./routes/user');

  const HOST = process.env.HOST || 'localhost';
  const PORT = process.env.PORT || 7000;

  (async () => {
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

    await server.route({
      method: 'GET',
      path: '/',
      handler: function(request, h) {
        return { message: 'Hello World!' };
      }
    });

    await server.register(userRoutes);
    server.start();
    console.info(`Server started at ${server.info.uri}`);
  })();
  ```
_routes/user.js_:
  ```js
  const Joi = require('@hapi/joi');

  const MemorySync = require('lowdb/adapters/Memory');
  const low = require('lowdb');
  const db = low(new MemorySync());
  const usersDefault = require('./users.json');
  db.defaults({ users:usersDefault }).write();

  const userSchema = Joi.object({
    first_name: Joi.string().min(3).max(64).required(),
    last_name: Joi.string().min(3).max(64).required(),
    email: Joi.string().min(3).max(64).required(),
    ip_address: Joi.string().min(7).max(15)
  });

  module.exports = {
    name: 'user-routes',
    version: '1.0.0',
    register: async function(server, options) {

      await server.route({
        method: 'GET',
        path: '/user/{userid}',
        handler: function(request, h) {
          const { userid } = request.params;
          const user = db.get('users').find({ id: parseInt(userid, 10) });
          if (user.value() !== undefined) {
            return user.value();
          }
          return h.response({ error: `user id ${userid} not found` }).code(400);
        }
      });

      await server.route({
        method: 'POST',
        path: '/user',
        config: {
          validate: {
            payload: userSchema
          }
        },
        handler: function(request, h) {
          const { first_name, last_name, email, ip_address } = request.payload;
          const id = Math.round(Math.random() * 10000); // not the safest way to generate a unique id...
          const user = { id, first_name, last_name, email, ip_address };

          db.get('users')
            .push(user)
            .write();
          return db
            .get('users')
            .find({ id })
            .value();
        }
      });

      await server.route({
        method: 'DELETE',
        path: '/user/{userid}',
        handler: function(request, h) {
          const { userid } = request.params;
          const user = db.get('users').find({ id: parseInt(userid, 10) });
          if (user.value() !== undefined) {
            db.get('users')
              .remove({ id: parseInt(userid, 10) })
              .write();
            return { message: `user id ${userid} was deleted` };
          }
          return h.response({ error: `user id ${userid} not found` }).code(400);
        }
      });

      await server.route({
        method: 'PUT',
        path: '/user/{userid}',
        config: {
          validate: {
            payload: userSchema
          }
        },
        handler: function(request, h) {
          const { first_name, last_name, email, ip_address } = request.payload;
          const { userid } = request.params;
          const id = parseInt(userid, 10);
          const user = db.get('users').find({ id });
          if (user.value() !== undefined) {
            user.assign({ id, first_name, last_name, email, ip_address }).write();
            return db
              .get('users')
              .find({ id })
              .value();
          }
          return h.response({ error: `user id ${id} not found` }).code(400);
        }
      });
    }
  };
  ```
