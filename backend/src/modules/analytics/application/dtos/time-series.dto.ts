// ============================================
// Time Series DTO
// ============================================

export interface TimeSeriesDto {
  readonly timestamp: Date;
  readonly value: number;
  readonly label?: string;
}
