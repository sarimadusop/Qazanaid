import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import * as XLSX from "xlsx";
import { authStorage } from "./auth/storage";
import archiver from "archiver";
import { productPhotos, opnameRecordPhotos } from "@shared/schema";
import { db } from "./db";
import { storageService } from "./lib/storage-provider";


const upload = multer({ dest: path.join(os.tmpdir(), "kazana-uploads"), limits: { fileSize: 10 * 1024 * 1024 } });

async function uploadToObjectStorage(file: Express.Multer.File): Promise<string> {
  const fileBuffer = fs.readFileSync(file.path);
  const url = await storageService.uploadFile(
    fileBuffer,
    file.originalname,
    file.mimetype || "application/octet-stream"
  );
  fs.unlinkSync(file.path);
  return url;
}

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

  app.get(api.products.withDetails.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const result = await storage.getProductsWithPhotosAndUnits(adminId);
    res.json(result);
  });

  app.get(api.products.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const locationType = req.query.locationType as string | undefined;
    const role = await getUserRole(req);

    let effectiveLocationType = locationType;
    if (role === "stock_counter_toko") effectiveLocationType = "toko";
    if (role === "stock_counter_gudang") effectiveLocationType = "gudang";

    const prods = await storage.getProducts(adminId, effectiveLocationType);
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

  app.post(api.products.bulkDelete.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const { ids } = req.body as { ids: number[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }
    let deleted = 0;
    for (const id of ids) {
      const existing = await storage.getProduct(id);
      if (existing && existing.userId === adminId) {
        await storage.deleteProduct(id);
        deleted++;
      }
    }
    res.json({ deleted });
  });

  // === Product Photos (multi-photo support) ===
  app.get(api.productPhotos.list.path, isAuthenticated, async (req, res) => {
    const productId = Number(req.params.productId);
    const photos = await storage.getProductPhotos(productId);
    res.json(photos);
  });

  app.post(api.productPhotos.upload.path, isAuthenticated, requireRole("admin", "sku_manager"), upload.single("photo"), async (req, res) => {
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

      const url = await uploadToObjectStorage(req.file);
      const photo = await storage.addProductPhoto({ productId, url });

      res.status(201).json(photo);
    } catch (err) {
      console.error("Product photo upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.delete(api.productPhotos.delete.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const photoId = Number(req.params.photoId);
      const productId = Number(req.params.productId);
      const adminId = await getTeamAdminId(req);
      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.deleteProductPhoto(photoId);
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete photo error:", err);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // === Product Units (unit beranak) ===
  app.get(api.productUnits.list.path, isAuthenticated, async (req, res) => {
    const productId = Number(req.params.productId);
    const units = await storage.getProductUnits(productId);
    res.json(units);
  });

  app.post(api.productUnits.create.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const adminId = await getTeamAdminId(req);
      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const { unitName, conversionToBase, baseUnit, sortOrder } = req.body;
      if (!unitName || !baseUnit) {
        return res.status(400).json({ message: "unitName and baseUnit are required" });
      }

      const unit = await storage.addProductUnit({
        productId,
        unitName,
        conversionToBase: conversionToBase || 1,
        baseUnit,
        sortOrder: sortOrder || 0,
      });
      res.status(201).json(unit);
    } catch (err) {
      console.error("Create unit error:", err);
      res.status(500).json({ message: "Failed to create unit" });
    }
  });

  app.put(api.productUnits.update.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const unitId = Number(req.params.unitId);
      const adminId = await getTeamAdminId(req);
      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      const { unitName, conversionToBase, baseUnit, sortOrder } = req.body;
      const unit = await storage.updateProductUnit(unitId, {
        unitName,
        conversionToBase,
        baseUnit,
        sortOrder,
      });
      res.json(unit);
    } catch (err) {
      console.error("Update unit error:", err);
      res.status(500).json({ message: "Failed to update unit" });
    }
  });

  app.delete(api.productUnits.delete.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const unitId = Number(req.params.unitId);
      const adminId = await getTeamAdminId(req);
      const product = await storage.getProduct(productId);
      if (!product || product.userId !== adminId) {
        return res.status(404).json({ message: "Product not found" });
      }

      await storage.deleteProductUnit(unitId);
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete unit error:", err);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // === Photo Upload (legacy single photo) ===
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

      const url = await uploadToObjectStorage(req.file);
      await storage.updateProduct(productId, { photoUrl: url });

      res.json({ url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // === Opname Photo Upload (legacy single photo) ===
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

      const url = await uploadToObjectStorage(req.file);
      await storage.updateRecordPhoto(sessionId, productId, url);

      res.json({ url });
    } catch (err) {
      console.error("Opname photo upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // === Opname Record Photos (multi-photo for SO) ===
  app.post(api.recordPhotos.upload.path, isAuthenticated, upload.single("photo"), async (req, res) => {
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

      const url = await uploadToObjectStorage(req.file);

      const record = session.records.find(r => r.productId === productId);
      if (record) {
        const recordPhoto = await storage.addRecordPhoto({ recordId: record.id, url });
        await storage.updateRecordPhoto(sessionId, productId, url);
        res.status(201).json(recordPhoto);
      } else {
        await storage.updateRecordPhoto(sessionId, productId, url);
        res.status(201).json({ url });
      }
    } catch (err) {
      console.error("Record photo upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.delete(api.recordPhotos.delete.path, isAuthenticated, async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const productId = Number(req.params.productId);
      const photoId = Number(req.params.photoId);
      const adminId = await getTeamAdminId(req);

      const session = await storage.getSession(sessionId);
      if (!session || session.userId !== adminId) {
        return res.status(404).json({ message: "Session not found" });
      }

      await storage.deleteRecordPhoto(photoId);
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete record photo error:", err);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // === Download ZIP Photos ===
  app.post(api.upload.downloadZip.path, isAuthenticated, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const adminId = await getTeamAdminId(req);

      const session = await storage.getSession(sessionId);
      if (!session || session.userId !== adminId) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { productIds, date } = req.body as { productIds?: number[]; date?: string };

      let recordsToDownload = session.records;

      if (productIds && productIds.length > 0) {
        recordsToDownload = recordsToDownload.filter(r => productIds.includes(r.productId));
      }

      if (date) {
        const targetDate = new Date(date);
        const targetDateStr = targetDate.toISOString().split("T")[0];
        recordsToDownload = recordsToDownload.filter(r => {
          if (r.photos && r.photos.length > 0) {
            return r.photos.some(p => {
              const photoDate = new Date(p.createdAt).toISOString().split("T")[0];
              return photoDate === targetDateStr;
            });
          }
          return false;
        });
      }

      const recordsWithPhotos = recordsToDownload.filter(r => {
        return (r.photos && r.photos.length > 0) || r.photoUrl;
      });

      if (recordsWithPhotos.length === 0) {
        return res.status(404).json({ message: "Tidak ada foto untuk didownload" });
      }

      const safeTitle = session.title.replace(/[^a-zA-Z0-9]/g, "_");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${safeTitle}_Photos.zip`);

      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(res);

      for (const record of recordsWithPhotos) {
        const safeName = record.product.name.replace(/[^a-zA-Z0-9]/g, "_");

        const appendPhotoToArchive = async (photoUrl: string, zipFilename: string) => {
          if (photoUrl.startsWith("http")) {
            // Fetch from Supabase public URL
            const response = await fetch(photoUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              archive.append(Buffer.from(arrayBuffer), { name: zipFilename });
            }
          } else {
            const relativePath = photoUrl.replace(/^\//, "");
            const filePath = path.join(process.cwd(), relativePath);
            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: zipFilename });
            }
          }
        };

        if (record.photos && record.photos.length > 0) {
          for (let i = 0; i < record.photos.length; i++) {
            const photo = record.photos[i];
            const ext = path.extname(photo.url) || ".jpg";
            const photoDate = new Date(photo.createdAt);
            const dateStr = `${photoDate.getFullYear()}${String(photoDate.getMonth() + 1).padStart(2, '0')}${String(photoDate.getDate()).padStart(2, '0')}`;
            const suffix = record.photos.length > 1 ? `_${i + 1}` : "";
            const zipFilename = `${safeTitle}/${safeName}_${dateStr}${suffix}${ext}`;
            await appendPhotoToArchive(photo.url, zipFilename);
          }
        } else if (record.photoUrl) {
          const ext = path.extname(record.photoUrl) || ".jpg";
          const startDate = new Date(session.startedAt);
          const dateStr = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}`;
          const zipFilename = `${safeTitle}/${safeName}_${dateStr}${ext}`;
          await appendPhotoToArchive(record.photoUrl, zipFilename);
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
    const locationType = req.query.locationType as string | undefined;
    const role = await getUserRole(req);

    let effectiveLocationType = locationType;
    if (role === "stock_counter_toko") effectiveLocationType = "toko";
    if (role === "stock_counter_gudang") effectiveLocationType = "gudang";

    const sessions = await storage.getSessions(adminId, effectiveLocationType);
    res.json(sessions);
  });

  app.post(api.sessions.create.path, isAuthenticated, requireRole("admin", "stock_counter", "stock_counter_toko", "stock_counter_gudang"), async (req, res) => {
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

  app.post(api.sessions.complete.path, isAuthenticated, requireRole("admin", "stock_counter", "stock_counter_toko", "stock_counter_gudang"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const session = await storage.getSession(Number(req.params.id));
    if (!session || session.userId !== adminId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const completed = await storage.completeSession(Number(req.params.id));
    res.json(completed);
  });

  // === Records ===
  app.post(api.records.update.path, isAuthenticated, requireRole("admin", "stock_counter", "stock_counter_toko", "stock_counter_gudang"), async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const sessionId = Number(req.params.sessionId);
    const session = await storage.getSession(sessionId);
    if (!session || session.userId !== adminId) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const { productId, actualStock, notes, unitValues, countedBy } = req.body;

    if (typeof productId !== 'number' || typeof actualStock !== 'number') {
      return res.status(400).json({ message: "Invalid input" });
    }

    const record = await storage.updateRecord(sessionId, productId, actualStock, notes, unitValues, countedBy);
    res.json(record);
  });

  // === Staff Members ===
  app.get(api.staff.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const members = await storage.getStaffMembers(adminId);
    res.json(members);
  });

  app.post(api.staff.create.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const adminId = await getTeamAdminId(req);
      const { name, locationType } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const member = await storage.createStaffMember({
        name,
        locationType: locationType || "toko",
        userId: adminId,
        active: 1,
      });
      res.status(201).json(member);
    } catch (err) {
      console.error("Create staff error:", err);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put(api.staff.update.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, locationType, active } = req.body;
      const member = await storage.updateStaffMember(id, { name, locationType, active });
      res.json(member);
    } catch (err) {
      console.error("Update staff error:", err);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete(api.staff.delete.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      await storage.deleteStaffMember(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete staff error:", err);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // === Announcements ===
  app.get(api.announcements.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const items = await storage.getAnnouncements(adminId);
    res.json(items);
  });

  app.post(api.announcements.create.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const adminId = await getTeamAdminId(req);
      const { title, content, expiresAt } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      const announcement = await storage.createAnnouncement({
        title,
        content,
        imageUrl: null,
        userId: adminId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      res.status(201).json(announcement);
    } catch (err) {
      console.error("Create announcement error:", err);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.put(api.announcements.update.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, content, expiresAt, imageUrl } = req.body;
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      const announcement = await storage.updateAnnouncement(id, updates as any);
      res.json(announcement);
    } catch (err) {
      console.error("Update announcement error:", err);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.post(api.announcements.uploadImage.path, isAuthenticated, requireRole("admin"), upload.single("image"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const url = await uploadToObjectStorage(file);
      const announcement = await storage.updateAnnouncement(id, { imageUrl: url });
      res.json(announcement);
    } catch (err) {
      console.error("Announcement image upload error:", err);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.delete(api.announcements.delete.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteAnnouncement(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete announcement error:", err);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // === Feedback (Kritik & Saran) ===
  app.get(api.feedback.list.path, isAuthenticated, async (req, res) => {
    const role = await getUserRole(req);
    if (role === "admin") {
      const adminId = await getTeamAdminId(req);
      const allFeedback = await storage.getFeedback(adminId);
      res.json(allFeedback);
    } else {
      const userId = getUserId(req);
      const userFeedback = await storage.getFeedback(userId);
      res.json(userFeedback);
    }
  });

  app.post(api.feedback.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const adminId = await getTeamAdminId(req);
      const { type, content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const user = await authStorage.getUser(userId);
      const fb = await storage.createFeedback({
        userId: adminId,
        userName: user?.username || user?.firstName || "Unknown",
        type: type || "saran",
        content,
      });
      res.status(201).json(fb);
    } catch (err) {
      console.error("Create feedback error:", err);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.delete(api.feedback.delete.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteFeedback(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete feedback error:", err);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // === Motivation Messages ===
  app.get(api.motivation.list.path, isAuthenticated, async (req, res) => {
    const adminId = await getTeamAdminId(req);
    const messages = await storage.getMotivationMessages(adminId);
    res.json(messages);
  });

  app.post(api.motivation.create.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const adminId = await getTeamAdminId(req);
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      const msg = await storage.createMotivationMessage({
        message,
        userId: adminId,
        active: 1,
      });
      res.status(201).json(msg);
    } catch (err) {
      console.error("Create motivation error:", err);
      res.status(500).json({ message: "Failed to create motivation message" });
    }
  });

  app.put(api.motivation.update.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { message, active } = req.body;
      const msg = await storage.updateMotivationMessage(id, { message, active });
      res.json(msg);
    } catch (err) {
      console.error("Update motivation error:", err);
      res.status(500).json({ message: "Failed to update motivation message" });
    }
  });

  app.delete(api.motivation.delete.path, isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteMotivationMessage(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete motivation error:", err);
      res.status(500).json({ message: "Failed to delete motivation message" });
    }
  });

  // === Category Priorities ===
  app.get(api.categoryPriorities.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    let priorities = await storage.getCategoryPriorities(userId);
    if (priorities.length === 0) {
      const adminId = await getTeamAdminId(req);
      if (adminId !== userId) {
        priorities = await storage.getCategoryPriorities(adminId);
      }
    }
    res.json(priorities);
  });

  app.post(api.categoryPriorities.set.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { priorities } = req.body as { priorities: { categoryName: string; sortOrder: number }[] };
      const result = await storage.setCategoryPriorities(userId, priorities || []);
      res.json(result);
    } catch (err) {
      console.error("Set category priorities error:", err);
      res.status(500).json({ message: "Failed to set category priorities" });
    }
  });

  // === Excel Template & Import ===
  app.get(api.excel.template.path, isAuthenticated, requireRole("admin", "sku_manager"), (req, res) => {
    const wb = XLSX.utils.book_new();
    const headers = ["SKU", "Nama Produk", "Kategori", "Deskripsi", "Stok Awal", "Lokasi", "Satuan"];
    const exampleRows = [
      ["ITEM-001", "Contoh Produk", "Elektronik", "Deskripsi produk", 10, "toko", "pcs"],
      ["ITEM-002", "Produk Kedua", "Makanan", "", 25, "gudang", "dus, pack, pcs"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];
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
      const existingProductCodes = new Set(existingProducts.filter(p => p.productCode).map(p => p.productCode!.toLowerCase()));

      const headerRow = rows[0] || [];
      const firstHeader = String(headerRow[0] || "").trim().toLowerCase();
      const isGudangFormat = firstHeader === "product name" || firstHeader === "nama produk" || firstHeader === "product code" ||
        (headerRow.length >= 2 && String(headerRow[1] || "").trim().toLowerCase() === "product code");

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === "")) {
          continue;
        }

        if (isGudangFormat) {
          const name = String(row[0] || "").trim();
          const productCode = String(row[1] || "").trim();
          const satuanRaw = String(row[2] || "").trim();
          const category = String(row[3] || "").trim() || null;
          const subCategory = String(row[4] || "").trim() || null;

          if (!name) {
            errors.push({ row: i + 1, message: "Nama Produk wajib diisi" });
            skipped++;
            continue;
          }

          const sku = productCode || `GDG-${Date.now()}-${i}`;

          if (existingSkus.has(sku.toLowerCase())) {
            errors.push({ row: i + 1, message: `Produk "${name}" (kode: ${sku}) sudah ada` });
            skipped++;
            continue;
          }

          if (productCode && existingProductCodes.has(productCode.toLowerCase())) {
            errors.push({ row: i + 1, message: `Kode Produk "${productCode}" sudah ada` });
            skipped++;
            continue;
          }

          try {
            const product = await storage.createProduct({
              sku,
              name,
              category,
              description: null,
              currentStock: 0,
              photoUrl: null,
              userId: adminId,
              locationType: "gudang",
              subCategory,
              productCode: productCode || null,
            });
            existingSkus.add(sku.toLowerCase());
            if (productCode) existingProductCodes.add(productCode.toLowerCase());

            if (satuanRaw) {
              const unitNames = satuanRaw.split(",").map(s => s.trim()).filter(Boolean);
              for (let j = 0; j < unitNames.length; j++) {
                await storage.addProductUnit({
                  productId: product.id,
                  unitName: unitNames[j],
                  conversionToBase: 1,
                  baseUnit: unitNames[j],
                  sortOrder: j,
                });
              }
            }

            imported++;
          } catch (err) {
            errors.push({ row: i + 1, message: "Gagal menyimpan produk" });
            skipped++;
          }
        } else {
          const sku = String(row[0] || "").trim();
          const name = String(row[1] || "").trim();
          const category = String(row[2] || "").trim() || null;
          const description = String(row[3] || "").trim() || null;
          const currentStock = parseInt(String(row[4] || "0"), 10);
          const locationRaw = String(row[5] || "").trim().toLowerCase();
          const locationType = locationRaw === "gudang" ? "gudang" : "toko";
          const satuanRaw = String(row[6] || "").trim();

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

          const subCategoryRaw = String(row[7] || "").trim() || null;
          const productCodeRaw = String(row[8] || "").trim() || null;

          try {
            const product = await storage.createProduct({
              sku,
              name,
              category,
              description,
              currentStock,
              photoUrl: null,
              userId: adminId,
              locationType,
              subCategory: subCategoryRaw,
              productCode: productCodeRaw,
            });
            existingSkus.add(sku.toLowerCase());

            if (satuanRaw) {
              const unitNames = satuanRaw.split(",").map(s => s.trim()).filter(Boolean);
              for (let j = 0; j < unitNames.length; j++) {
                await storage.addProductUnit({
                  productId: product.id,
                  unitName: unitNames[j],
                  conversionToBase: 1,
                  baseUnit: unitNames[j],
                  sortOrder: j,
                });
              }
            }

            imported++;
          } catch (err) {
            errors.push({ row: i + 1, message: "Gagal menyimpan produk" });
            skipped++;
          }
        }
      }

      res.json({ imported, skipped, errors, format: isGudangFormat ? "gudang" : "standard" });
    } catch (err) {
      console.error("Excel import error:", err);
      res.status(500).json({ message: "Gagal memproses file Excel" });
    }
  });

  app.post(api.excel.gudangTemplate.path, isAuthenticated, requireRole("admin", "sku_manager"), (req, res) => {
    try {
      const wb = XLSX.utils.book_new();

      const headers = [
        "Kode Produk", "Nama Produk", "Kategori", "Sub Kategori",
        "Nama Satuan 1 (Terbesar)", "Nama Satuan 2 (Tengah)", "Nama Satuan 3 (Terkecil)",
        "Konversi Satuan 1 ke Satuan 2", "Konversi Satuan 2 ke Satuan 3",
        "Stok (Satuan 1)", "Stok (Satuan 2)", "Stok (Satuan 3)"
      ];
      const exampleRow = ["GDG-001", "Contoh Produk", "Makanan", "Snack", "Dus", "Pack", "Gram", 24, 500, 0, 0, 0];
      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      ws["!cols"] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 22 }, { wch: 22 }, { wch: 22 },
        { wch: 26 }, { wch: 26 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Data Produk Gudang");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=template_gudang.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err) {
      console.error("Gudang template error:", err);
      res.status(500).json({ message: "Gagal membuat template gudang" });
    }
  });

  app.post(api.excel.gudangExport.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const adminId = await getTeamAdminId(req);
      const productsWithUnits = await storage.getProductsWithPhotosAndUnits(adminId);
      const gudangProducts = productsWithUnits.filter(p => p.locationType === "gudang");

      const wb = XLSX.utils.book_new();

      const headers = [
        "Kode Produk", "Nama Produk", "Kategori", "Sub Kategori",
        "Nama Satuan 1 (Terbesar)", "Nama Satuan 2 (Tengah)", "Nama Satuan 3 (Terkecil)",
        "Konversi Satuan 1 ke Satuan 2", "Konversi Satuan 2 ke Satuan 3",
        "Stok (Satuan 1)", "Stok (Satuan 2)", "Stok (Satuan 3)"
      ];
      const rows = gudangProducts.map(p => {
        const units = p.units || [];
        const sortedUnits = [...units].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        let unit1Name = "";
        let unit2Name = "";
        let unit3Name = "";
        let conv1to2 = 0;
        let conv2to3 = 0;

        if (sortedUnits.length >= 3) {
          unit1Name = sortedUnits[0].unitName;
          unit2Name = sortedUnits[1].unitName;
          unit3Name = sortedUnits[2].unitName;
          conv1to2 = sortedUnits[0].conversionToBase || 0;
          conv2to3 = sortedUnits[1].conversionToBase || 0;
        } else if (sortedUnits.length === 2) {
          unit1Name = sortedUnits[0].unitName;
          unit2Name = sortedUnits[1].unitName;
          conv1to2 = sortedUnits[0].conversionToBase || 0;
        } else if (sortedUnits.length === 1) {
          unit1Name = sortedUnits[0].unitName;
        }

        return [
          p.productCode || p.sku,
          p.name,
          p.category || "",
          p.subCategory || "",
          unit1Name,
          unit2Name,
          unit3Name,
          conv1to2 || "",
          conv2to3 || "",
          0,
          0,
          0,
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 22 }, { wch: 22 }, { wch: 22 },
        { wch: 26 }, { wch: 26 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Data Produk Gudang");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=export_gudang.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err) {
      console.error("Gudang export error:", err);
      res.status(500).json({ message: "Gagal export gudang" });
    }
  });

  app.post(api.excel.gudangImport.path, isAuthenticated, requireRole("admin", "sku_manager"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);
      const wb = XLSX.read(fileBuffer, { type: "buffer" });

      const wsData = wb.Sheets["Data Produk Gudang"] || wb.Sheets[wb.SheetNames[0]];
      if (!wsData) {
        return res.status(400).json({ message: "Sheet 'Data Produk Gudang' tidak ditemukan" });
      }

      const dataRows: any[][] = XLSX.utils.sheet_to_json(wsData, { header: 1 });
      if (dataRows.length < 2) {
        return res.status(400).json({ message: "File kosong atau tidak memiliki data" });
      }

      const adminId = await getTeamAdminId(req);
      const existingProducts = await storage.getProducts(adminId);
      const existingSkus = new Set(existingProducts.map(p => p.sku.toLowerCase()));
      const existingProductCodes = new Set(existingProducts.filter(p => p.productCode).map(p => p.productCode!.toLowerCase()));

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0 || row.every((cell: any) => cell === undefined || cell === null || cell === "")) {
          continue;
        }

        const productCode = String(row[0] || "").trim();
        const name = String(row[1] || "").trim();
        const category = String(row[2] || "").trim() || null;
        const subCategory = String(row[3] || "").trim() || null;
        const unit1Name = String(row[4] || "").trim();
        const unit2Name = String(row[5] || "").trim();
        const unit3Name = String(row[6] || "").trim();
        const conv1to2 = parseFloat(String(row[7] || "0")) || 0;
        const conv2to3 = parseFloat(String(row[8] || "0")) || 0;
        const stok1 = parseFloat(String(row[9] || "0")) || 0;
        const stok2 = parseFloat(String(row[10] || "0")) || 0;
        const stok3 = parseFloat(String(row[11] || "0")) || 0;

        if (!name) {
          errors.push({ row: i + 1, message: "Nama Produk wajib diisi" });
          skipped++;
          continue;
        }

        const sku = productCode || `GDG-${Date.now()}-${i}`;

        if (existingSkus.has(sku.toLowerCase())) {
          errors.push({ row: i + 1, message: `Produk "${name}" (kode: ${sku}) sudah ada` });
          skipped++;
          continue;
        }

        if (productCode && existingProductCodes.has(productCode.toLowerCase())) {
          errors.push({ row: i + 1, message: `Kode Produk "${productCode}" sudah ada` });
          skipped++;
          continue;
        }

        try {
          let totalBase = stok3;
          if (conv2to3 > 0) {
            totalBase += stok2 * conv2to3;
          } else {
            totalBase += stok2;
          }
          if (conv1to2 > 0 && conv2to3 > 0) {
            totalBase += stok1 * conv1to2 * conv2to3;
          } else if (conv1to2 > 0) {
            totalBase += stok1 * conv1to2;
          } else {
            totalBase += stok1;
          }

          const product = await storage.createProduct({
            sku,
            name,
            category,
            description: null,
            currentStock: totalBase,
            photoUrl: null,
            userId: adminId,
            locationType: "gudang",
            subCategory,
            productCode: productCode || null,
          });
          existingSkus.add(sku.toLowerCase());
          if (productCode) existingProductCodes.add(productCode.toLowerCase());

          const unitsToCreate: { unitName: string; conversionToBase: number; baseUnit: string; sortOrder: number }[] = [];

          if (unit1Name && unit2Name && conv1to2 > 0) {
            unitsToCreate.push({
              unitName: unit1Name,
              conversionToBase: conv1to2,
              baseUnit: unit2Name,
              sortOrder: 0,
            });
          } else if (unit1Name && !unit2Name) {
            unitsToCreate.push({
              unitName: unit1Name,
              conversionToBase: 1,
              baseUnit: unit1Name,
              sortOrder: 0,
            });
          }

          if (unit2Name && unit3Name && conv2to3 > 0) {
            unitsToCreate.push({
              unitName: unit2Name,
              conversionToBase: conv2to3,
              baseUnit: unit3Name,
              sortOrder: 1,
            });
          } else if (unit2Name && !unit3Name) {
            unitsToCreate.push({
              unitName: unit2Name,
              conversionToBase: 1,
              baseUnit: unit2Name,
              sortOrder: unit1Name ? 1 : 0,
            });
          }

          if (unit3Name) {
            unitsToCreate.push({
              unitName: unit3Name,
              conversionToBase: 1,
              baseUnit: unit3Name,
              sortOrder: unitsToCreate.length,
            });
          }

          for (const unit of unitsToCreate) {
            await storage.addProductUnit({
              productId: product.id,
              ...unit,
            });
          }

          imported++;
        } catch (err) {
          errors.push({ row: i + 1, message: "Gagal menyimpan produk" });
          skipped++;
        }
      }

      res.json({ imported, skipped, errors, format: "gudang-3-tingkat" });
    } catch (err) {
      console.error("Gudang import error:", err);
      res.status(500).json({ message: "Gagal memproses file Excel gudang" });
    }
  });

  app.get(api.excel.export.path, isAuthenticated, requireRole("admin", "sku_manager"), async (req, res) => {
    try {
      const adminId = await getTeamAdminId(req);
      const productsWithUnits = await storage.getProductsWithPhotosAndUnits(adminId);

      const wb = XLSX.utils.book_new();
      const headers = ["SKU", "Nama Produk", "Kategori", "Deskripsi", "Stok", "Lokasi", "Satuan", "Sub Kategori", "Kode Produk"];
      const rows = productsWithUnits.map(p => [
        p.sku,
        p.name,
        p.category || "",
        p.description || "",
        p.currentStock,
        p.locationType || "toko",
        p.units && p.units.length > 0
          ? p.units.sort((a, b) => a.sortOrder - b.sortOrder).map(u => u.unitName).join(", ")
          : "",
        p.subCategory || "",
        p.productCode || "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, "Produk");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=produk_export.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err) {
      console.error("Excel export error:", err);
      res.status(500).json({ message: "Gagal export Excel" });
    }
  });

  return httpServer;
}
