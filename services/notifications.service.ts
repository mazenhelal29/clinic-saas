import { createClient } from '@/lib/supabase/server';
import type { Notification, NotificationType } from '@/types';

export async function getNotifications(clinicId: string, userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllAsRead(clinicId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .eq('read', false);
}

export async function createNotification(
  clinicId: string,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  titleAr?: string,
  bodyAr?: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from('notifications').insert({
    clinic_id: clinicId,
    user_id: userId,
    type,
    title,
    title_ar: titleAr,
    body,
    body_ar: bodyAr,
    read: false,
  });
}

export async function getUnreadCount(clinicId: string, userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .eq('read', false);
  return count ?? 0;
}
