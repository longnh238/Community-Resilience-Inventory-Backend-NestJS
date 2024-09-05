export default () => ({
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
        ttl: 604800 // --> One week
    },
    mailing: {
        host: 'smtp.gmail.com',
        port: 465,
        account: 'email@gmail.com',
        password: 'password',
        from: '"RESILOC" <email@gmail.com>',
        logo: 'http://abc.com/inventory/api/img/logo-1.png',
        banner: 'http://abc.com/inventory/api/img/banner.png'
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
        resiloc_indicator_unique_validator_error_message: 'Resiloc indicator validation failed',
        unique_validator_error_tag: 'duplicated'
    },
    jwt: {
        short_expiration_time: '86400s', // --> One day
        long_expiration_time: '604800s', // --> One week
        very_long_expiration_time: '31536000s', // --> One year
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
        limit: 0,
        orderBy: '_id',
        arrange: 'ASC'
    },
    query: {
        requested_proxy_status: 'default', 
        requested_indicator_status: 'default'
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
        normal: 'bearer ',
    },
    userModel: {
        excluded_information: '-resilocServiceRole -password -__v',
        userActivationTokenLength: 50,
        passwordResetTokenLength: 100
    },
    communityModel: {
        community_information: '_id name metadata',
    },
    selectedCommunityTag: 'selected',
    scenarioAssociatedAttributes: 'scenarioAssociatedAttributes',
    userRoleAll: 'all'
});

export const mongodb_uri: string = 'mongodb://localhost:27017/inventory';
export const mongodb_username: string = 'username';
export const mongodb_password: string = 'password';

export const mongoose_unique_validator_error_tag: string = 'duplicated';