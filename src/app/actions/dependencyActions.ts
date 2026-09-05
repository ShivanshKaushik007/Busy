'use server'

import { createClient } from '@/utils/supabase/server'
import {
  wouldCreateCycle,
  getTransitiveChains,
  auditProjectDependencies,
  DependencyEdge,
  TaskNode,
  ProjectDependencyHealth
} from '@/lib/dependencyGraphUtils'
import { revalidatePath } from 'next/cache'

/**
 * Add a blocking dependency relationship with full cycle detection across chains
 * of arbitrary length (A -> B -> C -> ... -> A).
 */
export async function addDependencyWithCycleCheck(taskId: string, blockerTaskId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    if (taskId === blockerTaskId) {
      return { error: 'A task cannot block itself.' }
    }

    // 1. Fetch both tasks
    const { data: t1 } = await supabase
      .from('tasks')
      .select('id, title, status, project_id, projects(key)')
      .eq('id', taskId)
      .single()

    const { data: t2 } = await supabase
      .from('tasks')
      .select('id, title, status, project_id, projects(key)')
      .eq('id', blockerTaskId)
      .single()

    if (!t1 || !t2) {
      return { error: 'One or both tasks could not be found.' }
    }

    if (t1.project_id !== t2.project_id) {
      return { error: 'Tasks must belong to the same project to form a blocking relationship.' }
    }

    const projectId = t1.project_id

    // 2. Fetch all existing dependencies in this project to analyze the full graph
    const { data: projectTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, projects(key)')
      .eq('project_id', projectId)

    const tasksMap = new Map<string, TaskNode>()
    for (const pt of projectTasks || []) {
      tasksMap.set(pt.id, {
        id: pt.id,
        title: pt.title,
        status: pt.status,
        priority: pt.priority,
        projectKey: (pt.projects as any)?.key
      })
    }

    const projectTaskIds = (projectTasks || []).map(pt => pt.id)

    const { data: existingDeps } = await supabase
      .from('task_dependencies')
      .select('task_id, blocks_task_id')
      .in('task_id', projectTaskIds)

    const existingEdges: DependencyEdge[] = (existingDeps || []).map((d: any) => ({
      taskId: d.task_id,
      blockerTaskId: d.blocks_task_id
    }))

    // 3. Cycle Detection: Check if adding taskId -> blockerTaskId creates a cycle
    const cycleCheck = wouldCreateCycle(existingEdges, taskId, blockerTaskId, tasksMap)

    if (cycleCheck.createsCycle) {
      return {
        error: cycleCheck.message,
        cycleString: cycleCheck.cycleString,
        cyclePath: cycleCheck.cyclePath
      }
    }

    // 4. Safe to insert into database
    const { error: insertError } = await supabase.from('task_dependencies').upsert({
      task_id: taskId,
      blocks_task_id: blockerTaskId
    })

    if (insertError) {
      return { error: insertError.message }
    }

    // 5. Audit log in immutable task_history
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'dependency_added',
      old_value: null,
      new_value: `Added blocker: "${t2.title}"`
    })

    revalidatePath('/board')
    revalidatePath('/tasks')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    console.error('Error in addDependencyWithCycleCheck:', err)
    return { error: err.message || 'Failed to add dependency' }
  }
}

/**
 * Fast client-side pre-validation: checks whether candidate blocker would create a cycle
 */
