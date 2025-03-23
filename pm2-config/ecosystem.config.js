module.exports = {
  apps: [
    {
      name: 'gervis',
      script: 'index.mjs', // Utilizziamo direttamente il file index.mjs
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: [
        '--experimental-specifier-resolution=node', // Permette di importare moduli senza estensione
        '--experimental-json-modules',              // Supporto per importare JSON come moduli
      ],
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