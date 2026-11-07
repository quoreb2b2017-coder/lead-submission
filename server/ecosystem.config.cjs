// PM2 config for running the API on an EC2 instance:  pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: "leadhub-api",
      script: "src/server.js",
      instances: 1, // the app keeps no in-memory state, so this can be raised to "max"
      exec_mode: "fork",
      max_memory_restart: "400M",
      kill_timeout: 12000, // give the graceful shutdown (10s) time to finish
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "127.0.0.1", // only reachable through Nginx on the same machine
      },
    },
  ],
};
