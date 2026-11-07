export interface ModalRequest<TProps = Record<string, unknown>> {
  id?: string
  remoteName: string
  moduleName: string
  title?: string
  props?: TProps
}

export interface NavigationRequest {
  path: string
  replace?: boolean
  state?: Record<string, unknown>
}

export interface WorkflowStepDefinition {
  id: string
  label: string
  /** Optional path to navigate to when this step becomes active */
  path?: string
  /** Optional remote modal to open when this step becomes active */
  modal?: ModalRequest
}

export interface WorkflowDefinition {
  id: string
  name: string
  steps: WorkflowStepDefinition[]
}

export interface ActiveWorkflowState {
  workflowId: string
  workflowName: string
  currentStepIndex: number
  totalSteps: number
  currentStep: WorkflowStepDefinition
  data: Record<string, unknown>
  completed: boolean
}

export interface TermsAcceptancePayload {
  version: string
  acceptedAt: string
}

export interface AuthenticatedUser {
  id: string
  uid?: string
  name: string
  email?: string
  photoURL?: string | null
  idToken?: string
  method: 'passkey' | 'github' | 'google' | 'firebase'
  authenticatedAt: string
}

export interface BuiltInMFEvents {
  'theme:changed': { theme: 'light' | 'dark' }
  'modal:open': ModalRequest
  'modal:close': { id?: string }
  'navigation:request': NavigationRequest
  'workflow:started': ActiveWorkflowState
  'workflow:stepChanged': ActiveWorkflowState
  'workflow:completed': ActiveWorkflowState
  'workflow:cancelled': { workflowId: string }
  'terms:accepted': TermsAcceptancePayload
  'auth:changed': { user: AuthenticatedUser | null }
  'auth:dataDeleted': { userId: string; deletedAt: string }
  'mfe:mounted': { remoteName: string; moduleName: string }
  'mfe:error': { remoteName: string; moduleName: string; error: string }
}

export type EventMap = BuiltInMFEvents & Record<string, unknown>
export type EventKey<T extends EventMap = EventMap> = keyof T & string
export type EventHandler<TPayload = unknown> = (payload: TPayload) => void
export type Unsubscribe = () => void
