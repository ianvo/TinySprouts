import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const sharedConfig = {
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                ...config.watchOptions,
                poll: 1000,
                aggregateTimeout: 300
            };
        }

        return config;
    }
};

export default (phase) => {
    if (phase === PHASE_DEVELOPMENT_SERVER) {
        return sharedConfig;
    }

    return {
        ...sharedConfig,
        output: 'export',
        distDir: 'dist'
    };
};
