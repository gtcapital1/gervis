import { Request, Response } from 'express';
import { db } from '../db';
import { getClientContext, getSiteDocumentation, getMeetingsByDateRange, getMeetingsByClientName, prepareMeetingData, prepareEditMeeting, getFinancialNews } from './functions';

// Definizioni dei tipi
export type FlowVariable = {
  name: string;
  value: any;
};

export type FlowCondition = {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists';
  value: any;
};

export type FlowStep = {
  id: string;
  name: string;
  type: 'function' | 'condition' | 'response';
  function?: string;
  functionArgs?: Record<string, any>;
  condition?: FlowCondition;
  response?: string;
  nextStep?: string;
  onSuccess?: string;
  onFailure?: string;
  onTrue?: string;
  onFalse?: string;
  variables?: string[]; // Nomi delle variabili da estrarre dal risultato
};

export type Flow = {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'keyword' | 'intent';
    value: string[];
  };
  initialStep: string;
  steps: Record<string, FlowStep>;
};

// Funzioni per l'esecuzione dei flussi
export async function executeFlow(flow: Flow, message: string, userId: number, conversationId: string): Promise<any> {
  console.log(`[FLOW] Esecuzione flow: ${flow.name}`);
  
  // Inizializza il contesto del flusso con le variabili
  const context: Record<string, any> = {
    message,
    userId,
    conversationId,
    flowId: flow.id,
    flowName: flow.name,
    result: null,
    variables: {}
  };
  
  // Esegui il flusso partendo dallo step iniziale
  const result = await executeFlowStep(flow.initialStep, flow, context);
  return result;
}

