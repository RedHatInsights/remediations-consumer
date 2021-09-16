import * as Joi from '@hapi/joi';
import { Message } from 'kafkajs';

export function parse<T> (message: Message): any {
    if (typeof(message.value) === 'string') {
        return JSON.parse(message.value);
    }

    return null;
}

export function validate<T> (value: any, schema: Joi.ObjectSchema): T {
    const { error } = Joi.validate(value, schema, {allowUnknown: true});
    if (error) {
        throw error;
    }

    return value;
}
