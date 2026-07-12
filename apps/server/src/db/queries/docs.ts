import { pool } from '../client';

export interface DocumentRecord {
  id: string;
  title: string;
  owner_id: string;
  content: { ops: any[] };
  revision: number;
  created_at: Date;
  updated_at: Date;
}

export interface CollaboratorRecord {
  doc_id: string;
  user_id: string;
  permission: 'read' | 'edit';
}

/**
 * Creates a new document.
 */
export async function createDocument(title: string, ownerId: string): Promise<DocumentRecord> {
  const result = await pool.query<DocumentRecord>(
    `INSERT INTO documents (title, owner_id)
     VALUES ($1, $2)
     RETURNING id, title, owner_id, content, revision, created_at, updated_at`,
    [title.trim(), ownerId]
  );
  return result.rows[0];
}

/**
 * Lists all documents owned by or shared with a user.
 */
export async function listDocumentsForUser(userId: string): Promise<Array<DocumentRecord & { owner_name: string }>> {
  const result = await pool.query<DocumentRecord & { owner_name: string }>(
    `SELECT DISTINCT d.id, d.title, d.owner_id, d.content, d.revision, d.created_at, d.updated_at, NULL as owner_name
     FROM documents d
     LEFT JOIN collaborators c ON d.id = c.doc_id
     WHERE d.owner_id = $1 OR c.user_id = $1
     ORDER BY d.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Retrieves a document by its UUID.
 */
export async function findDocumentById(id: string): Promise<DocumentRecord | null> {
  const result = await pool.query<DocumentRecord>(
    `SELECT id, title, owner_id, content, revision, created_at, updated_at
     FROM documents
     WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Updates the document content and revision.
 */
export async function updateDocumentContent(id: string, content: any, revision: number): Promise<void> {
  await pool.query(
    `UPDATE documents
     SET content = $1, revision = $2, updated_at = now()
     WHERE id = $3`,
    [JSON.stringify(content), revision, id]
  );
}

/**
 * Updates the document title.
 */
export async function updateDocumentTitle(id: string, title: string): Promise<DocumentRecord | null> {
  const result = await pool.query<DocumentRecord>(
    `UPDATE documents
     SET title = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, title, owner_id, content, revision, created_at, updated_at`,
    [title.trim(), id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Deletes a document by ID.
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM documents WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Checks if a user has access to a document.
 */
export async function checkDocumentAccess(docId: string, userId: string): Promise<'owner' | 'collaborator' | null> {
  const doc = await findDocumentById(docId);
  if (!doc) {
    return null;
  }
  if (doc.owner_id === userId) {
    return 'owner';
  }
  
  const result = await pool.query(
    'SELECT permission FROM collaborators WHERE doc_id = $1 AND user_id = $2',
    [docId, userId]
  );
  
  if (result.rows.length > 0) {
    return 'collaborator';
  }
  
  return null;
}

/**
 * Adds a user as a collaborator to a document.
 */
export async function addCollaborator(docId: string, userId: string, permission: 'read' | 'edit' = 'edit'): Promise<void> {
  await pool.query(
    `INSERT INTO collaborators (doc_id, user_id, permission)
     VALUES ($1, $2, $3)
     ON CONFLICT (doc_id, user_id) DO NOTHING`,
    [docId, userId, permission]
  );
}
