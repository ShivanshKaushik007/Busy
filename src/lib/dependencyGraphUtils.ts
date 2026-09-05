export interface DependencyEdge {
  taskId: string // The task that is blocked
  blockerTaskId: string // The task that blocks it
}

export interface TaskNode {
  id: string
  title: string
  status: string
  priority?: string
  projectKey?: string
}

export interface CycleCheckResult {
  createsCycle: boolean
  cyclePath?: TaskNode[]
  cycleString?: string
  message?: string
}

export interface TransitiveDependencyItem {
  id: string
  title: string
  status: string
  priority?: string
  projectKey?: string
  depth: number
  via?: string // title of intermediate blocker
}

export interface TransitiveChainsResult {
  directBlockers: TransitiveDependencyItem[]
  indirectBlockers: TransitiveDependencyItem[]
  directDependents: TransitiveDependencyItem[] // tasks directly blocked by this task
  indirectDependents: TransitiveDependencyItem[] // tasks indirectly blocked by this task
  maxUpstreamDepth: number
  maxDownstreamDepth: number
}

export interface ProjectDependencyHealth {
  projectId: string
  totalTasks: number
  totalDependencies: number
  isDagValid: boolean
  cycles: Array<{
    cycleNodes: TaskNode[]
    cycleString: string
  }>
  criticalPath: TaskNode[]
  maxDepth: number
}

/**
 * Builds forward and reverse adjacency maps from dependency edges.
 * In our system:
 * (taskId, blockerTaskId) means taskId depends on blockerTaskId (blockerTaskId blocks taskId).
 * Forward: taskId -> [blockerTaskId] (what taskId is waiting on)
 * Reverse: blockerTaskId -> [taskId] (what blockerTaskId blocks)
 */
export function buildAdjacencyList(edges: DependencyEdge[]) {
  const forward = new Map<string, string[]>() // task -> blockers
  const reverse = new Map<string, string[]>() // blocker -> tasks it blocks

  for (const edge of edges) {
    if (!forward.has(edge.taskId)) forward.set(edge.taskId, [])
    forward.get(edge.taskId)!.push(edge.blockerTaskId)

    if (!reverse.has(edge.blockerTaskId)) reverse.set(edge.blockerTaskId, [])
    reverse.get(edge.blockerTaskId)!.push(edge.taskId)
  }

  return { forward, reverse }
}

/**
 * Checks whether adding a dependency where `fromTaskId` is blocked by `toBlockerId`
 * would introduce a circular dependency chain of ANY length (2, 3, 4, ... N).
 *
 * Algorithm:
 * Adding `fromTaskId -> toBlockerId` creates a cycle IF AND ONLY IF there is already
 * a directed path from `toBlockerId` to `fromTaskId` in the forward adjacency graph
 * (i.e. `toBlockerId` already transitively depends on `fromTaskId`).
 * We run DFS from `toBlockerId` searching for `fromTaskId`.
 */
export function wouldCreateCycle(
  existingEdges: DependencyEdge[],
  fromTaskId: string,
  toBlockerId: string,
  tasksMap: Map<string, TaskNode> = new Map()
): CycleCheckResult {
  // 1. Self-block check
  if (fromTaskId === toBlockerId) {
    const node = tasksMap.get(fromTaskId) || { id: fromTaskId, title: 'This task', status: '' }
    return {
      createsCycle: true,
      cyclePath: [node, node],
      cycleString: `"${node.title}" → "${node.title}"`,
      message: 'A task cannot block itself.'
    }
  }

  const { forward } = buildAdjacencyList(existingEdges)

  // 2. DFS from toBlockerId to find if fromTaskId is reachable
  const visited = new Set<string>()
  const parentMap = new Map<string, string>() // to reconstruct path
  const queue: string[] = [toBlockerId]
  visited.add(toBlockerId)

  let foundCycle = false

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === fromTaskId) {
      foundCycle = true
      break
    }

    const blockers = forward.get(current) || []
    for (const nextBlocker of blockers) {
      if (!visited.has(nextBlocker)) {
        visited.add(nextBlocker)
        parentMap.set(nextBlocker, current)
        queue.push(nextBlocker)
      }
    }
  }

  if (!foundCycle) {
    return { createsCycle: false }
  }

  // 3. Reconstruct cycle path: toBlockerId -> ... -> fromTaskId -> toBlockerId
  const pathIds: string[] = []
  let curr: string | undefined = fromTaskId
  while (curr !== undefined) {
    pathIds.unshift(curr)
    curr = parentMap.get(curr)
  }

  // Complete the loop by appending toBlockerId at the end
  const fullCycleIds = [...pathIds, toBlockerId]
  const cyclePath: TaskNode[] = fullCycleIds.map(id => {
    return tasksMap.get(id) || { id, title: `Task ${id.slice(0, 4)}`, status: '' }
  })

  const cycleString = cyclePath.map(n => `"${n.title}"`).join(' → ')

  return {
    createsCycle: true,
    cyclePath,
    cycleString,
    message: `Circular dependency detected: ${cycleString}. This chain of tasks would permanently deadlock and can never be completed.`
  }
}

