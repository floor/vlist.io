// PM2 Ecosystem Configuration — vlist.dev
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: "vlist.dev",
      script: "server.ts",
      interpreter: "bun",
      cwd: "/home/floor/vlist.dev",
      env: {
        NODE_ENV: "production",
        PORT: 3338,
      },
      instances: 2,
      exec_mode: "cluster",
      wait_ready: true,
      listen_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      max_memory_restart: "256M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/home/admin/.pm2/logs/vlist.dev-error.log",
      out_file: "/home/admin/.pm2/logs/vlist.dev-out.log",
      merge_logs: true,
    },
  ],
};
