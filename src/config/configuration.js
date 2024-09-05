"use strict";
exports.__esModule = true;
exports.mongoose_unique_validator_error_tag = exports.mongodb_password = exports.mongodb_username = exports.mongodb_uri = void 0;
exports["default"] = (function () { return ({
    mongodb: {
        uri: 'mongodb://localhost:27017/inventory',
        username: 'username',
        password: 'password'
    },
    postgres: {
        host: '127.0.0.1',
        port: 5432,
        username: 'username',
        password: 'password',
        database: 'inventory',
        mode: 'dev',
        run_migrations: true
    },
    redis: {
        host: 'localhost',
        port: 6379,
        password: 'password',
        ttl: 604800
    },
    mongoose: {
        unique_validator_error_code: 11000,
        user_unique_validator_error_message: 'User validation failed',
        community_unique_validator_error_message: 'Community validation failed',
        unique_validator_error_tag: 'duplicated'
    },
    typeorm: {
        unique_validator_error_code: 23505,
        resiloc_proxy_unique_validator_error_message: 'Resiloc proxy validation failed',
        unique_validator_error_tag: 'duplicated'
    },
    jwt: {
        short_expiration_time: '86400s',
        long_expiration_time: '604800s',
        very_long_expiration_time: '31536000s',
        public: './auth/keys/public.key',
        private: './auth/keys/private.key'
    },
    documentation: {
        title: 'RESILOC INVENTORY BACKEND APIs',
        description: 'The RESILOC inventory backend APIs description',
        version: '1.1',
        tag: 'resiloc',
        url: 'inventory/api',
        siteTitle: 'RESILOC Inventory APIs',
        logo: 'resiloc-logo-2.png'
    },
    pagination: {
        page: 1,
        limit: 10
    },
    parser: {
        inside_rounded_brackets: '\\(([^)]+)\\)',
        inside_curly_brackets: '\\{([^)]+)\\}'
    },
    blacklist: {
        value: 'BLOCKED'
    },
    salt: 'BqWd7daafgwffa4525ts1g654thh_i&Ns',
    communityHeaderId: 'flid',
    jwtTokenPrefix: {
        capitalised: 'Bearer ',
        normal: 'bearer '
    },
    excludedUserFields: '-resilocServiceRole -password -__v',
    selectedCommunityTag: 'selected'
}); });
exports.mongodb_uri = 'mongodb://localhost:27017/inventory';
exports.mongodb_username = 'username';
exports.mongodb_password = 'password';
exports.mongoose_unique_validator_error_tag = 'duplicated';