/**
 * Traverse transitive chains for a specific task:
 * Upstream: All tasks blocking this task (direct and indirect)
 * Downstream: All tasks waiting on this task (direct and indirect)
 */
export function getTransitiveChains(
  taskId: string,
  edges: DependencyEdge[],
  tasksMap: Map<string, TaskNode> = new Map()
): TransitiveChainsResult {
  const { forward, reverse } = buildAdjacencyList(edges)

  const directBlockers: TransitiveDependencyItem[] = []
  const indirectBlockers: TransitiveDependencyItem[] = []
  const directDependents: TransitiveDependencyItem[] = []
  const indirectDependents: TransitiveDependencyItem[] = []

  // Traverse upstream (tasks that block this task)
  let maxUpstreamDepth = 0
  const upstreamVisited = new Set<string>()
  upstreamVisited.add(taskId)

  const upstreamQueue: Array<{ id: string; depth: number; via?: string }> = []
  const immediateBlockers = forward.get(taskId) || []

  for (const bId of immediateBlockers) {
    upstreamVisited.add(bId)
    const node = tasksMap.get(bId) || { id: bId, title: 'Unknown Task', status: '' }
    directBlockers.push({
      ...node,
      depth: 1
    })
    upstreamQueue.push({ id: bId, depth: 1, via: node.title })
  }

  while (upstreamQueue.length > 0) {
    const { id, depth, via } = upstreamQueue.shift()!
    if (depth > maxUpstreamDepth) maxUpstreamDepth = depth

    const nextBlockers = forward.get(id) || []
    for (const nextId of nextBlockers) {
      if (!upstreamVisited.has(nextId)) {
        upstreamVisited.add(nextId)
        const node = tasksMap.get(nextId) || { id: nextId, title: 'Unknown Task', status: '' }
        indirectBlockers.push({
          ...node,
          depth: depth + 1,
          via
        })
        upstreamQueue.push({ id: nextId, depth: depth + 1, via })
      }
    }
  }

  // Traverse downstream (tasks blocked by this task)
  let maxDownstreamDepth = 0
  const downstreamVisited = new Set<string>()
  downstreamVisited.add(taskId)

  const downstreamQueue: Array<{ id: string; depth: number; via?: string }> = []
  const immediateDependents = reverse.get(taskId) || []

  for (const dId of immediateDependents) {
    downstreamVisited.add(dId)
    const node = tasksMap.get(dId) || { id: dId, title: 'Unknown Task', status: '' }
    directDependents.push({
      ...node,
      depth: 1
    })
    downstreamQueue.push({ id: dId, depth: 1, via: node.title })
  }

  while (downstreamQueue.length > 0) {
    const { id, depth, via } = downstreamQueue.shift()!
    if (depth > maxDownstreamDepth) maxDownstreamDepth = depth

    const nextDependents = reverse.get(id) || []
    for (const nextId of nextDependents) {
      if (!downstreamVisited.has(nextId)) {
        downstreamVisited.add(nextId)
        const node = tasksMap.get(nextId) || { id: nextId, title: 'Unknown Task', status: '' }
        indirectDependents.push({
          ...node,
          depth: depth + 1,
          via
        })
        downstreamQueue.push({ id: nextId, depth: depth + 1, via })
      }
    }
  }

  return {
    directBlockers,
    indirectBlockers,
    directDependents,
    indirectDependents,
    maxUpstreamDepth,
    maxDownstreamDepth
  }
}

