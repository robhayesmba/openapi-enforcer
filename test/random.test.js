'use strict';
const Buffer    = require('buffer').Buffer;
const expect    = require('chai').expect;
const random    = require('../bin/random');

describe('random', () => {

    describe('array', () => {

        it('is array', () => {
            expect(random.array({})).to.be.an.instanceOf(Array);
        });

        it('minimum length', () => {
            const schema = { minItems: 5 };
            expect(random.array(schema).length).to.be.at.least(5);
        });

        it('maximum length', () => {
            const schema = { maxItems: 1 };
            expect(random.array(schema).length).to.be.at.most(1);
        });

        it('maximum and minimum length', () => {
            const schema = { minItems: 1, maxItems: 1 };
            expect(random.array(schema).length).to.equal(1);
        });

    });

    describe('binary and byte', () => {

        it('is buffer', () => {
            expect(random.binary({})).to.be.an.instanceOf(Buffer);
        });

        it('minimum length', () => {
            const schema = { minLength: 5 };
            expect(random.binary(schema).length).to.be.at.least(5);
        });

        it('maximum length', () => {
            const schema = { maxLength: 1 };
            expect(random.binary(schema).length).to.be.at.most(1);
        });

        it('maximum and minimum length', () => {
            const schema = { minLength: 1, maxLength: 1 };
            expect(random.binary(schema).length).to.equal(1);
        });

    });

    describe('boolean', () => {

        it('enum', () => {
            const schema = { enum: [true] };
            expect(random.boolean(schema)).to.be.true;
        });

        it('true or false', () => {
            expect(random.boolean({})).to.be.oneOf([true, false]);
        });

    });

    describe('date', () => {

        it('is a date', () => {
            expect(random.date({})).to.be.an.instanceOf(Date);
        });

        it('is at start of day', () => {
            const value = random.date({}).toISOString().substr(10);
            expect(value).to.equal('T00:00:00.000Z');
        });

    });

    describe('dateTime', () => {

        it('is a date', () => {
            expect(random.dateTime({})).to.be.an.instanceOf(Date);
        });

        it('minimum', () => {
            const str = '2001-01-01';
            const d = new Date(str);
            const schema = { minimum: str };
            expect(+random.dateTime(schema)).to.be.at.least(+d);
        });

        it('maximum', () => {
            const str = '2001-01-01';
            const d = new Date(str);
            const schema = { maximum: str };
            expect(+random.dateTime(schema)).to.be.at.most(+d);
        });

        it('maximum and minimum', () => {
            const str1 = '2001-01-01';
            const str2 = '2001-01-02';
            const d1 = new Date(str1);
            const d2 = new Date(str2);
            const schema = { minimum: str1, maximum: str2 };
            const v = +random.dateTime(schema);
            expect(v).to.be.at.least(+d1);
            expect(v).to.be.at.most(+d2);
        });

    });

    describe('integer', () => {

        it('is integer', () => {
            const value = random.integer({});
            expect(value).to.be.a('number');
            expect(Math.round(value)).to.equal(value);
        });

        it('enum', () => {
            const schema = { enum: [1, 2, 3, -5] };
            expect(random.integer(schema)).to.be.oneOf(schema.enum);
        });

        it('random', () => {
            const value = random.integer({});
            expect(value).to.be.at.most(500);
            expect(value).to.be.at.least(-500);
        });

        it('minimum', () => {
            const schema = { minimum: 0 };
            expect(random.integer(schema)).to.be.at.least(0);
        });

        it('maximum', () => {
            const schema = { maximum: 0 };
            expect(random.integer(schema)).to.be.at.most(0);
        });

        it('minimum and maximum', () => {
            const schema = { minimum: 0, maximum: 2 };
            expect(random.integer(schema)).to.be.oneOf([0, 1, 2])
        });

        it('minimum and maximum exclusive', () => {
            const schema = { minimum: 0, maximum: 2, exclusiveMinimum: true, exclusiveMaximum: true };
            expect(random.integer(schema)).to.equal(1);
        });

    });

    describe('number', () => {

        it('is number', () => {
            const value = random.number({});
            expect(value).to.be.a('number');
        });

        it('enum', () => {
            const schema = { enum: [1, 2.2, 3.3, -5.5] };
            expect(random.number(schema)).to.be.oneOf(schema.enum);
        });

        it('random', () => {
            const value = random.number({});
            expect(value).to.be.at.most(500);
            expect(value).to.be.at.least(-500);
        });

        it('minimum', () => {
            const schema = { minimum: 0 };
            expect(random.number(schema)).to.be.at.least(0);
        });

        it('maximum', () => {
            const schema = { maximum: 0 };
            expect(random.number(schema)).to.be.at.most(0);
        });

        it('minimum and maximum', () => {
            const schema = { minimum: 0, maximum: 2 };
            const value = random.number(schema);
            expect(value).to.be.at.least(0);
            expect(value).to.be.at.most(2);
        });

        it('minimum and maximum exclusive', () => {
            const schema = { minimum: 0, maximum: 2, exclusiveMinimum: true, exclusiveMaximum: true };
            const value = random.number(schema);
            expect(value).to.be.greaterThan(0);
            expect(value).to.be.lessThan(2);
        });
    });

    describe('object', () => {

        it('is object', () => {
            expect(random.object({})).to.be.an.instanceOf(Object);
        });

        it('has all required properties', () => {
            const schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'string',
                        required: true
                    },
                    b: {
                        type: 'string',
                        format: 'date',
                        required: true
                    }
                }
            };
            const value = random.object(schema);
            expect(value.a).to.be.a('string');
            expect(value.b).to.be.an.instanceOf(Date);
        });

        it('has all optional properties when space available', () => {
            const schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'string',
                        required: false
                    },
                    b: {
                        type: 'string',
                        format: 'date',
                        required: false
                    }
                }
            };
            const value = random.object(schema);
            expect(value.a).to.be.a('string');
            expect(value.b).to.be.an.instanceOf(Date);
        });

        it('has some optional properties when some space available', () => {
            const schema = {
                type: 'object',
                minProperties: 1,
                maxProperties: 2,
                properties: {
                    a: {
                        type: 'string',
                        required: true
                    },
                    b: {
                        type: 'number'
                    },
                    c: {
                        type: 'number'
                    }
                }
            };
            const value = random.object(schema);
            expect(Object.keys(value).length).to.equal(2);
            expect(value.a).to.be.a('string');
            expect(value.b || value.c).to.be.a('number');
        });

        it('has additional properties when space available', () => {
            const schema = {
                type: 'object',
                maxProperties: 2,
                properties: {
                    a: {
                        type: 'string',
                        required: true
                    }
                },
                additionalProperties: {
                    type: 'number'
                }
            };
            const value = random.object(schema);
            expect(Object.keys(value).length).to.equal(2);
            expect(value.a).to.be.a('string');
            expect(value.additionalProperty1).to.be.a('number');
        });

    });

    describe('string', () => {

        it('is string', () => {
            const value = random.string({});
            expect(value).to.be.a('string');
        });

        it('minimum length', () => {
            const schema = { minLength: 500 };
            expect(random.string(schema).length).to.be.at.least(500);
        });

        it('maximum length', () => {
            const schema = { maxLength: 10 };
            expect(random.string(schema).length).to.be.at.most(10);
        });

        it('minimum and maximum length', () => {
            const schema = { minLength: 0, maxLength: 2 };
            const value = random.string(schema);
            expect(value.length).to.be.at.least(0);
            expect(value.length).to.be.at.most(2);
        });
    });

});