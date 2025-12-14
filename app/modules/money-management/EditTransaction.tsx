import React from "react";
import { useLocalSearchParams } from "expo-router";
import TransactionAdd from "./TransactionAdd";

/**
 * EditTransaction
 * ----------------
 * Thin wrapper around TransactionAdd.
 *
 * WHY:
 * - Keeps the SAME UI, styles, and features as Add
 * - Loads previous transaction data using editId
 * - Prevents code duplication
 * - Safe for future changes
 */
export default function EditTransaction() {
  const params = useLocalSearchParams<{ txId?: string }>();

  const editId = params?.txId ? String(params.txId) : undefined;

  return <TransactionAdd forcedEditId={editId} />;
}
