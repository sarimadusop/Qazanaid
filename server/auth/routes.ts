import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./authLogic";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { userRoles } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, firstName, lastName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password wajib diisi" });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: "Username minimal 3 karakter" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password minimal 6 karakter" });
      }

      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await authStorage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        adminId: null,
      });

      await db.insert(userRoles).values({
        userId: user.id,
        role: "admin",
      });

      (req.session as any).userId = user.id;

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Gagal mendaftar" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password wajib diisi" });
      }

      const user = await authStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Username atau password salah" });
      }

      (req.session as any).userId = user.id;

      const { password: _, ...safeUser } = user;

      // Ensure session is saved to DB before sending response
      // This prevents race conditions on the subsequent /api/auth/user call
      req.session.save((err) => {
        if (err) {
          console.error("[auth] Session save error:", err);
          return res.status(500).json({ message: "Gagal menyimpan sesi" });
        }
        console.log(`[auth] Login berhasil: ${username}`);
        res.json(safeUser);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Gagal login" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { firstName, lastName, username, currentPassword, newPassword } = req.body;

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updates: Record<string, any> = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;

      if (username && username !== user.username) {
        if (username.length < 3) {
          return res.status(400).json({ message: "Username minimal 3 karakter" });
        }
        const existing = await authStorage.getUserByUsername(username);
        if (existing) {
          return res.status(400).json({ message: "Username sudah digunakan" });
        }
        updates.username = username;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Password lama wajib diisi" });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
          return res.status(400).json({ message: "Password lama salah" });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Password baru minimal 6 karakter" });
        }
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      updates.updatedAt = new Date();

      const updated = await authStorage.updateUser(userId, updates);
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Gagal memperbarui profil" });
    }
  });

  app.post("/api/auth/create-user", isAuthenticated, async (req, res) => {
    try {
      const adminId = (req.session as any).userId;
      const adminRole = await db.select().from(userRoles).where(
        eq(userRoles.userId, adminId)
      );
      if (!adminRole[0] || adminRole[0].role !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang bisa membuat user" });
      }

      const { username, password, firstName, lastName, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password wajib diisi" });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: "Username minimal 3 karakter" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password minimal 6 karakter" });
      }

      if (!["sku_manager", "stock_counter"].includes(role)) {
        return res.status(400).json({ message: "Role harus sku_manager atau stock_counter" });
      }

      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await authStorage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        adminId,
      });

      await db.insert(userRoles).values({
        userId: user.id,
        role,
      });

      const { password: _, ...safeUser } = user;
      res.status(201).json({ ...safeUser, role });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Gagal membuat user" });
    }
  });

  app.post("/api/auth/reset-password", isAuthenticated, async (req, res) => {
    try {
      const adminId = (req.session as any).userId;
      const adminRole = await db.select().from(userRoles).where(
        eq(userRoles.userId, adminId)
      );
      if (!adminRole[0] || adminRole[0].role !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang bisa reset password" });
      }

      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({ message: "User ID dan password baru wajib diisi" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password baru minimal 6 karakter" });
      }

      const targetUser = await authStorage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      if (targetUser.adminId !== adminId) {
        return res.status(403).json({ message: "Anda hanya bisa reset password anggota tim Anda" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await authStorage.updateUser(userId, { password: hashedPassword, updatedAt: new Date() });

      res.json({ message: "Password berhasil direset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Gagal mereset password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Gagal logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
}
