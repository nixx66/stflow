import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalInvoiceMetadata,
  hashInvoiceMetadata,
  invoiceIdFromReference
} from "../lib/invoiceMetadata.ts";

const MERCHANT = "0x1111111111111111111111111111111111111111";
const OTHER_MERCHANT = "0x2222222222222222222222222222222222222222";
const REFERENCE_ID =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("canonicalizes metadata independently of object insertion order", () => {
  const first = {
    customerName: "  Builder team ",
    title: " July invoice  ",
    description: " Arc settlement ",
    memo: " Thanks "
  };
  const second = {
    memo: " Thanks ",
    description: " Arc settlement ",
    title: " July invoice  ",
    customerName: "  Builder team "
  };

  assert.equal(canonicalInvoiceMetadata(first), canonicalInvoiceMetadata(second));
  assert.equal(hashInvoiceMetadata(first), hashInvoiceMetadata(second));
});

test("trims every metadata field in canonical JSON", () => {
  assert.equal(
    canonicalInvoiceMetadata({
      customerName: "  Builder team ",
      title: "\tJuly invoice",
      description: "Arc settlement\n",
      memo: " Thanks "
    }),
    '{"customerName":"Builder team","title":"July invoice","description":"Arc settlement","memo":"Thanks"}'
  );
});

test("matches the canonical metadata hash vector", () => {
  assert.equal(
    hashInvoiceMetadata({
      customerName: "  Builder team ",
      title: "\tJuly invoice",
      description: "Arc settlement\n",
      memo: " Thanks "
    }),
    "0x2a3afda7234a6ff6cf4704aedd9f434df7e6c4d3c65a27c0c86bc11613169d58"
  );
});

test("derives a stable bytes32 invoice id with Solidity ABI encoding", () => {
  assert.equal(
    invoiceIdFromReference(MERCHANT, REFERENCE_ID),
    "0x6d8711716258cba4c4e85649e2cddb2481ca6f47e0a8003e50791f4be8d5dea8"
  );
});

test("isolates identical references across merchants", () => {
  assert.notEqual(
    invoiceIdFromReference(MERCHANT, REFERENCE_ID),
    invoiceIdFromReference(OTHER_MERCHANT, REFERENCE_ID)
  );
});