/**
 * Audits all dependency edges across an entire project to detect any cycles,
 * verify DAG topological ordering, and identify the critical path.
 */
export function auditProjectDependencies(
  projectId: string,
  tasks: TaskNode[],
  edges: DependencyEdge[]
): ProjectDependencyHealth {
  const tasksMap = new Map<string, TaskNode>()
  for (const t of tasks) tasksMap.set(t.id, t)

  const { forward } = buildAdjacencyList(edges)

  // 1. Detect all cycles using 3-color DFS (White=0, Gray=1, Black=2)
  const color = new Map<string, number>()
  const parent = new Map<string, string>()
  const cycles: Array<{ cycleNodes: TaskNode[]; cycleString: string }> = []
  const seenCycleSignatures = new Set<string>()

  for (const task of tasks) {
    color.set(task.id, 0)
  }

  const dfs = (nodeId: string) => {
    color.set(nodeId, 1) // Gray (in current recursion stack)

    const neighbors = forward.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (color.get(neighbor) === 1) {
        // Back edge found! Cycle detected
        const cycleIds: string[] = [neighbor, nodeId]
        let p = parent.get(nodeId)
        while (p && p !== neighbor && cycleIds.length < 50) {
          cycleIds.push(p)
          p = parent.get(p)
        }
        cycleIds.reverse()
        cycleIds.push(neighbor)

        const signature = [...cycleIds].sort().join('-')
        if (!seenCycleSignatures.has(signature)) {
          seenCycleSignatures.add(signature)
          const cycleNodes = cycleIds.map(
            id => tasksMap.get(id) || { id, title: `Task ${id.slice(0, 4)}`, status: '' }
          )
          const cycleString = cycleNodes.map(n => `"${n.title}"`).join(' → ')
          cycles.push({ cycleNodes, cycleString })
        }
      } else if (color.get(neighbor) === 0) {
        parent.set(neighbor, nodeId)
        dfs(neighbor)
      }
    }

    color.set(nodeId, 2) // Black (finished)
  }

  for (const task of tasks) {
    if (color.get(task.id) === 0) {
      dfs(task.id)
    }
  }

  // 2. Compute Longest Path (Critical Path) among unfinished tasks
  let maxDepth = 0
  let criticalPath: TaskNode[] = []

  const memo = new Map<string, { depth: number; path: string[] }>()

  const getLongestPath = (nodeId: string, visited: Set<string>): { depth: number; path: string[] } => {
    if (memo.has(nodeId)) return memo.get(nodeId)!
    if (visited.has(nodeId)) return { depth: 0, path: [nodeId] } // cycle guard

    visited.add(nodeId)
    let best = { depth: 1, path: [nodeId] }

    const blockers = forward.get(nodeId) || []
    for (const bId of blockers) {
      const sub = getLongestPath(bId, new Set(visited))
      if (sub.depth + 1 > best.depth) {
        best = {
          depth: sub.depth + 1,
          path: [nodeId, ...sub.path]
        }
      }
    }

    memo.set(nodeId, best)
    return best
  }

  for (const task of tasks) {
    const result = getLongestPath(task.id, new Set())
    if (result.depth > maxDepth) {
      maxDepth = result.depth
      criticalPath = result.path.map(
        id => tasksMap.get(id) || { id, title: `Task ${id.slice(0, 4)}`, status: '' }
      )
    }
  }

  return {
    projectId,
    totalTasks: tasks.length,
    totalDependencies: edges.length,
    isDagValid: cycles.length === 0,
    cycles,
    criticalPath,
    maxDepth
  }
}
