import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const activityCategories = {
  coffee: "Kahve & sohbet",
  games: "Oyun",
  walk: "Yürüyüş",
} as const;
export type ActivityCategory = keyof typeof activityCategories;
const activitySchemaBase = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["coffee", "games", "walk"]),
  venue_name: z.string(),
  latitude: z.number().min(-85).max(85),
  longitude: z.number().min(-180).max(180),
  starts_at: z.string(),
  ends_at: z.string(),
  capacity: z.number(),
  attending: z.number(),
  host_name: z.string(),
  is_host: z.boolean(),
  my_status: z
    .enum(["host", "pending", "accepted", "declined", "left"])
    .nullable(),
});
export type Activity = Required<z.infer<typeof activitySchemaBase>>;
// This project's TS config disables strictNullChecks; preserve required runtime fields in inference.
export const activitySchema = activitySchemaBase as z.ZodType<Activity>;
export const memberSchema = z.object({
  user_id: z.string().uuid().nullable(),
  name: z.string(),
  status: z.enum(["pending", "accepted"]),
});
export const activityMessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  name: z.string(),
  created_at: z.string(),
  is_own: z.boolean(),
});
type Rpc =
  | "social_activities_available"
  | "list_social_activities"
  | "create_social_activity"
  | "manage_social_activity"
  | "get_social_activity_members"
  | "read_social_activity_chat"
  | "send_social_activity_message"
  | "report_social_activity"
  | "admin_social_activities";
// New RPCs are isolated here until the generated Supabase schema is refreshed.
const rpc = supabase.rpc as unknown as (
  name: Rpc,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;
export async function activityRpc<T>(
  name: Rpc,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await rpc(name, args);
  if (error) throw new Error(activityError(error.message));
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new Error("Aktivite bilgileri okunamadı. Tekrar deneyebilirsin.");
  return parsed.data;
}
export function activityError(message: string) {
  if (message.includes("Activity full"))
    return "Son yer dolmuş. Başka bir aktiviteye bakabilirsin.";
  if (message.includes("Daily activity limit"))
    return "Bir günde en fazla 3 aktivite oluşturabilirsin.";
  if (message.includes("Daily request limit"))
    return "Bugünkü katılım isteği sınırına ulaştın.";
  if (message.includes("Request declined"))
    return "Bu aktivitedeki isteğin kabul edilmedi.";
  if (message.includes("Invalid activity time"))
    return "Başlangıç ileri bir saat ve önümüzdeki 30 gün içinde olmalı.";
  if (message.includes("Message limit"))
    return "Çok hızlı mesaj gönderiyorsun. Biraz bekleyip tekrar dene.";
  if (
    /unavailable|not allowed|Member unavailable|Request changed/.test(message)
  )
    return "Bu işlem şu an kullanılamıyor. Aktiviteyi yenileyip tekrar dene.";
  return "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar deneyebilirsin.";
}
export function activityTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}
export interface ActivityDraft {
  title: string;
  description: string;
  category: ActivityCategory;
  venue_name: string;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
}
export function validateActivityDraft(
  d: ActivityDraft,
  now = Date.now(),
): string | null {
  if (d.title.trim().length < 5 || d.title.trim().length > 80)
    return "Aktivite adı 5–80 karakter olmalı.";
  if (d.description.trim().length < 10 || d.description.trim().length > 1000)
    return "Planını 10–1000 karakterle anlat.";
  if (d.venue_name.trim().length < 3 || d.venue_name.trim().length > 120)
    return "Buluşacağınız kamusal mekanın adını yaz.";
  if (
    d.latitude === null ||
    d.longitude === null ||
    !Number.isFinite(d.latitude) ||
    !Number.isFinite(d.longitude) ||
    Math.abs(d.latitude) > 85 ||
    Math.abs(d.longitude) > 180
  )
    return "Haritada buluşma noktasını seç.";
  const start = Date.parse(d.starts_at),
    end = Date.parse(d.ends_at);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start <= now ||
    start > now + 30 * 86400000 ||
    end <= start ||
    end - start > 8 * 3600000
  )
    return "Önümüzdeki 30 gün içinde, en fazla 8 saat süren bir plan seç.";
  if (!Number.isInteger(d.capacity) || d.capacity < 2 || d.capacity > 20)
    return "Kişi sınırı sen dahil 2–20 arasında olmalı.";
  return null;
}
