import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  insertUserSchema,
  loginSchema,
  updateProfileSchema,
} from "../shared/schema";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
} from "./auth";

const rapidApiStudioTools = [
  {
    id: "requests",
    name: "Requests",
    description:
      "Zespołowy klient żądań API do budowania grup zapytań, parametryzacji środowisk i pracy na gałęziach.",
    benefits: [
      "Tworzenie grup żądań dla różnych przypadków użycia.",
      "Łatwa parametryzacja pod różne środowiska.",
      "Współpraca zespołowa z użyciem gałęzi przed mergem do głównej wersji.",
    ],
  },
  {
    id: "testing",
    name: "RapidAPI Testing",
    description:
      "Narzędzie do przekształcania zapytań API w testy kontraktowe i monitorujące.",
    benefits: [
      "Weryfikacja kontraktu API (np. OpenAPI / GraphQL schema).",
      "Automatyczne testy regresji przy zmianach API.",
      "Monitoring stabilności API w czasie.",
    ],
  },
  {
    id: "hub-listing",
    name: "Hub Listing",
    description:
      "Moduł do opisu i publikacji API, zarządzania planami oraz zapraszania deweloperów i zespołów.",
    benefits: [
      "Tworzenie czytelnej dokumentacji i definicji API.",
      "Publikacja API w RapidAPI Hub.",
      "Zarządzanie planami i dostępem konsumentów.",
    ],
  },
  {
    id: "analytics",
    name: "Analityka",
    description:
      "Panel analityczny do monitorowania ruchu, błędów i opóźnień na poziomie endpointów i konsumentów.",
    benefits: [
      "Analiza użycia API per endpoint lub konsument.",
      "Wykrywanie błędów i skoków opóźnień.",
      "Podejmowanie decyzji opartych na danych telemetrycznych.",
    ],
  },
  {
    id: "settings",
    name: "Ustawienia",
    description:
      "Ustawienia projektu API, w tym przenoszenie własności projektu i usuwanie API.",
    benefits: [
      "Przenoszenie projektu między kontami i zespołami.",
      "Centralne zarządzanie konfiguracją projektu.",
      "Kontrolowane usuwanie API.",
    ],
  },
  {
    id: "my-apis-inbox",
    name: "My APIs Inbox",
    description:
      "Jedna skrzynka odbiorcza dla wiadomości, dyskusji i ogłoszeń związanych ze wszystkimi API dostawcy.",
    benefits: [
      "Wspólne miejsce do komunikacji z użytkownikami API.",
      "Obsługa wiadomości dla API osobistych i zespołowych.",
      "Lepsza organizacja wsparcia deweloperów.",
    ],
  },
] as const;

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/rapidapi/studio", (_req, res) => {
    res.json({
      name: "RapidAPI Studio Toolkit API",
      description:
        "Ściśle zintegrowany zestaw narzędzi dla dostawców API do budowania, testowania, publikowania i utrzymania API.",
      supportedApiTypes: ["REST", "SOAP", "GraphQL"],
      toolsCount: rapidApiStudioTools.length,
      tools: rapidApiStudioTools,
    });
  });

  app.get("/api/rapidapi/studio/tools", (_req, res) => {
    res.json(rapidApiStudioTools);
  });

  app.get("/api/rapidapi/studio/tools/:id", (req, res) => {
    const tool = rapidApiStudioTools.find((item) => item.id === req.params.id);

    if (!tool) {
      return res.status(404).json({
        message: "Nie znaleziono narzędzia o podanym identyfikatorze.",
      });
    }

    return res.json(tool);
  });

  // Authentication routes

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          ...validatedData,
          password: hashedPassword,
        })
        .returning();

      // Generate token
      const token = generateToken(newUser.id);

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(
        validatedData.password,
        user.password,
      );

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate token
      const token = generateToken(user.id);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.userId!),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile routes

  // Get user profile
  app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.userId!),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/profile", authenticateToken, async (req, res) => {
    try {
      const validatedData = updateProfileSchema.parse(req.body);

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId!))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
