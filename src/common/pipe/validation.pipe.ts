import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    async transform(value, metadata: ArgumentMetadata) {
        if (Object.keys(value).length == 0) {
            throw new BadRequestException('No valid fields were requested');
        } 

        const { metatype } = metadata;
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const object = plainToClass(metatype, value);
        const errors = await validate(object);

        if (errors.length > 0) {
            let errMessage = JSON.stringify(errors[0].constraints);
            if (errMessage == undefined) {
                errMessage = JSON.stringify(errors[0].children[0].constraints);
            }
            throw new BadRequestException('Value validation failed: ' + errMessage);
        }

        return value;
    }

    private toValidate(metatype): boolean {
        const types = [String, Boolean, Number, Array, Object];
        return !types.find(type => metatype == type);
    }
}