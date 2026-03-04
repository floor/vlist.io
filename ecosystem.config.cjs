// PM2 Ecosystem Configuration — vlist.dev
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// NOTE: fork mode is required because PM2 cluster mode ignores the
// `interpreter` setting and always spawns workers with Node.js.
// Fork mode correctly uses Bun as the interpreter and still supports
// zero-downtime `pm2 reload` with wait_ready + listen_timeout.

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
      instances: 1,
      exec_mode: "fork",
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
