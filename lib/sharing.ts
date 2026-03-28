import { supabase } from './supabase';

export interface ProjectShare {
  id: string;
  project_id: string;
  owner_id: string;
  shared_with_id: string | null;
  shared_with_email: string;
  permission: 'viewer' | 'editor';
  created_at?: string;
}

export interface SharedProject {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  folder_id?: string | null;
  position?: number;
  permission: 'viewer' | 'editor';
  owner_email: string;
  owner_id: string;
}

export async function shareProject(
  projectId: string,
  ownerUserId: string,
  email: string,
  permission: 'viewer' | 'editor'
): Promise<ProjectShare | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    console.log('🔍 Looking up user:', cleanEmail);

    // Single clean lookup — works once RLS policy is fixed
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError);
      if (profileError.code === '42501' || profileError.message?.includes('permission')) {
        alert('Permission error: The profiles table RLS policy needs to be updated. See setup guide.');
      } else {
        alert(`Could not find user: ${profileError.message}`);
      }
      return null;
    }

    if (!targetProfile) {
      console.error('❌ User not found:', cleanEmail);
      alert(
        `No account found for "${email}".\n\n` +
        `Make sure:\n` +
        `• They have signed up at this app\n` +
        `• You typed the email correctly\n` +
        `• They used this exact email to sign up`
      );
      return null;
    }

    console.log('✅ Found user:', targetProfile.id);

    // Check not sharing with yourself
    if (targetProfile.id === ownerUserId) {
      alert('You cannot share a project with yourself.');
      return null;
    }

    // Check if already shared
    const { data: existing } = await supabase
      .from('project_shares')
      .select('id')
      .eq('project_id', projectId)
      .eq('shared_with_id', targetProfile.id)
      .maybeSingle();

    if (existing) {
      alert('This project is already shared with this user.');
      return null;
    }

    // Create the share record
    const { data, error: shareError } = await supabase
      .from('project_shares')
      .insert([{
        project_id: projectId,
        owner_id: ownerUserId,
        shared_with_email: cleanEmail,
        shared_with_id: targetProfile.id,
        permission,
      }])
      .select()
      .single();

    if (shareError) {
      console.error('❌ Share creation error:', shareError);
      alert(`Failed to share: ${shareError.message}`);
      return null;
    }

    console.log('✅ Share created:', data);
    return data;

  } catch (err: any) {
    console.error('❌ Exception in shareProject:', err);
    alert(`Unexpected error: ${err.message}`);
    return null;
  }
}

export async function getSharedProjects(userId: string): Promise<SharedProject[]> {
  try {
    console.log('🔍 getSharedProjects called with userId:', userId);

    const { data, error } = await supabase
      .from('project_shares')
      .select(`
        permission,
        owner_id,
        projects (
          id,
          user_id,
          name,
          created_at,
          folder_id,
          position
        )
      `)
      .eq('shared_with_id', userId);

    if (error) {
      console.error('❌ Error fetching shared projects:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('🔍 No shared projects found');
      return [];
    }

    // Fetch owner emails separately
    const ownerIds = [...new Set(data.map((s: any) => s.owner_id))];
    const { data: ownerProfiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', ownerIds);

    const ownerEmailMap = new Map(
      (ownerProfiles || []).map((p: any) => [p.id, p.email])
    );

    const results = data
      .filter((s: any) => s.projects)
      .map((s: any) => ({
        id: s.projects.id,
        user_id: s.projects.user_id,
        name: s.projects.name,
        created_at: s.projects.created_at,
        folder_id: s.projects.folder_id,
        position: s.projects.position,
        permission: s.permission as 'viewer' | 'editor',
        owner_id: s.owner_id,
        owner_email: ownerEmailMap.get(s.owner_id) || 'Unknown',
      }));

    console.log('✅ Shared projects loaded:', results.length);
    return results;

  } catch (err) {
    console.error('❌ Exception in getSharedProjects:', err);
    return [];
  }
}

export async function getProjectShares(projectId: string): Promise<ProjectShare[]> {
  try {
    const { data, error } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shares:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception in getProjectShares:', err);
    return [];
  }
}

export async function updateSharePermission(
  shareId: string,
  permission: 'viewer' | 'editor'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      console.error('Error updating permission:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in updateSharePermission:', err);
    return false;
  }
}

export async function removeShare(shareId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error removing share:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception in removeShare:', err);
    return false;
  }
}