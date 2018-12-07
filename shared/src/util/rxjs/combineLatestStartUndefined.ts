import { combineLatest, from, Observable, ObservableInput, Operator } from 'rxjs'
import { fromArray } from 'rxjs/internal/observable/fromArray'
import { OuterSubscriber } from 'rxjs/internal/OuterSubscriber'
import { startWith } from 'rxjs/operators'

// tslint:disable no-use-before-declare

/**
 * Like {@link combineLatest}, except that it does not wait for all observables to emit before emitting an initial
 * value. In the emitted array value, any source observables that have not yet emitted are represented by the
 * undefined value.
 *
 * @see {@link combineLatest}
 *
 * @param {SchedulerLike} [scheduler=null] The {@link SchedulerLike} to use for subscribing to each input
 * Observable.
 * @return {Observable} An Observable of an array of the most recent values from each input Observable.
 */
export function combineLatestStartUndefined<T>(observables: ObservableInput<T>[]): Observable<(T | undefined)[]> {
    return fromArray(observables).lift(new CombineLatestOperator<T, T>())
}

export class CombineLatestOperator<T, R> implements Operator<T, R> {
    constructor(private resultSelector?: (...values: any[]) => R) {}

    public call(subscriber: Subscriber<R>, source: any): any {
        return source.subscribe(new CombineLatestSubscriber(subscriber, this.resultSelector))
    }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
export class CombineLatestSubscriber<T, R> extends OuterSubscriber<T, R> {
    private active = 0
    private values: any[] = []
    private observables: any[] = []
    private toRespond: number

    constructor(destination: Subscriber<R>, private resultSelector?: (...values: any[]) => R) {
        super(destination)
    }

    protected _next(observable: any) {
        this.values.push(NONE)
        this.observables.push(observable)
    }

    protected _complete() {
        const observables = this.observables
        const len = observables.length
        if (len === 0) {
            this.destination.complete()
        } else {
            this.active = len
            this.toRespond = len
            for (let i = 0; i < len; i++) {
                const observable = observables[i]
                this.add(subscribeToResult(this, observable, observable, i))
            }
        }
    }

    public notifyComplete(unused: Subscriber<R>): void {
        if ((this.active -= 1) === 0) {
            this.destination.complete()
        }
    }

    public notifyNext(
        outerValue: T,
        innerValue: R,
        outerIndex: number,
        innerIndex: number,
        innerSub: InnerSubscriber<T, R>
    ): void {
        const values = this.values
        const oldVal = values[outerIndex]
        const toRespond = !this.toRespond ? 0 : oldVal === NONE ? --this.toRespond : this.toRespond
        values[outerIndex] = innerValue

        if (toRespond === 0) {
            if (this.resultSelector) {
                this._tryResultSelector(values)
            } else {
                this.destination.next(values.slice())
            }
        }
    }

    private _tryResultSelector(values: any[]) {
        let result: any
        try {
            result = this.resultSelector.apply(this, values)
        } catch (err) {
            this.destination.error(err)
            return
        }
        this.destination.next(result)
    }
}
