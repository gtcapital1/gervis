import express from 'express';
import { db, sql as pgClient } from '../db';

const router = express.Router();

/**
 * GET /api/portfolio-products
 * 
 * Ottiene i dati dei prodotti di portafoglio in base agli ISIN forniti
 * Query params:
 * - isins: stringa di ISIN separati da virgola
 */
router.get('/', async (req, res) => {
  try {
    const { isins } = req.query;
    
    if (!isins || typeof isins !== 'string') {
      return res.status(400).json({ error: 'ISINs are required' });
    }
    
    const isinList = isins.split(',').map(isin => isin.trim()).filter(isin => isin.length > 0);
    
    if (isinList.length === 0) {
      return res.status(400).json({ error: 'No valid ISINs provided' });
    }
    
    // Query for debugging
    console.log(`[PortfolioProducts] Searching for ISINs: ${isinList.join(', ')}`);
    
    try {
      // Utilizziamo l'API SQL client disponibile nel progetto
      const queryText = `SELECT * FROM portfolio_products WHERE isin = ANY($1)`;
      const products = await pgClient.unsafe(queryText, [isinList]);
      
      console.log(`[PortfolioProducts] Found ${products.length} products`);
      
      return res.json(products);
    } catch (queryError) {
      console.error('SQL query error:', queryError);
      return res.status(500).json({ error: 'Database query failed' });
    }
  } catch (error) {
    console.error('Error fetching portfolio products:', error);
    return res.status(500).json({ error: 'Failed to fetch portfolio products' });
  }
});

export default router; 