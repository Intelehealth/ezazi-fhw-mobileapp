/**
 * The dirty-parent layer. Every local write to a child row goes through here,
 * so the child and its parent's needing-send flag land in one transaction or
 * neither does. Screens call these; they never call a repository writer.
 *
 * Namespaced like `repositories/index.ts`, and for the same reason: the names
 * repeat across files.
 */

export * as obsWrites from './obsWrites';
export * as patientAttributeWrites from './patientAttributeWrites';
export * as visitAttributeWrites from './visitAttributeWrites';
