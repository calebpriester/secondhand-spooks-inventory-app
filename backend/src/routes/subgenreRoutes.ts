import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../config/database';

const router = Router();

// GET /api/subgenres - List all sub-genre options
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM subgenre_options ORDER BY sort_order ASC, name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subgenre options:', error);
    res.status(500).json({ error: 'Failed to fetch subgenre options' });
  }
});

// POST /api/subgenres - Add a new sub-genre option
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const maxOrder = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM subgenre_options');
    const order = maxOrder.rows[0].next;

    const result = await query(
      'INSERT INTO subgenre_options (name, sort_order) VALUES ($1, $2) RETURNING *',
      [name.trim(), order]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Sub-genre already exists' });
    }
    console.error('Error creating subgenre option:', error);
    res.status(500).json({ error: 'Failed to create subgenre option' });
  }
});

function parseIdParam(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isNaN(id) || id <= 0 ? null : id;
}

// PUT /api/subgenres/:id - Update a sub-genre option
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid subgenre ID' });
    const { name, sort_order } = req.body;

    const result = await withTransaction(async (client) => {
      const oldResult = await client.query('SELECT name FROM subgenre_options WHERE id = $1', [id]);
      if (oldResult.rows.length === 0) return null;

      const oldName = oldResult.rows[0].name;
      const fields: string[] = [];
      const values: any[] = [];
      let p = 1;

      if (name !== undefined) { fields.push(`name = $${p++}`); values.push(name.trim()); }
      if (sort_order !== undefined) { fields.push(`sort_order = $${p++}`); values.push(sort_order); }

      if (fields.length === 0) return oldResult.rows[0];

      values.push(id);
      const updateResult = await client.query(
        `UPDATE subgenre_options SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      );

      // If name changed, update all books that had the old name in their subgenres array
      if (name && name.trim() !== oldName) {
        await client.query(
          `UPDATE books SET subgenres = array_replace(subgenres, $1, $2) WHERE $1 = ANY(subgenres)`,
          [oldName, name.trim()]
        );
      }

      return updateResult.rows[0];
    });

    if (result === null) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'Sub-genre already exists' });
    console.error('Error updating subgenre option:', error);
    res.status(500).json({ error: 'Failed to update subgenre option' });
  }
});

// DELETE /api/subgenres/:id - Remove a sub-genre option
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid subgenre ID' });

    const found = await withTransaction(async (client) => {
      const old = await client.query('SELECT name FROM subgenre_options WHERE id = $1', [id]);
      if (old.rows.length === 0) return false;

      const name = old.rows[0].name;

      // Remove from books that have this subgenre
      await client.query(
        `UPDATE books SET subgenres = array_remove(subgenres, $1) WHERE $1 = ANY(subgenres)`,
        [name]
      );
      // Clean up empty arrays to NULL
      await client.query(`UPDATE books SET subgenres = NULL WHERE subgenres = '{}'`);

      await client.query('DELETE FROM subgenre_options WHERE id = $1', [id]);
      return true;
    });

    if (!found) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subgenre option:', error);
    res.status(500).json({ error: 'Failed to delete subgenre option' });
  }
});

export default router;
