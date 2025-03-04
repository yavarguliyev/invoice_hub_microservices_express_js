export interface ValidationError {
  property: string;
  constraints: Record<string, string>;
  reason: string;
}

export interface ErrorWithValidation extends Error {
  errors?: ValidationError[];
};
