#!/bin/bash
# Script per verificare i servizi PM2 attivi sul server AWS

echo 'Per verificare quali servizi PM2 sono attivi sul server AWS, eseguire:'
echo 'ssh ubuntu@<indirizzo-ip-server> "pm2 list"'
echo
echo "Questo mostrerà tutti i servizi attivi. Il nome corretto da usare è quello nella colonna 'name'."
echo
echo "Una volta identificato il nome corretto, riavviare il servizio con:"
echo 'ssh ubuntu@<indirizzo-ip-server> "pm2 restart <nome-servizio>"'
echo
echo "Per vedere i log in tempo reale:"
echo 'ssh ubuntu@<indirizzo-ip-server> "pm2 logs <nome-servizio>"'
