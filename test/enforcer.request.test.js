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
const Definition    = require('../bin/definition');
const Enforcer      = require('../index');
const expect        = require('chai').expect;

describe.only('enforcer/request', () => {

    describe('path parameters', () => {

        describe('variations', () => {

            it('/{name}', () => {
                const def = new Definition(2)
                    .addParameter('/{name}', 'get', { name: 'name', in: 'path', required: true, type: 'string' })
                    .build();
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '/bob' });
                expect(req.path).to.deep.equal({ name: 'bob' })
            });

            it('/{a},{b}.{c}-{d}', () => {
                const def = new Definition(2)
                    .addParameter('/{a},{b}.{c}-{d}', 'get',
                        { name: 'a', in: 'path', required: true, type: 'string' },
                        { name: 'b', in: 'path', required: true, type: 'string' },
                        { name: 'c', in: 'path', required: true, type: 'string' },
                        { name: 'd', in: 'path', required: true, type: 'string' })
                    .build();
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '/paths,have.parameters-sometimes' });
                expect(req.path).to.deep.equal({ a: 'paths', b: 'have', c: 'parameters', d: 'sometimes' })
            });

            it('/{a}/b/{c}/{d}/e', () => {
                const def = new Definition(2)
                    .addParameter('/{a}/b/{c}/{d}/e', 'get',
                        { name: 'a', in: 'path', required: true, type: 'string' },
                        { name: 'c', in: 'path', required: true, type: 'string' },
                        { name: 'd', in: 'path', required: true, type: 'string' })
                    .build();
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '/a/b/c/d/e' });
                expect(req.path).to.deep.equal({ a: 'a', c: 'c', d: 'd' })
            });

        });

        describe('v2', () => {

            it('will serialize values', () => {
                const def = new Definition(2)
                    .addParameter('/{array}/{num}/{boolean}/{date}/{dateTime}/{binary}/{byte}', 'get',
                        { name: 'array', in: 'path', required: true, type: 'array', items: { type: 'integer' } },
                        { name: 'num', in: 'path', required: true, type: 'number' },
                        { name: 'boolean', in: 'path', required: true, type: 'boolean' },
                        { name: 'date', in: 'path', required: true, type: 'string', format: 'date' },
                        { name: 'dateTime', in: 'path', required: true, type: 'string', format: 'date-time' },
                        { name: 'binary', in: 'path', required: true, type: 'string', format: 'binary' },
                        { name: 'byte', in: 'path', required: true, type: 'string', format: 'byte' });
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '1,2,3/123/false/2000-01-01/2000-01-01T01:02:03.456Z/00000010/aGVsbG8=' });
                expect(req.path).to.deep.equal({
                    array: [1,2,3],
                    num: 123,
                    boolean: false,
                    date: new Date('2000-01-01'),
                    dateTime: new Date('2000-01-01T01:02:03.456Z'),
                    binary: Buffer.from([2]),
                    byte: Buffer.from('aGVsbG8=', 'base64')
                })
            });

            it('will serialize nested arrays', () => {
                const def = new Definition(2)
                    .addParameter('/{array}', 'get', {
                        name: 'array',
                        in: 'path', required: true,
                        type: 'array',
                        collectionFormat: 'pipes',
                        items: {
                            type: 'array',
                            items: {
                                type: 'array',
                                collectionFormat: 'ssv',
                                items: {
                                    type: 'number'
                                }
                            }
                        }
                    });
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '/1 2 3,4 5|6,7 8' });
                expect(req.path).to.deep.equal({
                    array: [
                        [
                            [1,2,3],
                            [4,5]
                        ],
                        [
                            [6],
                            [7,8]
                        ]
                    ],
                })
            });

        });

        describe('v3', () => {

            describe('style: simple', () => {

                it('primitive', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'number' },
                            style: 'simple',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/5' });
                    expect(req.path.value).to.equal(5);
                });

                it('primitive explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'number' },
                            style: 'simple',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/5' });
                    expect(req.path.value).to.equal(5);
                });

                it('array', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'array', items: { type: 'number' } },
                            style: 'simple',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/3,4,5' });
                    expect(req.path.value).to.deep.equal([3,4,5]);
                });

                it('array explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'array', items: { type: 'number' } },
                            style: 'simple',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/3,4,5' });
                    expect(req.path.value).to.deep.equal([3,4,5]);
                });

                it('object', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    a: { type: 'number' },
                                    b: { type: 'number' }
                                }
                            },
                            style: 'simple',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/a,1,b,2' });
                    expect(req.path.value).to.deep.equal({a:1,b:2});
                });

                it('object explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    a: { type: 'number' },
                                    b: { type: 'number' }
                                }
                            },
                            style: 'simple',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/a=1,b=2' });
                    expect(req.path.value).to.deep.equal({a:1,b:2});
                });

            });

            describe.only('style: label', () => {

                it('primitive', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'number' },
                            style: 'label',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.5' });
                    expect(req.path.value).to.equal(5);
                });

                it('primitive explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'number' },
                            style: 'label',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.5' });
                    expect(req.path.value).to.equal(5);
                });

                it('array', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'array', items: { type: 'number' } },
                            style: 'label',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.3,4,5' });
                    expect(req.path.value).to.deep.equal([3,4,5]);
                });

                it('array explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: { type: 'array', items: { type: 'number' } },
                            style: 'label',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.3.4.5' });
                    expect(req.path.value).to.deep.equal([3,4,5]);
                });

                it('object', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    a: { type: 'number' },
                                    b: { type: 'number' }
                                }
                            },
                            style: 'label',
                            explode: false
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.a,1,b,2' });
                    expect(req.path.value).to.deep.equal({a:1,b:2});
                });

                it('object explode', () => {
                    const def = new Definition(3)
                        .addParameter('/{value}', 'get', {
                            name: 'value',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    a: { type: 'number' },
                                    b: { type: 'number' }
                                }
                            },
                            style: 'label',
                            explode: true
                        });
                    const enforcer = new Enforcer(def);
                    const [, req] = enforcer.request({ path: '/.a=1.b=2' });
                    expect(req.path.value).to.deep.equal({a:1,b:2});
                });

            });

        });

    });

    describe('query parameters', () => {

        describe('v2', () => {

            it('can parse multi input', () => {
                const def = new Definition(2)
                    .addParameter('/', 'get', {
                        name: 'item',
                        in: 'query',
                        type: 'array',
                        collectionFormat: 'multi',
                        items: { type: 'number' }
                    });
                const enforcer = new Enforcer(def);
                const [, req] = enforcer.request({ path: '/?item=1&item=2&item=3' });
                expect(req.query.item).to.deep.equal([1, 2, 3]);
            });

        });

    });

});