export async function checkPotentialCycle(taskId: string, candidateBlockerId: string) {
  try {
    const supabase = await createClient()

    if (taskId === candidateBlockerId) {
      return {
        createsCycle: true,
        message: 'A task cannot block itself.'
      }
    }

    const { data: t1 } = await supabase.from('tasks').select('project_id, title').eq('id', taskId).single()
    if (!t1) return { createsCycle: false }

    const { data: projectTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, projects(key)')
      .eq('project_id', t1.project_id)

    const tasksMap = new Map<string, TaskNode>()
    for (const pt of projectTasks || []) {
      tasksMap.set(pt.id, {
        id: pt.id,
        title: pt.title,
        status: pt.status,
        priority: pt.priority,
        projectKey: (pt.projects as any)?.key
      })
    }

    const projectTaskIds = (projectTasks || []).map(pt => pt.id)
    const { data: existingDeps } = await supabase
      .from('task_dependencies')
      .select('task_id, blocks_task_id')
      .in('task_id', projectTaskIds)

    const existingEdges: DependencyEdge[] = (existingDeps || []).map((d: any) => ({
      taskId: d.task_id,
      blockerTaskId: d.blocks_task_id
    }))

    return wouldCreateCycle(existingEdges, taskId, candidateBlockerId, tasksMap)
  } catch (err: any) {
    return { createsCycle: false }
  }
}

/**
 * Fetch direct and transitive dependency chains for a task
 */
export async function getTaskDependencyChains(taskId: string) {
  try {
    const supabase = await createClient()

    const { data: currentTask } = await supabase
      .from('tasks')
      .select('id, title, status, project_id, projects(key)')
      .eq('id', taskId)
      .single()

    if (!currentTask) {
      return { error: 'Task not found' }
    }

    const projectId = currentTask.project_id

    // Fetch all project tasks
    const { data: projectTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, projects(key)')
      .eq('project_id', projectId)

    const tasksMap = new Map<string, TaskNode>()
    const allProjectTasks: TaskNode[] = []

    for (const pt of projectTasks || []) {
      const node: TaskNode = {
        id: pt.id,
        title: pt.title,
        status: pt.status,
        priority: pt.priority,
        projectKey: (pt.projects as any)?.key
      }
      tasksMap.set(pt.id, node)
      allProjectTasks.push(node)
    }

    // Fetch project dependencies
    const projectTaskIds = (projectTasks || []).map(pt => pt.id)
    const { data: existingDeps } = await supabase
      .from('task_dependencies')
      .select('task_id, blocks_task_id')
      .in('task_id', projectTaskIds)

    const edges: DependencyEdge[] = (existingDeps || []).map((d: any) => ({
      taskId: d.task_id,
      blockerTaskId: d.blocks_task_id
    }))

    const chains = getTransitiveChains(taskId, edges, tasksMap)

    // Filter available candidates that can be added as blockers
    const directBlockerIds = new Set(chains.directBlockers.map(b => b.id))
    const availableCandidates = allProjectTasks
      .filter(t => t.id !== taskId && !directBlockerIds.has(t.id))
      .map(candidate => {
        const cycleCheck = wouldCreateCycle(edges, taskId, candidate.id, tasksMap)
        return {
          ...candidate,
          wouldCauseCycle: cycleCheck.createsCycle,
          cycleString: cycleCheck.cycleString
        }
      })

    return {
      success: true,
      chains,
      availableCandidates
    }
  } catch (err: any) {
    console.error('Error in getTaskDependencyChains:', err)
    return { error: err.message || 'Failed to fetch dependency chains' }
  }
}

/**
 * Audit project dependencies for DAG validity, cycles, and critical path
 */
export async function getProjectDependencyHealth(projectId: string): Promise<ProjectDependencyHealth | { error: string }> {
  try {
    const supabase = await createClient()

    const { data: projectTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, projects(key)')
      .eq('project_id', projectId)

    const tasks: TaskNode[] = (projectTasks || []).map((pt: any) => ({
      id: pt.id,
      title: pt.title,
      status: pt.status,
      priority: pt.priority,
      projectKey: pt.projects?.key
    }))

    const taskIds = tasks.map(t => t.id)
    const { data: projectDeps } = await supabase
      .from('task_dependencies')
      .select('task_id, blocks_task_id')
      .in('task_id', taskIds)

    const edges: DependencyEdge[] = (projectDeps || []).map((d: any) => ({
      taskId: d.task_id,
      blockerTaskId: d.blocks_task_id
    }))

    return auditProjectDependencies(projectId, tasks, edges)
  } catch (err: any) {
    console.error('Error in getProjectDependencyHealth:', err)
    return { error: err.message || 'Failed to audit project dependencies' }
  }
}

/**
 * Remove a dependency edge and audit in task_history
 */
export async function removeDependency(taskId: string, blockerTaskId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { data: blockerTask } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', blockerTaskId)
      .single()

    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('task_id', taskId)
      .eq('blocks_task_id', blockerTaskId)

    if (error) {
      return { error: error.message }
    }

    if (user) {
      await supabase.from('task_history').insert({
        task_id: taskId,
        actor_id: user.id,
        action_type: 'dependency_removed',
        old_value: blockerTaskId,
        new_value: blockerTask ? `Removed blocker "${blockerTask.title}"` : null
      })
    }

    revalidatePath('/board')
    revalidatePath('/tasks')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to remove dependency' }
  }
}
