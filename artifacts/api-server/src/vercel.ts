import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app";

// Handler serverless da Vercel: o app Express é, por si só, um (req, res) handler.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
