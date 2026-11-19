import { createHmac } from "node:crypto";
import { parseExternalRef, verifyWebhookSignature, externalRef } from "@/lib/server/mercadopago";

vi.mock("server-only", () => ({}));

const secret = "segredo-de-teste";
function sign(id: string, req: string, ts: string) {
  return createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");
}

describe("Mercado Pago", () => {
  it("aceita webhook com assinatura válida", () => {
    const v1 = sign("123456", "req-1", "1700000000");
    expect(
      verifyWebhookSignature({
        signature: `ts=1700000000,v1=${v1}`,
        requestId: "req-1",
        dataId: "123456",
        secret,
      }),
    ).toBe(true);
  });
  it("rejeita assinatura falsa, ausente ou de outro pagamento", () => {
    const v1 = sign("123456", "req-1", "1700000000");
    expect(
      verifyWebhookSignature({
        signature: `ts=1700000000,v1=${"0".repeat(64)}`,
        requestId: "req-1",
        dataId: "123456",
        secret,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ signature: null, requestId: "req-1", dataId: "123456", secret }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        signature: `ts=1700000000,v1=${v1}`,
        requestId: "req-1",
        dataId: "999999",
        secret,
      }),
    ).toBe(false);
  });
  it("referência externa só aceita planos pagos válidos", () => {
    const uid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(parseExternalRef(externalRef(uid, "plus", "anual"))).toEqual({
      userId: uid,
      plan: "plus",
      period: "anual",
    });
    expect(parseExternalRef(`${uid}|gratis|anual`)).toBeNull();
    expect(parseExternalRef(`x|plus|anual`)).toBeNull();
    expect(parseExternalRef(null)).toBeNull();
  });
});
