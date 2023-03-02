import * as Joi from '@hapi/joi';
import { Message } from 'kafkajs';

export function parse (message: Message): any {
    const stringValue = (message.value) ? message.value.toString() : null;
    if (typeof(stringValue) === 'string') {
        return JSON.parse(stringValue);
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
