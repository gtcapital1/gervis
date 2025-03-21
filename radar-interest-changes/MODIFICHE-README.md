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

1. Sostituire il file `client/src/components/advisor/ClientEditDialog.tsx` con quello incluso in questo pacchetto
2. Testare l'interfaccia per verificare che tutto funzioni correttamente

## Note importanti:

- Queste modifiche garantiscono che il grafico radar dei clienti mostri correttamente i valori degli interessi di investimento
- Le modifiche mantengono la compatibilità con l'interfaccia di onboarding esistente
