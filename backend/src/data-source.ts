import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "./entities/user";
import { RefreshToken } from "./entities/RefreshToken";
import { Meeting } from "./entities/Meeting";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: +(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "talentmeet",
  entities: [User, RefreshToken, Meeting],
  synchronize: true, // only dev; for prod use migrations
});
