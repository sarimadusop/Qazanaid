import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { authStorage } from "./replit_integrations/auth/storage";
import archiver from "archiver";

const upload = multer({ dest: "/tmp/uploads", limits: { fileSize: 10 * 1024 * 1024 } });

function getUserId(req: Request): string {
  return (req.session as any)?.userId;
}

async function getTeamAdminId(req: Request): Promise<string> {
  const userId = getUserId(req);
  const user = await authStorage.getUser(userId);
  if (user?.adminId) {
    return user.adminId;
  }
  return userId;
}

async function getUserRole(req: Request) {
  const userId = getUserId(req);
  const roleRecord = await storage.getUserRole(userId);
  return roleRecord?.role || "stock_counter";
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: Function) => {
    const role = await getUserRole(req);
    if (roles.includes(role)) {
      return next();
    }
    res.status(403).json({ message: "Anda tidak memiliki akses untuk fitur ini" });
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  // === Roles ===
  app.get(api.roles.me.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    let roleRecord = await storage.getUserRole(userId);
    if (!roleRecord) {
      roleRecord = await storage.setUserRole({ userId, role: "stock_counter" });
    }
    res.json(roleRecord);
  });

  app.get(api.roles.list.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    const adminId = getUserId(req);
    const roles = await storage.getAllUserRoles();
    const { users } = await import("@shared/models/auth");
    const { db } = await import("./db");
    const { eq, or } = await import("drizzle-orm");
    const allUsers = await db.select().from(users).where(
      or(eq(users.id, adminId), eq(users.adminId, adminId))
    );
    
    const teamUserIds = new Set(allUsers.map(u => u.id));
    const teamRoles = roles.filter(r => teamUserIds.has(r.userId));
    
    const enriched = teamRoles.map(r => {
      const user = allUsers.find(u => u.id === r.userId);
      return {
        ...r,
        username: user?.username,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        adminId: user?.adminId,
      };
    });
    res.json(enriched);
  });

  app.post(api.roles.set.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const input = api.roles.set.input.parse(req.body);
      const adminId = getUserId(req);
      
      const { users } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId));
      
      if (!targetUser || (targetUser.id !== adminId && targetUser.adminId !== adminId)) {
        return res.status(403).json({ message: "Anda tidak bisa mengubah role user ini" });
      }
      
      if (targetUser.id === adminId) {
        return res.status(400).json({ message: "Tidak bisa mengubah role sendiri" });
      }
      
      const role = await storage.setUserRole(input);
      res.json(role);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === Products ===
  app.get(api.products.categories.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const prods = await storage.getProducts(adminId);
    const cats = Array.from(new Set(prods.map(p => p.category).filter(Boolean))) as string[];
    res.json(cats);
  });

  app.get(api.products.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const prods = await storage.getProducts(adminId);
    res.json(prods);
  });

  app.post(api.products.create.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const adminId = await getTeamAdminId(req);
      const product = await storage.createProduct({ ...input, userId: adminId });
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

  app.put(api.products.update.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const adminId = await getTeamAdminId(req);
      const existing = await storage.getProduct(id);
      if (!existing || existing.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(id, input);
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete(api.products.delete.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const existing = await storage.getProduct(Number(req.params.id));
    if (!existing || existing.userId !== adminId) {
      return res.status(404).json({ message: "Product not found" });
    }
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Photo Upload ===
  app.post(api.upload.photo.path, isAuthenticated, requireRole("admin", "sku_manager"), upload.single("photo"), async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const adminId = await getTeamAdminId(req);
      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const date = new Date().toISOString().split("T")[0];
      const safeName = product.name.replace(/[^a-zA-Z0-9]/g, "_");
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `${safeName}_${date}${ext}`;

      const publicDir = path.join(process.cwd(), "client", "public", "uploads");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const destPath = path.join(publicDir, filename);
      fs.copyFileSync(req.file.path, destPath);
      fs.unlinkSync(req.file.path);

      const url = `/uploads/${filename}`;
      await storage.updateProduct(productId, { photoUrl: url });

      res.json({ url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // === Opname Photo Upload ===
  app.post(api.upload.opnamePhoto.path, isAuthenticated, upload.single("photo"), async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const productId = Number(req.params.productId);
      const adminId = await getTeamAdminId(req);

      const session = await storage.getSession(sessionId);
      if (!session || session.userId !== adminId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const safeName = product.name.replace(/[^a-zA-Z0-9]/g, "_");
      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `${safeName}SO_${dateStr}${ext}`;

      const publicDir = path.join(process.cwd(), "client", "public", "uploads");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const destPath = path.join(publicDir, filename);
      fs.copyFileSync(req.file.path, destPath);
      fs.unlinkSync(req.file.path);

      const url = `/uploads/${filename}`;
      await storage.updateRecordPhoto(sessionId, productId, url);

      res.json({ url });
    } catch (err) {
      console.error("Opname photo upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // === Download ZIP Photos ===
  app.get(api.upload.downloadZip.path, isAuthenticated, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const adminId = await getTeamAdminId(req);

      const session = await storage.getSession(sessionId);
      if (!session || session.userId !== adminId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const recordsWithPhotos = session.records.filter(r => r.photoUrl);
      if (recordsWithPhotos.length === 0) {
        return res.status(404).json({ message: "Tidak ada foto untuk didownload" });
      }

      const safeTitle = session.title.replace(/[^a-zA-Z0-9]/g, "_");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${safeTitle}_Photos.zip`);

      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(res);

      for (const record of recordsWithPhotos) {
        const relativePath = record.photoUrl!.replace(/^\//, "");
        const filePath = path.join(process.cwd(), "client", "public", relativePath);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(record.photoUrl!) || ".jpg";
          const now = new Date(session.startedAt);
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const safeName = record.product.name.replace(/[^a-zA-Z0-9]/g, "_");
          const zipFilename = `${safeName}SO_${dateStr}${ext}`;
          archive.file(filePath, { name: zipFilename });
        }
      }

      await archive.finalize();
    } catch (err) {
      console.error("ZIP download error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create ZIP" });
      }
    }
  });

  // === Sessions ===
  app.get(api.sessions.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const sessions = await storage.getSessions(adminId);
    res.json(sessions);
  });

  app.post(api.sessions.create.path, isAuthenticated, requireRole("admin", "stock_counter"), async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const adminId = await getTeamAdminId(req);
      const session = await storage.createSession({ ...input, userId: adminId });
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.sessions.get.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const session = await storage.getSession(Number(req.params.id));
    if (!session || session.userId !== adminId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  });

  app.post(api.sessions.complete.path, isAuthenticated, requireRole("admin", "stock_counter"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const session = await storage.getSession(Number(req.params.id));
    if (!session || session.userId !== adminId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const completed = await storage.completeSession(Number(req.params.id));
    res.json(completed);
  });

  // === Records ===
  app.post(api.records.update.path, isAuthenticated, requireRole("admin", "stock_counter"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const sessionId = Number(req.params.sessionId);
    const session = await storage.getSession(sessionId);
    if (!session || session.userId !== adminId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const { productId, actualStock, notes } = req.body;
    
    if (typeof productId !== 'number' || typeof actualStock !== 'number') {
      return res.status(400).json({ message: "Invalid input" });
    }

    const record = await storage.updateRecord(sessionId, productId, actualStock, notes);
    res.json(record);
  });

  // === Excel Template & Import ===
  app.get(api.excel.template.path, isAuthenticated, requireRole("admin", "sku_manager"), (req, res) => {
    const wb = XLSX.utils.book_new();
    const headers = ["SKU", "Nama Produk", "Kategori", "Deskripsi", "Stok Awal"];
    const exampleRows = [
      ["ITEM-001", "Contoh Produk", "Elektronik", "Deskripsi produk", 10],
      ["ITEM-002", "Produk Kedua", "Makanan", "", 25],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Template Produk");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=template_produk.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.post(api.excel.import.path, isAuthenticated, requireRole("admin", "sku_manager"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);
      const wb = XLSX.read(fileBuffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        return res.status(400).json({ message: "File kosong atau tidak memiliki data" });
      }

      const adminId = await getTeamAdminId(req);
      const existingProducts = await storage.getProducts(adminId);
      const existingSkus = new Set(existingProducts.map(p => p.sku.toLowerCase()));

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === "")) {
          continue;
        }

        const sku = String(row[0] || "").trim();
        const name = String(row[1] || "").trim();
        const category = String(row[2] || "").trim() || null;
        const description = String(row[3] || "").trim() || null;
        const currentStock = parseInt(String(row[4] || "0"), 10);

        if (!sku) {
          errors.push({ row: i + 1, message: "SKU wajib diisi" });
          skipped++;
          continue;
        }

        if (!name) {
          errors.push({ row: i + 1, message: "Nama Produk wajib diisi" });
          skipped++;
          continue;
        }

        if (existingSkus.has(sku.toLowerCase())) {
          errors.push({ row: i + 1, message: `SKU "${sku}" sudah ada` });
          skipped++;
          continue;
        }

        if (isNaN(currentStock) || currentStock < 0) {
          errors.push({ row: i + 1, message: "Stok harus berupa angka positif" });
          skipped++;
          continue;
        }

        try {
          await storage.createProduct({
            sku,
            name,
            category,
            description,
            currentStock,
            photoUrl: null,
            userId: adminId,
          });
          existingSkus.add(sku.toLowerCase());
          imported++;
        } catch (err) {
          errors.push({ row: i + 1, message: "Gagal menyimpan produk" });
          skipped++;
        }
      }

      res.json({ imported, skipped, errors });
    } catch (err) {
      console.error("Excel import error:", err);
      res.status(500).json({ message: "Gagal memproses file Excel" });
    }
  });

  return httpServer;
}
