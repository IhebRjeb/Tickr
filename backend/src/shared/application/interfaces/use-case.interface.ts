/**
 * Base interface for all Use Cases
 *
 * Use Cases orchestrate business logic and coordinate between domain and infrastructure
 */

export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
