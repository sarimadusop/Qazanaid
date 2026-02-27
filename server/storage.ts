import { db } from "./db";
import {
  products, opnameSessions, opnameRecords, userRoles,
  productPhotos, productUnits, staffMembers, announcements,
  feedback, motivationMessages, opnameRecordPhotos, categoryPriorities,
  type Product, type InsertProduct,
  type OpnameSession, type InsertOpnameSession,
  type OpnameRecord,
  type OpnameSessionWithRecords,
  type UserRole, type InsertUserRole,
  type ProductPhoto, type InsertProductPhoto,
  type ProductUnit, type InsertProductUnit,
  type StaffMember, type InsertStaffMember,
  type Announcement, type InsertAnnouncement,
  type Feedback, type InsertFeedback,
  type MotivationMessage, type InsertMotivationMessage,
  type OpnameRecordPhoto,
  type ProductWithPhotosAndUnits,
  type CategoryPriority,
} from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IStorage {
  getProducts(userId: string, locationType?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  bulkResetStock(ids: number[], userId: string): Promise<void>;
  getProductsWithPhotosAndUnits(userId: string): Promise<ProductWithPhotosAndUnits[]>;

  getProductPhotos(productId: number): Promise<ProductPhoto[]>;
  addProductPhoto(data: InsertProductPhoto): Promise<ProductPhoto>;
  deleteProductPhoto(id: number): Promise<void>;

  getProductUnits(productId: number): Promise<ProductUnit[]>;
  addProductUnit(data: InsertProductUnit): Promise<ProductUnit>;
  updateProductUnit(id: number, data: Partial<InsertProductUnit>): Promise<ProductUnit>;
  deleteProductUnit(id: number): Promise<void>;

  getSessions(userId: string, locationType?: string): Promise<OpnameSession[]>;
  getSession(id: number): Promise<OpnameSessionWithRecords | undefined>;
  createSession(session: InsertOpnameSession): Promise<OpnameSession>;
  completeSession(id: number): Promise<OpnameSession>;

  updateRecord(sessionId: number, productId: number, actualStock: number, notes?: string, unitValues?: string, countedBy?: string, returnedQuantity?: number, returnedNotes?: string): Promise<OpnameRecord>;
  updateRecordPhoto(sessionId: number, productId: number, photoUrl: string): Promise<OpnameRecord>;

  getRecordPhotos(recordId: number): Promise<OpnameRecordPhoto[]>;
  addRecordPhoto(data: { recordId: number; url: string }): Promise<OpnameRecordPhoto>;
  deleteRecordPhoto(id: number): Promise<void>;

  getUserRole(userId: string): Promise<UserRole | undefined>;
  setUserRole(data: InsertUserRole): Promise<UserRole>;
  getAllUserRoles(): Promise<UserRole[]>;

  getStaffMembers(userId: string): Promise<StaffMember[]>;
  createStaffMember(data: InsertStaffMember): Promise<StaffMember>;
  updateStaffMember(id: number, data: Partial<InsertStaffMember>): Promise<StaffMember>;
  deleteStaffMember(id: number): Promise<void>;

  getAnnouncements(userId: string): Promise<Announcement[]>;
  createAnnouncement(data: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

  getFeedback(userId: string): Promise<Feedback[]>;
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  deleteFeedback(id: number): Promise<void>;
  getAllFeedback(): Promise<Feedback[]>;

  getMotivationMessages(userId: string): Promise<MotivationMessage[]>;
  createMotivationMessage(data: InsertMotivationMessage): Promise<MotivationMessage>;
  updateMotivationMessage(id: number, data: Partial<InsertMotivationMessage>): Promise<MotivationMessage>;
  deleteMotivationMessage(id: number): Promise<void>;

  getCategoryPriorities(userId: string): Promise<CategoryPriority[]>;
  setCategoryPriorities(userId: string, priorities: { categoryName: string; sortOrder: number }[]): Promise<CategoryPriority[]>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(userId: string, locationType?: string): Promise<Product[]> {
    if (locationType) {
      return await db.select().from(products).where(and(eq(products.userId, userId), eq(products.locationType, locationType as "toko" | "gudang"))).orderBy(products.sku);
    }
    return await db.select().from(products).where(eq(products.userId, userId)).orderBy(products.sku);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async bulkResetStock(ids: number[], userId: string): Promise<void> {
    await db.update(products).set({ currentStock: 0 }).where(and(inArray(products.id, ids), eq(products.userId, userId)));
  }

  async getProductsWithPhotosAndUnits(userId: string): Promise<ProductWithPhotosAndUnits[]> {
    const result = await db.query.products.findMany({
      where: eq(products.userId, userId),
      with: {
        photos: true,
        units: true,
      },
      orderBy: products.sku,
    });
    return result;
  }

  async getProductPhotos(productId: number): Promise<ProductPhoto[]> {
    return await db.select().from(productPhotos).where(eq(productPhotos.productId, productId));
  }

  async addProductPhoto(data: InsertProductPhoto): Promise<ProductPhoto> {
    const [photo] = await db.insert(productPhotos).values(data).returning();
    return photo;
  }

  async deleteProductPhoto(id: number): Promise<void> {
    await db.delete(productPhotos).where(eq(productPhotos.id, id));
  }

  async getProductUnits(productId: number): Promise<ProductUnit[]> {
    return await db.select().from(productUnits).where(eq(productUnits.productId, productId)).orderBy(productUnits.sortOrder);
  }

  async addProductUnit(data: InsertProductUnit): Promise<ProductUnit> {
    const [unit] = await db.insert(productUnits).values(data).returning();
    return unit;
  }

  async updateProductUnit(id: number, data: Partial<InsertProductUnit>): Promise<ProductUnit> {
    const [unit] = await db.update(productUnits).set(data).where(eq(productUnits.id, id)).returning();
    return unit;
  }

  async deleteProductUnit(id: number): Promise<void> {
    await db.delete(productUnits).where(eq(productUnits.id, id));
  }

  async getSessions(userId: string, locationType?: string): Promise<OpnameSession[]> {
    if (locationType) {
      return await db.select().from(opnameSessions).where(and(eq(opnameSessions.userId, userId), eq(opnameSessions.locationType, locationType as "toko" | "gudang"))).orderBy(desc(opnameSessions.startedAt));
    }
    return await db.select().from(opnameSessions).where(eq(opnameSessions.userId, userId)).orderBy(desc(opnameSessions.startedAt));
  }

  async getSession(id: number): Promise<OpnameSessionWithRecords | undefined> {
    const [session] = await db.select().from(opnameSessions).where(eq(opnameSessions.id, id));
    if (!session) return undefined;

    const records = await db.query.opnameRecords.findMany({
      where: eq(opnameRecords.sessionId, id),
      with: {
        product: {
          with: {
            photos: true,
            units: true,
          },
        },
        photos: true,
      },
      orderBy: desc(opnameRecords.id)
    });

    return { ...session, records };
  }

  async createSession(insertSession: InsertOpnameSession): Promise<OpnameSession> {
    const [session] = await db.insert(opnameSessions).values(insertSession).returning();

    const sessionLocationType = insertSession.locationType;
    const allProducts = await this.getProducts(insertSession.userId, sessionLocationType ?? undefined);
    if (allProducts.length > 0) {
      const recordsToInsert = allProducts.map(p => ({
        sessionId: session.id,
        productId: p.id,
        actualStock: null as number | null,
      }));
      await db.insert(opnameRecords).values(recordsToInsert);
    }

    return session;
  }

  async completeSession(id: number): Promise<OpnameSession> {
    const [session] = await db.update(opnameSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(opnameSessions.id, id))
      .returning();

    const records = await db.select().from(opnameRecords).where(eq(opnameRecords.sessionId, id));
    for (const record of records) {
      if (record.actualStock !== null) {
        await db.update(products)
          .set({ currentStock: record.actualStock })
          .where(eq(products.id, record.productId));
      }
    }

    return session;
  }

  async updateRecord(sessionId: number, productId: number, actualStock: number, notes?: string, unitValues?: string, countedBy?: string, returnedQuantity?: number, returnedNotes?: string): Promise<OpnameRecord> {
    const [existing] = await db.select().from(opnameRecords).where(
      and(eq(opnameRecords.sessionId, sessionId), eq(opnameRecords.productId, productId))
    );

    const updateData: Record<string, unknown> = { actualStock, notes };
    if (unitValues !== undefined) {
      updateData.unitValues = unitValues;
    }
    if (countedBy !== undefined) {
      updateData.countedBy = countedBy;
    }
    if (returnedQuantity !== undefined) {
      updateData.returnedQuantity = returnedQuantity;
    }
    if (returnedNotes !== undefined) {
      updateData.returnedNotes = returnedNotes;
    }

    if (existing) {
      const [updated] = await db.update(opnameRecords)
        .set(updateData)
        .where(eq(opnameRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(opnameRecords).values({
        sessionId,
        productId,
        actualStock,
        notes,
        unitValues,
        countedBy,
        returnedQuantity: returnedQuantity ?? 0,
        returnedNotes
      }).returning();
      return created;
    }
  }

  async updateRecordPhoto(sessionId: number, productId: number, photoUrl: string): Promise<OpnameRecord> {
    const [existing] = await db.select().from(opnameRecords).where(
      and(eq(opnameRecords.sessionId, sessionId), eq(opnameRecords.productId, productId))
    );

    if (existing) {
      const [updated] = await db.update(opnameRecords)
        .set({ photoUrl })
        .where(eq(opnameRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(opnameRecords).values({
        sessionId,
        productId,
        photoUrl
      }).returning();
      return created;
    }
  }

  async getRecordPhotos(recordId: number): Promise<OpnameRecordPhoto[]> {
    return await db.select().from(opnameRecordPhotos).where(eq(opnameRecordPhotos.recordId, recordId));
  }

  async addRecordPhoto(data: { recordId: number; url: string }): Promise<OpnameRecordPhoto> {
    const [photo] = await db.insert(opnameRecordPhotos).values(data).returning();
    return photo;
  }

  async deleteRecordPhoto(id: number): Promise<void> {
    await db.delete(opnameRecordPhotos).where(eq(opnameRecordPhotos.id, id));
  }

  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async setUserRole(data: InsertUserRole): Promise<UserRole> {
    const [existing] = await db.select().from(userRoles).where(eq(userRoles.userId, data.userId));
    if (existing) {
      const [updated] = await db.update(userRoles)
        .set({ role: data.role })
        .where(eq(userRoles.userId, data.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userRoles).values(data).returning();
    return created;
  }

  async getAllUserRoles(): Promise<UserRole[]> {
    return await db.select().from(userRoles);
  }

  async getStaffMembers(userId: string): Promise<StaffMember[]> {
    return await db.select().from(staffMembers).where(eq(staffMembers.userId, userId));
  }

  async createStaffMember(data: InsertStaffMember): Promise<StaffMember> {
    const [member] = await db.insert(staffMembers).values(data).returning();
    return member;
  }

  async updateStaffMember(id: number, data: Partial<InsertStaffMember>): Promise<StaffMember> {
    const [member] = await db.update(staffMembers).set(data).where(eq(staffMembers.id, id)).returning();
    return member;
  }

  async deleteStaffMember(id: number): Promise<void> {
    await db.delete(staffMembers).where(eq(staffMembers.id, id));
  }

  async getAnnouncements(userId: string): Promise<Announcement[]> {
    return await db.select().from(announcements).where(eq(announcements.userId, userId)).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(announcements).values(data).returning();
    return announcement;
  }

  async updateAnnouncement(id: number, data: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [announcement] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return announcement;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async getFeedback(userId: string): Promise<Feedback[]> {
    return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [fb] = await db.insert(feedback).values(data).returning();
    return fb;
  }

  async deleteFeedback(id: number): Promise<void> {
    await db.delete(feedback).where(eq(feedback.id, id));
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async getMotivationMessages(userId: string): Promise<MotivationMessage[]> {
    return await db.select().from(motivationMessages).where(eq(motivationMessages.userId, userId));
  }

  async createMotivationMessage(data: InsertMotivationMessage): Promise<MotivationMessage> {
    const [msg] = await db.insert(motivationMessages).values(data).returning();
    return msg;
  }

  async updateMotivationMessage(id: number, data: Partial<InsertMotivationMessage>): Promise<MotivationMessage> {
    const [msg] = await db.update(motivationMessages).set(data).where(eq(motivationMessages.id, id)).returning();
    return msg;
  }

  async deleteMotivationMessage(id: number): Promise<void> {
    await db.delete(motivationMessages).where(eq(motivationMessages.id, id));
  }

  async getCategoryPriorities(userId: string): Promise<CategoryPriority[]> {
    return await db.select().from(categoryPriorities).where(eq(categoryPriorities.userId, userId)).orderBy(categoryPriorities.sortOrder);
  }

  async setCategoryPriorities(userId: string, priorities: { categoryName: string; sortOrder: number }[]): Promise<CategoryPriority[]> {
    await db.delete(categoryPriorities).where(eq(categoryPriorities.userId, userId));
    if (priorities.length === 0) return [];
    const values = priorities.map(p => ({ categoryName: p.categoryName, sortOrder: p.sortOrder, userId }));
    return await db.insert(categoryPriorities).values(values).returning();
  }
}

export const storage = new DatabaseStorage();
