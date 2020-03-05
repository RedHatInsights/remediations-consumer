import * as Joi from '@hapi/joi';
import { Message } from 'kafka-node';

export function parse<T> (message: Message): any {
    return JSON.parse(message.value.toString());
}

export function validate<T> (value: any, schema: Joi.ObjectSchema): T {
    const { error } = Joi.validate(value, schema, {allowUnknown: true});
    if (error) {
        throw error;
    }

    return value;
}
