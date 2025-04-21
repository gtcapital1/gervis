import express from 'express';
import { 
  getClientProfileById, 
  searchClientByName,
  invalidateClientCache 
} from '../controllers/clientProfileController';

const router = express.Router();

// Rotte per il profilo cliente completo
router.get('/clients/:id/profile-complete', getClientProfileById);
router.get('/clients/search', searchClientByName);
router.post('/clients/:id/invalidate-cache', invalidateClientCache);

export default router; 