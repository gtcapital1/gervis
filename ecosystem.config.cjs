module.exports = {
  apps: [
    {
      name: 'gervis',
      script: 'index.cjs', // Modificato per usare index.cjs (compatibile con CommonJS)
      instances: 1,
      exec_mode: 'fork',
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
      ],
      // Indica esplicitamente a PM2 di caricare il file .env
      env_file: ".env"
    }
  ]
};