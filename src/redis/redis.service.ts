import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';

@Injectable()
export class RedisService {
    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager,
    ) { }

    async findAll() {
        return await this.cacheManager.keys();
    }

    async get(key: string) {
        return await this.cacheManager.get(key);
    }

    async set(key: string, value: string) {
        await this.cacheManager.set(key, value);
    }

    async remove(key: string) {
        return await this.cacheManager.del(key);
    }
}
