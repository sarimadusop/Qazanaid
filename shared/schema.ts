import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  role: text("role", { enum: ["admin", "sku_manager", "stock_counter"] }).default("stock_counter").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  currentStock: integer("current_stock").default(0).notNull(),
  photoUrl: text("photo_url"),
  userId: text("user_id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opnameSessions = pgTable("opname_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).default("in_progress").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  userId: text("user_id").notNull(),
});

export const opnameRecords = pgTable("opname_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => opnameSessions.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  actualStock: integer("actual_stock"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
});

export const opnameRecordsRelations = relations(opnameRecords, ({ one }) => ({
  session: one(opnameSessions, {
    fields: [opnameRecords.sessionId],
    references: [opnameSessions.id],
  }),
  product: one(products, {
    fields: [opnameRecords.productId],
    references: [products.id],
  }),
}));

export const opnameSessionsRelations = relations(opnameSessions, ({ many }) => ({
  records: many(opnameRecords),
}));

export const insertProductSchema = createInsertSchema(products).omit({ id: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(opnameSessions).omit({ id: true, startedAt: true, completedAt: true });
export const insertRecordSchema = createInsertSchema(opnameRecords).omit({ id: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type OpnameSession = typeof opnameSessions.$inferSelect;
export type InsertOpnameSession = z.infer<typeof insertSessionSchema>;

export type OpnameRecord = typeof opnameRecords.$inferSelect;
export type InsertOpnameRecord = z.infer<typeof insertRecordSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type OpnameRecordWithProduct = OpnameRecord & { product: Product };
export type OpnameSessionWithRecords = OpnameSession & { records: OpnameRecordWithProduct[] };
