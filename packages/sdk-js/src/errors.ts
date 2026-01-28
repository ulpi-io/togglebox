/**
 * Base error class for ToggleBox SDK errors
 */
export class ToggleBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToggleBoxError";
    Object.setPrototypeOf(this, ToggleBoxError.prototype);
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends ToggleBoxError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "NetworkError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ToggleBoxError {
  public readonly details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ToggleBoxError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
