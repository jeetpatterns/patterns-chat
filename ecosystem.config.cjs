module.exports = {
  apps: [
    {
      name: 'chat-backend',
      cwd: '/var/www/chat/backend',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'chat-frontend',
      cwd: '/var/www/chat/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
