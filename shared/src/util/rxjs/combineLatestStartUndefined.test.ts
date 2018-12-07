import assert from 'assert'
import { TestScheduler } from 'rxjs/testing'
import { combineLatestStartUndefined } from './combineLatestStartUndefined'

const scheduler = () => new TestScheduler((a, b) => assert.deepStrictEqual(a, b))

describe('combineLatestStartUndefined', () => {
    describe('with 0 source observables', () => {
        it('emits an empty array and completes', () =>
            scheduler().run(({ expectObservable }) =>
                expectObservable(combineLatestStartUndefined([])).toBe('a|', {
                    a: [],
                })
            ))
    })

    describe.only('with 1 source observable', () => {
        it('waits to emit until the first source observable emits', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(combineLatestStartUndefined([cold('-b-|', { b: 1 })])).toBe('-b-|', {
                    b: [1],
                })
            ))
    })

    describe('with 2 source observables', () => {
        it('waits to emit until the first source observable emits', () =>
            scheduler().run(({ cold, expectObservable }) =>
                expectObservable(combineLatestStartUndefined([cold('-b-|', { b: 1 }), cold('--c|', { c: 2 })])).toBe(
                    '-bc|',
                    {
                        b: [1],
                        c: [1, 2],
                    }
                )
            ))
    })

    it('operates on 3 observables', () =>
        scheduler().run(({ cold, expectObservable }) =>
            expectObservable(
                combineLatestStartUndefined([
                    cold('a-|', { a: 1 }),
                    cold('ab|', { a: 2, b: 3 }),
                    cold('-bc-|', { b: 4, c: 5 }),
                ])
            ).toBe('abc-|', {
                a: [1, 2, undefined],
                b: [1, 3, 4],
                c: [1, 3, 5],
            })
        ))
})
