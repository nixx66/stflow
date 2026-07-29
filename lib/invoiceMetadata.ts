import {
  encodeAbiParameters,
  keccak256,
  type Address,
  type Hex
} from "viem";

export type InvoiceMetadata = {
  customerName: string;
  title: string;
  description: string;
  memo: string;
};

export function canonicalInvoiceMetadata(metadata: InvoiceMetadata) {
  return JSON.stringify({
    customerName: metadata.customerName.trim(),
    title: metadata.title.trim(),
    description: metadata.description.trim(),
    memo: metadata.memo.trim()
  });
}

export function hashInvoiceMetadata(metadata: InvoiceMetadata): Hex {
  return keccak256(
    new TextEncoder().encode(canonicalInvoiceMetadata(metadata))
  );
}

export function invoiceIdFromReference(
  merchant: Address,
  referenceId: Hex
): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "bytes32" }],
      [merchant, referenceId]
    )
  );
}
