declare module "node-redis-pubsub" {
    import { Callback, RedisClient } from "redis";

    export interface RedisPubsubOptions {
        port?: number,
        scope?: string,
        emitter?: RedisClient,
        receiver?: RedisClient,
        auth?: string,
    }

    export default class NRP<T> {
        constructor(options?: RedisPubsubOptions);
        public getRedisClient(): RedisClient;
        public on(channel: string,
            handler: (message: T, channel: string) => void,
            callback?: () => void): () => Callback<any>;
        public subscribe(channel: string,
            handler: (message: T, channel: string) => void,
            callback?: () => void): () => Callback<any>;
        public emit(channel: string, message: T): boolean;
        public publish(channel: string, message: T): boolean;
        public quit(): void;
        public end(): void;
    }
}
