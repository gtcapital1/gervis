module.exports = {
  apps: [
    {
      name: 'gervis',
      script: 'dist/server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Aggiungi questa sezione per eseguire il fix-public-path prima dell'avvio
      post_update: [
        "npm install",
        "npm run build",
        "chmod +x ./fix-public-path.sh",
        "./fix-public-path.sh --force"
      ]
    }
  ]
};