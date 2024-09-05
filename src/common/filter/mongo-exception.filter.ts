import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { MongoError } from 'mongodb';

@Catch()
export class BadRequestFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        response.status(400).json({ message: exception.message });
    }
}

@Catch(MongoError)
export class MongoFilter implements ExceptionFilter {
    catch(exception: MongoError, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        if (exception.code == 11000) {
            response.status(400).json({ message: 'User already exists.' });
        } else {
            response.status(500).json({ message: 'Internal error.' });
        }
    }
}

