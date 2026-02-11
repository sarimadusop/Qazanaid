import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { userRoles } from "@shared/schema";
import { users } from "@shared/models/auth";

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
      });

      const allUsers = await db.select().from(users);
      const isFirstUser = allUsers.length === 1;
      await db.insert(userRoles).values({
        userId: user.id,
        role: isFirstUser ? "admin" : "stock_counter",
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
      res.json(safeUser);
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
