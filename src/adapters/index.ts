import type { NotificationEvent, DownstreamTarget } from "../types";

export interface DownstreamAdapter {
  name: string;
  buildRequest(event: NotificationEvent, target: DownstreamTarget): Request;
}
