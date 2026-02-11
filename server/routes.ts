
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Products ===
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const input = api.products.update.input.parse(req.body);
        const product = await storage.updateProduct(id, input);
        res.json(product);
    } catch (err) {
        // Handle 404 in storage or here
        res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Sessions ===
  app.get(api.sessions.list.path, async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id));
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  });

  app.post(api.sessions.complete.path, async (req, res) => {
    const session = await storage.completeSession(Number(req.params.id));
    res.json(session);
  });

  // === Records ===
  app.post(api.records.update.path, async (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const { productId, actualStock, notes } = req.body;
    
    // Simple validation
    if (typeof productId !== 'number' || typeof actualStock !== 'number') {
        return res.status(400).json({ message: "Invalid input" });
    }

    const record = await storage.updateRecord(sessionId, productId, actualStock, notes);
    res.json(record);
  });

  return httpServer;
}

// Seed function to create initial data if empty
async function seedDatabase() {
    const products = await storage.getProducts();
    if (products.length === 0) {
        console.log("Seeding database...");
        await storage.createProduct({ sku: "SKU-001", name: "Laptop Gaming", category: "Electronics", currentStock: 10, description: "High performance laptop" });
        await storage.createProduct({ sku: "SKU-002", name: "Wireless Mouse", category: "Accessories", currentStock: 50, description: "Ergonomic mouse" });
        await storage.createProduct({ sku: "SKU-003", name: "Mechanical Keyboard", category: "Accessories", currentStock: 25, description: "RGB keyboard" });
        await storage.createProduct({ sku: "SKU-004", name: "Monitor 24 inch", category: "Electronics", currentStock: 15, description: "1080p display" });
        await storage.createProduct({ sku: "GEN-X1", name: "Generic Item A", category: "General", currentStock: 100, description: "Standard stock item" });
        console.log("Seeding complete.");
    }
}

// Run seed
seedDatabase().catch(console.error);
