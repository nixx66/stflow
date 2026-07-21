import { redirect } from "next/navigation";

export default function CreateInvoiceRedirectPage() {
  redirect("/invoice/new");
}
