import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app.module';
import { CommonModule, LogInterceptor } from './modules/common';

/**
 * These are API defaults that can be changed using environment variables,
 * it is not required to change them (see the `.env.example` file)
 */
const API_DEFAULT_PORT = 3000;
const API_DEFAULT_PREFIX = '/api/v1';

/**
 * The defaults below are dedicated to Swagger configuration, change them
 * following your needs (change at least the title & description).
 *
 * @todo Change the constants below following your API requirements
 */
const SWAGGER_TITLE = 'Tapos API';
const SWAGGER_DESCRIPTION = 'API used for tapos';
const SWAGGER_PREFIX = '/docs';

/**
 * Register a Swagger module in the NestJS application.
 * This method mutates the given `app` to register a new module dedicated to
 * Swagger API documentation. Any request performed on `SWAGGER_PREFIX` will
 * receive a documentation page as response.
 *
 * @todo See the `nestjs/swagger` NPM package documentation to customize the
 *       code below with API keys, security requirements, tags and more.
 */
function createSwagger(app: INestApplication) {
    const options = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        // Explicitly name it "access-token" to match Controller
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'access-token',
        )
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(SWAGGER_PREFIX, app, document);
}

/**
 * Build & bootstrap the NestJS API.
 * This method is the starting point of the API; it registers the application
 * module and registers essential components such as the logger and request
 * parsing middleware.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter()
    );

    // ADD CORS CONFIGURATION
    // This allows your React/Next.js frontend to talk to your Fastify backend
    app.enableCors({
        origin: [
            'http://localhost:4000', // Frontend Dev Port
            'http://localhost:3000', // Alternative Port
            'https://tapos.work', // Your Portfolio/Production site
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true, // Allows cookies and Authorization headers
    });

    // TODO: HELMET SECURITY
    // Since I have a @todo for Helmet, it's highly advised for api.tapos.work
    // Note: I'll need to run 'npm install @fastify/helmet'
    // import helmet from '@fastify/helmet';
    // await app.register(helmet, {
    //   contentSecurityPolicy: false, // Disable if it interferes with Swagger
    // });

    app.setGlobalPrefix(process.env.API_PREFIX || API_DEFAULT_PREFIX);

    if (!process.env.SWAGGER_ENABLE || process.env.SWAGGER_ENABLE === '1') {
        createSwagger(app);
    }

    const logInterceptor = app.select(CommonModule).get(LogInterceptor);
    app.useGlobalInterceptors(logInterceptor);

    // ENHANCED VALIDATION PIPE
    // Adding 'transform: true' ensures your string IDs from params become numbers
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true // Required for your findById(Number(id)) logic
    }));

    // Listen on 0.0.0.0 to allow access within Docker or external networks
    const port = process.env.API_PORT || API_DEFAULT_PORT;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: http://localhost:${port}${API_DEFAULT_PREFIX}`);
    console.log(`📝 Swagger docs available at: http://localhost:${port}${SWAGGER_PREFIX}`);
}

/**
 * It is now time to turn the lights on!
 * Any major error that can not be handled by NestJS will be caught in the code
 * below. The default behavior is to display the error on stdout and quit.
 *
 * @todo It is often advised to enhance the code below with an exception-catching
 *       service for better error handling in production environments.
 */
bootstrap().catch(err => {

    // eslint-disable-next-line no-console
    console.error(err);

    const defaultExitCode = 1;
    process.exit(defaultExitCode);
});
