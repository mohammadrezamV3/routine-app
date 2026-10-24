import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const findUnique = vi.fn();
const create = vi.fn();
const deleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    requestReceipt: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      create: (...a: unknown[]) => create(...a),
      deleteMany: (...a: unknown[]) => deleteMany(...a),
    },
  },
}));

import { withIdempotency, readRequestId } from "@/lib/idempotency";
import { REQUEST_ID_HEADER } from "@/lib/offline/types";

const KEY = "3f1c9a52-8b7e-4c1d-9a55-0d2e7c4b1a10";
const mk = (key?: string) =>
  new Request("http://x/api", { method: "POST", headers: key ? { [REQUEST_ID_HEADER]: key } : {} });

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
  deleteMany.mockReset().mockResolvedValue({ count: 0 });
});

describe("withIdempotency", () => {
  it("runs the handler without touching the db when header is absent", async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const res = await withIdempotency(mk(), "u1", "r", handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores an invalid key", async () => {
    expect(readRequestId(mk("bad key!"))).toBeNull();
    expect(readRequestId(mk("a".repeat(65)))).toBeNull();
    expect(readRequestId(mk(KEY))).toBe(KEY);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    await withIdempotency(mk("bad key!"), "u1", "r", handler);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("stores the response on first call", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({});
    const handler = vi.fn(async () => NextResponse.json({ ok: true, entry: { id: "e1" } }));
    const res = await withIdempotency(mk(KEY), "u1", "trade.entries", handler);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, entry: { id: "e1" } });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: "u1", key: KEY, route: "trade.entries", status: 200, response: { ok: true, entry: { id: "e1" } } });
  });

  it("returns the stored response on repeat without running the handler", async () => {
    findUnique.mockResolvedValue({ status: 200, response: { ok: true, entry: { id: "e1" } } });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const res = await withIdempotency(mk(KEY), "u1", "r", handler);
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, entry: { id: "e1" } });
    expect(findUnique.mock.calls[0][0].where).toEqual({ userId_key: { userId: "u1", key: KEY } });
  });

  it("strips long strings but keeps ids when the body is large", async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValue({});
    const entry = { id: "e1", images: [{ id: "i1", caption: "c", dataUrl: "d".repeat(100 * 1024) }] };
    await withIdempotency(mk(KEY), "u1", "r", async () => NextResponse.json({ ok: true, entry }));
    expect(create.mock.calls[0][0].data.response).toEqual({
      ok: true, entry: { id: "e1", images: [{ id: "i1", caption: "c", dataUrl: null }] },
    });
  });

  it("repeats with duplicate marker when body is still too large", async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValue({});
    const big = Array.from({ length: 4000 }, (_, i) => ({ id: `id-${i}-${"y".repeat(20)}` }));
    await withIdempotency(mk(KEY), "u1", "r", async () => NextResponse.json({ big }));
    expect(create.mock.calls[0][0].data.response).toBeUndefined();
    findUnique.mockResolvedValueOnce({ status: 200, response: null });
    const handler = vi.fn();
    const res = await withIdempotency(mk(KEY), "u1", "r", handler);
    expect(handler).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
  });

  it("does not store non-2xx responses", async () => {
    findUnique.mockResolvedValue(null);
    const res = await withIdempotency(mk(KEY), "u1", "r", async () => NextResponse.json({ error: "x" }, { status: 400 }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("on unique violation returns the winner's receipt", async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
    findUnique.mockResolvedValueOnce({ status: 200, response: { ok: true, entry: { id: "winner" } } });
    const res = await withIdempotency(mk(KEY), "u1", "r", async () => NextResponse.json({ ok: true, entry: { id: "loser" } }));
    expect(await res.json()).toEqual({ ok: true, entry: { id: "winner" } });
  });

  it("keeps the success response if saving the receipt fails", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(new Error("db down"));
    const res = await withIdempotency(mk(KEY), "u1", "r", async () => NextResponse.json({ ok: true }));
    expect(res.status).toBe(200);
  });
});
