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
