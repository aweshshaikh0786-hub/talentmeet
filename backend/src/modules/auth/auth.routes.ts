import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AppDataSource } from "../../data-source";
import { User } from "../../entities/User";
import { RefreshToken } from "../../entities/RefreshToken";

const router = Router();
const userRepo = AppDataSource.getRepository(User);
const refreshRepo = AppDataSource.getRepository(RefreshToken);

function signAccess(user: User) {
  return jwt.sign({ userId: user.id, role: user.role }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: "15m" });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email & password required" });
    const existing = await userRepo.findOneBy({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = userRepo.create({ name, email, passwordHash, role: role || "user" });
    await userRepo.save(user);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email & password required" });
    const user = await userRepo.findOneBy({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccess(user);

    // Refresh token
    const refreshRaw = crypto.randomBytes(64).toString("hex");
    const refreshHash = crypto.createHash("sha256").update(refreshRaw).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const rt = refreshRepo.create({ user, tokenHash: refreshHash, expiresAt });
    await refreshRepo.save(rt);

    // set cookie
    res.cookie("refreshToken", refreshRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const raw = req.cookies.refreshToken;
    if (!raw) return res.status(401).json({ message: "No refresh token" });
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const tokenRecord = await refreshRepo.findOne({ where: { tokenHash: hash }, relations: ["user"] });
    if (!tokenRecord) return res.status(401).json({ message: "Invalid token" });
    if (tokenRecord.revoked) return res.status(401).json({ message: "Token revoked" });
    if (new Date() > tokenRecord.expiresAt) return res.status(401).json({ message: "Token expired" });

    // rotate refresh token
    tokenRecord.revoked = true;
    await refreshRepo.save(tokenRecord);

    const refreshRaw = crypto.randomBytes(64).toString("hex");
    const refreshHash = crypto.createHash("sha256").update(refreshRaw).digest("hex");
    const newRT = refreshRepo.create({
      user: tokenRecord.user,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await refreshRepo.save(newRT);

    // new cookie
    res.cookie("refreshToken", refreshRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = signAccess(tokenRecord.user);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/logout", async (req, res) => {
  try {
    const raw = req.cookies.refreshToken;
    if (raw) {
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      const tokenRecord = await refreshRepo.findOne({ where: { tokenHash: hash } });
      if (tokenRecord) {
        tokenRecord.revoked = true;
        await refreshRepo.save(tokenRecord);
      }
    }
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;
