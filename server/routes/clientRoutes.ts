import express from 'express.js';
import { 
  getClientProfileById, 
  searchClientByName,
  invalidateClientCache 
} from '../controllers/clientProfileController.js';

const router = express.Router();

// Rotte per il profilo cliente completo
router.get('/clients/:id/profile-complete', getClientProfileById);
router.get('/clients/search', searchClientByName);
router.post('/clients/:id/invalidate-cache', invalidateClientCache);

export default router; 