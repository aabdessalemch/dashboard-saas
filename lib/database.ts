import { supabase } from './supabase';

export interface Widget {
  id: string;
  project_id: string;
  user_id: string;
  widget_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  data: any;
  created_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  folder_id?: string | null;
  position?: number;
  created_at?: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at?: string;
  updated_at?: string;
}

// ==================== PROJECTS ====================

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data || [];
}

export async function getSharedProjects(userId: string): Promise<(Project & { permission: 'viewer' | 'editor'; owner_email: string })[]> {
  try {
    console.log('🔍 getSharedProjects called with userId:', userId);
    // Get user's email first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    console.log('🔍 profile result:', { profile, profileError });

    if (profileError || !profile?.email) {
      console.log('Profile not found or error:', profileError?.message);
      return [];
    }

    // Get shares by BOTH user ID and email (belt and suspenders approach)
    const { data: shares, error: sharesError } = await supabase
      .from('project_shares')
      .select('*')
      .or(`shared_with_id.eq.${userId},shared_with_email.ilike.${profile.email}`);

    console.log('🔍 shares result:', { shares, sharesError });

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
      return [];
    }

    if (!shares || shares.length === 0) {
      return [];
    }

    // Get all project details
    const projectIds = shares.map(s => s.project_id);
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds);

    console.log('🔍 projects result:', { projects, projectsError });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return [];
    }

    // Combine and return
    return shares.map(share => {
      const project = projects?.find(p => p.id === share.project_id);
      if (!project) return null;
      
      return {
        id: project.id,
        user_id: project.user_id,
        name: project.name,
        created_at: project.created_at,
        folder_id: project.folder_id,
        position: project.position,
        permission: share.permission as 'viewer' | 'editor',
        owner_email: share.shared_with_email
      };
    }).filter(Boolean) as (Project & { permission: 'viewer' | 'editor'; owner_email: string })[];
  } catch (err) {
    console.error('Exception in getSharedProjects:', err);
    return [];
  }
}
export async function createProject(userId: string, name: string, folderId?: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ 
      user_id: userId, 
      name,
      folder_id: folderId || null,
      position: 0
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return null;
  }

  return data;
}

export async function updateProject(projectId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project:', error);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
  }
}

export async function moveProjectToFolder(projectId: string, folderId: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({ folder_id: folderId })
    .eq('id', projectId);

  if (error) {
    console.error('Error moving project:', error);
    return false;
  }

  return true;
}

export async function updateProjectPosition(projectId: string, position: number): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({ position })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project position:', error);
    return false;
  }

  return true;
}

// ==================== FOLDERS ====================

export async function getFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }

  return data || [];
}

export async function createFolder(userId: string, name: string, color: string = '#8b5cf6'): Promise<Folder | null> {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ 
      user_id: userId, 
      name,
      color,
      position: 0
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    return null;
  }

  return data;
}

export async function updateFolder(folderId: string, updates: { name?: string; color?: string }): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .select();

    if (error) {
      console.error('Error updating folder:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in updateFolder:', err);
    return false;
  }
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  const { error: moveError } = await supabase
    .from('projects')
    .update({ folder_id: null })
    .eq('folder_id', folderId);

  if (moveError) {
    console.error('Error moving projects out of folder:', moveError);
    return false;
  }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
    return false;
  }

  return true;
}

export async function updateFolderPosition(folderId: string, position: number): Promise<boolean> {
  const { error } = await supabase
    .from('folders')
    .update({ position })
    .eq('id', folderId);

  if (error) {
    console.error('Error updating folder position:', error);
    return false;
  }

  return true;
}

// ==================== WIDGETS ====================

export async function getWidgets(projectId: string): Promise<Widget[]> {
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching widgets:', error);
    return [];
  }

  return data || [];
}

export async function createWidget(
  projectId: string,
  userId: string,
  widgetData: Partial<Widget>
): Promise<Widget | null> {
  const { data, error } = await supabase
    .from('widgets')
    .insert([{
      project_id: projectId,
      user_id: userId,
      ...widgetData
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating widget:', error);
    return null;
  }

  return data;
}

export async function updateWidget(
  widgetId: string,
  updates: Partial<Widget>
): Promise<void> {
  const { error } = await supabase
    .from('widgets')
    .update(updates)
    .eq('id', widgetId);

  if (error) {
    console.error('Error updating widget:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Widget ID:', widgetId);
    console.error('Updates:', updates);
  }
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const { error } = await supabase
    .from('widgets')
    .delete()
    .eq('id', widgetId);

  if (error) {
    console.error('Error deleting widget:', error);
  }
}

// ==================== SUBSCRIPTION & LIMITS ====================

export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, ai_generation_count, ai_generation_reset_at')
      .eq('id', userId)
      .single();

    console.log('💳 getUserSubscription result:', { data, error }); // ADD THIS
    if (error) {
      console.log('💳 getUserSubscription error code:', error.code); // ADD THIS
      console.error('Error fetching subscription:', error);
      
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            subscription_tier: 'free', 
            ai_generation_count: 0, 
            ai_generation_reset_at: new Date().toISOString() 
          }])
          .select()
          .single();
        console.log('💳 profile insert result:', { newProfile, insertError });
        return newProfile;
      }
      
      return null;
    }

    return data;
  } catch (err) {
    console.error('Exception in getUserSubscription:', err);
    return null;
  }
}

export async function canCreateProject(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (subscription?.subscription_tier !== 'free') {
      return true;
    }

    const projects = await getProjects(userId);
    return projects.length < 3;
  } catch (err) {
    console.error('Error in canCreateProject:', err);
    return false;
  }
}

export async function canUseAI(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date | null }> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return { allowed: false, remaining: 0, resetTime: null };
    }

    if (subscription.subscription_tier !== 'free') {
      return { allowed: true, remaining: 999, resetTime: null };
    }

    const now = new Date();
    const resetTime = new Date(subscription.ai_generation_reset_at);
    
    if (now.getTime() - resetTime.getTime() > 24 * 60 * 60 * 1000) {
      await supabase
        .from('profiles')
        .update({
          ai_generation_count: 0,
          ai_generation_reset_at: now.toISOString()
        })
        .eq('id', userId);
      
      return { allowed: true, remaining: 10, resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
    }

    const remaining = 10 - subscription.ai_generation_count;
    
    if (remaining <= 0) {
      const nextReset = new Date(resetTime.getTime() + 24 * 60 * 60 * 1000);
      return { allowed: false, remaining: 0, resetTime: nextReset };
    }

    return { allowed: true, remaining, resetTime: new Date(resetTime.getTime() + 24 * 60 * 60 * 1000) };
  } catch (err) {
    console.error('Error in canUseAI:', err);
    return { allowed: false, remaining: 0, resetTime: null };
  }
}

export async function incrementAIUsage(userId: string): Promise<void> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      console.error('No subscription found for user');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        ai_generation_count: subscription.ai_generation_count + 1 
      })
      .eq('id', userId);

    if (error) {
      console.error('Error incrementing AI usage:', error);
    }
  } catch (err) {
    console.error('Exception in incrementAIUsage:', err);
  }
}