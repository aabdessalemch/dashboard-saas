import { supabase } from './supabase';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

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
  updated_at?: string;
}

// ==================== PROJECTS ====================

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching projects:', error);
    return [];
  }

  console.log('✅ Fetched projects:', data?.length || 0);
  return data || [];
}

export async function createProject(userId: string, name: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id: userId, name }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating project:', error);
    return null;
  }

  console.log('✅ Created project:', data);
  return data;
}

export async function updateProject(projectId: string, name: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId);

  if (error) {
    console.error('❌ Error updating project:', error);
    return false;
  }

  console.log('✅ Updated project:', projectId);
  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('❌ Error deleting project:', error);
    return false;
  }

  console.log('✅ Deleted project:', projectId);
  return true;
}

// ==================== WIDGETS ====================

export async function getWidgets(projectId: string): Promise<Widget[]> {
  console.log('🔍 Fetching widgets for project:', projectId);
  
  const { data, error } = await supabase
    .from('widgets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching widgets:', error);
    return [];
  }

  console.log('✅ Fetched widgets:', data?.length || 0);
  return data || [];
}

export async function createWidget(
  projectId: string,
  userId: string,
  widgetData: {
    widget_type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z_index: number;
    data: any;
  }
): Promise<Widget | null> {
  console.log('➕ Creating widget:', widgetData.widget_type);
  
  const { data, error } = await supabase
    .from('widgets')
    .insert([{
      project_id: projectId,
      user_id: userId,
      widget_type: widgetData.widget_type,
      x: widgetData.x,
      y: widgetData.y,
      width: widgetData.width,
      height: widgetData.height,
      z_index: widgetData.z_index,
      data: widgetData.data,
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating widget:', error);
    return null;
  }

  console.log('✅ Created widget:', data.id);
  return data;
}

export async function updateWidget(
  widgetId: string,
  updates: {
    widget_type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    z_index?: number;
    data?: any;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('widgets')
    .update(updates)
    .eq('id', widgetId);

  if (error) {
    console.error('❌ Error updating widget:', error);
    return false;
  }

  return true;
}

export async function deleteWidget(widgetId: string): Promise<boolean> {
  console.log('🗑️ Deleting widget:', widgetId);
  
  const { error } = await supabase
    .from('widgets')
    .delete()
    .eq('id', widgetId);

  if (error) {
    console.error('❌ Error deleting widget:', error);
    return false;
  }

  console.log('✅ Deleted widget');
  return true;
}

export async function deleteAllWidgets(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('widgets')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('❌ Error deleting widgets:', error);
    return false;
  }

  return true;
}

// Helper to sync local widgets to database
export async function syncWidgets(
  projectId: string,
  userId: string,
  localWidgets: any[]
): Promise<Widget[]> {
  console.log('🔄 Syncing widgets...');
  
  // Get current widgets from database
  const dbWidgets = await getWidgets(projectId);
  const dbWidgetMap = new Map(dbWidgets.map(w => [w.id, w]));
  
  // Track which DB widgets we've seen
  const seenIds = new Set<string>();
  
  // Create or update widgets
  for (const localWidget of localWidgets) {
    const dbWidget = dbWidgetMap.get(localWidget.id);
    
    if (dbWidget) {
      // Widget exists in DB - update it
      seenIds.add(localWidget.id);
      await updateWidget(localWidget.id, {
        widget_type: localWidget.type,
        x: localWidget.x,
        y: localWidget.y,
        width: localWidget.width,
        height: localWidget.height,
        z_index: localWidget.zIndex || 0,
        data: localWidget.data,
      });
    } else {
      // Widget doesn't exist - create it
      const created = await createWidget(projectId, userId, {
        widget_type: localWidget.type,
        x: localWidget.x,
        y: localWidget.y,
        width: localWidget.width,
        height: localWidget.height,
        z_index: localWidget.zIndex || 0,
        data: localWidget.data,
      });
      
      if (created) {
        seenIds.add(created.id);
      }
    }
  }
  
  // Delete widgets that were removed locally
  for (const dbWidget of dbWidgets) {
    if (!seenIds.has(dbWidget.id)) {
      await deleteWidget(dbWidget.id);
    }
  }
  
  // Return updated widgets
  return await getWidgets(projectId);
}