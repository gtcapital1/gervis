#!/bin/bash

# Script per preparare un pacchetto di modifiche per gli interessi di investimento (scala 1-5)
# Da utilizzare quando le modifiche sono già state fatte ma non vengono rilevate da git

# Configurazione
OUTPUT_DIR="radar-interest-changes"
TARGET_FILE="client/src/components/advisor/ClientEditDialog.tsx"
DESCRIPTION_FILE="MODIFICHE-README.md"

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Creazione pacchetto di modifiche per gli interessi di investimento...${NC}"

# Crea la directory di output se non esiste
mkdir -p ${OUTPUT_DIR}

# Copia il file modificato
echo -e "${YELLOW}Copiando il file modificato...${NC}"
cp ${TARGET_FILE} ${OUTPUT_DIR}/

# Crea un file README con la descrizione delle modifiche
echo -e "${YELLOW}Creando il file di descrizione...${NC}"
cat > ${OUTPUT_DIR}/${DESCRIPTION_FILE} << EOF
# Modifiche per interessi di investimento nel form di modifica cliente

## Cosa è stato modificato:

1. **Aggiunta dello schema per gli interessi di investimento:**
   - Abbiamo aggiunto 5 campi nello schema di validazione:
     - retirementInterest
     - wealthGrowthInterest
     - incomeGenerationInterest
     - capitalPreservationInterest
     - estatePlanningInterest
   - Ogni campo è validato come numero da 1 a 5

2. **Aggiornamento dell'inizializzazione del form:**
   - I valori degli interessi sono ora inizializzati dai dati del cliente
   - Se un valore non è impostato, viene utilizzato il valore predefinito 3

3. **Implementazione dell'interfaccia grafica:**
   - Aggiunta una sezione con 5 slider per gli interessi di investimento
   - Ogni slider permette di selezionare un valore da 1 a 5
   - L'interfaccia è coerente con quella presente nel form di onboarding

## Come applicare le modifiche:

1. Sostituire il file \`client/src/components/advisor/ClientEditDialog.tsx\` con quello incluso in questo pacchetto
2. Testare l'interfaccia per verificare che tutto funzioni correttamente

## Note importanti:

- Queste modifiche garantiscono che il grafico radar dei clienti mostri correttamente i valori degli interessi di investimento
- Le modifiche mantengono la compatibilità con l'interfaccia di onboarding esistente
EOF

# Crea un file con lo script per applicare le modifiche
echo -e "${YELLOW}Creando lo script per applicare le modifiche...${NC}"
cat > ${OUTPUT_DIR}/apply-changes.sh << EOF
#!/bin/bash

# Script per applicare le modifiche agli interessi di investimento
cp ClientEditDialog.tsx ../../client/src/components/advisor/ClientEditDialog.tsx
echo "Modifiche applicate con successo!"
EOF

# Rendi lo script eseguibile
chmod +x ${OUTPUT_DIR}/apply-changes.sh

echo -e "${GREEN}Pacchetto creato con successo nella directory '${OUTPUT_DIR}'!${NC}"
echo -e "${GREEN}Ora puoi inviare questo pacchetto al team per applicare le modifiche.${NC}"