async function executeFlowStep(stepId: string, flow: Flow, context: Record<string, any>): Promise<any> {
  // Ottieni lo step corrente
  const step = flow.steps[stepId];
  if (!step) {
    console.error(`[FLOW] Step non trovato: ${stepId}`);
    return {
      success: false,
      error: `Step non trovato: ${stepId}`
    };
  }
  
  console.log(`[FLOW] Esecuzione step: ${step.name} (${step.type})`);
  
  // Elabora argomenti della funzione sostituendo le variabili
  const processedArgs = step.functionArgs ? 
    Object.entries(step.functionArgs).reduce((args, [key, value]) => {
      args[key] = replaceVariables(value, context.variables);
      return args;
    }, {} as Record<string, any>) : 
    {};
  
  try {
    let result;
    
    // Esecuzione in base al tipo di step
    switch (step.type) {
      case 'function':
        if (!step.function) {
          throw new Error('Funzione non specificata per lo step di tipo function');
        }
        
        // Esegui la funzione appropriata
        result = await executeFunctionByName(step.function, processedArgs, context.userId);
        
        // Salva il risultato nel contesto
        context.result = result;
        
        // Estrai variabili specificate
        if (step.variables && result.success) {
          for (const varName of step.variables) {
            if (result[varName] !== undefined) {
              context.variables[varName] = result[varName];
            }
          }
        }
        
        // Determina il prossimo step
        const nextStepId = result.success ? 
          (step.onSuccess || step.nextStep) : 
          (step.onFailure || null);
        
        if (nextStepId) {
          return executeFlowStep(nextStepId, flow, context);
        }
        break;
        
      case 'condition':
        if (!step.condition) {
          throw new Error('Condizione non specificata per lo step di tipo condition');
        }
        
        // Valuta la condizione
        const conditionResult = evaluateCondition(step.condition, context);
        
        // Determina il prossimo step in base al risultato della condizione
        const nextConditionStepId = conditionResult ? 
          (step.onTrue || step.nextStep) : 
          (step.onFalse || null);
        
        if (nextConditionStepId) {
          return executeFlowStep(nextConditionStepId, flow, context);
        }
        break;
        
      case 'response':
        // Elabora la risposta sostituendo le variabili
        if (step.response) {
          context.response = replaceVariables(step.response, context.variables);
        }
        
        // Passa allo step successivo se specificato
        if (step.nextStep) {
          return executeFlowStep(step.nextStep, flow, context);
        }
        break;
      
      default:
        throw new Error(`Tipo di step non supportato: ${step.type}`);
    }
    
    // Restituisci il contesto finale
    return {
      success: true,
      context,
      result: context.result,
      response: context.response
    };
    
  } catch (error) {
    console.error(`[FLOW] Errore nell'esecuzione dello step ${step.name}:`, error);
    return {
      success: false,
      error: `Errore nell'esecuzione dello step ${step.name}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
      context
    };
  }
}

// Funzione per eseguire una funzione in base al nome
async function executeFunctionByName(functionName: string, args: any, userId: number): Promise<any> {
  switch (functionName) {
    case 'getClientContext':
      return getClientContext(args.clientName, args.query, userId);
      
    case 'getSiteDocumentation':
      return getSiteDocumentation();
      
    case 'getFinancialNews':
      return getFinancialNews(args.maxResults);
      
    case 'getMeetingsByDateRange':
      return getMeetingsByDateRange(args.dateRange, userId);
      
    case 'getMeetingsByClientName':
      return getMeetingsByClientName(args.clientName, userId);
      
    case 'prepareMeetingData':
      return prepareMeetingData({
        clientId: args.clientId,
        clientName: args.clientName,
        subject: args.subject,
        dateTime: args.dateTime,
        duration: args.duration,
        location: args.location,
        notes: args.notes
      }, userId);
      
    case 'prepareEditMeeting':
      return prepareEditMeeting(args, userId);
      
    default:
      return {
        success: false,
        error: `Funzione non implementata: ${functionName}`
      };
  }
}

// Funzione per valutare una condizione
function evaluateCondition(condition: FlowCondition, context: Record<string, any>): boolean {
  const { field, operator, value } = condition;
  
  // Ottieni il valore del campo dal contesto
  const fieldPath = field.split('.');
  let fieldValue = context;
  
  for (const part of fieldPath) {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    fieldValue = fieldValue[part];
  }
  
  // Confronta in base all'operatore
  switch (operator) {
    case 'eq':
      return fieldValue === value;
    case 'neq':
      return fieldValue !== value;
    case 'gt':
      return fieldValue > value;
    case 'lt':
      return fieldValue < value;
    case 'contains':
      if (typeof fieldValue === 'string') {
        return (fieldValue as string).includes(value);
      }
      return false;
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    default:
      return false;
  }
}

// Funzione per sostituire le variabili in una stringa
function replaceVariables(template: any, variables: Record<string, any>): any {
  if (typeof template === 'string') {
    return template.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = getNestedProperty(variables, varName);
      return value !== undefined ? String(value) : match;
    });
  } else if (typeof template === 'object' && template !== null) {
    if (Array.isArray(template)) {
      return template.map(item => replaceVariables(item, variables));
    } else {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = replaceVariables(value, variables);
      }
      return result;
    }
  }
  
  return template;
}

// Funzione per ottenere una proprietà nidificata
function getNestedProperty(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

// Esempio di un flow predefinito
export const SAMPLE_FLOW: Flow = {
  id: 'client_lookup',
  name: 'Ricerca Cliente',
  description: 'Cerca informazioni su un cliente e restituisce i dettagli',
  trigger: {
    type: 'keyword',
    value: ['profilo cliente', 'informazioni cliente', 'dettagli cliente']
  },
  initialStep: 'extractClientName',
  steps: {
    'extractClientName': {
      id: 'extractClientName',
      name: 'Estrai Nome Cliente',
      type: 'function',
      function: 'extractClientName',
      functionArgs: {
        message: '${message}'
      },
      variables: ['clientName'],
      onSuccess: 'getClientInfo',
      onFailure: 'clientNameNotFound'
    },
    'getClientInfo': {
      id: 'getClientInfo',
      name: 'Ottieni Informazioni Cliente',
      type: 'function',
      function: 'getClientContext',
      functionArgs: {
        clientName: '${clientName}',
        query: '${message}'
      },
      variables: ['clientInfo'],
      onSuccess: 'formatClientResponse',
      onFailure: 'clientNotFound'
    },
    'formatClientResponse': {
      id: 'formatClientResponse',
      name: 'Formatta Risposta Cliente',
      type: 'response',
      response: 'Ecco le informazioni sul cliente ${clientInfo.firstName} ${clientInfo.lastName}:\n\n${clientInfo}'
    },
    'clientNameNotFound': {
      id: 'clientNameNotFound',
      name: 'Nome Cliente Non Trovato',
      type: 'response',
      response: 'Non sono riuscito a identificare il nome del cliente nel tuo messaggio. Puoi specificare il nome completo?'
    },
    'clientNotFound': {
      id: 'clientNotFound',
      name: 'Cliente Non Trovato',
      type: 'response',
      response: 'Non ho trovato informazioni sul cliente con il nome specificato. Verifica che il nome sia corretto.'
    }
  }
};

// Registro dei flussi disponibili
export const flowRegistry: Record<string, Flow> = {
  'client_lookup': SAMPLE_FLOW
  // Aggiungi altri flussi qui
};

// Funzione per trovare un flow in base a un messaggio
export function findMatchingFlow(message: string): Flow | null {
  for (const flow of Object.values(flowRegistry)) {
    if (flow.trigger.type === 'keyword') {
      for (const keyword of flow.trigger.value) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          return flow;
        }
      }
    }
    // Qui in futuro si potrebbero implementare trigger basati su intent
  }
  
  return null;
}

// Funzione per gestire i flussi in controller.ts
export async function handleFlow(req: Request, res: Response) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }
  
  const { message, conversationId, flowId } = req.body;
  const userId = req.user.id;
  
  try {
    let flow: Flow | null = null;
    
    // Se è specificato un ID di flusso, usa quello
    if (flowId && flowRegistry[flowId]) {
      flow = flowRegistry[flowId];
    } else {
      // Altrimenti cerca un flusso che corrisponda al messaggio
      flow = findMatchingFlow(message);
    }
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'Nessun flusso trovato per questo messaggio'
      });
    }
    
    // Esegui il flusso
    const result = await executeFlow(flow, message, userId, conversationId);
    
    return res.json({
      success: true,
      flowId: flow.id,
      flowName: flow.name,
      result: result
    });
    
  } catch (error) {
    console.error('Errore nell\'esecuzione del flusso:', error);
    return res.status(500).json({
      success: false,
      error: `Errore nell'esecuzione del flusso: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    });
  }
} 