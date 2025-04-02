import React, { useState, useEffect } from 'react';
import { XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Interfaccia per i dati del form
interface EmailSettingsForm {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

const EmailSettings: React.FC = () => {
  // Stato per i dati del form
  const [formData, setFormData] = useState<EmailSettingsForm>({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
  });

  // Stati per gestire caricamento ed errori
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carica le impostazioni esistenti
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/email');
        if (!response.ok) {
          throw new Error('Errore nel caricamento delle impostazioni');
        }
        
        const data = await response.json();
        
        // Imposta i dati nel form solo se esistono
        if (data && data.smtpHost) {
          setFormData({
            smtpHost: data.smtpHost || '',
            smtpPort: data.smtpPort?.toString() || '587',
            smtpUser: data.smtpUser || '',
            smtpPass: data.smtpPass ? '********' : '', // Maschera la password
            smtpSecure: data.smtpSecure || false,
          });
        }
      } catch (err) {
        
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, []);

  // Gestisce i cambiamenti nei campi del form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Gestisce l'invio del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validazione dei campi
      if (!formData.smtpHost) {
        setError('L\'host SMTP è obbligatorio');
        setIsLoading(false);
        return;
      }
      
      if (!formData.smtpPort || isNaN(Number(formData.smtpPort))) {
        setError('La porta SMTP deve essere un numero valido');
        setIsLoading(false);
        return;
      }
      
      if (!formData.smtpUser) {
        setError('L\'utente SMTP è obbligatorio');
        setIsLoading(false);
        return;
      }
      
      if (!formData.smtpPass) {
        setError('La password SMTP è obbligatoria');
        setIsLoading(false);
        return;
      }

      // Se la password è mascherata (********) e non è stata modificata, non la inviamo
      const dataToSend = {
        ...formData,
        smtpPass: formData.smtpPass === '********' ? undefined : formData.smtpPass
      };

      // Invio dati al server
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il salvataggio delle impostazioni');
      }

      setSuccess('Impostazioni email salvate con successo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio delle impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  // Mostra un loader durante il caricamento iniziale
  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Configurazione Server Email
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configura le impostazioni del server SMTP per l'invio delle email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Host SMTP */}
        <div>
          <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Host SMTP
          </label>
          <input
            type="text"
            id="smtpHost"
            name="smtpHost"
            value={formData.smtpHost}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="es. smtp.gmail.com"
          />
        </div>

        {/* Porta SMTP */}
        <div>
          <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Porta SMTP
          </label>
          <input
            type="number"
            id="smtpPort"
            name="smtpPort"
            value={formData.smtpPort}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="es. 587 o 465"
          />
        </div>

        {/* Utente SMTP */}
        <div>
          <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Utente SMTP (Email mittente)
          </label>
          <input
            type="text"
            id="smtpUser"
            name="smtpUser"
            value={formData.smtpUser}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="es. tuonome@gmail.com"
          />
        </div>

        {/* Password SMTP */}
        <div>
          <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password SMTP
          </label>
          <input
            type="password"
            id="smtpPass"
            name="smtpPass"
            value={formData.smtpPass}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
          />
        </div>

        {/* SSL/TLS */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="smtpSecure"
              checked={formData.smtpSecure}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Usa SSL/TLS
            </span>
          </label>
        </div>

        {/* Messaggi di errore */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Messaggi di successo */}
        {success && (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  {success}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Pulsante di invio */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? 'Salvataggio...' : 'Salva Impostazioni'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailSettings; 