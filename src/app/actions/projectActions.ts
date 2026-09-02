'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to verify if current user is a manager
export async function verifyManagerRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isManager: false, error: 'Not authenticated', user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return { isManager: false, error: 'Only managers can perform this action', user }
  }

  return { isManager: true, user }
}

// 1. Create Project (Manager only)
export async function createProject(formData: {
  key: string
  name: string
  description?: string
  ownerId?: string
}) {
  const supabase = await createClient()
  const { isManager, error: authError, user } = await verifyManagerRole()

  if (!isManager || !user) {
    return { error: authError || 'Unauthorized: Only managers can create projects' }
  }

  const owner_id = formData.ownerId || user.id
  const projectKey = formData.key.trim().toUpperCase()

  // Insert project
  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      key: projectKey,
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      owner_id: owner_id,
      is_archived: false
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message || 'Failed to create project' }
  }

  // Automatically add owner/creator as project member
  await supabase.from('project_members').upsert({
    project_id: project.id,
    user_id: owner_id
  })

  revalidatePath('/', 'layout')
  revalidatePath('/projects')
  return { success: true, project }
}

// 2. Archive / Restore Project (Manager only)
export async function toggleArchiveProject(projectId: string, archive: boolean) {
  const supabase = await createClient()
  const { isManager, error: authError } = await verifyManagerRole()

  if (!isManager) {
    return { error: authError || 'Unauthorized: Only managers can archive projects' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ is_archived: archive })
    .eq('id', projectId)

  if (error) {
    return { error: error.message || 'Failed to update project archive state' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/projects')
  return { success: true }
}

// 3. Edit Project details (Manager only)
export async function updateProject(projectId: string, updates: {
  name?: string
  description?: string
  ownerId?: string
}) {
  const supabase = await createClient()
  const { isManager, error: authError } = await verifyManagerRole()

  if (!isManager) {
    return { error: authError || 'Unauthorized: Only managers can edit projects' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
      ...(updates.ownerId ? { owner_id: updates.ownerId } : {})
    })
    .eq('id', projectId)

  if (error) {
    return { error: error.message || 'Failed to update project' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/projects')
  return { success: true }
}

// 4. Update Project Members (Manager only)
// "removing someone from a project unassigns them from that project's tasks"
export async function updateProjectMembers(projectId: string, userIds: string[]) {
  const supabase = await createClient()
  const { isManager, error: authError } = await verifyManagerRole()

  if (!isManager) {
    return { error: authError || 'Unauthorized: Only managers can change project members' }
  }

  // Get current members
  const { data: currentMembers } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)

  const currentIds = new Set((currentMembers || []).map(m => m.user_id))
  const newIds = new Set(userIds)

  // Identify removed users
  const removedUserIds = Array.from(currentIds).filter(id => !newIds.has(id))
  // Identify added users
  const addedUserIds = Array.from(newIds).filter(id => !currentIds.has(id))

  // 1. Remove memberships
  if (removedUserIds.length > 0) {
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .in('user_id', removedUserIds)

    // Unassign them from all tasks in this project!
    // Get all task IDs in this project
    const { data: projectTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId)

    if (projectTasks && projectTasks.length > 0) {
      const taskIds = projectTasks.map(t => t.id)
      await supabase
        .from('task_assignments')
        .delete()
        .in('task_id', taskIds)
        .in('user_id', removedUserIds)
    }
  }

  // 2. Add new memberships
  if (addedUserIds.length > 0) {
    const rowsToInsert = addedUserIds.map(uid => ({
      project_id: projectId,
      user_id: uid
    }))
    await supabase.from('project_members').insert(rowsToInsert)
  }

  revalidatePath('/', 'layout')
  revalidatePath('/projects')
  return { success: true }
}
