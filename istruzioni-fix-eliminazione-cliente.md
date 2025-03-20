# Istruzioni per risolvere i problemi di eliminazione dei clienti

Questo documento contiene le istruzioni per risolvere i problemi di eliminazione dei clienti nell'ambiente AWS.

## Problema

Quando si tenta di eliminare un cliente, l'operazione può fallire perché:
1. Le tabelle `assets` e `recommendations` non hanno vincoli CASCADE DELETE configurati correttamente
2. L'utente del database non ha i permessi DELETE necessari su tutte le tabelle
3. La procedura di eliminazione non utilizza correttamente le transazioni

## Soluzione

Abbiamo implementato diverse correzioni per risolvere il problema:

1. Un nuovo script di migrazione che configura correttamente i vincoli CASCADE DELETE
2. Un nuovo script di migrazione che corregge i permessi del database
3. Un'implementazione migliorata del metodo `deleteClient` che utilizza transazioni esplicite
4. Uno script che esegue tutte le correzioni in sequenza

## Come applicare le correzioni

### Metodo 1: Applicazione singola (per ambiente di sviluppo e testing)

1. Carica questa directory in un ambiente di sviluppo
2. Assicurati che le variabili d'ambiente siano configurate correttamente (in particolare `DATABASE_URL`)
3. Esegui lo script `run-db-fixes.sh`:

```bash
chmod +x run-db-fixes.sh
./run-db-fixes.sh
```

### Metodo 2: Esecuzione durante il deployment (per produzione)

1. Copia i seguenti file nell'ambiente di produzione:
   - `server/migrations/fix-cascade-delete.ts`
   - `server/migrations/fix-delete-permissions.ts`
   - `server/migrations/run-all-fixes.ts`
   - `server/storage.ts` (contiene la nuova implementazione di `deleteClient`)
   - `run-db-fixes.sh`

2. Esegui lo script di correzione:

```bash
cd /var/www/gervis  # o la directory di deploy
chmod +x run-db-fixes.sh
./run-db-fixes.sh
```

3. Riavvia l'applicazione:

```bash
pm2 restart gervis
```

## Verifica

Per verificare che le correzioni siano state applicate correttamente:

1. Accedi alla dashboard degli advisor
2. Crea un nuovo cliente di test con alcuni asset e raccomandazioni
3. Prova a eliminare il cliente
4. Controlla nei log dell'applicazione che l'eliminazione sia avvenuta correttamente

## Log di debug

Se l'eliminazione del cliente fallisce ancora, controlla i log dell'applicazione:

```bash
pm2 logs gervis
```

Cerca messaggi di debug che iniziano con `[DEBUG deleteClient]` che forniscono informazioni dettagliate sul processo di eliminazione.

## Spiegazione tecnica

### 1. Fix CASCADE DELETE

Lo script `fix-cascade-delete.ts` rimuove e ricrea i vincoli di chiave esterna sulle tabelle `assets` e `recommendations`, aggiungendo l'opzione `ON DELETE CASCADE`. Questo fa sì che quando un cliente viene eliminato, tutti i suoi asset e raccomandazioni vengano eliminati automaticamente.

### 2. Fix Permessi DELETE

Lo script `fix-delete-permissions.ts` concede i permessi DELETE all'utente corrente del database su tutte le tabelle necessarie.

### 3. Implementazione migliorata di deleteClient

La nuova implementazione di `deleteClient` in `storage.ts`:
- Utilizza transazioni esplicite per garantire l'atomicità dell'operazione
- Verifica se i vincoli CASCADE sono configurati correttamente
- Se non lo sono, esegue l'eliminazione manuale degli asset e delle raccomandazioni
- Esegue verifiche finali per confermare che tutto sia stato eliminato
- Gestisce correttamente il rilascio delle connessioni anche in caso di errori

## Supporto

Se riscontri problemi nell'applicazione di queste correzioni, contatta il team di sviluppo.