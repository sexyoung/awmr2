import { createClient, RedisClientType } from 'redis';

export class Redis {
  client: RedisClientType;
  constructor(url: string = '') {
    this.client = createClient({ url });
  }
  async connect() {
    await this.client.connect();
  }
  async disconnect() {
    await this.client.disconnect();
  }
  async get(key: string) {
    return await this.client.get(key);
  }
  async hGetAll(key: string) {
    return await this.client.hGetAll(key);
  }
  async hSet(key: string, field: string, value: any, expire: number = 0) {
    if(!expire) {
      return await this.client.hSet(key, field, value);
    }
    await this.client.hSet(key, field, value);
    await this.client.expire(key, expire);
  }
}

