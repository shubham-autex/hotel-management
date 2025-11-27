import mongoose from "mongoose";

type MongooseCache = {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
};

const MONGODB_URI = process.env.MONGODB_URI as string;
const MONGODB_DB = process.env.MONGODB_DB as string;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalForMongoose._mongoose ?? (globalForMongoose._mongoose = { conn: null, promise: null });

export async function connectToDatabase(): Promise<mongoose.Connection> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB
      })
      .then((m) => m.connection);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}


