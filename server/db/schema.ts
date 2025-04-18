export const mifid = pgTable('mifid', {
  // ... existing schema ...
});

// Nuova tabella per i documenti verificati
export const mifidDocuments = pgTable('mifid_documents', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  sessionId: text('session_id').notNull(),
  idFrontPath: text('id_front_path').notNull(),
  idBackPath: text('id_back_path').notNull(),
  selfiePath: text('selfie_path').notNull(),
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
  status: text('status').notNull().default('verified'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
}); 