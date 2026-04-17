import { NextResponse } from "next/server";

/**
 * Allowed origins for cross-origin requests from DataMaker frontend.
 */
const ALLOWED_ORIGINS = [
  "http://localhost:4000",
  "http://127.0.0.1:4000",
];

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.join(", "),
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export function corsResponse(data: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
