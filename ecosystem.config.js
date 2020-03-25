/* eslint-disable */

require('dotenv').config();

module.exports = {
  apps : [{
    name: 'Judge Server',
    script: 'dist/server.js',
    instances: process.env.INSTANCES || 1,
    exec_mode: "cluster",
    autorestart: true,
    watch: ['dist'],
    // max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
