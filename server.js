const Hapi = require('@hapi/hapi');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 7000;

const server = Hapi.server({
  host: HOST,
  port: PORT,
})

server.start();

console.info(`Server started at ${server.info.uri}`);
