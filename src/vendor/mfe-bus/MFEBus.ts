import {
  type ActiveWorkflowState,
  type EventHandler,
  type EventKey,
  type EventMap,
  type ModalRequest,
  type NavigationRequest,
  type Unsubscribe,
  type WorkflowDefinition,
} from './types'

const GLOBAL_BUS_KEY = '__MFE_BUS_INSTANCE__'

export class MFEBus<TEvents extends EventMap = EventMap> {
  private listeners = new Map<string, Set<EventHandler<any>>>()
  private stateStore = new Map<string, unknown>()
  private stateListeners = new Map<string, Set<EventHandler<any>>>()
  private workflows = new Map<string, WorkflowDefinition>()
  private activeWorkflow: ActiveWorkflowState | null = null

  on<K extends EventKey<TEvents>>(
    event: K,
    handler: EventHandler<TEvents[K]>,
  ): Unsubscribe {
    let handlers = this.listeners.get(event)
    if (!handlers) {
      handlers = new Set()
      this.listeners.set(event, handlers)
    }
    handlers.add(handler)
    return () => this.off(event, handler)
  }

  once<K extends EventKey<TEvents>>(
    event: K,
    handler: EventHandler<TEvents[K]>,
  ): Unsubscribe {
    const wrapper: EventHandler<TEvents[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  off<K extends EventKey<TEvents>>(
    event: K,
    handler: EventHandler<TEvents[K]>,
  ): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    handlers.delete(handler)
    if (handlers.size === 0) {
      this.listeners.delete(event)
    }
  }

  emit<K extends EventKey<TEvents>>(event: K, payload: TEvents[K]): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    Array.from(handlers).forEach((handler) => {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[MFEBus] Error in handler for event "${event}":`, err)
      }
    })
  }

  setState<TValue = unknown>(key: string, value: TValue): void {
    this.stateStore.set(key, value)
    const handlers = this.stateListeners.get(key)
    if (handlers) {
      Array.from(handlers).forEach((handler) => {
        try {
          handler(value)
        } catch (err) {
          console.error(`[MFEBus] Error in state subscriber for "${key}":`, err)
        }
      })
    }
  }

  getState<TValue = unknown>(key: string): TValue | undefined {
    return this.stateStore.get(key) as TValue | undefined
  }

  subscribeState<TValue = unknown>(
    key: string,
    handler: EventHandler<TValue>,
    replayImmediately = true,
  ): Unsubscribe {
    let handlers = this.stateListeners.get(key)
    if (!handlers) {
      handlers = new Set()
      this.stateListeners.set(key, handlers)
    }
    handlers.add(handler)

    if (replayImmediately && this.stateStore.has(key)) {
      handler(this.stateStore.get(key) as TValue)
    }

    return () => {
      const current = this.stateListeners.get(key)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) {
        this.stateListeners.delete(key)
      }
    }
  }

  openModal<TProps = Record<string, unknown>>(
    request: ModalRequest<TProps>,
  ): string {
    const modalId =
      request.id ??
      `${request.remoteName}:${request.moduleName}:${Date.now().toString(36)}`
    this.emit('modal:open', {
      ...request,
      id: modalId,
    } as TEvents['modal:open'])
    return modalId
  }

  closeModal(id?: string): void {
    this.emit('modal:close', { id } as TEvents['modal:close'])
  }

  navigate(request: NavigationRequest | string): void {
    const normalized: NavigationRequest =
      typeof request === 'string' ? { path: request } : request
    this.emit('navigation:request', normalized as TEvents['navigation:request'])
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    if (!definition.steps.length) {
      throw new Error(
        `[MFEBus] Workflow "${definition.id}" must contain at least one step.`,
      )
    }
    this.workflows.set(definition.id, definition)
  }

  startWorkflow(
    workflowId: string,
    initialData: Record<string, unknown> = {},
  ): ActiveWorkflowState {
    const definition = this.workflows.get(workflowId)
    if (!definition) {
      throw new Error(`[MFEBus] Unknown workflow "${workflowId}".`)
    }

    const firstStep = definition.steps[0]
    this.activeWorkflow = {
      workflowId,
      workflowName: definition.name,
      currentStepIndex: 0,
      totalSteps: definition.steps.length,
      currentStep: firstStep,
      data: { ...initialData },
      completed: false,
    }

    this.setState('workflow:active', this.activeWorkflow)
    this.emit(
      'workflow:started',
      this.activeWorkflow as TEvents['workflow:started'],
    )
    this.triggerStepSideEffects(firstStep, this.activeWorkflow.data)
    return this.activeWorkflow
  }

  nextWorkflowStep(
    stepData: Record<string, unknown> = {},
  ): ActiveWorkflowState | null {
    if (!this.activeWorkflow || this.activeWorkflow.completed) {
      return null
    }

    const definition = this.workflows.get(this.activeWorkflow.workflowId)
    if (!definition) return null

    const mergedData = { ...this.activeWorkflow.data, ...stepData }
    const nextIndex = this.activeWorkflow.currentStepIndex + 1

    if (nextIndex >= definition.steps.length) {
      this.activeWorkflow = {
        ...this.activeWorkflow,
        data: mergedData,
        completed: true,
      }
      this.setState('workflow:active', this.activeWorkflow)
      this.emit(
        'workflow:completed',
        this.activeWorkflow as TEvents['workflow:completed'],
      )
      return this.activeWorkflow
    }

    const nextStep = definition.steps[nextIndex]
    this.activeWorkflow = {
      workflowId: definition.id,
      workflowName: definition.name,
      currentStepIndex: nextIndex,
      totalSteps: definition.steps.length,
      currentStep: nextStep,
      data: mergedData,
      completed: false,
    }

    this.setState('workflow:active', this.activeWorkflow)
    this.emit(
      'workflow:stepChanged',
      this.activeWorkflow as TEvents['workflow:stepChanged'],
    )
    this.triggerStepSideEffects(nextStep, mergedData)
    return this.activeWorkflow
  }

  previousWorkflowStep(): ActiveWorkflowState | null {
    if (!this.activeWorkflow || this.activeWorkflow.currentStepIndex <= 0) {
      return null
    }

    const definition = this.workflows.get(this.activeWorkflow.workflowId)
    if (!definition) return null

    const prevIndex = this.activeWorkflow.currentStepIndex - 1
    const prevStep = definition.steps[prevIndex]

    this.activeWorkflow = {
      ...this.activeWorkflow,
      currentStepIndex: prevIndex,
      currentStep: prevStep,
      completed: false,
    }

    this.setState('workflow:active', this.activeWorkflow)
    this.emit(
      'workflow:stepChanged',
      this.activeWorkflow as TEvents['workflow:stepChanged'],
    )
    this.triggerStepSideEffects(prevStep, this.activeWorkflow.data)
    return this.activeWorkflow
  }

  cancelWorkflow(): void {
    if (!this.activeWorkflow) return
    const { workflowId } = this.activeWorkflow
    this.activeWorkflow = null
    this.setState('workflow:active', null)
    this.emit(
      'workflow:cancelled',
      { workflowId } as TEvents['workflow:cancelled'],
    )
  }

  getActiveWorkflow(): ActiveWorkflowState | null {
    return this.activeWorkflow
  }

  reset(): void {
    this.listeners.clear()
    this.stateStore.clear()
    this.stateListeners.clear()
    this.workflows.clear()
    this.activeWorkflow = null
  }

  private triggerStepSideEffects(
    step: WorkflowDefinition['steps'][number],
    workflowData: Record<string, unknown>,
  ): void {
    if (step.path) {
      this.navigate({ path: step.path, state: workflowData })
    }
    if (step.modal) {
      this.openModal({
        ...step.modal,
        props: {
          ...(step.modal.props ?? {}),
          workflowData,
        },
      })
    }
  }
}

export function getMFEBus<
  TEvents extends EventMap = EventMap,
>(): MFEBus<TEvents> {
  const g = globalThis as unknown as Record<string, MFEBus<TEvents> | undefined>
  if (!g[GLOBAL_BUS_KEY]) {
    g[GLOBAL_BUS_KEY] = new MFEBus<TEvents>()
  }
  return g[GLOBAL_BUS_KEY]!
}

export const mfeBus = getMFEBus()
