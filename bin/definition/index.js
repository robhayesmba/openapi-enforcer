/**
 *  @license
 *    Copyright 2018 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const Exception = require('../exception');
const Result    = require('../result');
const Swagger   = require('./swagger');
const util      = require('../util');

const rxExtension = /^x-.+/;

module.exports = function(definition) {
    const exception = Exception('One or more errors exist in the OpenAPI definition');
    const warn = Exception('One or more warnings exist in the OpenAPI definition');
    const hasSwagger = definition.hasOwnProperty('swagger');
    if (!hasSwagger && !definition.hasOwnProperty('openapi')) {
        return new Result(exception('Missing required "openapi" or "swagger" property'), null);
    } else {
        const match = /^(\d+)(?:\.(\d+))(?:\.(\d+))?$/.exec(definition.swagger || definition.openapi);
        if (match) {
            const major = +match[1];
            const minor = +match[2];
            const patch = +(match[3] || 0);
            const validator = Swagger;
            const value = util.copy(definition);
            return new Result(exception, normalize({ exception, major, minor, parent, patch, validator, value, warn }));
        } else {
            return new Result(exception('Invalid value for property: ' + (hasSwagger ? 'swagger' : 'openapi')), null);
        }
    }
};

module.exports.normalize = function(version, validator, definition) {
    if (version === 2) version = '2.0';
    if (version === 3) version = '3.0.0';
    const exception = Exception('One or more errors exist in the definition');
    const warn = Exception('One or more warnings exist in the definition');
    const match = /^(\d+)(?:\.(\d+))(?:\.(\d+))?$/.exec(version);
    const major = +match[1];
    const minor = +match[2];
    const patch = +(match[3] || 0);
    const parent = null;
    const value = util.copy(definition);
    return new Result(exception, normalize({ exception, major, minor, parent, patch, validator, value, warn }));
};

// module.exports.version = function(version) {
//     if (version === 2) version = '2.0';
//     if (version === 3) version = '3.0.0';
//     const match = /^(\d+)(?:\.(\d+))(?:\.(\d+))?$/.exec(version);
//     if (!match) return null;
//
//     const major = +match[1];
//     const minor = +match[2];
//     const patch = +(match[3] || 0);
//     return { major, minor, patch };
// };

/**
 *
 * @param {object} data
 * @param {Exception} data.exception
 * @param {number} data.major
 * @param {number} data.minor
 * @param {object} data.parent
 * @param {number} data.patch
 * @param {object} data.validator
 * @param {*} data.value
 * @param {Exception} data.warn
 * @returns {*}
 */
function normalize(data) {
    const { exception, major, minor, parent, patch, value, warn } = data;
    const validator = normalizeValidator(data.validator);
    let message;
    let result;

    if (validator.type && (message = fn(validator.type, data)) !== getValueType(value)) {
        if (message === 'array') message = 'array';
        if (message === 'object') message = 'plain object';
        message = message === 'array' ? 'n array' : ' ' + message;
        exception('Value must be a' + message + '. Received: ' + util.smart(value));

    // check if enum matches
    } else if (validator.enum && (message = checkEnum(data))) {
        message.length === 1
            ? exception('Value must equal: ' + message[0] + '. Received: ' + util.smart(value))
            : exception('Value must be one of: ' + message.join(', ') + '. Received: ' + util.smart(value));

    } else if (validator.type === 'array') {
        result = value.map((v, i) => {
            return normalize({
                exception: exception.at(i),
                major,
                minor,
                parent: data,
                patch,
                validator: validator.items,
                value: v,
                warn: warn.at(i)
            });
        });

    } else if (validator.type === 'object') {
        result = {};
        if (validator.additionalProperties) {
            result = normalize({
                exception,
                major,
                minor,
                parent,
                patch,
                validator: validator.additionalProperties,
                value: value,
                warn: warn
            });

        } else if (!validator.properties) {
            Object.keys(value).forEach(key => {
                result[key] = value[key];
            });

        } else {
            const allowed = {};
            const missingRequired = [];
            const notAllowed = [];
            const properties = validator.properties;

            // check for missing required and set defaults
            Object.keys(properties).forEach(key => {
                const validator = normalizeValidator(properties[key]);
                const param = {
                    exception: exception.at(key),
                    major,
                    minor,
                    parent: data,
                    patch,
                    validator: properties[key],
                    value: value[key],
                    warn: warn.at(key)
                };

                // check whether this property is allowed
                allowed[key] = validator.hasOwnProperty('allowed')
                    ? fn(validator.allowed, param)
                    : true;

                // if it doesn't have the property and it is allowed then check if it is required or has a default
                if (!value.hasOwnProperty(key) && allowed[key]) {
                    if (validator.required && fn(validator.required, param)) {
                        missingRequired.push(key);
                    } else if (validator.hasOwnProperty('default')) {
                        value[key] = fn(validator.default, param);
                    }
                }
            });

            // validate each property and copy to the result object
            Object.keys(value).forEach(key => {

                // check if the key is an extension property
                if (rxExtension.test(key)) {
                    result[key] = value[key];

                // check if property allowed
                } else if (!allowed[key]) {
                    notAllowed.push(key);

                } else if (!validator.ignore || !fn(validator.ignore, { exception, major, minor, parent: data, patch, validator, value, warn })) {
                    result[key] = normalize({
                        exception: exception.at(key),
                        major,
                        minor,
                        parent: data,
                        patch,
                        value: value[key],
                        validator: validator.properties[key],
                        warn: warn.at(key)
                    });
                }
            });

            // report missing required properties
            if (missingRequired.length) {
                missingRequired.sort();
                exception('Missing required propert' + (missingRequired.length === 1 ? 'y' : 'ies') + ': ' + missingRequired.join(', '));
            }

            // report not allowed properties
            if (notAllowed.length) {
                exception('Propert' + (notAllowed.length === 1 ? 'y' : 'ies') + ' not allowed: ' + notAllowed.join(', '));
            }
        }

    } else {
        result = validator.deserialize
            ? fn(validator.deserialize, {
                exception,
                major,
                minor,
                parent,
                patch,
                validator,
                value,
                warn
            })
            : value;
    }

    if (result !== undefined && validator.errors) {
        fn(validator.errors, {
            exception,
            major,
            minor,
            parent,
            patch,
            validator,
            value: result,
            warn
        });
    }

    return result;
}

function fn(value, params) {
    return typeof value === 'function'
        ? value(params)
        : value;
}

function normalizeValidator(validator) {
    if (typeof validator === 'string') validator = { type: validator };
    if (!validator.type && validator.items) validator.type = 'array';
    if (!validator.type && (validator.additionalProperties || validator.properties)) validator.type = 'object';
    return validator;
}

function getValueType(value) {
    if (Array.isArray(value)) return 'array';
    if (util.isPlainObject(value)) return 'object';
    const type = typeof value;
    return type === 'object' ? '' : type;
}

function checkEnum(params) {
    const { validator, value } = params;
    if (!validator.enum) return false;
    const matches = fn(validator.enum, params);
    return matches.indexOf(value) !== -1
        ? false
        : matches;
}