/**
 * Supabase Type-Safe Query Helpers
 *
 * Utility functions for making type-safe Supabase queries without resorting to 'as any'.
 * These helpers provide proper typing while maintaining flexibility.
 */

import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

/**
 * Type-safe insert payload
 */
export type InsertPayload<T extends TableName> = Tables[T]['Insert']

/**
 * Type-safe update payload
 */
export type UpdatePayload<T extends TableName> = Tables[T]['Update']

/**
 * Type-safe row type
 */
export type Row<T extends TableName> = Tables[T]['Row']

/**
 * Type assertion helper for query results
 * Use this when you need to assert a specific shape but want to be explicit about it
 *
 * @example
 * const result = await supabase.from('contracts').select('id, amount')
 * const contracts = assertType<Array<{ id: string; amount: number }>>(result.data)
 */
export function assertType<T>(value: unknown): T {
  return value as T
}

/**
 * Safely narrow a Supabase query result to a known type
 * Provides compile-time safety while being explicit about the assertion
 *
 * @example
 * const { data, error } = queryResult(
 *   await supabase.from('contracts').select('id, amount'),
 *   (data): data is Array<{ id: string; amount: number }> => Array.isArray(data)
 * )
 */
export function queryResult<T>(
  result: { data: unknown; error: unknown },
  guard: (data: unknown) => data is T
): { data: T | null; error: unknown } {
  if (result.error || !result.data) {
    return { data: null, error: result.error }
  }

  if (guard(result.data)) {
    return { data: result.data, error: null }
  }

  return { data: null, error: new Error('Type guard failed') }
}
