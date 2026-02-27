import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  role: text("role", { enum: ["admin", "sku_manager", "stock_counter", "stock_counter_toko", "stock_counter_gudang"] }).default("stock_counter").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  subCategory: text("sub_category"),
  productCode: text("product_code"),
  description: text("description"),
  currentStock: integer("current_stock").default(0).notNull(),
  photoUrl: text("photo_url"),
  userId: text("user_id").notNull(),
  locationType: text("location_type", { enum: ["toko", "gudang"] }).default("toko"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productPhotos = pgTable("product_photos", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productUnits = pgTable("product_units", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  unitName: text("unit_name").notNull(),
  conversionToBase: real("conversion_to_base").default(1).notNull(),
  baseUnit: text("base_unit").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const opnameSessions = pgTable("opname_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).default("in_progress").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  userId: text("user_id").notNull(),
  locationType: text("location_type", { enum: ["toko", "gudang"] }).default("toko"),
  startedByName: text("started_by_name"),
  assignedTo: text("assigned_to"),
});

export const opnameRecords = pgTable("opname_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => opnameSessions.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  actualStock: integer("actual_stock"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  unitValues: text("unit_values"),
  countedBy: text("counted_by"),
  returnedQuantity: integer("returned_quantity").default(0),
  returnedNotes: text("returned_notes"),
});

export const opnameRecordPhotos = pgTable("opname_record_photos", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").references(() => opnameRecords.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locationType: text("location_type", { enum: ["toko", "gudang"] }).default("toko"),
  userId: text("user_id").notNull(),
  active: integer("active").default(1).notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  type: text("type", { enum: ["kritik", "saran"] }).default("saran").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const motivationMessages = pgTable("motivation_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  userId: text("user_id").notNull(),
  active: integer("active").default(1).notNull(),
});

export const categoryPriorities = pgTable("category_priorities", {
  id: serial("id").primaryKey(),
  categoryName: text("category_name").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  userId: text("user_id").notNull(),
});

// === Relations ===

export const productPhotosRelations = relations(productPhotos, ({ one }) => ({
  product: one(products, {
    fields: [productPhotos.productId],
    references: [products.id],
  }),
}));

export const productUnitsRelations = relations(productUnits, ({ one }) => ({
  product: one(products, {
    fields: [productUnits.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  photos: many(productPhotos),
  units: many(productUnits),
}));

export const opnameRecordsRelations = relations(opnameRecords, ({ one, many }) => ({
  session: one(opnameSessions, {
    fields: [opnameRecords.sessionId],
    references: [opnameSessions.id],
  }),
  product: one(products, {
    fields: [opnameRecords.productId],
    references: [products.id],
  }),
  photos: many(opnameRecordPhotos),
}));

export const opnameRecordPhotosRelations = relations(opnameRecordPhotos, ({ one }) => ({
  record: one(opnameRecords, {
    fields: [opnameRecordPhotos.recordId],
    references: [opnameRecords.id],
  }),
}));

export const opnameSessionsRelations = relations(opnameSessions, ({ many }) => ({
  records: many(opnameRecords),
}));

export const staffMembersRelations = relations(staffMembers, ({ }) => ({}));

// === Insert Schemas ===

export const insertProductSchema = createInsertSchema(products).omit({ id: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(opnameSessions).omit({ id: true, startedAt: true, completedAt: true });
export const insertRecordSchema = createInsertSchema(opnameRecords).omit({ id: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export const insertProductPhotoSchema = createInsertSchema(productPhotos).omit({ id: true, createdAt: true });
export const insertProductUnitSchema = createInsertSchema(productUnits).omit({ id: true });
export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertMotivationMessageSchema = createInsertSchema(motivationMessages).omit({ id: true });
export const insertCategoryPrioritySchema = createInsertSchema(categoryPriorities).omit({ id: true });

// === Types ===

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductPhoto = typeof productPhotos.$inferSelect;
export type InsertProductPhoto = z.infer<typeof insertProductPhotoSchema>;

export type ProductUnit = typeof productUnits.$inferSelect;
export type InsertProductUnit = z.infer<typeof insertProductUnitSchema>;

export type OpnameSession = typeof opnameSessions.$inferSelect;
export type InsertOpnameSession = z.infer<typeof insertSessionSchema>;

export type OpnameRecord = typeof opnameRecords.$inferSelect;
export type InsertOpnameRecord = z.infer<typeof insertRecordSchema>;

export type OpnameRecordPhoto = typeof opnameRecordPhotos.$inferSelect;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type MotivationMessage = typeof motivationMessages.$inferSelect;
export type InsertMotivationMessage = z.infer<typeof insertMotivationMessageSchema>;

export type CategoryPriority = typeof categoryPriorities.$inferSelect;
export type InsertCategoryPriority = z.infer<typeof insertCategoryPrioritySchema>;

export type ProductWithPhotosAndUnits = Product & { photos: ProductPhoto[]; units: ProductUnit[] };
export type OpnameRecordWithProduct = OpnameRecord & { product: Product & { photos: ProductPhoto[]; units: ProductUnit[] }; photos: OpnameRecordPhoto[] };
export type OpnameSessionWithRecords = OpnameSession & { records: OpnameRecordWithProduct[] };
