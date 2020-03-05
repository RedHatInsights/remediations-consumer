import { Offset } from 'kafka-node';

declare module 'kafka-node' {
    export interface ConsumerGroupStreamOptions {
        autoConnect?: boolean;
    }

    export interface ConsumerGroupStream {
        closeAsync(): void;
    }

    export interface ConsumerGroup {
        getOffset(): Offset;
    }

    export interface Offset {
        fetchEarliestOffsetsAsync (topics: string[]): Promise<any>;
        fetchLatestOffsetsAsync (topics: string[]): Promise<any>;
    }

    export interface Message {
        topic: string;
        value: string | Buffer;
        offset?: number;
        partition?: number;
        highWaterOffset?: number;
        key?: string | Buffer;
    }
}

declare module 'async' {
    export interface AsyncQueue<T> {
        unsaturated(handler: () => void): void ;
    }
}
