import { Router, Response, Request } from 'express';
import { z } from 'zod';
import {
  createDocument,
  listDocumentsForUser,
  findDocumentById,
  updateDocumentTitle,
  deleteDocument,
  checkDocumentAccess,
  addCollaborator
} from '../db/queries/docs';
import { upsertUser } from '../db/queries/users';

export const docsRouter = Router();

// Middleware to automatically upsert/sync the user to the local PostgreSQL database
docsRouter.use((req: Request, res: Response, next) => {
  const auth = (req as any).auth;
  if (auth && auth.userId) {
    upsertUser(auth.userId)
      .then(() => next())
      .catch((error) => {
        console.error('Error syncing user with local DB:', error);
        res.status(500).json({ error: 'Internal server error' });
      });
  } else {
    next();
  }
});

const createDocSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
});

const updateTitleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

/**
 * GET /docs
 * Lists all documents the authenticated user has access to.
 */
docsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.userId;
    const docs = await listDocumentsForUser(userId);
    return res.status(200).json(docs);
  } catch (error) {
    console.error('Error listing documents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /docs
 * Creates a new document.
 */
docsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.userId;
    const parseResult = createDocSchema.safeParse(req.body);
    const title = parseResult.success && parseResult.data.title ? parseResult.data.title : 'Untitled';
    
    const doc = await createDocument(title, userId);
    return res.status(201).json(doc);
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /docs/:id
 * Loads a document's details. Registers the user as an edit collaborator
 * if they open a shared document they don't yet have explicit access to.
 */
docsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.userId;
    const docId = req.params.id;

    const doc = await findDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const access = await checkDocumentAccess(docId, userId);
    if (!access) {
      // Automatic collaborator inclusion (share-by-link)
      await addCollaborator(docId, userId, 'edit');
    }

    return res.status(200).json(doc);
  } catch (error) {
    console.error('Error loading document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /docs/:id/title
 * Updates the title of the document.
 */
docsRouter.patch('/:id/title', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.userId;
    const docId = req.params.id;

    const parseResult = updateTitleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const access = await checkDocumentAccess(docId, userId);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized to modify this document' });
    }

    const updatedDoc = await updateDocumentTitle(docId, parseResult.data.title);
    if (!updatedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(updatedDoc);
  } catch (error) {
    console.error('Error updating document title:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /docs/:id
 * Deletes the document. Allowed only for the document owner.
 */
docsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth.userId;
    const docId = req.params.id;

    const doc = await findDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete this document' });
    }

    await deleteDocument(docId);
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
