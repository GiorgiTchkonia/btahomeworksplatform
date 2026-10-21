import { supabase } from './supabase';
import { CollegeGroup } from '@/types';

export const programmeLabel = (type: string) => type === 'INTEGRATED' ? 'ინტეგრირებული' : 'არაინტეგრირებული';
export const educationOptions = ['IX კლასი', 'X კლასი', 'XI კლასი', 'XII კლასი', 'სკოლა დასრულებული აქვს'];

export async function getCollegeGroups(): Promise<CollegeGroup[]> {
  const { data, error } = await supabase.from('college_groups').select('*').order('code');
  if (error) throw error;
  return data || [];
}

export async function saveCollegeGroup(group: Partial<CollegeGroup>, teacherIds: string[]) {
  const { error } = await supabase.rpc('save_college_group', {
    p_id: group.id || null, p_code: group.code?.trim(), p_type: group.programme_type,
    p_programme: group.programme_name?.trim() || '', p_active: group.active ?? true, p_teachers: teacherIds,
  });
  if (error) throw error;
}

export async function assignStudentsToGroup(groupId: string, studentIds: string[]) {
  const ids = [...new Set(studentIds)];
  if (!groupId || !ids.length) throw new Error('აირჩიეთ ჯგუფი და სტუდენტები');
  const { data, error } = await supabase.from('profiles').update({ group_id: groupId }).eq('role','STUDENT').in('id',ids).select('id');
  if (error) throw error;
  if (data?.length !== ids.length) throw new Error('ყველა სტუდენტის დამატება ვერ დადასტურდა. განაახლეთ სია.');
}
