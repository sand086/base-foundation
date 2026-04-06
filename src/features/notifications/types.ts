export interface UserNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  event_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}
