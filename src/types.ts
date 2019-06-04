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
}
