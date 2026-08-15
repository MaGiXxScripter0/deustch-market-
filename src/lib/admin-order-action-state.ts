export type AdminOrderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_ADMIN_ORDER_ACTION_STATE: AdminOrderActionState = {
  status: "idle",
  message: "",
};

export function mapAdminOrderError(message: string): string {
  if (message.includes("All order items must be picked first")) {
    return "Kommissionieren Sie zuerst alle Positionen.";
  }
  if (message.includes("Invalid order status transition")) {
    return "Dieser Statuswechsel ist nicht erlaubt.";
  }
  if (message.includes("Order item cannot be changed")) {
    return "Diese Position kann im aktuellen Status nicht geändert werden.";
  }
  if (message.includes("Admin access required")) {
    return "Ihre Sitzung hat keine Administratorberechtigung.";
  }
  return "Die Änderung konnte nicht gespeichert werden.";
}
