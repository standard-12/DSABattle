/**
 * Environment Configuration
 */

export const config = {
  port: parseInt(process.env.WS_PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;
