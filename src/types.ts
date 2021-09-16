declare module 'async' {
    export interface AsyncQueue<T> {
        unsaturated(handler: () => void): void ;
    }
}
