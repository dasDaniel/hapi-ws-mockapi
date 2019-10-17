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


