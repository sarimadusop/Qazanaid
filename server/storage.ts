import { db } from "./db";
import {
  products, opnameSessions, opnameRecords, userRoles,
  type Product, type InsertProduct,
  type OpnameSession, type InsertOpnameSession,
  type OpnameRecord,
  type OpnameSessionWithRecords,
  type UserRole, type InsertUserRole
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getProducts(userId: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  getSessions(userId: string): Promise<OpnameSession[]>;
  getSession(id: number): Promise<OpnameSessionWithRecords | undefined>;
  createSession(session: InsertOpnameSession): Promise<OpnameSession>;
  completeSession(id: number): Promise<OpnameSession>;

  updateRecord(sessionId: number, productId: number, actualStock: number, notes?: string): Promise<OpnameRecord>;
  updateRecordPhoto(sessionId: number, productId: number, photoUrl: string): Promise<OpnameRecord>;

  getUserRole(userId: string): Promise<UserRole | undefined>;
  setUserRole(data: InsertUserRole): Promise<UserRole>;
  getAllUserRoles(): Promise<UserRole[]>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(userId: string): Promise<Product[]> {
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

  async getSessions(userId: string): Promise<OpnameSession[]> {
    return await db.select().from(opnameSessions).where(eq(opnameSessions.userId, userId)).orderBy(desc(opnameSessions.startedAt));
  }

  async getSession(id: number): Promise<OpnameSessionWithRecords | undefined> {
    const [session] = await db.select().from(opnameSessions).where(eq(opnameSessions.id, id));
    if (!session) return undefined;

    const records = await db.query.opnameRecords.findMany({
      where: eq(opnameRecords.sessionId, id),
      with: {
        product: true
      },
      orderBy: desc(opnameRecords.id)
    });

    return { ...session, records };
  }

  async createSession(insertSession: InsertOpnameSession): Promise<OpnameSession> {
    const [session] = await db.insert(opnameSessions).values(insertSession).returning();

    const allProducts = await this.getProducts(insertSession.userId);
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

  async updateRecord(sessionId: number, productId: number, actualStock: number, notes?: string): Promise<OpnameRecord> {
    const [existing] = await db.select().from(opnameRecords).where(
      and(eq(opnameRecords.sessionId, sessionId), eq(opnameRecords.productId, productId))
    );

    if (existing) {
      const [updated] = await db.update(opnameRecords)
        .set({ actualStock, notes })
        .where(eq(opnameRecords.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(opnameRecords).values({
        sessionId,
        productId,
        actualStock,
        notes
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
}

export const storage = new DatabaseStorage();
