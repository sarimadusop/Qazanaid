
import { db } from "./db";
import {
  products, opnameSessions, opnameRecords,
  type Product, type InsertProduct,
  type OpnameSession, type InsertOpnameSession,
  type OpnameRecord, type InsertOpnameRecord,
  type OpnameSessionWithRecords
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Sessions
  getSessions(): Promise<OpnameSession[]>;
  getSession(id: number): Promise<OpnameSessionWithRecords | undefined>;
  createSession(session: InsertOpnameSession): Promise<OpnameSession>;
  completeSession(id: number): Promise<OpnameSession>;

  // Records
  updateRecord(sessionId: number, productId: number, actualStock: number, notes?: string): Promise<OpnameRecord>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.sku);
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

  async getSessions(): Promise<OpnameSession[]> {
    return await db.select().from(opnameSessions).orderBy(desc(opnameSessions.startedAt));
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
    // 1. Create the session
    const [session] = await db.insert(opnameSessions).values(insertSession).returning();

    // 2. Snapshot all current products into records
    const allProducts = await this.getProducts();
    if (allProducts.length > 0) {
        const recordsToInsert = allProducts.map(p => ({
            sessionId: session.id,
            productId: p.id,
            systemStockSnapshot: p.currentStock,
            actualStock: null,
            difference: null,
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

    // Optional: Update product stock based on actual counts?
    // For now, let's keep it as an audit record without auto-updating master stock
    // to avoid accidental overwrites. Usually opname results are reviewed before posting.
    // If the user wants auto-update, we can add it later.
    // Ideally, we SHOULD update the master stock if the count is finalized.
    // Let's implement that for a better user experience.

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
    // Find existing record or create if product was added after session start (edge case)
    const [existing] = await db.select().from(opnameRecords).where(
        eq(opnameRecords.sessionId, sessionId)
    ).where(
        eq(opnameRecords.productId, productId)
    );

    let systemStock = existing ? existing.systemStockSnapshot : 0;
    
    // If it's a new record (product added mid-session), get current system stock
    if (!existing) {
        const p = await this.getProduct(productId);
        systemStock = p ? p.currentStock : 0;
    }

    const difference = actualStock - systemStock;

    if (existing) {
        const [updated] = await db.update(opnameRecords)
            .set({ actualStock, difference, notes })
            .where(eq(opnameRecords.id, existing.id))
            .returning();
        return updated;
    } else {
        const [created] = await db.insert(opnameRecords).values({
            sessionId,
            productId,
            systemStockSnapshot: systemStock,
            actualStock,
            difference,
            notes
        }).returning();
        return created;
    }
  }
}

export const storage = new DatabaseStorage();
