import type { DashboardMetrics } from "@/types/analytics.type";

type SSEEventType = "connected" | "dashboard-update";

interface SSEMessage {
  type: SSEEventType;
  payload?: Partial<DashboardMetrics>;
  message?: string;
  timestamp?: string;
}

export const eventsService = {
  // Returns a cleanup function — call it on component unmount
  subscribeDashboard: (
    onMessage: (data: SSEMessage) => void,
    onError?: (err: Event) => void
  ): (() => void) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const token = localStorage.getItem("token");

    // EventSource doesn't support headers natively — pass token as query param
    const url = `${baseUrl}/events/dashboard-stream?token=${token}`;
    const source = new EventSource(url);

    source.onmessage = (e) => {
      try {
        const data: SSEMessage = JSON.parse(e.data);
        onMessage(data);
      } catch {
     
      }
    };

    source.onerror = (err) => {
      onError?.(err);
    };

    return () => source.close();
  },
};