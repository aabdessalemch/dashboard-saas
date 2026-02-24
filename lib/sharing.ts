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

export async function shareProject(
  projectId: string,
  ownerUserId: string,
  email: string,
  permission: 'viewer' | 'editor'
): Promise<ProjectShare | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    console.log('🔍 Searching for user with email:', cleanEmail);
    
    // Try multiple search methods
    let targetProfile = null;
    
    // Method 1: Case-insensitive like
    const { data: profile1 } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', cleanEmail)
      .maybeSingle();
    
    if (profile1) {
      targetProfile = profile1;
      console.log('✅ Found via ilike:', profile1);
    }
    
    // Method 2: Exact match (case-sensitive)
    if (!targetProfile) {
      const { data: profile2 } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();
      
      if (profile2) {
        targetProfile = profile2;
        console.log('✅ Found via exact match:', profile2);
      }
    }
    
    // Method 3: Get all profiles and search manually
    if (!targetProfile) {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, email');
      
      console.log('📋 All profiles:', allProfiles);
      
      targetProfile = allProfiles?.find(p => 
        p.email?.toLowerCase() === cleanEmail
      );
      
      if (targetProfile) {
        console.log('✅ Found via manual search:', targetProfile);
      }
    }
    
    if (!targetProfile) {
      console.error('❌ User not found with any method');
      alert(`User with email "${email}" not found. Make sure they have signed up!`);
      return null;
    }

    // Check if already shared
    const { data: existing } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .eq('shared_with_id', targetProfile.id)
      .maybeSingle();

    if (existing) {
      alert('This project is already shared with this user!');
      return null;
    }

    // Create share
    const { data, error } = await supabase
      .from('project_shares')
      .insert([{
        project_id: projectId,
        owner_id: ownerUserId,
        shared_with_email: cleanEmail,
        shared_with_id: targetProfile.id,
        permission
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating share:', error);
      alert('Failed to share project. Please try again.');
      return null;
    }

    console.log('✅ Share created successfully:', data);
    alert(`Successfully shared with ${email}!`);
    return data;
  } catch (err) {
    console.error('❌ Exception in shareProject:', err);
    alert('An error occurred while sharing. Please try again.');
    return null;
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