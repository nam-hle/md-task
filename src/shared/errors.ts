export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;

export class MtaskError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = EXIT_ERROR,
  ) {
    super(message);
    this.name = 'MtaskError';
  }
}

export function taskNotFound(id: number): MtaskError {
  return new MtaskError(`Task ${id} not found`);
}

export function fileNotFound(path: string): MtaskError {
  return new MtaskError(`No tasks file found at ${path}. Run: mtask init`);
}

export function fileAlreadyExists(path: string): MtaskError {
  return new MtaskError(`Tasks file already exists: ${path}`);
}

export function validationError(message: string): MtaskError {
  return new MtaskError(message);
}
